'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

/** ==== 同一オリジンの Bot ゲートウェイ ==== */
const API_BASE = '/api/zoom-bot';

/** ==== ハードコード（必要なら書き換えOK） ==== */
const MEETING_ID = '7635676767';
const PASSCODE   = 'XUVPh1';
const BOT_NAME   = 'MinutesAI Bot';
const RUN_SECS   = 21600; // 6h

/** ==== 小道具 ==== */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const backoffMs = (n) => Math.max(200, Math.min(5000, 300 * Math.pow(2, n)));
const now = () => new Date().toISOString().replace('T',' ').slice(0,19);

/** ==== API ==== */
async function apiStart(meetingNumber, meetingPasscode, runSecs = RUN_SECS) {
  const r = await fetch(`${API_BASE}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meetingNumber, meetingPasscode, botName: BOT_NAME, runSecs }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`start ${r.status}: ${t}`);
  const j = JSON.parse(t);
  if (!j.sessionId) throw new Error('start: no sessionId');
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
  return j.files || [];
}

/** ==== 深リンク（ネイティブ Zoom を高確率で起動） ==== */
function openZoomDeep(meetingId, passcode) {
  const id  = String(meetingId || '').replace(/\D/g, '');
  const pwd = encodeURIComponent(passcode || '');
  const ua  = navigator.userAgent;

  // 判定
  const isiOS     = /iP(hone|ad|od)/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isMobile  = isiOS || isAndroid;

  // スキーム
  const scheme   = isMobile ? 'zoomus' : 'zoommtg';
  const base     = `${scheme}://zoom.us/join`;
  const action   = isMobile ? '' : 'action=join&';
  const deeplink = `${base}?${action}confno=${id}${pwd ? `&pwd=${pwd}` : ''}`;

  // 1) まず location.assign（同期ハンドラ内）
  try { window.location.assign(deeplink); } catch {}

  // 2) 旧 Safari/特殊環境向けに hidden iframe も撃つ
  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.width = 0; iframe.height = 0;
    iframe.src = deeplink;
    document.body.appendChild(iframe);
    // 2秒後に掃除
    setTimeout(() => { try { document.body.removeChild(iframe); } catch {} }, 2000);
  } catch {}

  // 3) a 要素 click（Chrome で成功率が上がるケース）
  try {
    const a = document.createElement('a');
    a.href = deeplink;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try { document.body.removeChild(a); } catch {} }, 1000);
  } catch {}

  return { deeplink, id };
}

/** ==== ブラウザ版テストアプリ ==== */
export default function TestApp() {
  const [meetingId, setMeetingId]   = useState(MEETING_ID);
  const [passcode,  setPasscode]    = useState(PASSCODE);
  const [sid,       setSid]         = useState(null);
  const [phase,     setPhase]       = useState('idle'); // idle|starting|joining|polling|finished|error
  const [logs,      setLogs]        = useState([]);
  const [statusObj, setStatusObj]   = useState(null);
  const [files,     setFiles]       = useState([]);
  const [overlay,   setOverlay]     = useState({ show:false, msg:'', progress:0 });

  const canJoin   = useMemo(() => !!meetingId && !!passcode && phase!=='starting' && phase!=='joining' && !sid, [meetingId, passcode, phase, sid]);
  const canFinish = useMemo(() => !!sid && phase!=='polling', [sid, phase]);
  const visTimer  = useRef(null);

  function push(s) {
    const line = `[${now()}] ${s}`;
    console.log(line);
    setLogs((prev) => [...prev, line].slice(-500));
  }
  function setOverlayStage(msg, p) {
    setOverlay({ show:true, msg, progress: Math.max(0, Math.min(100, p)) });
  }

  /** JOIN: /start → 即座にネイティブ Zoom を開く（Swift と同じ流れ） */
  async function onJoin() {
    if (!canJoin) return;
    const ok = window.confirm('“MinutesAI Bot”の参加リクエストをホストに送信し、Zoomアプリを開きます。');
    if (!ok) return;

    try {
      setPhase('starting');
      setOverlayStage('Starting bot…', 8);
      push('JOIN: calling /start');

      // ① サーバのボット起動
      const sessionId = await apiStart(meetingId, passcode, RUN_SECS);
      setSid(sessionId);
      push(`JOIN OK: sid=${sessionId}`);
      setPhase('joining');

      // ② クリック同一ハンドラ内で Zoom を開く（ブラウザのブロック回避）
      const t0 = Date.now();
      const { deeplink, id } = openZoomDeep(meetingId, passcode);
      push(`DEEPLINK: ${deeplink}`);

      // ③ 「アプリへ移動したら」document.hidden が true になる → フォールバック抑制
      //    1.6秒待って hidden 変化がなければ Web クライアントへ誘導
      clearTimeout(visTimer.current);
      visTimer.current = setTimeout(() => {
        if (!document.hidden) {
          const wc = `https://zoom.us/wc/join/${id}`;
          push('No app switch detected → Fallback to Web Client');
          try { window.location.href = wc; }
          catch { window.open(wc, '_blank'); }
        } else {
          push(`App switch detected in ${Date.now()-t0} ms`);
        }
      }, 1600);

      setOverlayStage('Ask the host to approve the bot…', 18);

      // ④ サーバ状態を軽くポーリング（2分）
      const begin = Date.now();
      let attempt = 0;
      while (Date.now() - begin < 120000) {
        try {
          const st = await apiStatus(sessionId);
          setStatusObj(st);
          push(`POLL(join): status=${st.status} phase=${st.phase||'-'} ready=${!!st.ready} last=${JSON.stringify(st.lastCodes||{})}`);
          if (st.status === 'running' || st.phase === 'fallback_running') {
            setOverlayStage('Bot running…', 25);
            break;
          }
        } catch (e) {
          push(`POLL(join) error: ${e.message||e}`);
        }
        attempt++;
        await sleep(backoffMs(attempt));
      }
      setOverlay({ show:false, msg:'', progress:0 });
    } catch (e) {
      setPhase('error');
      push(`JOIN ERROR: ${e.message||e}`);
      setOverlayStage('Failed to start', 100);
      setTimeout(() => setOverlay({ show:false, msg:'', progress:0 }), 1200);
    }
  }

  /** FINISH: /stop → ready → /files → ダウンロードURLを列挙（ダウンロード自体は任意） */
  async function onFinish() {
    if (!sid) return;
    try {
      setPhase('polling');
      setOverlayStage('Finalizing on server…', 12);
      push('FINISH: calling /stop');
      await apiStop(sid);

      const begin = Date.now();
      let attempt = 0;
      while (Date.now() - begin < 180000) {
        try {
          const st = await apiStatus(sid);
          setStatusObj(st);
          push(`POLL(stop): status=${st.status} phase=${st.phase||'-'} ready=${!!st.ready}`);
          if (st.status === 'finished' && st.phase === 'ready') break;
          // 代表セグメントの HEAD 安定化チェックは省略（必要なら追加可）
        } catch (e) {
          push(`POLL(stop) error: ${e.message||e}`);
        }
        attempt++;
        await sleep(backoffMs(attempt));
      }

      setOverlayStage('Listing files…', 20);
      const list = await apiFiles(sid);
      setFiles(list);
      push(`FILES: ${list.join(', ') || '(none)'}`);

      setOverlayStage('Done', 100);
      setTimeout(() => setOverlay({ show:false, msg:'', progress:0 }), 800);
      setPhase('finished');
    } catch (e) {
      setPhase('error');
      push(`FINISH ERROR: ${e.message||e}`);
      setOverlayStage('Error', 100);
      setTimeout(() => setOverlay({ show:false, msg:'', progress:0 }), 1000);
    }
  }

  async function onReset() {
    try {
      if (sid) await apiStop(sid).catch(() => {});
    } finally {
      setSid(null);
      setPhase('idle');
      setFiles([]);
      setStatusObj(null);
      setOverlay({ show:false, msg:'', progress:0 });
      push('RESET done');
    }
  }

  function openAgain() {
    openZoomDeep(meetingId, passcode);
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.h1}>Test: Bot + Open Zoom App</h1>
        <p style={S.note}>
          Click “Join” → server /start → <b>immediately open Zoom app</b> via deep link.<br/>
          If the browser doesn’t switch to the app, it will fallback to Web Client after ~1.6s.
        </p>

        <div style={S.row}>
          <label style={S.label}>Meeting ID</label>
          <input style={S.input} value={meetingId} onChange={(e)=>setMeetingId(e.target.value)} />
        </div>
        <div style={S.row}>
          <label style={S.label}>Passcode</label>
          <input style={S.input} value={passcode}  onChange={(e)=>setPasscode(e.target.value)} />
        </div>

        <div style={{height:8}}/>
        <div style={S.center}>
          <button onClick={onJoin}   disabled={!canJoin}   style={{...S.btn, ...(canJoin?S.btnJoin:S.btnDisabled)}}>
            {phase==='starting' ? 'Starting…' : sid ? 'Joined' : 'Join'}
          </button>
          <div style={{height:10}}/>
          <button onClick={onFinish} disabled={!canFinish} style={{...S.btn, ...(canFinish?S.btnRaised:S.btnDisabled)}}>
            {phase==='polling' ? 'Fetching…' : 'Finish'}
          </button>
          <div style={{height:10}}/>
          <button onClick={openAgain} style={{...S.btn, ...S.btnGhost}}>Open Zoom again</button>
          <div style={{height:10}}/>
          <button onClick={onReset} style={{...S.btn, ...S.btnDanger}}>Reset</button>
        </div>

        <div style={{height:14}}/>
        {sid && (
          <div style={S.kv}>
            <span>sessionId</span>
            <code style={S.code}>{sid}</code>
          </div>
        )}
        {statusObj && (
          <pre style={S.pre}>{JSON.stringify(statusObj, null, 2)}</pre>
        )}
        {files.length>0 && (
          <>
            <h3 style={{margin:'12px 0 6px'}}>Files</h3>
            <ul style={{margin:0, paddingLeft:18}}>
              {files.map((f,i)=>(
                <li key={i} style={{wordBreak:'break-all'}}>{f}</li>
              ))}
            </ul>
          </>
        )}
        <h3 style={{margin:'16px 0 6px'}}>Logs</h3>
        <pre style={S.pre}>{logs.join('\n')}</pre>
      </div>

      {overlay.show && (
        <div style={S.overlay}>
          <div style={S.overlayBox}>
            <div style={S.progressCircle}>
              <div style={{
                ...S.progressRing,
                background: `conic-gradient(#3b82f6 ${overlay.progress*3.6}deg, rgba(255,255,255,0.15) 0deg)`
              }}/>
              <div style={S.progressHole}/>
              <div style={S.progressText}>{Math.round(overlay.progress)}%</div>
            </div>
            <div style={{height:10}}/>
            <div style={{fontWeight:700}}>{overlay.msg}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/** ==== スタイル ==== */
const S = {
  page: { minHeight:'100vh', display:'grid', placeItems:'center', background:'#fff', fontFamily:'system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif', padding:16 },
  card: { width:'100%', maxWidth:760, border:'1px solid rgba(0,0,0,.08)', borderRadius:16, background:'#fff', padding:16 },
  h1: { margin:'6px 0 8px', fontSize:28, fontWeight:900 },
  note: { margin:'0 0 14px', opacity:.75, fontSize:13.5 },
  row: { display:'grid', gridTemplateColumns:'120px 1fr', alignItems:'center', gap:8, margin:'8px 0' },
  label: { fontSize:12, opacity:.8 },
  input: { width:'100%', fontSize:16, padding:'8px 10px', border:'1px solid rgba(0,0,0,.12)', borderRadius:10, background:'#fff' },
  center: { display:'flex', flexDirection:'column', alignItems:'center' },
  btn: { width:'70%', padding:'12px 16px', borderRadius:22, border:'1px solid rgba(0,0,0,0.08)', fontWeight:700, background:'#fff', cursor:'pointer' },
  btnJoin: { color:'#fff', background:'linear-gradient(135deg,#2563eb,#0ea5e9)', border:'none', boxShadow:'0 10px 20px rgba(37,99,235,.25)' },
  btnRaised:{ color:'#111827', background:'#f7f7f9', boxShadow:'0 10px 18px rgba(0,0,0,.12), inset 0 0 0 1px rgba(0,0,0,.03)' },
  btnGhost: { background:'#fff', color:'#111827' },
  btnDanger:{ color:'#fff', background:'linear-gradient(135deg,#ef4444,rgba(239,68,68,.85))', border:'none', boxShadow:'0 12px 20px rgba(239,68,68,.25)' },
  btnDisabled:{ opacity:.55, pointerEvents:'none' },
  kv: { display:'flex', alignItems:'center', gap:8, marginTop:8 },
  code: { fontSize:12, background:'rgba(0,0,0,.05)', padding:'2px 6px', borderRadius:6 },
  pre: { margin:0, background:'rgba(0,0,0,.04)', padding:10, borderRadius:8, fontSize:12, maxHeight:280, overflow:'auto' },
  overlay:{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'grid', placeItems:'center', zIndex:1000 },
  overlayBox:{ padding:22, borderRadius:18, background:'rgba(17,24,39,.85)', color:'#fff', textAlign:'center', width:260 },
  progressCircle:{ position:'relative', width:150, height:150 },
  progressRing:{ position:'absolute', inset:0, borderRadius:'50%' },
  progressHole:{ position:'absolute', inset:10, borderRadius:'50%', background:'rgba(17,24,39,1)' },
  progressText:{ position:'absolute', inset:0, display:'grid', placeItems:'center', fontSize:28, fontWeight:800 },
};
