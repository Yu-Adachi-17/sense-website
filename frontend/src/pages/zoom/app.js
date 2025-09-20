import React, { useEffect, useMemo, useRef, useState } from 'react';

/** ====== 設定（.env で上書き可・クライアント参照なので NEXT_PUBLIC_） ====== */
const GATEWAY_BASE =
  process.env.NEXT_PUBLIC_GATEWAY_BASE || 'https://minutesai-bot-gw-production.up.railway.app';
const INTERNAL_TOKEN = process.env.NEXT_PUBLIC_INTERNAL_TOKEN || '';
const START_TICKET_BEARER = process.env.NEXT_PUBLIC_START_TICKET_BEARER || ''; // 使わないなら空

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
  const base = Math.min(5000, 300 * Math.pow(2, n)); // max 5s
  const jitter = base * (0.2 * (Math.random() * 2 - 1));
  return Math.max(200, base + jitter);
}
function now() {
  const d = new Date();
  return d.toISOString().replace('T',' ').slice(0,19);
}

/** ====== API ラッパ（全て console に詳細ログ出力） ====== */
async function apiStart(meetingNumber, meetingPasscode, runSecs = 21600) {
  const url = `${GATEWAY_BASE}/start`;
  console.log(`[${now()}] POST ${url}`, { meetingNumber, meetingPasscodeMasked: !!meetingPasscode, runSecs });
  const r = await fetch(url, {
    method: 'POST',
    headers: authHeadersJSON(),
    body: JSON.stringify({ meetingNumber, meetingPasscode, botName: 'MinutesAI Bot', runSecs }),
    mode: 'cors',
    credentials: 'omit',
  });
  const text = await r.text();
  console.log(`[${now()}] /start status=${r.status} body=${text}`);
  if (!r.ok) throw new Error(`start bad status ${r.status}: ${text}`);
  let j; try { j = JSON.parse(text); } catch { throw new Error(`start JSON parse error: ${text}`); }
  if (!j.sessionId) throw new Error('start response missing sessionId');
  return j.sessionId;
}

async function apiStop(sid) {
  const url = `${GATEWAY_BASE}/stop/${encodeURIComponent(sid)}`;
  console.log(`[${now()}] POST ${url}`);
  const r = await fetch(url, { method: 'POST', headers: authHeaders(), mode: 'cors', credentials: 'omit' });
  const text = await r.text();
  console.log(`[${now()}] /stop status=${r.status} body=${text}`);
  if (!r.ok) throw new Error(`stop bad status ${r.status}: ${text}`);
}

async function apiStatus(sid) {
  const url = `${GATEWAY_BASE}/status/${encodeURIComponent(sid)}`;
  const r = await fetch(url, { headers: authHeaders(), mode: 'cors', credentials: 'omit' });
  const text = await r.text();
  if (!r.ok) {
    console.log(`[${now()}] /status ${r.status} ${text}`);
    throw new Error(`status bad ${r.status}: ${text}`);
  }
  let j; try { j = JSON.parse(text); } catch { throw new Error(`status JSON parse error: ${text}`); }
  console.log(`[${now()}] /status OK`, j);
  return j;
}

async function apiFiles(sid) {
  const url = `${GATEWAY_BASE}/files/${encodeURIComponent(sid)}`;
  const r = await fetch(url, { headers: authHeaders(), mode: 'cors', credentials: 'omit' });
  const text = await r.text();
  if (!r.ok) throw new Error(`files bad ${r.status}: ${text}`);
  let j; try { j = JSON.parse(text); } catch { throw new Error(`files JSON parse error: ${text}`); }
  console.log(`[${now()}] /files OK`, j);
  return j.files || [];
}

async function headLen(url) {
  const r = await fetch(url, { method: 'HEAD', headers: authHeaders(), mode: 'cors', credentials: 'omit' });
  const len = r.headers.get('content-length');
  console.log(`[${now()}] HEAD ${url} -> ${r.status} len=${len}`);
  if (!r.ok) return -1;
  return len ? parseInt(len, 10) : -1;
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

  const canJoin = useMemo(
    () => !!meetingId && !!passcode && !inputLocked && phase !== 'starting' && phase !== 'joining',
    [meetingId, passcode, inputLocked, phase]
  );
  const canFinish = useMemo(() => !!sessionId && phase !== 'polling', [sessionId, phase]);

  useEffect(() => {
    const mid = localStorage.getItem(LAST_MEETING_ID_KEY);
    const pwd = localStorage.getItem(LAST_PASSCODE_KEY);
    if (mid) setMeetingId(mid);
    if (pwd) setPasscode(pwd);

    const sid = localStorage.getItem(LAST_SID_KEY);
    if (sid) {
      setSessionId(sid);
      setInputLocked(true);
      setRestored(`restored sid=${sid}`);
      push(`restored sid=${sid}`);
    }
  }, []);

  function push(s) {
    const line = `[${now()}] ${s}`;
    console.log(line);
    setLogs(prev => [...prev, line]);
  }

  function setOverlayStage(msg, progress) {
    setOverlay({ show: true, msg, progress: Math.max(0, Math.min(100, progress)) });
  }

  async function onJoin() {
    if (!canJoin) return;
    const ok = window.confirm('"MinutesAI Bot"参加のリクエストが会議のホストに通知されます');
    if (!ok) return;

    try {
      setPhase('starting');
      setAudioList([]);
      setOverlayStage('起動しています…', 5);
      push('JOIN: calling /start');

      const sid = await apiStart(meetingId, passcode, 21600);
      push(`JOIN: /start OK sid=${sid}`);
      setSessionId(sid);
      localStorage.setItem(LAST_SID_KEY, sid);
      localStorage.setItem(LAST_MEETING_ID_KEY, meetingId);
      localStorage.setItem(LAST_PASSCODE_KEY, passcode);
      setInputLocked(true);
      setPhase('joining');

      // 軽い状態監視（最大 3 分）
      setOverlayStage('参加リクエスト送信。ホストに許可を依頼してください…', 15);
      const begin = Date.now();
      let attempt = 0;
      while (Date.now() - begin < 180000) {
        try {
          const st = await apiStatus(sid);
          push(`POLL(join): status=${st.status} phase=${st.phase || '-'} ready=${!!st.ready}`);
          if (st.status === 'running') {
            setOverlayStage('ミーティングに参加しました（Bot稼働中）', 25);
            break;
          }
        } catch (e) {
          push(`POLL(join) error: ${e.message || e}`);
        }
        attempt++;
        await sleep(backoffMs(attempt));
      }
      setOverlay({ show: false, msg: '', progress: 0 });
    } catch (e) {
      setPhase('error');
      push(`JOIN ERROR: ${e.message || e}`);
      setOverlayStage(`起動失敗: ${e.message || 'network error'}`, 100);
      setTimeout(() => setOverlay({ show: false, msg: '', progress: 0 }), 1800);
    }
  }

  async function onFinish() {
    if (!sessionId) return;
    try {
      setPhase('polling');
      setOverlayStage('サーバで録音を最終化しています…', 10);
      push('FINISH: calling /stop');
      await apiStop(sessionId);

      const begin = Date.now();
      let attempt = 0;
      while (Date.now() - begin < 180000) {
        try {
          const st = await apiStatus(sessionId);
          push(`POLL(stop): status=${st.status} phase=${st.phase || '-'} ready=${!!st.ready}`);
          if (st.status === 'finished' && st.ready && st.phase === 'ready') break;

          if (st.status === 'finished') {
            const list = await apiFiles(sessionId);
            const seg = list.filter(x => x.startsWith('segments/')).sort();
            const single = list.find(x => x.toLowerCase().endsWith('.webm') && !x.includes('seg_'));
            const pick = seg[0] || single;
            if (pick) {
              const safe = encodeURIComponent(pick.split('/').pop());
              const url = pick.startsWith('segments/')
                ? `${GATEWAY_BASE}/files/${encodeURIComponent(sessionId)}/segments/${safe}`
                : `${GATEWAY_BASE}/files/${encodeURIComponent(sessionId)}/${safe}`;
              const s1 = await headLen(url);
              await sleep(1000);
              const s2 = await headLen(url);
              push(`HEAD check: ${pick} size1=${s1} size2=${s2}`);
              if (s1 > 0 && s1 === s2) break;
            }
          }
        } catch (e) {
          push(`POLL(stop) error: ${e.message || e}`);
        }
        attempt++;
        await sleep(backoffMs(attempt));
      }

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
        const r = await fetch(`${GATEWAY_BASE}${path}`, { headers: authHeaders(), mode: 'cors', credentials: 'omit' });
        if (!r.ok) throw new Error(`download bad ${r.status}`);
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        downloaded.push({ name: `${sessionId}_${p.split('/').pop()}`, url });
        const prog = 20 + ((i + 1) / plan.length) * 30;
        setOverlayStage('音声データをダウンロードしています…', Math.min(50, prog));
        push(`DL OK: ${p}`);
      }
      setAudioList(downloaded);

      setOverlayStage('音声をテキスト化しています…', 60);
      await sleep(500);
      setOverlayStage('議事録を生成しています…', 80);
      await sleep(500);

      setOverlayStage('完了しました', 100);
      setTimeout(() => setOverlay({ show: false, msg: '', progress: 0 }), 700);
      localStorage.removeItem(LAST_SID_KEY);
      localStorage.removeItem(LAST_MEETING_ID_KEY);
      localStorage.removeItem(LAST_PASSCODE_KEY);
      setPhase('finished');
    } catch (e) {
      push(`FINISH ERROR: ${e.message || e}`);
      setOverlayStage('エラーが発生しました', 100);
      setPhase('error');
      setTimeout(() => setOverlay({ show: false, msg: '', progress: 0 }), 800);
    }
  }

  async function onReset() {
    if (!window.confirm('会議の紐付けをリセットしますか？\n録音情報は全て失われます')) return;
    try {
      if (sessionId) await apiStop(sessionId).catch(() => {});
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
      push('RESET done');
    }
  }

  /** Deep Link（検証用ボタン） */
  function openZoomDeepLink() {
    const url = `zoommtg://zoom.us/join?action=join&confno=${encodeURIComponent(meetingId)}&pwd=${encodeURIComponent(passcode)}`;
    push(`DEEPLINK: ${url}`);
    try {
      window.location.href = url;
      // 起動できない環境向けに 1.5秒後 Web Join へフォールバック
      setTimeout(() => {
        const webUrl = `https://zoom.us/j/${encodeURIComponent(meetingId)}?pwd=${encodeURIComponent(passcode)}`;
        push(`DEEPLINK fallback -> ${webUrl}`);
        window.open(webUrl, '_blank', 'noopener,noreferrer');
      }, 1500);
    } catch (e) {
      push(`DEEPLINK error: ${e.message || e}`);
    }
  }

  return (
    <main style={styles.main}>
      <h1 style={styles.title}>Minutes.AI for Zoom</h1>
      <p style={styles.note}>Recording needs host OK or token; Waiting Room/Auth may require approval or sign-in.</p>

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

        {sessionId && (
          <div style={styles.metaRow}>
            <span style={styles.meta}>sessionId:</span>
            <code style={styles.code}>{sessionId}</code>
          </div>
        )}
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

          <div style={{ height: 10 }} />
          <button onClick={openZoomDeepLink} style={merge(styles.linkBtn)}>
            Open in Zoom app (test)
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

      <section style={styles.card}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Debug Logs</h3>
        <pre style={styles.logs}>{logs.join('\n')}</pre>
      </section>

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

/** ====== UI 部品 ====== */
function Label({ children }) { return <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>{children}</div>; }
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
      <div style={{ height: 1, background: disabled ? 'rgba(107,114,128,0.28)' : 'rgba(107,114,128,0.38)' }} />
    </div>
  );
}

/** ====== スタイル ====== */
const styles = {
  main: { maxWidth: 620, margin: '0 auto', padding: 20, fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif' },
  title: { margin: 0, textAlign: 'center', fontSize: 20 },
  note: { textAlign: 'center', opacity: 0.7, margin: '12px 0 18px' },
  card: { padding: 16, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(6px)', marginBottom: 14 },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center' },

  btnBase: { width: '70%', padding: '12px 16px', borderRadius: 22, border: '1px solid rgba(255,255,255,0.22)', fontWeight: 600 },
  btnJoin: { color: '#fff', background: 'linear-gradient(135deg,#2563eb,#06b6d4)', boxShadow: '0 10px 20px rgba(37,99,235,.25)' },
  btnRaised: { color: '#111827', background: '#f7f7f9', boxShadow: '0 10px 18px rgba(0,0,0,.12), inset 0 0 0 1px rgba(0,0,0,.03)' },
  btnReset: { color: '#fff', background: 'linear-gradient(135deg,#ef4444,rgba(239,68,68,.85))', boxShadow: '0 12px 20px rgba(239,68,68,.25)' },
  btnDisabled: { opacity: 0.55, pointerEvents: 'none' },
  linkBtn: { background: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', fontSize: 13, opacity: 0.85 },

  metaRow: { marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  meta: { fontSize: 12, opacity: 0.75 },
  code: { fontSize: 12, background: 'rgba(0,0,0,.05)', padding: '2px 6px', borderRadius: 6 },

  restoreText: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, opacity: 0.7, marginTop: 6 },
  logs: { fontSize: 12, whiteSpace: 'pre-wrap', margin: 0, maxHeight: 280, overflow: 'auto', background: 'rgba(0,0,0,.04)', padding: 10, borderRadius: 8 },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'grid', placeItems: 'center', zIndex: 1000 },
  overlayBox: { padding: 22, borderRadius: 18, background: 'rgba(17,24,39,.85)', color: '#fff', textAlign: 'center', width: 260 },
  overlayText: { fontWeight: 700, letterSpacing: 0.2 },
  circleOuter: { position: 'relative', width: 150, height: 150 },
  circleInner: { position: 'absolute', inset: 0, borderRadius: '50%' },
  circleHole: { position: 'absolute', inset: 10, borderRadius: '50%', background: 'rgba(17,24,39,1)' },
  circleText: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 28, fontWeight: 800 }
};

function merge(...xs) { return Object.assign({}, ...xs.filter(Boolean)); }
