// pages/m/[id].js
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FaApple } from 'react-icons/fa';
import HomeIcon from '../homeIcon';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'https://sense-website-production.up.railway.app';

const LINK_IOS =
  'https://apps.apple.com/jp/app/%E8%AD%B0%E4%BA%8B%E9%8C%B2ai/id6504087901';

const LAST_JOIN_NAME_KEY = 'minutesai.joinName';

/* ===== Fixed Header（左= /home、右= iOS）===== */
function FixedHeaderPortal({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

export default function MeetingJoinPage() {
  const router = useRouter();
  const { id } = router.query;

  // ===== State =====
  const [meeting, setMeeting] = useState(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | connected | error
  const [needAudioStart, setNeedAudioStart] = useState(false);
  const [needVideoPlay, setNeedVideoPlay] = useState(false);
  const [deviceHint, setDeviceHint] = useState('');

  const [viewMode, setViewMode] = useState('speaker'); // 'speaker' | 'gallery'
  const [pinnedId, setPinnedId] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  const roomRef = useRef(null);
  const localVideoRef = useRef(null);   // 上中央PIP
  const stageRef = useRef(null);
  const remoteGridRef = useRef(null);
  const thumbStripRef = useRef(null);
  const localTracksRef = useRef({ audio: null, video: null });

  // 自分だけの時に中央表示する用
  const selfMainRef = useRef(null); // { wrapper, videoEl }
  const [selfCentered, setSelfCentered] = useState(false);

  // 参加者カード管理（id -> {wrapper, meta}）
  const cardMapRef = useRef(new Map());

  /* ===== 前回のユーザー名を復元 ===== */
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LAST_JOIN_NAME_KEY);
      if (cached) setName(cached);
    } catch {}
  }, []);

  /* ===== 会議情報 ===== */
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

  /* ===== リモートDOM掃除 ===== */
  const cleanupRemotes = () => {
    cardMapRef.current.forEach(({ wrapper }) => wrapper.remove());
    cardMapRef.current.clear();
  };

  /* ===== デバイス完全解放 ===== */
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

  /* ===== ローカルプレビュー attach（play まで）===== */
  const attachLocalPreviewFromTrack = async (videoTrack) => {
    if (!videoTrack) return;
    const v = localVideoRef.current;
    if (!v) return;
    try { videoTrack.attach(v); } catch {}
    v.muted = true;
    v.playsInline = true;
    v.autoplay = true;
    try {
      await v.play();
      setNeedVideoPlay(false);
    } catch {
      setNeedVideoPlay(true);
    }
  };

  const leave = async () => {
    try {
      await roomRef.current?.disconnect();
    } finally {
      if (selfMainRef.current) {
        try { localTracksRef.current.video?.detach(selfMainRef.current.videoEl); } catch {}
        try { selfMainRef.current.wrapper.remove(); } catch {}
        selfMainRef.current = null;
      }
      setSelfCentered(false);
      cleanupRemotes();
      hardStopLocal();
      roomRef.current = null;
      setStatus('idle');
      setDeviceHint('');
      setNeedVideoPlay(false);
      setPinnedId(null);
    }
  };

  /* ====== ここがポイント：映像の実寸に合わせてカード比率・クラスを更新 ====== */
  const applyAspectFromVideo = (entry) => {
    const v = entry?.meta?.videoEl;
    if (!v) return;
    const w = v.videoWidth || 0;
    const h = v.videoHeight || 0;
    if (!w || !h) return;
    // カード自身の aspect-ratio を実映像に合わせる（デフォ 16/9 → 上書き）
    entry.wrapper.style.setProperty('--ar', `${w}/${h}`);
    entry.wrapper.style.aspectRatio = `${w}/${h}`;
    // 縦横でクラスを分けてわかりやすく
    const portrait = h > w;
    entry.wrapper.classList.toggle('is-portrait', portrait);
    entry.wrapper.classList.toggle('is-landscape', !portrait);
  };

  /* ===== Zoom風レイアウト更新 ===== */
  const relayout = () => {
    const grid = remoteGridRef.current;
    const strip = thumbStripRef.current;
    if (!grid) return;

    const entries = Array.from(cardMapRef.current.values());
    // 並び順（ピン→発話→名前）
    entries.sort((a, b) => {
      const pa = a.meta.pinned ? 1 : 0;
      const pb = b.meta.pinned ? 1 : 0;
      if (pa !== pb) return pb - pa;
      const sa = a.meta.isSpeaking ? 1 : 0;
      const sb = b.meta.isSpeaking ? 1 : 0;
      if (sa !== sb) return sb - sa;
      return (a.meta.name || '').localeCompare(b.meta.name || '');
    });

    const localId = roomRef.current?.localParticipant?.identity;
    const remoteEntries = entries.filter(e => e.meta.id !== localId);

    grid.innerHTML = '';
    if (strip) strip.innerHTML = '';

    if (remoteEntries.length > 0) {
      setSelfCentered(false);

      if (selfMainRef.current) {
        try { localTracksRef.current.video?.detach(selfMainRef.current.videoEl); } catch {}
        try { selfMainRef.current.wrapper.remove(); } catch {}
        selfMainRef.current = null;
      }

      if (viewMode === 'speaker') {
        const main = remoteEntries[0];
        if (main) {
          main.wrapper.classList.add('lk-main');
          grid.appendChild(main.wrapper);
        }
        if (strip) {
          const rest = entries.filter(e => e !== main && e.meta.id !== localId);
          for (const e of rest) {
            e.wrapper.classList.remove('lk-main');
            strip.appendChild(e.wrapper);
          }
        }
      } else {
        entries.forEach(e => {
          e.wrapper.classList.remove('lk-main');
          grid.appendChild(e.wrapper);
        });
      }
    } else {
      // 自分だけの時は中央に大きく（自分映像は cover のまま）
      const vtrack = localTracksRef.current?.video || null;
      if (!selfMainRef.current) {
        const wrapper = document.createElement('div');
        wrapper.className = 'lk-card lk-main';
        const videoWrap = document.createElement('div');
        videoWrap.className = 'lk-videoWrap';
        const v = document.createElement('video');
        Object.assign(v, { autoplay: true, playsInline: true, muted: true, style: 'object-fit:contain' });
        videoWrap.appendChild(v);
        wrapper.appendChild(videoWrap);
        selfMainRef.current = { wrapper, videoEl: v };
        try { vtrack?.attach(v); } catch {}
        try { v.play().catch(() => {}); } catch {}
      }
      grid.appendChild(selfMainRef.current.wrapper);
      setSelfCentered(true);
    }
  };

  /* ===== 1～2 フレーム後の実行ユーティリティ ===== */
  const afterDomPaint = (n = 2) =>
    new Promise((resolve) => {
      const step = () => (n-- <= 0 ? resolve() : requestAnimationFrame(step));
      requestAnimationFrame(step);
    });

  /* ===== 参加処理（LiveKit）===== */
  const join = async () => {
    if (!meeting) return;

    try {
      if (name && name.trim()) localStorage.setItem(LAST_JOIN_NAME_KEY, name.trim());
    } catch {}

    setStatus('loading');
    setDeviceHint('');
    setNeedVideoPlay(false);

    try {
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

      const {
        Room, VideoPresets, createLocalTracks, MediaDeviceFailure,
      } = await import('livekit-client');

      hardStopLocal();

      const room = new Room({
        adaptiveStream: { pixelDensity: 'screen' },
        dynacast: true,
        autoSubscribe: true,
        videoCaptureDefaults: {
          facingMode: 'user',
          resolution: { width: 1280, height: 720 },
          frameRate: 30,
        },
        publishDefaults: {
          simulcast: true,
          videoEncoding: { maxBitrate: 2_500_000, maxFramerate: 30 },
          videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
          backupCodec: { codec: 'h264' },
          degradationPreference: 'maintain-resolution',
        },
      });
      roomRef.current = room;

      // --- ローカルトラック ---
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
        localTracksRef.current.audio = localAudio || null;
        localTracksRef.current.video = localVideo || null;
      } catch (err) {
        const failure = (typeof MediaDeviceFailure?.getFailure === 'function')
          ? MediaDeviceFailure.getFailure(err) : null;
        setDeviceHint(String(failure || err?.message || err));
        try {
          const onlyAudio = await createLocalTracks({ audio: true });
          localAudio = onlyAudio.find(t => t.kind === 'audio') || null;
          localTracksRef.current.audio = localAudio || null;
          localTracksRef.current.video = null;
        } catch {}
      }

      // ===== 参加者カードDOM =====
      const ensureCard = (participant) => {
        const id = participant.identity;
        if (cardMapRef.current.has(id)) return cardMapRef.current.get(id);

        const wrapper = document.createElement('div');
        wrapper.className = 'lk-card';
        wrapper.dataset.id = id;

        const videoWrap = document.createElement('div');
        videoWrap.className = 'lk-videoWrap';
        const v = document.createElement('video');
        Object.assign(v, { autoplay: true, playsInline: true, muted: false });
        // ★ 重要：リモートは常に「元比率維持」
        v.style.objectFit = 'contain';
        v.style.background = '#000';
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
          relayout();
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

        // 動画サイズがわかったらカード比率を実映像に同期
        const bindAspectHandlers = () => {
          try {
            v.addEventListener('loadedmetadata', () => {
              applyAspectFromVideo(entry);
              relayout();
            });
            // 一部ブラウザは resize を発火（Chrome は発火する）
            v.addEventListener('resize', () => {
              applyAspectFromVideo(entry);
              relayout();
            });
          } catch {}
        };
        bindAspectHandlers();

        cardMapRef.current.set(id, entry);
        return entry;
      };

      // ===== 可視性ナッジ =====
      const visibilityNudge = (videoEl) => {
        if (!videoEl) return;
        videoEl.style.transform = 'translateZ(0)';
        requestAnimationFrame(() => {
          // eslint-disable-next-line no-unused-expressions
          videoEl.getBoundingClientRect();
          videoEl.style.transform = '';
          relayout();
        });
      };

      // ===== イベント =====
      room.on('trackSubscribed', async (track, pub, participant) => {
        const entry = ensureCard(participant);
        if (track.kind === 'video') {
          entry.meta.publication = pub;
          try {
            track.attach(entry.meta.videoEl);
            await entry.meta.videoEl.play().catch(() => {});
            applyAspectFromVideo(entry); // ← ここで比率反映
            entry.meta.videoEl.onloadeddata = () => {
              applyAspectFromVideo(entry);
              relayout();
            };
            visibilityNudge(entry.meta.videoEl);
            relayout();
          } catch (e) {
            console.warn('[video attach]', e);
          }
        } else if (track.kind === 'audio') {
          entry.wrapper.classList.toggle('is-muted', false);
        }
      });

      room.on('trackUnsubscribed', (track, pub, participant) => {
        const entry = cardMapRef.current.get(participant.identity);
        if (!entry) return;
        try { track.detach(); } catch {}
        relayout();
      });

      room.on('participantConnected', (p) => {
        ensureCard(p);
        relayout();
      });
      room.on('participantDisconnected', (p) => {
        const entry = cardMapRef.current.get(p.identity);
        if (entry) {
          entry.wrapper.remove();
          cardMapRef.current.delete(p.identity);
        }
        if (pinnedId === p.identity) setPinnedId(null);
        relayout();
      });

      room.on('activeSpeakersChanged', (speakers) => {
        const activeIds = new Set(speakers.map(s => s.identity));
        cardMapRef.current.forEach((entry, id) => {
          entry.meta.isSpeaking = activeIds.has(id);
          entry.wrapper.classList.toggle('is-speaking', entry.meta.isSpeaking);
        });
        relayout();
      });

      room.on('mediaDevicesError', (err) => {
        setDeviceHint(err?.error || err?.message || 'Media device error');
      });

      room.on('disconnected', () => {
        setStatus('idle');
        cleanupRemotes();
      });

      room.on('audioPlaybackChanged', () => {
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

      setIsMuted(lp.isMicrophoneEnabled ? false : true);
      setIsCamOff(lp.isCameraEnabled ? false : true);

      // 取りこぼし attach
      await afterDomPaint(2);
      const attachExisting = () => {
        if (!room) return;
        const remoteMap =
          (room.participants && room.participants instanceof Map && room.participants) ||
          (room.remoteParticipants && room.remoteParticipants instanceof Map && room.remoteParticipants) ||
          new Map();

        const lp2 = room.localParticipant;
        const everyone = [lp2, ...Array.from(remoteMap.values())];

        const pubsOf = (p) => {
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
            if (!track) continue;
            const entry = ensureCard(p);
            if (track.kind === 'video') {
              try { track.attach(entry.meta.videoEl); } catch {}
              try { entry.meta.videoEl.play(); } catch {}
              applyAspectFromVideo(entry);
            }
          }
        }
        relayout();
      };
      attachExisting();
      relayout();
    } catch (e) {
      console.error('join failed', e);
      setStatus('error');
    }
  };

  /* ===== ピン留めの反映 ===== */
  useEffect(() => {
    cardMapRef.current.forEach((entry, id) => {
      entry.meta.pinned = (pinnedId === id);
      entry.wrapper.classList.toggle('is-pinned', entry.meta.pinned);
    });
    relayout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinnedId, viewMode]);

  /* ===== 自動再生解除 ===== */
  const startAudio = async () => {
    try {
      await roomRef.current?.startAudio();
      setNeedAudioStart(false);
    } catch {}
  };
  const startVideo = async () => {
    try {
      await localVideoRef.current?.play();
      setNeedVideoPlay(false);
    } catch {}
  };

  // タブ復帰時にも再生を試みる
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && needVideoPlay) startVideo();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [needVideoPlay]);

  // PIPの再アタッチ念押し
  useEffect(() => {
    if (status !== 'connected') return;
    if (selfCentered) return;
    const vtrack = localTracksRef.current?.video;
    const v = localVideoRef.current;
    if (!vtrack || !v) return;
    try { vtrack.attach(v); } catch {}
    v.muted = true;
    v.playsInline = true;
    v.autoplay = true;
    v.play().catch(() => {});
  }, [selfCentered, status]);

  // ページ離脱時は確実に解放
  useEffect(() => {
    const onBeforeUnload = () => {
      hardStopLocal();
      roomRef.current?.disconnect();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  /* ===== ツールバー操作 ===== */
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

  /* ===== UI ===== */
  return (
    <>
      {/* ===== 固定ヘッダー（接続前のみ） ===== */}
      {status !== 'connected' && (
        <FixedHeaderPortal>
          <header style={styles.top}>
            <Link href="/home" aria-label="Minutes.AI Home" style={styles.brand}>
              <span style={styles.brandIcon} aria-hidden="true">
                <HomeIcon size={22} color="currentColor" />
              </span>
              <span style={styles.brandText}>Minutes.AI</span>
            </Link>
            <nav style={styles.nav}>
              <a href={LINK_IOS} target="_blank" rel="noopener noreferrer" style={styles.navLink}>
                <FaApple aria-hidden="true" style={{ marginRight: 8 }} />
                <span className="gradHeader">iOS</span>
              </a>
            </nav>
          </header>
        </FixedHeaderPortal>
      )}

      {/* ===== Join ===== */}
      {status !== 'connected' && (
        <main style={styles.main}>
          <div style={styles.wrap}>
            <h1 style={styles.hero}>Join the Meeting</h1>
            <h2 style={styles.subtitle}>Powered by Minutes.AI</h2>

            <section style={styles.card}>
              <div style={{ marginBottom: 12 }}>
                <label htmlFor="name" style={styles.label}>Your name</label>
                <div>
                  <input
                    id="name"
                    className="joinNameInput"
                    placeholder="user name"
                    value={name}
                    onChange={(e) => {
                      const v = e.target.value;
                      setName(v);
                      try { localStorage.setItem(LAST_JOIN_NAME_KEY, v); } catch {}
                    }}
                    style={styles.inputUnderline}
                  />
                  <div style={styles.inputBorder} />
                </div>
              </div>

              <div style={styles.center}>
                <button
                  onClick={join}
                  disabled={status === 'loading' || !meeting}
                  style={merge(styles.btnBase, styles.btnJoin, (status === 'loading' || !meeting) && styles.btnDisabled)}
                >
                  {status === 'loading' ? 'Joining…' : 'Join'}
                </button>
              </div>

              {deviceHint && (
                <div style={{ marginTop: 12, whiteSpace: 'pre-wrap', fontSize: 12, color: '#6b7280' }}>
                  {deviceHint}
                </div>
              )}
            </section>
          </div>
        </main>
      )}

      {/* ===== 接続後：Zoom風レイアウト ===== */}
      {status === 'connected' && (
        <div
          ref={stageRef}
          style={{
            ...styles.stage,
            paddingTop: selfCentered ? 12 : 196, // 上中央PIPぶん
          }}
        >
          <div style={styles.stageHeader}>
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

          {/* 自分プレビュー（上中央固定） */}
          {!selfCentered && (
            <video
              ref={localVideoRef}
              style={styles.selfPreviewTopCenter}
              muted
              playsInline
              autoPlay
            />
          )}

          {/* メイン領域 */}
          <div
            ref={remoteGridRef}
            style={viewMode === 'speaker' ? styles.speakerMain : styles.galleryGrid}
          />
          {viewMode === 'speaker' && <div ref={thumbStripRef} style={styles.thumbStrip} />}

          {/* ブロッカー解除 */}
          {needAudioStart && (
            <button onClick={startAudio} style={styles.floatingBtn}>Enable audio</button>
          )}
          {needVideoPlay && (
            <button onClick={startVideo} style={{ ...styles.floatingBtn, left: 160 }}>
              Show preview
            </button>
          )}

          {/* ボトムツールバー */}
          <div style={styles.toolbar}>
            <button onClick={toggleMic} style={{ ...styles.toolBtn, ...(isMuted ? styles.toolOff : {}) }}>
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <button onClick={toggleCam} style={{ ...styles.toolBtn, ...(isCamOff ? styles.toolOff : {}) }}>
              {isCamOff ? 'Start Video' : 'Stop Video'}
            </button>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setViewMode(viewMode === 'speaker' ? 'gallery' : 'speaker')}
              style={styles.toolBtn}
            >
              {viewMode === 'speaker' ? 'Gallery View' : 'Speaker View'}
            </button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <p style={{ color: 'crimson', textAlign: 'center', marginTop: 16 }}>
          Failed to join. Open DevTools console for details.
        </p>
      )}

      {/* ===== 追加CSS（カード見た目 & 比率制御） ===== */}
      <style jsx global>{`
        /* カードの基本。--ar が設定されなければ 16/9 */
        .lk-card { position: relative; aspect-ratio: var(--ar, 16/9); background:#000; border-radius:12px; overflow:hidden; border:1px solid #1b1b1b; }
        .lk-card.lk-main { border-color:#3b82f6; box-shadow:0 0 0 2px rgba(59,130,246,.35) inset; }

        .lk-videoWrap { width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#000; }
        /* ★ リモート映像は常に “元比率を維持” して内接（Zoomと同じ挙動） */
        .lk-videoWrap video { width:100%; height:100%; object-fit: contain; background:#000; }

        /*（任意）縦横で装飾を変えたい場合のフック */
        .lk-card.is-portrait { }
        .lk-card.is-landscape { }

        .lk-badges { position:absolute; left:8px; bottom:8px; display:flex; gap:6px; align-items:center; }
        .lk-name { font-size:12px; background:rgba(0,0,0,.55); color:#fff; padding:3px 8px; border-radius:6px; }
        .lk-mic::before { content:''; width:8px; height:8px; border-radius:50%; display:inline-block; background:#22c55e; }
        .lk-card.is-muted .lk-mic::before { background:#ef4444; }
        .lk-pin { position:absolute; right:8px; top:8px; font-size:12px; background:rgba(0,0,0,.55); color:#fff; border:1px solid #444; padding:3px 6px; border-radius:6px; cursor:pointer; }
        .lk-card.is-speaking { outline: 2px solid #facc15; outline-offset:-2px; }

        .joinNameInput::placeholder { color: rgba(107, 114, 128, 0.7); }
      `}</style>
    </>
  );
}

/* ===== Styles ===== */
const styles = {
  // Header
  top: {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    height: 56,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 14px',
    background: '#ffffff',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    zIndex: 100,
  },
  brand: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    textDecoration: 'none',
    color: '#111827',
    fontWeight: 800,
    letterSpacing: 0.2,
  },
  brandIcon: { display: 'inline-grid', placeItems: 'center' },
  brandText: { fontSize: 16.5 },
  nav: { display: 'inline-flex', alignItems: 'center', gap: 8 },
  navLink: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid rgba(0,0,0,0.06)',
    textDecoration: 'none',
    color: '#111827',
    fontWeight: 700,
    background: '#fff',
  },

  // Join
  main: {
    minHeight: '100svh',
    display: 'grid',
    placeItems: 'center',
    padding: '72px 16px 24px',
    background: '#ffffff',
    fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif',
  },
  wrap: { width: '100%', maxWidth: 620 },
  hero: {
    margin: '8px 0 8px',
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
  subtitle: { margin: 0, textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#111827' },
  card: {
    marginTop: 14,
    padding: 16,
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 16,
    background: '#ffffff',
  },
  label: { fontSize: 12, opacity: 0.8, marginBottom: 4 },
  inputUnderline: {
    width: '100%',
    border: 'none',
    outline: 'none',
    fontSize: 16,
    padding: '8px 0',
    color: '#111827',
    background: 'transparent',
  },
  inputBorder: { height: 1, background: 'rgba(107,114,128,0.38)' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  btnBase: {
    width: '70%',
    padding: '12px 16px',
    borderRadius: 22,
    border: '1px solid rgba(0,0,0,0.08)',
    fontWeight: 700,
    background: '#fff',
    cursor: 'pointer',
  },
  btnJoin: {
    color: '#fff',
    background: 'linear-gradient(135deg,#2563eb,#0ea5e9)',
    boxShadow: '0 10px 20px rgba(37,99,235,.25)',
    border: 'none',
  },
  btnDisabled: { opacity: 0.55, pointerEvents: 'none' },

  // 接続後（黒ステージ）
  stage: {
    position: 'relative',
    marginTop: 12,
    padding: 12,
    minHeight: '100svh',
    background: '#0b0b0b',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  stageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  viewSwitch: { display: 'flex', border: '1px solid #333', borderRadius: 8, overflow: 'hidden' },
  viewBtn: {
    padding: '6px 10px', background: '#161616', color: '#ddd', border: 'none', cursor: 'pointer',
  },
  viewBtnActive: { background: '#2b2b2b', color: '#fff' },
  secondaryBtn: {
    marginLeft: 'auto',
    padding: '6px 10px',
    borderRadius: 8,
    background: '#222',
    color: '#fff',
    border: '1px solid #444',
    cursor: 'pointer',
  },

  galleryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 12,
    flex: 1,
  },
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

  // 上中央PIP（cover のまま＝自分映像のみ）
  selfPreviewTopCenter: {
    position: 'absolute',
    top: 14,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 300,
    height: 170,
    objectFit: 'cover',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,.25)',
    background: '#000',
    zIndex: 5,
    boxShadow: '0 14px 30px rgba(0,0,0,.45)',
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

function merge(...xs) {
  return Object.assign({}, ...xs.filter(Boolean));
}
