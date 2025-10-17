// pages/m/[id].js
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'https://sense-website-production.up.railway.app';

export default function MeetingJoinPage() {
  const router = useRouter();
  const { id } = router.query; // /m/:id

  // ===== State =====
  const [meeting, setMeeting] = useState(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | connected | error
  const [needAudioStart, setNeedAudioStart] = useState(false);
  const [needVideoPlay, setNeedVideoPlay] = useState(false);
  const [deviceHint, setDeviceHint] = useState('');

  // Zoom風UI
  const [viewMode, setViewMode] = useState('speaker'); // 'speaker' | 'gallery'
  const [pinnedId, setPinnedId] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  const roomRef = useRef(null);
  const localVideoRef = useRef(null);
  const stageRef = useRef(null);
  const remoteGridRef = useRef(null);
  const thumbStripRef = useRef(null); // スピーカービューの水平サムネ帯
  const localTracksRef = useRef({ audio: null, video: null });

  // 参加者カード管理（id -> DOM）
  const cardMapRef = useRef(new Map());

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
  const cleanupRemotes = () => {
    cardMapRef.current.forEach(({ wrapper }) => wrapper.remove());
    cardMapRef.current.clear();
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
      cleanupRemotes();
      hardStopLocal();
      roomRef.current = null;
      setStatus('idle');
      setDeviceHint('');
      setNeedVideoPlay(false);
      setPinnedId(null);
    }
  };

  // ===== Zoom風レイアウト更新 =====
  const relayout = () => {
    const grid = remoteGridRef.current;
    const strip = thumbStripRef.current;
    if (!grid || !strip) return;

    const entries = Array.from(cardMapRef.current.values());
    // ソート: ピン留め ＞ アクティブスピーカー ＞ それ以外（名前順）
    entries.sort((a, b) => {
      const pa = a.meta.pinned ? 1 : 0;
      const pb = b.meta.pinned ? 1 : 0;
      if (pa !== pb) return pb - pa;
      const sa = a.meta.isSpeaking ? 1 : 0;
      const sb = b.meta.isSpeaking ? 1 : 0;
      if (sa !== sb) return sb - sa;
      return (a.meta.name || '').localeCompare(b.meta.name || '');
    });

    // クリア
    grid.innerHTML = '';
    strip.innerHTML = '';

    if (viewMode === 'speaker') {
      // 一番上をメイン、残りを水平サムネイル帯へ
      const main = entries[0];
      if (main) {
        main.wrapper.classList.add('lk-main');
        grid.appendChild(main.wrapper);
      }
      for (let i = 1; i < entries.length; i++) {
        const e = entries[i];
        e.wrapper.classList.remove('lk-main');
        strip.appendChild(e.wrapper);
      }
    } else {
      // ギャラリー
      entries.forEach(e => {
        e.wrapper.classList.remove('lk-main');
        grid.appendChild(e.wrapper);
      });
    }
  };

  // ===== “キーフレーム促進バンプ” & ウォッチドッグ =====
  let VideoQuality; // livekit-client import後に代入
  const nudgePublication = (pub) => {
    if (!pub || !VideoQuality) return;
    try {
      // レイヤーを一度落としてすぐ戻す → キーフレームを誘発
      pub.setVideoQuality(VideoQuality.MEDIUM);
      setTimeout(() => { try { pub.setVideoQuality(VideoQuality.HIGH); } catch {} }, 300);
    } catch {}
  };

  const watchdogKick = () => {
    cardMapRef.current.forEach((entry) => {
      const v = entry.meta.videoEl;
      if (!v) return;
      const notReady = !v.videoWidth || !v.videoHeight;
      if (notReady && entry.meta.publication) {
        nudgePublication(entry.meta.publication);
        try { v.play(); } catch {}
      }
    });
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
      const mod = await import('livekit-client');
      const {
        Room, RoomEvent, VideoPresets,
        createLocalTracks, MediaDeviceFailure,
      } = mod;
      VideoQuality = mod.VideoQuality; // ここで代入

      // 前回分を解放
      hardStopLocal();

      // --- ルーム生成（Zoom画面の安定描画に向けた既定）---
      const room = new Room({
        adaptiveStream: { pixelDensity: 'screen' }, // ギャラリー時の負荷低減
        dynacast: true,
        autoSubscribe: true,
        videoCaptureDefaults: {
          facingMode: 'user',
          resolution: { width: 1280, height: 720 },
          frameRate: 30,
        },
        publishDefaults: {
          simulcast: true,
          videoEncoding: { maxBitrate: 2_500_000, maxFramerate: 30 }, // 720p相当
          videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
          backupCodec: { codec: 'h264' }, // iOS互換の安定化
          degradationPreference: 'maintain-resolution',
        },
      });
      roomRef.current = room;

      // --- ローカルトラック生成 ---
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
      } catch (err) {
        const failure = (typeof MediaDeviceFailure?.getFailure === 'function')
          ? MediaDeviceFailure.getFailure(err) : null;
        setDeviceHint(String(failure || err?.message || err));
        try {
          const onlyAudio = await createLocalTracks({ audio: true });
          localAudio = onlyAudio.find(t => t.kind === 'audio') || null;
        } catch {}
      }

      // ===== イベント =====
      const ensureCard = (participant) => {
        const id = participant.identity;
        if (cardMapRef.current.has(id)) return cardMapRef.current.get(id);

        // --- カードDOM生成（Zoom風）---
        const wrapper = document.createElement('div');
        wrapper.className = 'lk-card';
        wrapper.dataset.id = id;

        const videoWrap = document.createElement('div');
        videoWrap.className = 'lk-videoWrap';
        const v = document.createElement('video');
        Object.assign(v, { autoplay: true, playsInline: true, muted: false });
        videoWrap.appendChild(v);

        const badges = document.createElement('div');
        badges.className = 'lk-badges';

        const nameBadge = document.createElement('div');
        nameBadge.className = 'lk-name';
        nameBadge.textContent = participant?.name || participant?.identity || 'Guest';

        const micBadge = document.createElement('div');
        micBadge.className = 'lk-mic';
        badges.appendChild(micBadge);
        badges.appendChild(nameBadge);

        const pinBtn = document.createElement('button');
        pinBtn.className = 'lk-pin';
        pinBtn.title = 'Pin / Unpin';
        pinBtn.textContent = '📌';
        pinBtn.onclick = () => {
          setPinnedId(prev => (prev === id ? null : id));
        };

        wrapper.appendChild(videoWrap);
        wrapper.appendChild(badges);
        wrapper.appendChild(pinBtn);

        const meta = {
          id,
          name: participant?.name || participant?.identity || 'Guest',
          isSpeaking: false,
          pinned: false,
          videoEl: v,
          publication: null,
        };
        const entry = { wrapper, meta };
        cardMapRef.current.set(id, entry);
        return entry;
      };

      room.on(RoomEvent.TrackSubscribed, async (track, pub, participant) => {
        if (track.kind === 'video') {
          const entry = ensureCard(participant);
          entry.meta.publication = pub;
          // 高品質を要求（Adaptiveより優先）＋バンプ
          try { pub.setVideoDimensions({ width: 1280, height: 720 }); } catch {}
          nudgePublication(pub);

          track.attach(entry.meta.videoEl);
          relayout();
          try { await entry.meta.videoEl.play(); } catch {}

          // 念のため後追いウォッチドッグ
          setTimeout(watchdogKick, 250);
          setTimeout(watchdogKick, 1200);
        } else if (track.kind === 'audio') {
          const entry = ensureCard(participant);
          entry.wrapper.classList.toggle('is-muted', false);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track, pub, participant) => {
        const entry = cardMapRef.current.get(participant.identity);
        if (!entry) return;
        try { track.detach(); } catch {}
        relayout();
      });

      // 参加/離脱
      room.on(RoomEvent.ParticipantConnected, (p) => {
        ensureCard(p);
        relayout();
        // 新規参加時も軽くバンプ
        setTimeout(watchdogKick, 300);
        setTimeout(watchdogKick, 1200);
      });
      room.on(RoomEvent.ParticipantDisconnected, (p) => {
        const entry = cardMapRef.current.get(p.identity);
        if (entry) {
          entry.wrapper.remove();
          cardMapRef.current.delete(p.identity);
        }
        if (pinnedId === p.identity) setPinnedId(null);
        relayout();
      });

      // アクティブスピーカー（黄色枠）
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const activeIds = new Set(speakers.map(s => s.identity));
        cardMapRef.current.forEach((entry, id) => {
          entry.meta.isSpeaking = activeIds.has(id);
          entry.wrapper.classList.toggle('is-speaking', entry.meta.isSpeaking);
        });
        relayout();
      });

      room.on(RoomEvent.MediaDevicesError, (err) => {
        setDeviceHint(err?.error || err?.message || 'Media device error');
      });

      room.on(RoomEvent.Disconnected, () => {
        setStatus('idle');
        cleanupRemotes();
      });

      room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        setNeedAudioStart(!room.canPlaybackAudio);
      });

      // --- 接続 ---
      await room.connect(wsUrl, token);

      // --- publish ---
      const lp = room.localParticipant;

      if (localAudio) {
        try { await lp.publishTrack(localAudio); } catch (e) { console.warn('[audio publish]', e); }
      }
      if (localVideo) {
        try {
          await lp.publishTrack(localVideo);
          await attachLocalPreviewFromTrack(localVideo);
        } catch (e) { console.warn('[video publish]', e); }
      }
      setStatus('connected');

      // UI: ローカルのミュート/カメラ操作
      setIsMuted(lp.isMicrophoneEnabled ? false : true);
      setIsCamOff(lp.isCameraEnabled ? false : true);

      // ----- 既存 publication の取りこぼし対策（SDK差分に強い版） -----
      const attachExisting = () => {
        if (!room) return;

        // v1: room.participants / v2: room.remoteParticipants に両対応
        const remoteMap =
          (room.participants && room.participants instanceof Map && room.participants) ||
          (room.remoteParticipants && room.remoteParticipants instanceof Map && room.remoteParticipants) ||
          new Map();

        const everyone = [room.localParticipant, ...Array.from(remoteMap.values())];

        const pubsOf = (p) => {
          if (!p) return [];
          if (typeof p.getTrackPublications === 'function') return p.getTrackPublications();
          const m =
            (p.trackPublications && p.trackPublications instanceof Map && p.trackPublications) ||
            (p.tracks && p.tracks instanceof Map && p.tracks) ||
            null;
          return m ? Array.from(m.values()) : [];
        };

        for (const p of everyone) {
          if (!p) continue;
          for (const pub of pubsOf(p)) {
            const track = pub.track;
            if (!track) continue; // まだ subscribe 前
            const entry = ensureCard(p);
            if (track.kind === 'video') {
              track.attach(entry.meta.videoEl);
              entry.meta.publication = pub;
              nudgePublication(pub);
              try { entry.meta.videoEl.play(); } catch {}
            } else if (track.kind === 'audio') {
              // 必要なら <audio/> を生成して attach してもOK
            }
          }
        }
        relayout();
      };
      attachExisting();

      // 既存映像が0x0のことがあるので数回ウォッチドッグ
      setTimeout(watchdogKick, 200);
      setTimeout(watchdogKick, 1000);
      setTimeout(watchdogKick, 2500);
    } catch (e) {
      console.error('join failed', e);
      setStatus('error');
    }
  };

  // ===== ピン留めの反映 =====
  useEffect(() => {
    cardMapRef.current.forEach((entry, id) => {
      entry.meta.pinned = (pinnedId === id);
      entry.wrapper.classList.toggle('is-pinned', entry.meta.pinned);
    });
    relayout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinnedId, viewMode]);

  // ===== 自動再生解除 =====
  const startAudio = async () => {
    try {
      await roomRef.current?.startAudio();
      setNeedAudioStart(false);
    } catch (e) {}
  };
  const startVideo = async () => {
    try {
      await localVideoRef.current?.play();
      setNeedVideoPlay(false);
    } catch (e) {}
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

  // ===== ツールバー操作 =====
  const toggleMic = async () => {
    const lp = roomRef.current?.localParticipant;
    if (!lp) return;
    const next = !lp.isMicrophoneEnabled;
    await lp.setMicrophoneEnabled(next);
    setIsMuted(!next);
  };
  const toggleCam = async () => {
    const lp = roomRef.current?.localParticipant;
    if (!lp) return;
    const next = !lp.isCameraEnabled;
    await lp.setCameraEnabled(next);
    setIsCamOff(!next);
  };

  // ===== UI =====
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>Meeting</h2>
        {status === 'connected' && (
          <div style={styles.headerRight}>
            <div style={styles.viewSwitch}>
              <button
                onClick={() => setViewMode('speaker')}
                style={{ ...styles.viewBtn, ...(viewMode === 'speaker' ? styles.viewBtnActive : {}) }}
              >
                Speaker
              </button>
              <button
                onClick={() => setViewMode('gallery')}
                style={{ ...styles.viewBtn, ...(viewMode === 'gallery' ? styles.viewBtnActive : {}) }}
              >
                Gallery
              </button>
            </div>
            <button onClick={leave} style={styles.secondaryBtn}>Leave</button>
          </div>
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

      {/* ローカルPIP */}
      <video
        ref={localVideoRef}
        style={{ ...styles.localPip, visibility: status === 'connected' ? 'visible' : 'hidden' }}
        muted
        playsInline
        autoPlay
      />

      {status === 'connected' && (
        <div ref={stageRef} style={styles.stage}>
          {/* スピーカービュー時: メインエリア + 下部サムネストリップ */}
          <div
            ref={remoteGridRef}
            style={{
              ...(viewMode === 'speaker' ? styles.speakerMain : styles.galleryGrid),
            }}
          />
          {viewMode === 'speaker' && (
            <div ref={thumbStripRef} style={styles.thumbStrip} />
          )}

          {/* ブロッカー解除ボタン */}
          {needAudioStart && (
            <button onClick={startAudio} style={styles.floatingBtn}>Enable audio</button>
          )}
          {needVideoPlay && (
            <button onClick={startVideo} style={{ ...styles.floatingBtn, left: 160 }}>
              Show preview
            </button>
          )}

          {/* Zoom風ボトムツールバー */}
          <div style={styles.toolbar}>
            <button onClick={toggleMic} style={{ ...styles.toolBtn, ...(isMuted ? styles.toolOff : {}) }}>
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <button onClick={toggleCam} style={{ ...styles.toolBtn, ...(isCamOff ? styles.toolOff : {}) }}>
              {isCamOff ? 'Start Video' : 'Stop Video'}
            </button>
            <div style={{ flex: 1 }} />
            <button onClick={() => setViewMode(viewMode === 'speaker' ? 'gallery' : 'speaker')}
                    style={styles.toolBtn}>
              {viewMode === 'speaker' ? 'Gallery View' : 'Speaker View'}
            </button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <p style={{ color: 'crimson' }}>Failed to join. Open DevTools console for details.</p>
      )}

      {/* ===== 追加CSS（カード見た目） ===== */}
      <style jsx global>{`
        .lk-card { position: relative; aspect-ratio: 16/9; background:#000; border-radius:12px; overflow:hidden; border:1px solid #1b1b1b; }
        .lk-card.lk-main { border-color:#3b82f6; box-shadow:0 0 0 2px rgba(59,130,246,.35) inset; }
        .lk-videoWrap, .lk-videoWrap video { width:100%; height:100%; object-fit:cover; }
        .lk-badges { position:absolute; left:8px; bottom:8px; display:flex; gap:6px; align-items:center; }
        .lk-name { font-size:12px; background:rgba(0,0,0,.55); color:#fff; padding:3px 8px; border-radius:6px; }
        .lk-mic::before { content:''; width:8px; height:8px; border-radius:50%; display:inline-block; background:#22c55e; }
        .lk-card.is-muted .lk-mic::before { background:#ef4444; }
        .lk-pin { position:absolute; right:8px; top:8px; font-size:12px; background:rgba(0,0,0,.55); color:#fff; border:1px solid #444; padding:3px 6px; border-radius:6px; cursor:pointer; }
        .lk-card.is-speaking { outline: 2px solid #facc15; outline-offset:-2px; }
      `}</style>
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
  headerRight: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 },
  viewSwitch: { display: 'flex', border: '1px solid #333', borderRadius: 8, overflow: 'hidden' },
  viewBtn: {
    padding: '6px 10px', background: '#161616', color: '#ddd', border: 'none', cursor: 'pointer',
  },
  viewBtnActive: { background: '#2b2b2b', color: '#fff' },
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
    minHeight: '70vh',
    background: '#000',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  // ギャラリー
  galleryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 12,
    flex: 1,
  },
  // スピーカー
  speakerMain: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '1fr',
    gridAutoRows: 'minmax(200px, 1fr)',
  },
  thumbStrip: {
    height: 112,
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    padding: '6px',
    borderTop: '1px solid #111',
    background: 'linear-gradient(180deg,#0a0a0a,#080808)',
  },
  localPip: {
    position: 'fixed',
    right: 16,
    bottom: 86, // ツールバーの上に浮かす
    width: 220,
    height: 140,
    objectFit: 'cover',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,.15)',
    background: '#000',
    zIndex: 9999,
    boxShadow: '0 10px 30px rgba(0,0,0,.5)',
  },
  floatingBtn: {
    position: 'absolute',
    left: 16,
    bottom: 140,
    padding: '10px 14px',
    borderRadius: 10,
    background: '#4C8DFF',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
  },
  // Zoom風ボトムツールバー
  toolbar: {
    position: 'sticky',
    bottom: 0,
    display: 'flex',
    gap: 8,
    padding: '10px 12px',
    border: '1px solid #111',
    borderRadius: 12,
    background: 'rgba(12,12,12,0.9)',
    backdropFilter: 'blur(6px)',
    alignItems: 'center',
  },
  toolBtn: {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid #333',
    background: '#1a1a1a',
    color: '#eee',
    cursor: 'pointer',
  },
  toolOff: {
    background: '#3a1010',
    borderColor: '#6a2a2a',
    color: '#fff',
  },
};
