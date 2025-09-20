import React, { useEffect, useMemo, useRef, useState } from 'react';

/** ====== 設定（必要に応じて .env で上書き） ====== */
const GATEWAY_BASE =
  process.env.NEXT_PUBLIC_GATEWAY_BASE || 'https://minutesai-bot-gw-production.up.railway.app';
const INTERNAL_TOKEN = process.env.NEXT_PUBLIC_INTERNAL_TOKEN || '';
const START_TICKET_BEARER = process.env.NEXT_PUBLIC_START_TICKET_BEARER || ''; // 使わないなら空でOK

/** ====== 永続キー ====== */
const LAST_SID_KEY = 'minutesai.lastSessionId';
const LAST_MEETING_ID_KEY = 'minutesai.lastMeetingId';
const LAST_PASSCODE_KEY = 'minutesai.lastPasscode';

/** ====== 共通ヘッダ ====== */
function authHeadersJSON() {
  return START_TICKET_BEARER
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${START_TICKET_BEARER}` }
    : { 'Content-Type': 'application/json', 'X-Internal-Token': INTERNAL_TOKEN };
}
function authHeaders() {
  return START_TICKET_BEARER
    ? { Authorization: `Bearer ${START_TICKET_BEARER}` }
    : { 'X-Internal-Token': INTERNAL_TOKEN };
}

/** ====== ヘルパ ====== */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function backoffMs(n) {
  const base = Math.min(5.0, 0.3 * Math.pow(2, n));
  const jitter = base * (0.2 * (Math.random() * 2 - 1));
  return Math.max(0.2, base + jitter) * 1000;
}

/** ====== ページ本体 ====== */
export default function ZoomAppHome() {
  const [meetingId, setMeetingId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [sessionId, setSessionId] = useState(null);

  const [phase, setPhase] = useState('idle'); // idle | starting | joining | polling | finished | error
  const [inputLocked, setInputLocked] = useState(false);
  const [overlay, setOverlay] = useState({ show: false, msg: '', progress: 0 });
  const [logs, setLogs] = useState([]);
  const [restored, setRestored] = useState(null);

  const [audioList, setAudioList] = useState([]); // {name,url}[]
  const progressRef = useRef(0);

  const canJoin = useMemo(
    () => !!meetingId && !!passcode && !inputLocked && phase !== 'starting' && phase !== 'joining',
    [meetingId, passcode, inputLocked, phase]
  );
  const canFinish = useMemo(() => !!sessionId && phase !== 'polling', [sessionId, phase]);

  useEffect(() => {
    // MeetingID/Passcode 復元
    const mid = localStorage.getItem(LAST_MEETING_ID_KEY);
    const pwd = localStorage.getItem(LAST_PASSCODE_KEY);
    if (mid) setMeetingId(mid);
    if (pwd) setPasscode(pwd);

    // セッション復元（クラッシュ回避）
    const sid = localStorage.getItem(LAST_SID_KEY);
    if (sid) {
      setSessionId(sid);
      setInputLocked(true);
      setRestored(`restored sid=${sid}`);
      pushLog(`restored sid=${sid}`);
    }
  }, []);

  /** ====== UI ログ ====== */
  function pushLog(s) { setLogs(prev => [...prev, s]); }

  /** ====== API ====== */
  async function apiStart(meetingNumber, meetingPasscode, runSecs = 21600) {
    const r = await fetch(`${GATEWAY_BASE}/start`, {
      method: 'POST',
      headers: authHeadersJSON(),
      body: JSON.stringify({ meetingNumber, meetingPasscode, botName: 'MinutesAI Bot', runSecs }),
    });
    if (!r.ok) throw new Error(`start bad status ${r.status}`);
    const j = await r.json();
    return j.sessionId;
  }

  async function apiStop(sid) {
    await fetch(`${GATEWAY_BASE}/stop/${encodeURIComponent(sid)}`, { method: 'POST', headers: authHeaders() });
  }

  async function apiStatus(sid) {
    const r = await fetch(`${GATEWAY_BASE}/status/${encodeURIComponent(sid)}`, { headers: authHeaders() });
    if (!r.ok) throw new Error(`status bad ${r.status}`);
    return r.json();
  }

  async function apiFiles(sid) {
    const r = await fetch(`${GATEWAY_BASE}/files/${encodeURIComponent(sid)}`, { headers: authHeaders() });
    if (!r.ok) throw new Error(`files bad ${r.status}`);
    const j = await r.json();
    return j.files || [];
  }

  async function headLen(url) {
    const r = await fetch(url, { method: 'HEAD', headers: authHeaders() });
    if (!r.ok) return -1;
    const len = r.headers.get('content-length');
    return len ? parseInt(len, 10) : -1;
  }

  /** ====== 進捗表示 ====== */
  function setOverlayStage(msg, progress) {
    progressRef.current = Math.max(0, Math.min(100, progress));
    setOverlay({ show: true, msg, progress: progressRef.current });
  }

  /** ====== Join ====== */
  async function onJoin() {
    if (!canJoin) return;
    const ok = window.confirm('"MinutesAI Bot"参加のリクエストが会議のホストに通知されます');
    if (!ok) return;

    try {
      setPhase('starting');
      setAudioList([]);
      setOverlayStage('起動しています…', 5);

      const sid = await apiStart(meetingId, passcode, 21600);
      setSessionId(sid);
      localStorage.setItem(LAST_SID_KEY, sid);
      localStorage.setItem(LAST_MEETING_ID_KEY, meetingId);
      localStorage.setItem(LAST_PASSCODE_KEY, passcode);
      setInputLocked(true);
      setPhase('joining');
      pushLog(`started sid=${sid}`);
      setOverlay({ show: false, msg: '', progress: 0 });
    } catch (e) {
      setPhase('error');
      pushLog(`start error: ${e?.message || e}`);
      setOverlay({ show: false, msg: '', progress: 0 });
    }
  }

  /** ====== Stop → finalize → DL ====== */
  async function onFinish() {
    if (!sessionId) return;
    try {
      setPhase('polling');
      setOverlayStage('サーバで録音を最終化しています…', 10);

      await apiStop(sessionId);

      // /status 監視（最大3分）
      const begin = Date.now();
      let attempt = 0;
      while (true) {
        if (Date.now() - begin > 180_000) throw new Error('timed out');

        try {
          const st = await apiStatus(sessionId);
          const fs = st.debug?.fs;
          pushLog(`[poll] status=${st.status} phase=${st.phase || '-'} ready=${!!st.ready} seg=${!!fs?.hasSegments} webm=${!!fs?.hasWebm} webmBytes=${fs?.webmBytes ?? -1} wavBytes=${fs?.wavBytes ?? -1} policy=${st.debug?.readyPolicy ?? '-'}`);

          if (st.status === 'finished' && st.ready && st.phase === 'ready') break;

          if (st.status === 'finished') {
            // 安定ファイル検査（segments優先）
            const list = await apiFiles(sessionId);
            const seg = list.filter(x => x.startsWith('segments/')).sort();
            const single = list.find(x => x.toLowerCase().endsWith('.webm') && !x.includes('seg_'));
            const pick = seg[0] || single;
            if (pick) {
              const encoded = encodeURIComponent(pick.split('/').pop());
              const url = pick.startsWith('segments/')
                ? `${GATEWAY_BASE}/files/${encodeURIComponent(sessionId)}/segments/${encoded}`
                : `${GATEWAY_BASE}/files/${encodeURIComponent(sessionId)}/${encoded}`;
              const s1 = await headLen(url);
              await sleep(1000);
              const s2 = await headLen(url);
              pushLog(`[head] ${pick} size1=${s1} size2=${s2}`);
              if (s1 > 0 && s1 === s2) break;
            }
          }
        } catch (err) {
          pushLog(`[poll] error: ${err?.message || err}`);
        }
        attempt++;
        await sleep(backoffMs(attempt));
      }

      // 一覧 → DL
      setOverlayStage('音声データをダウンロードしています…', 20);
      const files = await apiFiles(sessionId);
      const segments = files.filter(f => f.startsWith('segments/')).sort();
      const singleWebm = files.find(f => f.endsWith('.webm') && !f.includes('seg_'));
      const fallbackWav = files.find(f => f.endsWith('.wav'));

      let plan = [];
      if (segments.length) plan = segments;
      else if (singleWebm) plan = [singleWebm];
      else if (fallbackWav) plan = [fallbackWav];
      else if (files[0]) plan = [files[0]];

      const downloaded = [];
      for (let i = 0; i < plan.length; i++) {
        const p = plan[i];
        const safe = encodeURIComponent(p.split('/').pop());
        const path = p.startsWith('segments/')
          ? `/files/${encodeURIComponent(sessionId)}/segments/${safe}`
          : `/files/${encodeURIComponent(sessionId)}/${safe}`;
        const r = await fetch(`${GATEWAY_BASE}${path}`, { headers: authHeaders() });
        if (!r.ok) throw new Error(`download bad ${r.status}`);
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        downloaded.push({ name: `${sessionId}_${p.split('/').pop()}`, url });
        const k = 20 + ((i + 1) / plan.length) * 30;
        setOverlayStage('音声データをダウンロードしています…', Math.min(50, k));
      }
      setAudioList(downloaded);

      // ここで STT/要約を走らせたい場合は別APIへPOSTする等で差し込んでください
      setOverlayStage('音声をテキスト化しています…', 60);
      await sleep(500);
      setOverlayStage('議事録を生成しています…', 80);
      await sleep(500);

      // 正常終了
      setOverlayStage('完了しました', 100);
      setTimeout(() => setOverlay({ show: false, msg: '', progress: 0 }), 600);
      localStorage.removeItem(LAST_SID_KEY);
      localStorage.removeItem(LAST_MEETING_ID_KEY);
      localStorage.removeItem(LAST_PASSCODE_KEY);
      setPhase('finished');
    } catch (e) {
      pushLog(`stop&fetch error: ${e?.message || e}`);
      setOverlayStage('エラーが発生しました', 100);
      setPhase('error');
      setTimeout(() => setOverlay({ show: false, msg: '', progress: 0 }), 800);
    }
  }

  /** ====== Reset ====== */
  async function onReset() {
    if (!window.confirm('会議の紐付けをリセットしますか？\n録音情報は全て失われます')) return;
    try {
      if (sessionId) {
        await apiStop(sessionId).catch(() => {});
      }
    } finally {
      setSessionId(null);
      setInputLocked(false);
      setPhase('idle');
      setAudioList([]);
      setOverlay({ show: false, msg: '', progress: 0 });
      setRestored(null);
      setMeetingId('');
      setPasscode('');
      localStorage.removeItem(LAST_SID_KEY);
      localStorage.removeItem(LAST_MEETING_ID_KEY);
      localStorage.removeItem(LAST_PASSCODE_KEY);
      setLogs([]);
    }
  }

  /** ====== UI ====== */
  return (
    <main style={styles.main}>
      <div style={styles.header}>
        <div style={{ width: 28 }} />
        <h1 style={styles.title}>Minutes.AI for Zoom</h1>
        <div />
      </div>

      <p style={styles.note}>
        Recording needs host OK or token; Waiting Room/Auth may require approval or sign-in.
      </p>

      <section style={styles.card}>
        <Label>Meeting ID</Label>
        <UnderlinedInput
          value={meetingId}
          onChange={e => setMeetingId(e.target.value)}
          placeholder="e.g. 9815129794"
          disabled={inputLocked}
          type="tel"
        />
        <div style={{ height: 10 }} />
        <Label>Passcode</Label>
        <UnderlinedInput
          value={passcode}
          onChange={e => setPasscode(e.target.value)}
          placeholder="Passcode"
          disabled={inputLocked}
        />

        {restored && <div style={styles.restoreText}>{restored}</div>}

        <div style={{ height: 14 }} />
        <div style={styles.center}>
          <button
            onClick={onJoin}
            disabled={!canJoin}
            style={merge(styles.btnBase, styles.btnJoin, !canJoin && styles.btnDisabled)}
          >
            {phase === 'starting' ? 'Starting…' : inputLocked ? 'Joined' : 'Join with Bot'}
          </button>

          <div style={{ height: 10 }} />

          <button
            onClick={onFinish}
            disabled={!canFinish}
            style={merge(styles.btnBase, styles.btnRaised, !canFinish && styles.btnDisabled)}
          >
            {phase === 'polling' ? 'Fetching…' : 'Finish'}
          </button>

          {inputLocked && (
            <>
              <div style={{ height: 10 }} />
              <button onClick={onReset} style={merge(styles.btnBase, styles.btnReset)}>Reset</button>
            </>
          )}
        </div>
      </section>

      {audioList.length > 0 && (
        <section style={styles.card}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Recording</h3>
          <div style={{ height: 8 }} />
          {audioList.map((a, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4, wordBreak: 'break-all' }}>{a.name}</div>
              <audio controls src={a.url} style={{ width: '100%' }} />
            </div>
          ))}
        </section>
      )}

      {logs.length > 0 && (
        <details style={styles.card}>
          <summary>Logs</summary>
          <pre style={styles.logs}>{logs.join('\n')}</pre>
        </details>
      )}

      {overlay.show && (
        <div style={styles.overlay}>
          <div style={styles.overlayBox}>
            <div style={styles.circleOuter}>
              <div
                style={{
                  ...styles.circleInner,
                  background: `conic-gradient(#3b82f6 ${overlay.progress * 3.6}deg, rgba(255,255,255,0.15) 0deg)`,
                }}
              />
              <div style={styles.circleHole} />
              <div style={styles.circleText}>{Math.round(overlay.progress)}%</div>
            </div>
            <div style={{ height: 12 }} />
            <div style={styles.overlayText}>{overlay.msg}</div>
          </div>
        </div>
      )}
    </main>
  );
}

/** ====== 小物 ====== */
function Label({ children }) {
  return <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>{children}</div>;
}
function UnderlinedInput(props) {
  const { disabled } = props;
  return (
    <div>
      <input
        {...props}
        style={{
          width: '100%',
          border: 'none',
          outline: 'none',
          fontSize: 16,
          padding: '8px 0',
          color: disabled ? 'rgba(107,114,128,0.7)' : 'inherit',
          background: 'transparent',
        }}
      />
      <div
        style={{
          height: 1,
          background: disabled ? 'rgba(107,114,128,0.28)' : 'rgba(107,114,128,0.38)',
        }}
      />
    </div>
  );
}

/** ====== スタイル ====== */
const styles = {
  main: { maxWidth: 560, margin: '0 auto', padding: 20, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' },
  header: { display: 'grid', gridTemplateColumns: '28px 1fr 28px', alignItems: 'center', marginBottom: 8 },
  title: { margin: 0, textAlign: 'center', fontSize: 20 },
  note: { textAlign: 'center', opacity: 0.7, margin: '12px 0 18px' },
  card: { padding: 16, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(6px)', marginBottom: 14 },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center' },

  btnBase: {
    width: '70%',
    padding: '12px 16px',
    borderRadius: 22,
    border: '1px solid rgba(255,255,255,0.22)',
    fontWeight: 600,
  },
  btnJoin: {
    color: '#fff',
    background: 'linear-gradient(135deg, #2563eb, #06b6d4)',
    boxShadow: '0 10px 20px rgba(37,99,235,.25)',
  },
  btnRaised: {
    color: '#111827',
    background: '#f7f7f9',
    boxShadow: '0 10px 18px rgba(0,0,0,.12), inset 0 0 0 1px rgba(0,0,0,.03)',
  },
  btnReset: {
    color: '#fff',
    background: 'linear-gradient(135deg, #ef4444, rgba(239,68,68,.85))',
    boxShadow: '0 12px 20px rgba(239,68,68,.25)',
  },
  btnDisabled: { opacity: 0.55, pointerEvents: 'none' },

  restoreText: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, opacity: 0.7, marginTop: 6 },

  logs: { fontSize: 12, whiteSpace: 'pre-wrap', margin: 0 },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'grid', placeItems: 'center', zIndex: 1000 },
  overlayBox: { padding: 22, borderRadius: 18, background: 'rgba(17,24,39,.85)', color: '#fff', textAlign: 'center', width: 260 },
  overlayText: { fontWeight: 700, letterSpacing: 0.2 },

  circleOuter: { position: 'relative', width: 150, height: 150 },
  circleInner: { position: 'absolute', inset: 0, borderRadius: '50%' },
  circleHole: { position: 'absolute', inset: 10, borderRadius: '50%', background: 'rgba(17,24,39,1)' },
  circleText: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 28, fontWeight: 800 }
};

/** 合成ユーティリティ */
function merge(...xs) { return Object.assign({}, ...xs.filter(Boolean)); }
