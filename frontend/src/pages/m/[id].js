// frontend/src/pages/m/[id].js
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'https://sense-website-production.up.railway.app';

export default function MeetingJoinPage() {
  const router = useRouter();
  const { id } = router.query; // /m/:id

  const [meeting, setMeeting] = useState(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('idle');
  const [needAudioStart, setNeedAudioStart] = useState(false);
  const [deviceHint, setDeviceHint] = useState(''); // UI表示用

  const roomRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteGridRef = useRef(null);
  const localTracksRef = useRef({ audio: null, video: null }); // 事前生成したローカルトラック

  // ===== 会議情報の取得 =====
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/meetings/${id}`);
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setMeeting(json);
      } catch (e) {
        console.error('fetch meeting failed', e);
        setStatus('error');
      }
    })();
  }, [id]);

  // ===== リモート映像DOM掃除 =====
  const cleanupRemoteGrid = () => {
    const grid = remoteGridRef.current;
    if (!grid) return;
    for (const el of Array.from(grid.querySelectorAll('video,audio'))) {
      try { el.srcObject = null; } catch {}
      el.remove();
    }
  };

  // ===== ローカルプレビューを <video> にアタッチ =====
  const attachLocalPreviewFromTrack = (videoTrack) => {
    if (!videoTrack || !localVideoRef.current) return;
    videoTrack.attach(localVideoRef.current);
    Object.assign(localVideoRef.current, { muted: true, playsInline: true, autoplay: true });
  };

  // ===== 退出処理（デバイス解放を“確実に”） =====
  const hardStopLocal = () => {
    // 事前生成のトラック
    for (const k of ['audio', 'video']) {
      try { localTracksRef.current[k]?.stop(); } catch {}
      localTracksRef.current[k] = null;
    }
    // publish 済み
    const room = roomRef.current;
    if (room) {
      room.localParticipant?.getTracks?.().forEach((pub) => {
        try { pub.track?.stop(); } catch {}
      });
    }
  };

  const leave = async () => {
    try {
      await roomRef.current?.disconnect();
    } finally {
      cleanupRemoteGrid();
      hardStopLocal();
      roomRef.current = null;
      setStatus('idle');
      setDeviceHint('');
    }
  };

  // ===== 参加処理 =====
  const join = async () => {
    if (!meeting) return;

    setStatus('loading');
    setDeviceHint('');

    try {
      // --- サーバでトークン発行 ---
      const tokRes = await fetch(`${API_BASE}/api/livekit/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: meeting.roomName,
          identity: crypto.randomUUID(),
          name: name || 'Guest',
        }),
      }).then((r) => r.json());
      if (tokRes.error) throw new Error(tokRes.error);
      const { token, wsUrl } = tokRes;

      // --- LiveKit SDK 読込（createLocalTracks 等を使う） ---
      const {
        Room, RoomEvent,
        createLocalTracks,
        MediaDeviceFailure,
      } = await import('livekit-client');

      // 既存ストリームを念のため完全解放
      hardStopLocal();

      // --- 先にローカルトラックを生成（単一権限プロンプト & 失敗を分類） ---
      let localAudio = null;
      let localVideo = null;

      try {
        const tracks = await createLocalTracks({
          audio: true,
          video: { facingMode: 'user' }, // 基本はフロント
        }); // 単一プロンプトで取得。失敗は catch へ
        for (const t of tracks) {
          if (t.kind === 'audio') localAudio = t;
          if (t.kind === 'video') localVideo = t;
        }
      } catch (err) {
        // 失敗種別を人間可読に
        const failure = MediaDeviceFailure.getFailure?.(err);
        console.warn('[createLocalTracks failed]', failure || err);
        setDeviceHint(String(failure || err?.message || err));
        // カメラがダメでもオーディオだけは再挑戦
        try {
          localAudio = null;
          const a = await createLocalTracks({ audio: true });
          localAudio = a.find((t) => t.kind === 'audio') || null;
        } catch (e2) {
          console.warn('[audio-only tracks failed]', e2);
        }
      }

      // --- ルーム接続 ---
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      // ===== イベント登録 =====
      room.on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
        const grid = remoteGridRef.current;
        if (!grid) return;

        if (track.kind === 'video') {
          const v = document.createElement('video');
          Object.assign(v, { autoplay: true, playsInline: true });
          Object.assign(v.style, {
            width: '100%', height: '100%', objectFit: 'cover',
          });

          const card = document.createElement('div');
          Object.assign(card.style, {
            position: 'relative', aspectRatio: '16/9', background: '#000',
            borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,.1)',
          });

          const label = document.createElement('div');
          label.textContent = participant?.name || participant?.identity || 'Guest';
          Object.assign(label.style, {
            position: 'absolute', left: '8px', bottom: '8px',
            padding: '2px 6px', fontSize: '12px',
            background: 'rgba(0,0,0,.5)', color: '#fff', borderRadius: '4px',
          });

          card.appendChild(v);
          card.appendChild(label);
          grid.appendChild(card);
          track.attach(v);
        } else if (track.kind === 'audio') {
          const a = document.createElement('audio');
          a.autoplay = true;
          grid.appendChild(a);
          track.attach(a);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        const els = track.detach();
        els.forEach((el) => {
          try { el.srcObject = null; } catch {}
          const wrapper = el.parentElement?.parentElement?.contains(el) ? el.parentElement : el;
          wrapper?.remove();
        });
      });

      // デバイス起動エラー（NotReadable / DeviceInUse など）はここでも拾える
      room.on(RoomEvent.MediaDevicesError, (err) => {
        const failure = (typeof err === 'object' && err) ? err : null;
        console.warn('[RoomEvent.MediaDevicesError]', failure);
        setDeviceHint(
          failure?.error || failure?.message || 'Media device error'
        );
      });

      room.on(RoomEvent.Disconnected, () => {
        setStatus('idle');
        cleanupRemoteGrid();
      });

      room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        setNeedAudioStart(!room.canPlaybackAudio);
      });

      // --- 接続 → トラック publish（失敗はフォールバック） ---
      await room.connect(wsUrl, token);

      // 先に用意済みトラックを publish
      if (localAudio) {
        try { await room.localParticipant.publishTrack(localAudio); } catch (e) { console.warn('publish audio failed', e); }
      }
      if (localVideo) {
        try {
          await room.localParticipant.publishTrack(localVideo);
          attachLocalPreviewFromTrack(localVideo);
        } catch (e) {
          console.warn('publish video failed', e);
          // 代替デバイス自動再試行
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cams = devices.filter(d => d.kind === 'videoinput');
            const alt = cams.find(d => d.deviceId && d.deviceId !== localVideo.getDeviceId?.());
            if (alt) {
              const { createLocalTracks } = await import('livekit-client');
              const [altVideo] = await createLocalTracks({
                video: { deviceId: alt.deviceId },
              });
              await room.localParticipant.publishTrack(altVideo);
              localTracksRef.current.video = altVideo;
              attachLocalPreviewFromTrack(altVideo);
              setDeviceHint(`switched to: ${alt.label || 'another camera'}`);
            }
          } catch (e2) {
            console.warn('alt camera retry failed', e2);
          }
        }
      }

      // ブラウザの自動再生制限に対処（ボタンで解除）
      if (!room.canPlaybackAudio) setNeedAudioStart(true);

      // 参照保持
      localTracksRef.current.audio = localAudio;
      localTracksRef.current.video = localVideo;

      setStatus('connected');
    } catch (e) {
      console.error('join failed', e);
      setStatus('error');
    }
  };

  // ===== 自動再生許可ボタン =====
  const startAudio = async () => {
    try {
      await roomRef.current?.startAudio();
      setNeedAudioStart(false);
    } catch (e) {
      console.warn('startAudio failed', e);
    }
  };

  // ===== UI =====
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>Join meeting</h2>
        {status === 'connected' && (
          <button onClick={leave} style={styles.secondaryBtn}>Leave</button>
        )}
      </div>

      {!meeting && <p>Loading meeting…</p>}

      {meeting && status !== 'connected' && (
        <div style={styles.joinBox}>
          <p style={{ marginTop: 0 }}>
            <b>Room:</b> {meeting.roomName}
          </p>
          <input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
          />
          <button onClick={join} disabled={status === 'loading'} style={styles.primaryBtn}>
            {status === 'loading' ? 'Joining…' : 'Join'}
          </button>
        </div>
      )}

      {deviceHint && status !== 'connected' && (
        <p style={{ color: '#aaa', marginTop: 8, whiteSpace: 'pre-wrap' }}>{deviceHint}</p>
      )}

      {status === 'connected' && (
        <div style={styles.stage}>
          <div ref={remoteGridRef} style={styles.remoteGrid} />
          <video ref={localVideoRef} style={styles.localPip} muted playsInline autoPlay />
          {needAudioStart && (
            <button onClick={startAudio} style={styles.floatingBtn}>
              Enable audio
            </button>
          )}
        </div>
      )}

      {status === 'error' && (
        <p style={{ color: 'crimson' }}>Failed to join. Open DevTools console for details.</p>
      )}
    </div>
  );
}

// ===== スタイル =====
const styles = {
  page: {
    padding: 16,
    color: '#fff',
    background: '#0b0b0b',
    minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  joinBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #333',
    background: '#111',
    color: '#fff',
  },
  primaryBtn: {
    padding: '8px 12px',
    borderRadius: 8,
    background: '#4C8DFF',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
  },
  secondaryBtn: {
    marginLeft: 'auto',
    padding: '6px 10px',
    borderRadius: 8,
    background: '#222',
    color: '#fff',
    border: '1px solid #444',
    cursor: 'pointer',
  },
  stage: {
    position: 'relative',
    marginTop: 12,
    border: '1px solid #222',
    borderRadius: 12,
    padding: 12,
    minHeight: '60vh',
    background: '#000',
  },
  remoteGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 12,
  },
  localPip: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 200,
    height: 120,
    objectFit: 'cover',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,.15)',
    background: '#000',
  },
  floatingBtn: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    padding: '10px 14px',
    borderRadius: 10,
    background: '#4C8DFF',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
  },
};
