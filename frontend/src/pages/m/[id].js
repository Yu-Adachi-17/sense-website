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

  const roomRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteGridRef = useRef(null);

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

  // ===== ローカル映像の <video> にアタッチ =====
  const attachLocalPreview = () => {
    const room = roomRef.current;
    if (!room || !localVideoRef.current) return;
    room.localParticipant.videoTrackPublications.forEach((pub) => {
      const t = pub.track;
      if (t) {
        t.attach(localVideoRef.current);
        localVideoRef.current.muted = true;
        localVideoRef.current.playsInline = true;
        localVideoRef.current.autoplay = true;
      }
    });
  };

  // ===== リモート映像のDOM掃除 =====
  const cleanupRemoteGrid = () => {
    const grid = remoteGridRef.current;
    if (!grid) return;
    for (const el of Array.from(grid.querySelectorAll('video,audio'))) {
      try {
        el.srcObject = null;
      } catch {}
      el.remove();
    }
  };

  // ===== 参加処理 =====
  const join = async () => {
    if (!meeting) return;
    try {
      setStatus('loading');

      // トークン発行
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

      // SDK読込
      const { Room, RoomEvent } = await import('livekit-client');
      const room = new Room();
      roomRef.current = room;

      // ===== イベント登録 =====
      room.on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
        const grid = remoteGridRef.current;
        if (!grid) return;

        if (track.kind === 'video') {
          const v = document.createElement('video');
          v.autoplay = true;
          v.playsInline = true;
          v.style.width = '100%';
          v.style.height = '100%';
          v.style.objectFit = 'cover';

          const card = document.createElement('div');
          card.style.position = 'relative';
          card.style.aspectRatio = '16/9';
          card.style.background = '#000';
          card.style.borderRadius = '8px';
          card.style.overflow = 'hidden';
          card.style.border = '1px solid rgba(255,255,255,.1)';

          const label = document.createElement('div');
          label.textContent = participant?.name || participant?.identity || 'Guest';
          label.style.position = 'absolute';
          label.style.left = '8px';
          label.style.bottom = '8px';
          label.style.padding = '2px 6px';
          label.style.fontSize = '12px';
          label.style.background = 'rgba(0,0,0,.5)';
          label.style.color = '#fff';
          label.style.borderRadius = '4px';

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
          try {
            el.srcObject = null;
          } catch {}
          const wrapper = el.parentElement?.parentElement?.contains(el)
            ? el.parentElement
            : el;
          wrapper?.remove();
        });
      });

      room.on(RoomEvent.Disconnected, () => {
        setStatus('idle');
        cleanupRemoteGrid();
      });

      room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        setNeedAudioStart(!room.canPlaybackAudio);
      });

      // ===== 接続と安全なカメラ・マイク起動 =====
      try {
        await room.connect(wsUrl, token);
        try {
          await room.localParticipant.setCameraEnabled(true);
        } catch (err) {
          console.warn('Camera start failed:', err);
          // カメラ起動に失敗しても音声のみで継続
        }
        await room.localParticipant.setMicrophoneEnabled(true);
        attachLocalPreview();
        setStatus('connected');
      } catch (e) {
        console.error('join failed', e);
        setStatus('error');
      }
    } catch (e) {
      console.error('join failed', e);
      setStatus('error');
    }
  };

  // ===== 退出処理 =====
  const leave = async () => {
    try {
      await roomRef.current?.disconnect();
    } finally {
      cleanupRemoteGrid();
      roomRef.current = null;
      setStatus('idle');
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
          <button onClick={leave} style={styles.secondaryBtn}>
            Leave
          </button>
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
