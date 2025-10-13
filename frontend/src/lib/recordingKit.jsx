import React from 'react';

/* ================================
   1) Debug helpers
   ================================ */
// lib/recordingKit.ts (or wherever isDebug lives)
export function isDebug() {
  if (typeof window === 'undefined') return false;

  const host = window.location.hostname;
  // ← 本番では絶対OFF。必要なら許可ホストを追加（preview環境など）
  const isProdHost = /(^|\.)sense-ai\.world$/.test(host);
  const allowHost =
    !isProdHost && (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      /\.ngrok-free\.app$/.test(host) ||
      /-preview\.your-domain\.com$/.test(host)
    );

  const qs = new URLSearchParams(window.location.search);
  const q = qs.get('debug');

  // 一度でも ?debug=1 を踏んだら latching。ただし allowHost のみ & 有効期限をつける
  if (q === '1' && allowHost) {
    const until = Date.now() + 60 * 60 * 1000; // 1時間だけ有効
    try {
      localStorage.setItem('rec_debug', '1');
      localStorage.setItem('rec_debug_until', String(until));
    } catch {}
    // URLの ?debug=1 を取り除く（後続ナビで再度ONにならないように）
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('debug');
      window.history.replaceState({}, '', url.toString());
    } catch {}
  }

  // 本番ホストに来たら強制OFF（誤ってラッチ済みでも即解除）
  if (!allowHost) {
    try {
      localStorage.removeItem('rec_debug');
      localStorage.removeItem('rec_debug_until');
    } catch {}
    return false;
  }

  // 期限切れ処理
  try {
    const flag = localStorage.getItem('rec_debug') === '1';
    const untilStr = localStorage.getItem('rec_debug_until');
    const notExpired = untilStr ? Date.now() < Number(untilStr) : false;
    if (!notExpired) {
      localStorage.removeItem('rec_debug');
      localStorage.removeItem('rec_debug_until');
      return false;
    }
    return flag && notExpired;
  } catch {
    return false;
  }
}


export const dbg = (...args) => {
  if (isDebug() && typeof console !== 'undefined') console.log('[RECDBG]', ...args);
};

/* ================================
   2) Audio env / MIME / permissions
   ================================ */
export function pickAudioMimeType() {
  if (typeof window === 'undefined') return '';
  if (!window.MediaRecorder) return '';
  const list = [
    'audio/webm;codecs=opus', 'audio/webm',
    'audio/mp4;codecs=mp4a.40.2', 'audio/mp4',
    'audio/ogg;codecs=opus', 'audio/ogg'
  ];
  for (const t of list) {
    try { if (window.MediaRecorder.isTypeSupported(t)) return t; } catch {}
  }
  return '';
}

export async function logEnvAndPerms() {
  try {
    dbg('env', {
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a',
      secure: typeof isSecureContext !== 'undefined' ? isSecureContext : 'n/a',
      protocol: typeof location !== 'undefined' ? location.protocol : 'n/a',
      iframed: (typeof window !== 'undefined') ? (window.top !== window.self) : 'n/a'
    });
    if (navigator?.permissions?.query) {
      try {
        const p = await navigator.permissions.query({ name: 'microphone' });
        dbg('perm.microphone', p.state); // 'granted' | 'prompt' | 'denied'
      } catch (e) { dbg('perm.microphone query failed', e?.message); }
    }
    const devs = (await navigator.mediaDevices?.enumerateDevices?.()) || [];
    dbg('devices.audioinput',
      devs.filter(d => d.kind === 'audioinput')
          .map(d => ({ label: d.label, deviceId: (d.deviceId || '').slice(0,6)+'…' })));
  } catch (e) { dbg('logEnvAndPerms error', e); }
}

/* ================================
   3) Recorder / WebAudio debug hook
   ================================ */
export function attachRecorderDebug({ stream, mr, ac, analyser }) {
  try {
    const track = stream?.getAudioTracks?.()[0];
    if (track) {
      dbg('track.init', {
        readyState: track.readyState,
        muted: track.muted,
        enabled: track.enabled,
        settings: track.getSettings?.()
      });
      try { dbg('track.caps', track.getCapabilities?.()); } catch {}
      track.addEventListener('mute',   () => dbg('track MUTE'));
      track.addEventListener('unmute', () => dbg('track UNMUTE'));
      track.addEventListener('ended',  () => dbg('track ENDED'));
    }

    mr?.addEventListener?.('start',  () => dbg('mr START', mr.mimeType));
    mr?.addEventListener?.('pause',  () => dbg('mr PAUSE'));
    mr?.addEventListener?.('resume', () => dbg('mr RESUME'));
    mr?.addEventListener?.('stop',   () => dbg('mr STOP'));
    mr?.addEventListener?.('error',  e => dbg('mr ERROR', e?.error || e));

    // 1秒ごとにRMSログ
    let last = (typeof performance !== 'undefined') ? performance.now() : 0;
    const tick = () => {
      if (!analyser || !ac) return;
      const now = performance.now();
      if (now - last >= 1000) {
        const buf = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(buf);
        let sum=0; for (let i=0;i<buf.length;i++){ const x = buf[i]/128-1; sum+=x*x; }
        const rms = Math.sqrt(sum/buf.length);
        dbg('level.rms', Number(rms.toFixed(4)), 'ac.state=', ac?.state);
        last = now;
      }
      if (ac?.state === 'closed') return;
      if (typeof window !== 'undefined') requestAnimationFrame(tick);
    };
    if (typeof window !== 'undefined') requestAnimationFrame(tick);

    // コンソール用フック（__recdbg.download() でチャンク保存）
    if (typeof window !== 'undefined') {
      window.__recdbg = {
        stream, mr, ac,
        __chunks: [],
        download: () => {
          try {
            const type = mr?.mimeType || 'audio/webm';
            const blob = new Blob(window.__recdbg.__chunks, { type });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `debug.${type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'}`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 2000);
          } catch (e) { dbg('download failed', e); }
        }
      };
    }
  } catch (e) { dbg('attachRecorderDebug error', e); }
}

/* ================================
   4) UI banner
   ================================ */
export function RecordingIssueBanner({ issue, onClose }) {
  if (!issue) return null;
  return (
    <div style={{
      position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
      background: '#fff3cd', color: '#664d03', border: '1px solid #ffecb5',
      borderRadius: 10, padding: '10px 14px', zIndex: 9999,
      boxShadow: '0 6px 24px rgba(0,0,0,0.12)', maxWidth: 720
    }}>
      <strong style={{marginRight: 8}}>⚠️ Recording problem:</strong>
      <span>{issue.message}</span>
      {issue.hint && <span style={{opacity: .9}}> — {issue.hint}</span>}
      <button onClick={onClose}
        style={{ marginLeft: 10, border: 'none', background: 'transparent',
                 textDecoration: 'underline', cursor: 'pointer' }}>
        Dismiss
      </button>
    </div>
  );
}
