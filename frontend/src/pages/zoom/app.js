// src/pages/zoom/app.js
import React, { useEffect, useMemo, useState } from 'react';
import FullScreenOverlay from '../fullscreenoverlay';
import { getClientAuth, getDb } from '../../firebaseConfig'; // ★ 変更：auth/dbはゲッター経由に
import { v4 as uuidv4 } from 'uuid';

/** ====== Same-origin API base ====== */
const API_BASE = '/api/zoom-bot';

/** ====== Persistence keys ====== */
const LAST_SID_KEY = 'minutesai.lastSessionId';
const LAST_MEETING_ID_KEY = 'minutesai.lastMeetingId';
const LAST_PASSCODE_KEY = 'minutesai.lastPasscode';

/** ====== Feature flags ====== */
const SHOW_DEBUG = false;

/** ====== Utils ====== */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const backoffMs = (n) => Math.max(200, Math.min(5000, 300 * Math.pow(2, n)));
const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

// ── 完全置換：ネイティブ Zoom クライアントを最優先で開く ──
function openZoomClientJoin(meetingId, passcode) {
  const id = String(meetingId || '').replace(/\D/g, '');
  const pwd = encodeURIComponent(passcode || '');
  const ua = navigator.userAgent || '';

  const isIOS = /iP(hone|ad|od)/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isChrome = /Chrome\/\d+/.test(ua) && !/Edg\//.test(ua);
  const isAndroidChrome = isAndroid && isChrome;

  // Web クライアントのフォールバック（?pwd は暗号化値が必要なため付与しない）
  const fallbackWeb = `https://zoom.us/wc/join/${id}`;

  let deeplink;
  if (isAndroidChrome) {
    deeplink =
      `intent://zoom.us/join?confno=${id}${pwd ? `&pwd=${pwd}` : ''}` +
      '#Intent;scheme=zoomus;package=us.zoom.videomeetings;' +
      `S.browser_fallback_url=${encodeURIComponent(fallbackWeb)};end`;
  } else if (isIOS || isAndroid) {
    deeplink = `zoomus://zoom.us/join?confno=${id}${pwd ? `&pwd=${pwd}` : ''}`;
  } else {
    deeplink = `zoommtg://zoom.us/join?action=join&confno=${id}${pwd ? `&pwd=${pwd}` : ''}`;
  }

  const openedAt = Date.now();
  try {
    window.location.href = deeplink;
  } catch {}

  if (!isAndroidChrome) {
    setTimeout(() => {
      if (document.visibilityState === 'visible' && Date.now() - openedAt >= 1400) {
        try {
          window.location.href = fallbackWeb;
        } catch {
          window.open(fallbackWeb, '_blank');
        }
      }
    }, 1500);
  }
}

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

/** ====== Transcribe helpers (frontend → backend) ====== */
async function transcribeFromBlobs(blobs, { meetingFormat, outputType = 'flexible', lang = 'ja' }) {
  const tkRes = await fetch('/api/transcribe-ticket', { method: 'POST' });
  if (!tkRes.ok) {
    const t = await tkRes.text();
    throw new Error(`ticket error ${tkRes.status}: ${t}`);
  }
  const { uploadUrl, token } = await tkRes.json();

  const primary = blobs[0];
  const fd = new FormData();
  fd.append('file', primary, primary.name || 'audio.webm');
  fd.append('meetingFormat', meetingFormat || '');
  fd.append('outputType', outputType);
  fd.append('lang', lang);

  const attemptOnce = (signal) =>
    fetch(uploadUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
      signal,
    });

  let lastErr;
  for (let i = 0; i < 3; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const r = await attemptOnce(controller.signal);
      clearTimeout(timer);
      const text = await r.text();
      if (!r.ok) throw new Error(`transcribe bad ${r.status}: ${text}`);
      try {
        return JSON.parse(text);
      } catch {
        return { raw: text };
      }
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      await sleep(Math.min(5000, 700 * Math.pow(2, i)));
    }
  }
  throw new Error(`transcribe failed after retries: ${lastErr?.message || lastErr}`);
}

async function transcribeBySid(
  sid,
  { meetingFormat = '', outputType = 'flexible', lang = 'ja', preferred = '' }
) {
  const payload = { sid, lang, outputType, meetingFormat, preferred };
  console.log('[transcribeBySid] request payload =', payload);

  const r = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await r.text();
  console.log('[transcribeBySid] status =', r.status, 'raw =', text.slice(0, 200));

  if (!r.ok) {
    const ct = r.headers.get('content-type');
    throw new Error(`transcribe failed ${r.status} (ct=${ct}): ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

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

  // === オフラインと同じ “結果表示” 用 ===
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [minutes, setMinutes] = useState('');
  const [meetingRecordId, setMeetingRecordId] = useState(null);
  const [selectedMeetingFormat, setSelectedMeetingFormat] = useState(null);

  // ★ 新：auth / db インスタンス（クライアントでのみセット）
  const [authInstance, setAuthInstance] = useState(null);
  const [dbInstance, setDbInstance] = useState(null);

  // クライアントで auth/db を取得
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [a, d] = await Promise.all([getClientAuth(), getDb()]);
      if (!mounted) return;
      setAuthInstance(a || null);
      setDbInstance(d || null);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const canJoin = useMemo(
    () => !!meetingId && !!passcode && !inputLocked && phase !== 'starting' && phase !== 'joining',
    [meetingId, passcode, inputLocked, phase]
  );
  const canFinish = useMemo(() => !!sessionId && phase !== 'polling', [sessionId, phase]);

  // 全画面白背景
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

  // localStorage 復元
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
    // 議事録テンプレ（オフラインと同一）
    const storedFormat = localStorage.getItem('selectedMeetingFormat');
    if (storedFormat) {
      setSelectedMeetingFormat(JSON.parse(storedFormat));
    } else {
      const defaultFormat = {
        id: 'general',
        title: 'General',
        template: `【Meeting Name】
【Date】
【Location】
【Attendees】
【Agenda(1)】⚫︎Discussion⚫︎Decision items⚫︎Pending problem
【Agenda(2)】⚫︎Discussion⚫︎Decision items⚫︎Pending problem
【Agenda(3)】⚫︎Discussion⚫︎Decision items⚫︎Pending problem・・・・（Repeat the agenda items (4), (5), (6), and (7), if any, below.）・・`,
        selected: true,
      };
      setSelectedMeetingFormat(defaultFormat);
      localStorage.setItem('selectedMeetingFormat', JSON.stringify(defaultFormat));
    }
  }, []);

  function push(s) {
    const line = `[${now()}] ${s}`;
    console.log(line);
    if (SHOW_DEBUG) setLogs((prev) => [...prev, line]);
  }
  function setOverlayStage(msg, progress) {
    setOverlay({ show: true, msg, progress: Math.max(0, Math.min(100, progress)) });
  }

  // --- Join（Bot起動 → DeepLinkで参加） ---
  async function onJoin() {
    if (!canJoin) return;
    const ok = window.confirm('“MinutesAI Bot”の参加リクエストをホストに送信します。');
    if (!ok) return;

    try {
      setPhase('starting');
      setAudioList([]);
      setOverlayStage('Starting up…', 5);
      push('JOIN: calling /api/zoom-bot/start');

      // ① Bot 起動
      const sid = await apiStart(meetingId, passcode, 21600);

      push(`JOIN OK: sid=${sid}`);
      setSessionId(sid);
      localStorage.setItem(LAST_SID_KEY, sid);
      localStorage.setItem(LAST_MEETING_ID_KEY, meetingId);
      localStorage.setItem(LAST_PASSCODE_KEY, passcode);
      setInputLocked(true);
      setPhase('joining');

      // ② Deep Link を同一タブで開く
      openZoomClientJoin(meetingId, passcode);

      setOverlayStage('Join request sent. Ask the host to approve…', 15);

      // ③ 起動確認ポーリング
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

  // --- Finish（停止 → ファイル安定待ち → DL → STT → Firestore保存） ---
  async function onFinish() {
    if (!sessionId) return;
    try {
      setPhase('polling');
      setOverlayStage('Finalizing recording on server…', 10);
      push('FINISH: calling /api/zoom-bot/stop');
      await apiStop(sessionId);

      const MAX_WAIT_MS = 180_000; // 3min
      const STABLE_DELAY_MS = 1_200;
      const begin = Date.now();
      let attempt = 0;

      while (Date.now() - begin < MAX_WAIT_MS) {
        try {
          const st = await apiStatus(sessionId);
          push(`POLL(stop): status=${st.status} phase=${st.phase || '-'} ready=${!!st.ready}`);

          const segCount = Number(st?.debug?.manifest?.segCount || 0);
          if (st.status === 'finished' && segCount >= 1) {
            const list = await apiFiles(sessionId);
            const seg = list.filter((x) => x.startsWith('segments/')).sort();
            const single = list.find((x) => x.toLowerCase().endsWith('.webm') && !x.includes('seg_'));
            const pick = seg[0] || single;

            if (pick) {
              const safe = encodeURIComponent(pick.split('/').pop());
              const url = pick.startsWith('segments/')
                ? `${API_BASE}/files/${encodeURIComponent(sessionId)}/segments/${safe}`
                : `${API_BASE}/files/${encodeURIComponent(sessionId)}/${safe}`;

              const s1 = await headLen(url);
              await sleep(STABLE_DELAY_MS);
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
      const segments = files.filter((f) => f.startsWith('segments/')).sort();
      const singleWebm = files.find((f) => f.endsWith('.webm') && !f.includes('seg_'));
      const fallbackWav = files.find((f) => f.endsWith('.wav'));

      let plan = [];
      if (segments.length) plan = segments;
      else if (singleWebm) plan = [singleWebm];
      else if (fallbackWav) plan = [fallbackWav];
      else if (files[0]) plan = [files[0]];
      if (!plan.length) throw new Error('no_audio_ready_yet');

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

        downloaded.push({
          name: `${sessionId}_${p.split('/').pop()}`,
          url: URL.createObjectURL(blob),
          blob,
        });

        const prog = 20 + ((i + 1) / plan.length) * 30;
        setOverlayStage('Downloading audio…', Math.min(50, prog));
        push(`DL OK: ${p}`);
      }
      setAudioList(downloaded);

      // === STT ===
      setOverlayStage('Transcribing audio…', 60);
      const lang = (navigator.language || 'ja').slice(0, 2);
      const fmt = selectedMeetingFormat?.template || '';
      const OUTPUT_TYPE = 'flexible';

      const filesToSend = downloaded.map(
        (d, i) => new File([d.blob], d.name || `segment_${i}.webm`, { type: d.blob?.type || 'audio/webm' })
      );

      const result = await transcribeFromBlobs(filesToSend, {
        meetingFormat: fmt,
        outputType: OUTPUT_TYPE,
        lang,
      });

      setOverlayStage('Generating minutes…', 80);
      const { transcription: tr, minutes: mm } = result || {};
      setTranscription(tr || '');
      setMinutes(mm || '');

      // === Firestore 保存（ログイン時のみ）※動的 import
      try {
        if (authInstance?.currentUser && dbInstance) {
          const { collection, addDoc } = await import('firebase/firestore');
          const docRef = await addDoc(collection(dbInstance, 'meetingRecords'), {
            paperID: uuidv4(),
            transcription: tr || 'No transcription available.',
            minutes: mm || 'No minutes available.',
            createdAt: new Date(),
            uid: authInstance.currentUser.uid,
          });
          setMeetingRecordId(docRef.id);
          push(`SAVE OK: ${docRef.id}`);
        } else {
          push('SKIP SAVE: not logged in');
        }
      } catch (e) {
        push(`SAVE ERR: ${e.message || e}`);
      }

      setOverlayStage('Done', 100);
      setTimeout(() => setOverlay({ show: false, msg: '', progress: 0 }), 700);
      localStorage.removeItem(LAST_SID_KEY);
      localStorage.removeItem(LAST_MEETING_ID_KEY);
      localStorage.removeItem(LAST_PASSCODE_KEY);
      setPhase('finished');

      // 画面起動（オフライン同様）
      setShowFullScreen(true);
      setIsExpanded(false);
    } catch (e) {
      push(`FINISH ERROR: ${e.message || e}`);
      setOverlayStage('An error occurred', 100);
      setPhase('error');
      setTimeout(() => setOverlay({ show: false, msg: '', progress: 0 }), 800);
    }
  }

  async function onReset() {
    if (!window.confirm('Reset the meeting link? All recording info will be lost.')) return;
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
      setShowFullScreen(false);
      setTranscription('');
      setMinutes('');
      setMeetingRecordId(null);
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
              onChange={(e) => setMeetingId(e.target.value)}
              placeholder="e.g. 9815129794"
              disabled={inputLocked}
            />
            <div style={{ height: 10 }} />
            <Label>Passcode</Label>
            <Underline
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
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
                  <button onClick={onReset} style={merge(styles.btnBase, styles.btnReset)}>
                    Reset
                  </button>
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

          {SHOW_DEBUG && (
            <section style={styles.card}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Debug Logs</h3>
              <pre style={styles.logs}>{logs.join('\n')}</pre>
            </section>
          )}
        </div>
      </main>

      {/* ★ ここでオフラインと同じ全画面ビューを起動 */}
      {showFullScreen && (
        <FullScreenOverlay
          setShowFullScreen={setShowFullScreen}
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
          transcription={transcription}
          minutes={minutes}
          audioURL={audioList[0]?.url || null}
          docId={meetingRecordId}
        />
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
  fullBleed: { position: 'fixed', inset: 0, background: '#ffffff', zIndex: 0 },
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
  wrap: { width: '100%', maxWidth: 620 },
  hero: {
    margin: '6px 0 10px',
    textAlign: 'center',
    fontSize: 44,
    fontWeight: 900,
    lineHeight: 1.05,
    letterSpacing: 0.2,
    background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 45%, #0b1a45 100%)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  },
  title: { margin: 0, textAlign: 'center', fontSize: 18, fontWeight: 700, color: '#111827' },
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
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,.55)',
    display: 'grid',
    placeItems: 'center',
    zIndex: 1000,
  },
  overlayBox: { padding: 22, borderRadius: 18, background: 'rgba(17,24,39,.85)', color: '#fff', textAlign: 'center', width: 260 },
  overlayText: { fontWeight: 700, letterSpacing: 0.2 },
  circleOuter: { position: 'relative', width: 150, height: 150 },
  circleInner: { position: 'absolute', inset: 0, borderRadius: '50%' },
  circleHole: { position: 'absolute', inset: 10, borderRadius: '50%', background: 'rgba(17,24,39,1)' },
  circleText: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 28, fontWeight: 800 },
};

function merge(...xs) {
  return Object.assign({}, ...xs.filter(Boolean));
}
