'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

/** ================================
 *  固定値（動作検証用にハードコード）
 *  ================================ */
const API_BASE = '/api/zoom-bot';           // 同一オリジンのゲートウェイ
const MEETING_ID = '7635676767';            // 検証用 Meeting ID
const PASSCODE   = 'XUVPh1';                // 検証用 Passcode
const BOT_NAME   = 'MinutesAI Bot';
const RUN_SECS   = 21600;                   // 6h 録音

/** ================================
 *  ユーティリティ
 *  ================================ */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const backoffMs = (n) => Math.max(200, Math.min(5000, 300 * Math.pow(2, n)));
const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

function logPush(setter, msg) {
  const line = `[${now()}] ${msg}`;
  console.log(line);
  setter((prev) => [...prev, line].slice(-400));
}

/** DeepLink URL 構築 */
function buildZoomDeepLink(meetingId, passcode) {
  const id  = String(meetingId || '').replace(/\D/g, '');
  const pwd = encodeURIComponent(passcode || '');
  const ua  = navigator.userAgent || '';

  const isiOS     = /iP(hone|ad|od)/.test(ua);
  const isAndroid = /Android/i.test(ua);

  // iOS/Android → zoomus://, Desktop → zoommtg://
  const scheme  = (isiOS || isAndroid) ? 'zoomus' : 'zoommtg';
  const base    = `${scheme}://zoom.us/join`;
  // Desktop は action=join を付けると安定（実運用での定番パラメータ）
  const action  = (scheme === 'zoommtg') ? 'action=join&' : '';
  const deepUrl = `${base}?${action}confno=${id}${pwd ? `&pwd=${pwd}` : ''}`;

  // Web フォールバック（パスコードはUIで入力想定）
  const webUrl  = `https://app.zoom.us/wc/join/${id}?prefer=1&lang=en-US`;

  return { scheme, deepUrl, webUrl };
}

/** DeepLink 実行（ユーザー操作直後に即遷移）＋起動検知できなければ Web にフォールバック */
function openZoomDesktop({ deepUrl, webUrl, timeoutMs = 1800, logs }) {
  const { setLogs } = logs;

  // 1) フォールバック予約（アプリが起動してブラウザがフォアグラウンドのままなら実行）
  let canceled = false;
  const cancel = () => (canceled = true);

  const onBlur = () => {
    // アプリ切替などでウィンドウが非アクティブになったら成功とみなしフォールバック抑止
    cancel();
    window.removeEventListener('blur', onBlur);
    document.removeEventListener('visibilitychange', onVisibility);
  };
  const onVisibility = () => {
    if (document.hidden) {
      cancel();
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    }
  };
  window.addEventListener('blur', onBlur, { once: true });
  document.addEventListener('visibilitychange', onVisibility, { once: true });

  setTimeout(() => {
    if (!canceled) {
      try {
        logPush(setLogs, `DeepLink fallback → ${webUrl}`);
        window.location.href = webUrl;
      } catch {
        window.open(webUrl, '_self');
      }
    }
  }, timeoutMs);

  // 2) DeepLink を**同一タブのトップレベル**で実行
  try {
    logPush(setLogs, `DeepLink to Zoom: ${deepUrl}`);
    window.location.href = deepUrl;
  } catch {
    // location.href が例外なら最終手段
    const a = document.createElement('a');
    a.href = deepUrl;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

/** API ラッパ */
async function apiStart(meetingNumber, meetingPasscode, runSecs = RUN_SECS) {
  const r = await fetch(`${API_BASE}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meetingNumber, meetingPasscode, botName: BOT_NAME, runSecs }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`start ${r.status}: ${t}`);
  const j = JSON.parse(t);
  if (!j.sessionId) throw new Error('start: sessionId missing');
  return j.sessionId;
}
async function apiStop(sid) {
  const r = await fetch(`${API_BASE}/stop/${encodeURIComponent(sid)}`, { method: 'POST' });
  const t = await r.text();
  if (!r.ok) throw new Error(`stop ${r.status}: ${t}`);
}
async function apiStatus(sid) {
  const r = await fetch(`${API_BASE}/status/${encodeURIComponent(sid)}`);
  const t = await r.text();
  if (!r.ok) throw new Error(`status ${r.status}: ${t}`);
  return JSON.parse(t);
}
async function apiFiles(sid) {
  const r = await fetch(`${API_BASE}/files/${encodeURIComponent(sid)}`);
  const t = await r.text();
  if (!r.ok) throw new Error(`files ${r.status}: ${t}`);
  const j = JSON.parse(t);
  return Array.isArray(j.files) ? j.files : [];
}
async function headLen(url) {
  const r = await fetch(url, { method: 'HEAD' });
  if (!r.ok) return -1;
  const len = r.headers.get('content-length');
  return len ? parseInt(len, 10) : -1;
}

/** ================================
 *  ページ本体
 *  ================================ */
export default function TestApp() {
  const [phase, setPhase] = useState('idle'); // idle | starting | joining | polling | finished | error
  const [sessionId, setSessionId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [audioList, setAudioList] = useState([]);
  const [overlay, setOverlay] = useState({ show: false, msg: '', progress: 0 });
  const [inputLocked, setInputLocked] = useState(false);

  const canJoin = useMemo(
    () => !inputLocked && phase !== 'starting' && phase !== 'joining',
    [inputLocked, phase]
  );
  const canFinish = useMemo(() => !!sessionId && phase !== 'polling', [sessionId, phase]);

  // 初期表示：何もせず（固定値のため）
  useEffect(() => {
    logPush(setLogs, 'TestApp ready (hardcoded MeetingID/Passcode).');
  }, []);

  /** Join: DeepLink を**即**叩き、同時に Bot を起動（非待機）→ 状態はポーリング */
  async function onJoin() {
    if (!canJoin) return;
    const ok = window.confirm('"MinutesAI Bot" の参加リクエストをホストに送信し、Zoomアプリを起動します。');
    if (!ok) return;

    try {
      setPhase('starting');
      setAudioList([]);
      setOverlay({ show: true, msg: 'Opening Zoom…', progress: 8 });

      // 1) DeepLink を即発火（ユーザー操作の同期処理のうちに）
      const { deepUrl, webUrl } = buildZoomDeepLink(MEETING_ID, PASSCODE);
      openZoomDesktop({ deepUrl, webUrl, timeoutMs: 1800, logs: { setLogs } });

      // 2) Bot 起動は待たずに開始（起動失敗しても DeepLink 自体は成功させる）
      //    → fetch を await せず並列化（ただし結果を受け取って UI 更新は行う）
      setOverlay((o) => ({ ...o, msg: 'Starting bot…', progress: 15 }));

      const sidPromise = apiStart(MEETING_ID, PASSCODE, RUN_SECS)
        .then((sid) => {
          setSessionId(sid);
          setInputLocked(true);
          setPhase('joining');
          logPush(setLogs, `JOIN OK: sid=${sid}`);
          return sid;
        })
        .catch((e) => {
          setPhase('error');
          logPush(setLogs, `JOIN ERROR: ${e.message || e}`);
          setOverlay({ show: true, msg: `Failed to start bot: ${e.message || e}`, progress: 100 });
          throw e;
        });

      // 3) ポーリング（最大 3 分）
      const sid = await sidPromise;
      const begin = Date.now();
      let attempt = 0;
      while (Date.now() - begin < 180000) {
        try {
          const st = await apiStatus(sid);
          logPush(setLogs, `POLL(join): status=${st.status} phase=${st.phase || '-'} ready=${!!st.ready}`);
          if (st.status === 'running') {
            setOverlay({ show: true, msg: 'Bot joined. Waiting for host approval if needed…', progress: 25 });
            break;
          }
        } catch (e) {
          logPush(setLogs, `POLL(join) error: ${e.message || e}`);
        }
        attempt++;
        await sleep(backoffMs(attempt));
      }

      setOverlay({ show: false, msg: '', progress: 0 });
    } catch {
      // ここには通常来ない（個別 catch 済み）
    }
  }

  /** Finish: stop → ready 待機 → ファイルDL（代表セグメント or 単一webm or wav） */
  async function onFinish() {
    if (!sessionId) return;
    try {
      setPhase('polling');
      setOverlay({ show: true, msg: 'Finalizing recording on server…', progress: 10 });
      logPush(setLogs, 'FINISH: calling /stop');

      await apiStop(sessionId);

      // ready 待機（最大 3 分）＋代表セグメントのサイズ不変チェック
      const MAX_WAIT_MS = 180000;
      const STABLE_DELAY_MS = 1200;
      const begin = Date.now();
      let attempt = 0;

      while (Date.now() - begin < MAX_WAIT_MS) {
        try {
          const st = await apiStatus(sessionId);
          logPush(setLogs, `POLL(stop): status=${st.status} phase=${st.phase || '-'} ready=${!!st.ready}`);

          const segCount = Number(st?.debug?.manifest?.segCount || 0);
          if (st.status === 'finished' && segCount >= 1) {
            const list = await apiFiles(sessionId);
            const segs = list.filter((x) => x.startsWith('segments/')).sort();
            const single = list.find((x) => x.toLowerCase().endsWith('.webm') && !x.includes('seg_'));
            const pick = segs[0] || single;

            if (pick) {
              const safe = encodeURIComponent(pick.split('/').pop());
              const url = pick.startsWith('segments/')
                ? `${API_BASE}/files/${encodeURIComponent(sessionId)}/segments/${safe}`
                : `${API_BASE}/files/${encodeURIComponent(sessionId)}/${safe}`;

              const s1 = await headLen(url);
              await sleep(STABLE_DELAY_MS);
              const s2 = await headLen(url);
              logPush(setLogs, `HEAD check: ${pick} size1=${s1} size2=${s2}`);

              if (s1 > 0 && s1 === s2) break;
            }
          }
        } catch (e) {
          logPush(setLogs, `POLL(stop) error: ${e.message || e}`);
        }
        attempt++;
        await sleep(backoffMs(attempt));
      }

      setOverlay({ show: true, msg: 'Downloading audio…', progress: 35 });

      // ファイル一覧→ダウンロード計画
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

      // ダウンロード
      const downloaded = [];
      for (let i = 0; i < plan.length; i++) {
        const p = plan[i];
        const safe = encodeURIComponent(p.split('/').pop());
        const path = p.startsWith('segments/')
          ? `${API_BASE}/files/${encodeURIComponent(sessionId)}/segments/${safe}`
          : `${API_BASE}/files/${encodeURIComponent(sessionId)}/${safe}`;

        const r = await fetch(path);
        if (!r.ok) throw new Error(`download ${r.status}`);
        const blob = await r.blob();
        downloaded.push({
          name: `${sessionId}_${p.split('/').pop()}`,
          url: URL.createObjectURL(blob),
          blob,
        });

        const prog = 35 + ((i + 1) / plan.length) * 30;
        setOverlay({ show: true, msg: 'Downloading audio…', progress: Math.min(65, prog) });
        logPush(setLogs, `DL OK: ${p}`);
      }
      setAudioList(downloaded);

      setOverlay({ show: true, msg: 'Done', progress: 100 });
      setTimeout(() => setOverlay({ show: false, msg: '', progress: 0 }), 800);
      setPhase('finished');
    } catch (e) {
      logPush(setLogs, `FINISH ERROR: ${e.message || e}`);
      setOverlay({ show: true, msg: 'An error occurred', progress: 100 });
      setPhase('error');
      setTimeout(() => setOverlay({ show: false, msg: '', progress: 0 }), 1000);
    }
  }

  function onReset() {
    if (!window.confirm('Reset the session?')) return;
    setSessionId(null);
    setInputLocked(false);
    setPhase('idle');
    setAudioList([]);
    setOverlay({ show: false, msg: '', progress: 0 });
    setLogs([]);
    logPush(setLogs, 'RESET done');
  }

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <h1 style={styles.hero}>Test: Deep Link + Bot</h1>
        <div style={styles.card}>
          <Row label="Meeting ID" value={MEETING_ID} />
          <Row label="Passcode"  value={PASSCODE} />
          {sessionId && (
            <div style={styles.metaRow}>
              <span style={styles.meta}>sessionId:</span>
              <code style={styles.code}>{sessionId}</code>
            </div>
          )}
          <div style={{ height: 12 }} />
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
        </div>

        {audioList.length > 0 && (
          <div style={styles.card}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Recording</h3>
            <div style={{ height: 8 }} />
            {audioList.map((a, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4, wordBreak: 'break-all' }}>{a.name}</div>
                <audio controls src={a.url} style={{ width: '100%' }} />
              </div>
            ))}
          </div>
        )}

        <div style={styles.card}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Logs</h3>
          <pre style={styles.logs}>{logs.join('\n')}</pre>
        </div>
      </div>

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
    </div>
  );
}

/** ================================
 *  小物
 *  ================================ */
function Row({ label, value }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, opacity: 0.75 }}>{label}</div>
      <div style={{ fontSize: 16, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{value}</div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100svh',
    display: 'grid',
    placeItems: 'center',
    background: '#fff',
    fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif',
    padding: 20,
  },
  wrap: { width: '100%', maxWidth: 620 },
  hero: {
    margin: '6px 0 12px',
    textAlign: 'center',
    fontSize: 40,
    fontWeight: 900,
    lineHeight: 1.05,
    letterSpacing: 0.2,
    background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 45%, #0b1a45 100%)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
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

function merge(...xs) {
  return Object.assign({}, ...xs.filter(Boolean));
}
