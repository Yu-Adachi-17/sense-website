import React, { useEffect, useMemo, useState } from 'react';

/** ====== Same-origin API base ====== */
const API_BASE = '/api/zoom-bot';

/** ====== Persistence keys ====== */
const LAST_SID_KEY = 'minutesai.lastSessionId';
const LAST_MEETING_ID_KEY = 'minutesai.lastMeetingId';
const LAST_PASSCODE_KEY = 'minutesai.lastPasscode';

/** ====== Feature flags ====== */
// ※ 本番UIではデバッグを見せない（Railwayへ console.log 出力のみ）
const SHOW_DEBUG = false; // 一時的にUIで見たいときは true に

/** ====== Utils ====== */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const backoffMs = n => Math.max(200, Math.min(5000, 300 * Math.pow(2, n)));
const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

/** ====== API wrappers ====== */
async function apiStart(meetingNumber, meetingPasscode, runSecs = 21600) {
  const url = `${API_BASE}/start`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meetingNumber, meetingPasscode, botName: 'MinutesAI Bot', runSecs }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`start bad ${r.status}: ${text}`);
  const j = JSON.parse(text);
  if (!j.sessionId) throw new Error('start response missing sessionId');
  return j.sessionId;
}
async function apiStop(sid) {
  const r = await fetch(`${API_BASE}/stop/${encodeURIComponent(sid)}`, { method: 'POST' });
  const t = await r.text();
  if (!r.ok) throw new Error(`stop bad ${r.status}: ${t}`);
}
async function apiStatus(sid) {
  const r = await fetch(`${API_BASE}/status/${encodeURIComponent(sid)}`);
  const t = await r.text();
  if (!r.ok) throw new Error(`status bad ${r.status}: ${t}`);
  return JSON.parse(t);
}
async function apiFiles(sid) {
  const r = await fetch(`${API_BASE}/files/${encodeURIComponent(sid)}`);
  const t = await r.text();
  if (!r.ok) throw new Error(`files bad ${r.status}: ${t}`);
  return JSON.parse(t).files || [];
}
async function headLen(url) {
  const r = await fetch(url, { method: 'HEAD' });
  const len = r.headers.get('content-length');
  if (!r.ok) return -1;
  return len ? parseInt(len, 10) : -1;
}

/** ====== Screen ====== */
export default function ZoomAppHome() {
  const [meetingId, setMeetingId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [sessionId, setSessionId] = useState(null);

  const [phase, setPhase] = useState('idle'); // idle | starting | joining | polling | finished | error
  const [inputLocked, setInputLocked] = useState(false);
  const [overlay, setOverlay] = useState({ show: false, msg: '', progress: 0 });
  const [logs, setLogs] = useState([]);
  const [audioList, setAudioList] = useState([]);
  const [restored, setRestored] = useState(null);

  const canJoin = useMemo(
    () => !!meetingId && !!passcode && !inputLocked && phase !== 'starting' && phase !== 'joining',
    [meetingId, passcode, inputLocked, phase]
  );
  const canFinish = useMemo(() => !!sessionId && phase !== 'polling', [sessionId, phase]);

  // ★ 全画面を確実に白背景に（親の黒を上書き）
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlBg = html.style.background;
    const prevBodyBg = body.style.background;
    html.style.background = '#ffffff';
    body.style.background = '#ffffff';
    return () => {
      html.style.background = prevHtmlBg;
      body.style.background = prevBodyBg;
    };
  }, []);

  // 復元
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

  // Railway出力（console.log）。UI表示は SHOW_DEBUG のみ
  function push(s) {
    const line = `[${now()}] ${s}`;
    // 出力：Railway（コンソール）
    // eslint-disable-next-line no-console
    console.log(line);
    // 任意：UIのデバッグ欄
    if (SHOW_DEBUG) {
      setLogs(prev => [...prev, line]);
    }
  }

  function setOverlayStage(msg, progress) {
    setOverlay({ show: true, msg, progress: Math.max(0, Math.min(100, progress)) });
  }

  async function onJoin() {
    if (!canJoin) return;
    const ok = window.confirm('A request to add “MinutesAI Bot” will be sent to the meeting host.');
    if (!ok) return;

    try {
      setPhase('starting');
      setAudioList([]);
      setOverlayStage('Starting up…', 5);
      push('JOIN: calling /api/zoom-bot/start');

      const sid = await apiStart(meetingId, passcode, 21600);
      push(`JOIN OK: sid=${sid}`);
      setSessionId(sid);
      localStorage.setItem(LAST_SID_KEY, sid);
      localStorage.setItem(LAST_MEETING_ID_KEY, meetingId);
      localStorage.setItem(LAST_PASSCODE_KEY, passcode);
      setInputLocked(true);
      setPhase('joining');

      setOverlayStage('Join request sent. Ask the host to approve…', 15);
      const begin = Date.now();
      let attempt = 0;
      while (Date.now() - begin < 180000) {
        try {
          const st = await apiStatus(sid);
          push(`POLL(join): status=${st.status} phase=${st.phase || '-'} ready=${!!st.ready}`);
          if (st.status === 'running') {
            setOverlayStage('Joined the meeting (bot running)', 25);
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
      setOverlayStage(`Failed to start: ${e.message || 'network error'}`, 100);
      setTimeout(() => setOverlay({ show: false, msg: '', progress: 0 }), 1800);
    }
  }

  async function onFinish() {
    if (!sessionId) return;
    try {
      setPhase('polling');
      setOverlayStage('Finalizing recording on server…', 10);
      push('FINISH: calling /api/zoom-bot/stop');
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
                ? `${API_BASE}/files/${encodeURIComponent(sessionId)}/segments/${safe}`
                : `${API_BASE}/files/${encodeURIComponent(sessionId)}/${safe}`;
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

      setOverlayStage('Downloading audio…', 20);
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
          ? `${API_BASE}/files/${encodeURIComponent(sessionId)}/segments/${safe}`
          : `${API_BASE}/files/${encodeURIComponent(sessionId)}/${safe}`;
        const r = await fetch(path);
        if (!r.ok) throw new Error(`download bad ${r.status}`);
        const blob = await r.blob();
        downloaded.push({ name: `${sessionId}_${p.split('/').pop()}`, url: URL.createObjectURL(blob) });
        const prog = 20 + ((i + 1) / plan.length) * 30;
        setOverlayStage('Downloading audio…', Math.min(50, prog));
        push(`DL OK: ${p}`);
      }
      setAudioList(downloaded);

      setOverlayStage('Transcribing audio…', 60);
      await sleep(500);
      setOverlayStage('Generating minutes…', 80);
      await sleep(500);

      setOverlayStage('Done', 100);
      setTimeout(() => setOverlay({ show: false, msg: '', progress: 0 }), 700);
      localStorage.removeItem(LAST_SID_KEY);
      localStorage.removeItem(LAST_MEETING_ID_KEY);
      localStorage.removeItem(LAST_PASSCODE_KEY);
      setPhase('finished');
    } catch (e) {
      push(`FINISH ERROR: ${e.message || e}`);
      setOverlayStage('An error occurred', 100);
      setPhase('error');
      setTimeout(() => setOverlay({ show: false, msg: '', progress: 0 }), 800);
    }
  }

  async function onReset() {
    if (!window.confirm('Reset the meeting link? All recording info will be lost.')) return;
    try { if (sessionId) await apiStop(sessionId).catch(() => {}); }
    finally {
      setSessionId(null); setInputLocked(false); setPhase('idle');
      setAudioList([]); setOverlay({ show: false, msg: '', progress: 0 });
      setRestored(null); setMeetingId(''); setPasscode('');
      localStorage.removeItem(LAST_SID_KEY);
      localStorage.removeItem(LAST_MEETING_ID_KEY);
      localStorage.removeItem(LAST_PASSCODE_KEY);
      setLogs([]); push('RESET done');
    }
  }

  const noteText =
    'Recording may require host approval or a valid token.\n' +
    'Waiting Room/Auth can also require approval or sign-in.';

  return (
    <>
      {/* ★ 画面全体ホワイト */}
      <div style={styles.fullBleed} />

      {/* 上下中央揃えのフレーム */}
      <main style={styles.main}>
        <div style={styles.wrap}>
          <h1 style={styles.hero}>Join a Zoom Meeting</h1>
          <h2 style={styles.title}>Minutes.AI for Zoom</h2>
          <div style={styles.note}>{noteText}</div>

          <section style={styles.card}>
            <Label>Meeting ID</Label>
            <Underline
              value={meetingId}
              onChange={e => setMeetingId(e.target.value)}
              placeholder="e.g. 9815129794"
              disabled={inputLocked}
            />
            <div style={{ height: 10 }} />
            <Label>Passcode</Label>
            <Underline
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

          {/* デバッグ欄は本番UIでは非表示（SHOW_DEBUG=false） */}
          {SHOW_DEBUG && (
            <section style={styles.card}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Debug Logs</h3>
              <pre style={styles.logs}>{logs.join('\n')}</pre>
            </section>
          )}
        </div>
      </main>

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
    </>
  );
}

/** Bits */
function Label({ children }) {
  return <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>{children}</div>;
}
function Underline(props) {
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

/** Styles */
const styles = {
  // 全画面ホワイトの“敷き紙”
  fullBleed: { position: 'fixed', inset: 0, background: '#ffffff', zIndex: 0 },

  // 上下左右の中央揃えフレーム
  main: {
    position: 'relative',
    zIndex: 1,
    minHeight: '100svh',
    display: 'grid',
    placeItems: 'center',
    padding: 20,
    background: 'transparent',
    fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif',
  },

  // 中身の幅制御カード束
  wrap: { width: '100%', maxWidth: 620 },

  // グラデ文字の大見出し（大きめ）
  hero: {
    margin: '6px 0 10px',
    textAlign: 'center',
    fontSize: 44,
    fontWeight: 900,
    lineHeight: 1.05,
    letterSpacing: 0.2,
    background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 45%, #0b1a45 100%)', // 水色→青→紺
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  },

  title: { margin: 0, textAlign: 'center', fontSize: 18, fontWeight: 700, color: '#111827' },

  // 改行を効かせるため pre-line
  note: {
    textAlign: 'center',
    opacity: 0.75,
    margin: '12px 0 18px',
    whiteSpace: 'pre-line',
    fontSize: 13.5,
  },

  card: {
    padding: 16,
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 16,
    background: '#ffffff',
    marginBottom: 14,
  },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center' },

  btnBase: {
    width: '70%',
    padding: '12px 16px',
    borderRadius: 22,
    border: '1px solid rgba(0,0,0,0.08)',
    fontWeight: 700,
    background: '#fff',
  },
  btnJoin: {
    color: '#fff',
    background: 'linear-gradient(135deg,#2563eb,#0ea5e9)',
    boxShadow: '0 10px 20px rgba(37,99,235,.25)',
    border: 'none',
  },
  btnRaised: {
    color: '#111827',
    background: '#f7f7f9',
    boxShadow: '0 10px 18px rgba(0,0,0,.12), inset 0 0 0 1px rgba(0,0,0,.03)',
  },
  btnReset: {
    color: '#fff',
    background: 'linear-gradient(135deg,#ef4444,rgba(239,68,68,.85))',
    boxShadow: '0 12px 20px rgba(239,68,68,.25)',
    border: 'none',
  },
  btnDisabled: { opacity: 0.55, pointerEvents: 'none' },

  metaRow: { marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  meta: { fontSize: 12, opacity: 0.75 },
  code: { fontSize: 12, background: 'rgba(0,0,0,.05)', padding: '2px 6px', borderRadius: 6 },

  restoreText: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 12,
    opacity: 0.7,
    marginTop: 6,
  },
  logs: {
    fontSize: 12,
    whiteSpace: 'pre-wrap',
    margin: 0,
    maxHeight: 280,
    overflow: 'auto',
    background: 'rgba(0,0,0,.04)',
    padding: 10,
    borderRadius: 8,
  },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'grid', placeItems: 'center', zIndex: 1000 },
  overlayBox: { padding: 22, borderRadius: 18, background: 'rgba(17,24,39,.85)', color: '#fff', textAlign: 'center', width: 260 },
  overlayText: { fontWeight: 700, letterSpacing: 0.2 },
  circleOuter: { position: 'relative', width: 150, height: 150 },
  circleInner: { position: 'absolute', inset: 0, borderRadius: '50%' },
  circleHole: { position: 'absolute', inset: 10, borderRadius: '50%', background: 'rgba(17,24,39,1)' },
  circleText: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 28, fontWeight: 800 },
};

function merge(...xs) { return Object.assign({}, ...xs.filter(Boolean)); }
