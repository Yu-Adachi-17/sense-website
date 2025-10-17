// pages/m/[id].js
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'https://sense-website-production.up.railway.app';

export default function MeetingJoinPage() {
  const router = useRouter();
  const { id } = router.query; // /m/:id

  const [meeting, setMeeting] = useState(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | connected | error
  const [needAudioStart, setNeedAudioStart] = useState(false);
  const [needVideoPlay, setNeedVideoPlay] = useState(false);
  const [deviceHint, setDeviceHint] = useState('');

  const roomRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteGridRef = useRef(null);
  const localTracksRef = useRef({ audio: null, video: null });

  // ===== 会議情報 =====
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

  // ===== リモートDOM掃除 =====
  const cleanupRemoteGrid = () => {
    const grid = remoteGridRef.current;
    if (!grid) return;
    for (const el of Array.from(grid.querySelectorAll('video,audio'))) {
      try { el.srcObject = null; } catch {}
      el.remove();
    }
  };

  // ===== ローカルプレビュー attach（play まで）=====
  const attachLocalPreviewFromTrack = async (videoTrack) => {
    if (!videoTrack) return;
    const v = localVideoRef.current;
    if (!v) return;

    videoTrack.attach(v);
    v.muted = true;
    v.playsInline = true;
    v.autoplay = true;

    const logDims = () => console.log('[local video] size', v.videoWidth, v.videoHeight);
    v.onloadedmetadata = logDims;
    v.onresize = logDims;

    try {
      await v.play();
      setNeedVideoPlay(false);
    } catch (e) {
      console.warn('[local video] play() blocked', e);
      setNeedVideoPlay(true);
    }
  };

  // ===== デバイス完全解放 =====
  const hardStopLocal = () => {
    for (const k of ['audio', 'video']) {
      try { localTracksRef.current[k]?.stop(); } catch {}
      localTracksRef.current[k] = null;
    }
    const room = roomRef.current;
    if (room) {
      try {
        room.localParticipant?.getTrackPublications?.().forEach((pub) => {
          try { pub.track?.stop(); } catch {}
        });
      } catch {}
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
      setNeedVideoPlay(false);
    }
  };

  // ===== 参加処理 =====
  const join = async () => {
    if (!meeting) return;

    setStatus('loading');
    setDeviceHint('');
    setNeedVideoPlay(false);

    try {
      // --- トークン ---
      const { token, wsUrl, error } = await fetch(`${API_BASE}/api/livekit/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: meeting.roomName,
          identity: crypto.randomUUID(),
          name: name || 'Guest',
        }),
      }).then((r) => r.json());
      if (error) throw new Error(error);

      // --- SDK ---
      const {
        Room, RoomEvent, VideoPresets, VideoQuality,
        createLocalTracks, MediaDeviceFailure,
      } = await import('livekit-client');

      // 念のため前回分を解放
      hardStopLocal();

      // --- ルーム生成（画質向上の既定値をセット）---
      const room = new Room({
        adaptiveStream: { pixelDensity: 'screen' },
        dynacast: true,
        videoCaptureDefaults: {
          facingMode: 'user',
          resolution: { width: 1280, height: 720 },
          frameRate: 30,
        },
        publishDefaults: {
          simulcast: true,
          // プライマリ（オリジナル）層＝720p相当
          videoEncoding: { maxBitrate: 2_500_000, maxFramerate: 30 },
          // 追加の低レイヤー2つ（720はプライマリに任せる）
          videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
          // H.264 バックアップ（iOS互換の安定化）
          backupCodec: { codec: 'h264' },
          // 解像度を優先（帯域低下時にfpsを犠牲にしやすくする）
          degradationPreference: 'maintain-resolution',
        },
      });
      roomRef.current = room;

      // --- 先にローカルトラック生成（単一プロンプト）---
      let localAudio = null;
      let localVideo = null;
      try {
        const tracks = await createLocalTracks({
          audio: true,
          video: { facingMode: 'user', resolution: { width: 1280, height: 720 }, frameRate: 30 },
        });
        for (const t of tracks) {
          if (t.kind === 'audio') localAudio = t;
          if (t.kind === 'video') localVideo = t;
        }
        console.log('[createLocalTracks]', { hasAudio: !!localAudio, hasVideo: !!localVideo });
      } catch (err) {
        const failure = (typeof MediaDeviceFailure?.getFailure === 'function')
          ? MediaDeviceFailure.getFailure(err) : null;
        console.warn('[createLocalTracks failed]', failure || err);
        setDeviceHint(String(failure || err?.message || err));
        // カメラがNGでも音声は再挑戦
        try {
          const onlyAudio = await createLocalTracks({ audio: true });
          localAudio = onlyAudio.find(t => t.kind === 'audio') || null;
        } catch (e2) {
          console.warn('[audio-only tracks failed]', e2);
        }
      }

      // ===== イベント =====
      room.on(RoomEvent.TrackSubscribed, async (track, pub, participant) => {
        const grid = remoteGridRef.current;
        if (!grid) return;

        if (track.kind === 'video') {
          const v = document.createElement('video');
          Object.assign(v, { autoplay: true, playsInline: true, muted: false });
          Object.assign(v.style, { width: '100%', height: '100%', objectFit: 'cover' });

          const card = document.createElement('div');
          Object.assign(card.style, {
            position: 'relative',
            aspectRatio: '16/9',
            background: '#000',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,.1)',
          });

          const label = document.createElement('div');
          label.textContent = participant?.name || participant?.identity || 'Guest';
          Object.assign(label.style, {
            position: 'absolute',
            left: '8px',
            bottom: '8px',
            padding: '2px 6px',
            fontSize: '12px',
            background: 'rgba(0,0,0,.5)',
            color: '#fff',
            borderRadius: '4px',
          });

          card.appendChild(v);
          card.appendChild(label);
          grid.appendChild(card);

          track.attach(v);

          // ★ 高画質の購読を強制（Adaptive より優先）
          try {
            pub.setVideoQuality(VideoQuality.HIGH);
            pub.setVideoDimensions({ width: 1280, height: 720 });
          } catch (e) {
            console.warn('set quality/dimensions failed', e);
          }

          try {
            await v.play();
            console.log('[remote video] play() ok for', participant?.identity);
          } catch (e) {
            console.warn('[remote video] play() blocked', e);
          }
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

      room.on(RoomEvent.MediaDevicesError, (err) => {
        console.warn('[RoomEvent.MediaDevicesError]', err);
        setDeviceHint(err?.error || err?.message || 'Media device error');
      });

      room.on(RoomEvent.Disconnected, () => {
        setStatus('idle');
        cleanupRemoteGrid();
      });

      room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        setNeedAudioStart(!room.canPlaybackAudio);
      });

      // --- 接続 ---
      await room.connect(wsUrl, token);

      // --- publish ---
      const lp = room.localParticipant;
      if (localAudio) {
        try {
          await lp.publishTrack(localAudio);
        } catch (e) {
          console.warn('[publish audio failed]', e);
        }
      }
      if (localVideo) {
        try {
          await lp.publishTrack(localVideo);
          await attachLocalPreviewFromTrack(localVideo);
        } catch (e) {
          console.warn('[publish video failed]', e);
        }
      }

      if (!room.canPlaybackAudio) setNeedAudioStart(true);

      localTracksRef.current.audio = localAudio;
      localTracksRef.current.video = localVideo;

      setStatus('connected');
    } catch (e) {
      console.error('join failed', e);
      setStatus('error');
    }
  };

  // ===== 自動再生解除 =====
  const startAudio = async () => {
    try {
      await roomRef.current?.startAudio();
      setNeedAudioStart(false);
    } catch (e) {
      console.warn('startAudio failed', e);
    }
  };
  const startVideo = async () => {
    try {
      await localVideoRef.current?.play();
      setNeedVideoPlay(false);
    } catch (e) {
      console.warn('startVideo failed', e);
    }
  };

  // タブ復帰時にも再生を試みる
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && needVideoPlay) startVideo();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [needVideoPlay]);

  // ページ離脱時は確実に解放
  useEffect(() => {
    const onBeforeUnload = () => {
      hardStopLocal();
      roomRef.current?.disconnect();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

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

      {/* 常時DOMに置いて attach タイミングのズレを解消 */}
      <video
        ref={localVideoRef}
        style={{ ...styles.localPip, visibility: status === 'connected' ? 'visible' : 'hidden' }}
        muted
        playsInline
        autoPlay
      />

      {status === 'connected' && (
        <div style={styles.stage}>
          <div ref={remoteGridRef} style={styles.remoteGrid} />
          {needAudioStart && (
            <button onClick={startAudio} style={styles.floatingBtn}>
              Enable audio
            </button>
          )}
          {needVideoPlay && (
            <button onClick={startVideo} style={{ ...styles.floatingBtn, left: 160 }}>
              Show preview
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
  joinBox: { display: 'flex', alignItems: 'center', gap: 8 },
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
    gap: 12,
  },
  localPip: {
    position: 'fixed',
    right: 16,
    bottom: 16,
    width: 200,
    height: 120,
    objectFit: 'cover',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,.15)',
    background: '#000',
    zIndex: 9999,
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
