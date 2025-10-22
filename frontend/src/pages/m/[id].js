// pages/m/[id].js
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FaApple } from 'react-icons/fa';
import { GiHamburgerMenu } from 'react-icons/gi';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiLogOut } from 'react-icons/fi';
import HomeIcon from '../homeIcon';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'https://sense-website-production.up.railway.app';

const LINK_IOS =
  'https://apps.apple.com/jp/app/%E8%AD%B0%E4%BA%8B%E9%8C%B2ai/id6504087901';

const LAST_JOIN_NAME_KEY = 'minutesai.joinName';
const GRID_GAP = 12;

/* ===================== Utilities ===================== */
function FixedHeaderPortal({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

// 16:9タイルで (W,H) の枠に N枚 を最大で敷き詰め
function computeBestGrid(N, W, H, gap = GRID_GAP, ar = 16 / 9) {
  let best = { cols: 1, rows: N, tileW: W, tileH: Math.floor(W / ar), area: 0 };
  for (let cols = 1; cols <= N; cols++) {
    const rows = Math.ceil(N / cols);
    let tileW = Math.floor((W - (cols - 1) * gap) / cols);
    let tileH = Math.floor(tileW / ar);
    if (rows * tileH + (rows - 1) * gap > H) {
      tileH = Math.floor((H - (rows - 1) * gap) / rows);
      tileW = Math.floor(tileH * ar);
    }
    const area = tileW * tileH;
    if (area > best.area) best = { cols, rows, tileW, tileH, area };
  }
  return best;
}

/* ===================== Page ===================== */
export default function MeetingJoinPage() {
  const router = useRouter();
  const { id } = router.query;

  // ===== State =====
  const [meeting, setMeeting] = useState(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | connected | error
  const [needAudioStart, setNeedAudioStart] = useState(false);
  const [deviceHint, setDeviceHint] = useState('');

  // 均等割ギャラリーのみ
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  // 一時拡大（オーバーレイ）
  const [focusId, setFocusId] = useState(null);

  // ページング
  const [page, setPage] = useState(0);
  const [pageCap, setPageCap] = useState(12); // 画面サイズから自動更新

  // SideMenu
  const [showSideMenu, setShowSideMenu] = useState(false);

  // Refs（LiveKit / DOM）
  const roomRef = useRef(null);
  const gridRef = useRef(null);
  const localTracksRef = useRef({ audio: null, video: null });

  // 参加者カード管理（id -> { wrapper, meta }）
  const cardMapRef = useRef(new Map());

  // ===== 前回のユーザー名復元 =====
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LAST_JOIN_NAME_KEY);
      if (cached) setName(cached);
    } catch {}
  }, []);

  // ===== 会議情報取得 =====
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

  // ===== DOM掃除・解放 =====
  const cleanupRemotes = () => {
    cardMapRef.current.forEach(({ wrapper }) => wrapper.remove());
    cardMapRef.current.clear();
  };
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

  // ===== レイアウト & ページング =====
  const relayoutRafRef = useRef(0);
  const scheduleRelayout = () => {
    if (relayoutRafRef.current) cancelAnimationFrame(relayoutRafRef.current);
    relayoutRafRef.current = requestAnimationFrame(() => {
      relayoutRafRef.current = 0;
      doRelayout();
    });
  };

  function safeReplaceChildren(parent, nodes) {
    if (!parent) return;
    const wanted = nodes.filter(Boolean);
    const current = Array.from(parent.children);
    const same = wanted.length === current.length && wanted.every((n, i) => n === current[i]);
    if (same) return;
    current.forEach(n => { if (!wanted.includes(n)) parent.removeChild(n); });
    wanted.forEach(n => {
      if (n.parentNode !== parent || n !== parent.lastChild) parent.appendChild(n);
    });
  }

  function ensurePlaying(v) {
    if (!v || !v.isConnected) return;
    if (v.readyState >= 2 && v.paused) v.play().catch(() => {});
  }

  const doRelayout = () => {
    const grid = gridRef.current;
    if (!grid) return;

    const entries = Array.from(cardMapRef.current.values());
    const N = entries.length;

    const W = grid.clientWidth;
    const H = grid.clientHeight > 0 ? grid.clientHeight : grid.getBoundingClientRect().height;
    const { cols, rows, tileW, tileH } = computeBestGrid(Math.max(1, N), W, H);
    const cap = Math.max(1, cols * rows);

    if (pageCap !== cap) setPageCap(cap);
    const maxPage = Math.max(0, Math.ceil(N / cap) - 1);
    if (page > maxPage) setPage(maxPage);

    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${cols}, ${tileW}px)`;
    grid.style.gridAutoRows = `${tileH}px`;
    grid.style.gap = `${GRID_GAP}px`;
    grid.style.justifyContent = 'center';
    grid.style.alignContent = 'center';

    const start = page * cap;
    const slice = entries.slice(start, start + cap);
    slice.forEach(e => {
      e.wrapper.classList.remove('lk-main');
      e.wrapper.style.width = `${tileW}px`;
      e.wrapper.style.height = `${tileH}px`;
      e.wrapper.style.aspectRatio = '16/9';
    });
    safeReplaceChildren(grid, slice.map(e => e.wrapper));
  };

  // ===== LiveKit Join =====
  const join = async () => {
    if (!meeting) return;
    try {
      if (name && name.trim()) localStorage.setItem(LAST_JOIN_NAME_KEY, name.trim());
    } catch {}

    setStatus('loading');
    setDeviceHint('');

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

      // ローカルトラック
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

      // 参加者カード
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
        pinBtn.title = 'Focus';
        pinBtn.textContent = '🔎';
        pinBtn.onclick = () => setFocusId(prev => (prev === id ? null : id));

        wrapper.appendChild(videoWrap);
        wrapper.appendChild(badges);
        wrapper.appendChild(pinBtn);

        wrapper.ondblclick = () => setFocusId(prev => (prev === id ? null : id));

        const meta = {
          id,
          name: participant?.name || participant?.identity || 'Guest',
          isSpeaking: false,
          videoEl: v,
          track: null,
        };
        const entry = { wrapper, meta };

        v.addEventListener('loadedmetadata', () => scheduleRelayout());
        v.addEventListener('resize', () => scheduleRelayout());

        cardMapRef.current.set(id, entry);

        // 自分タイルは即ミュート & attach（黒防止）
        const lp = roomRef.current?.localParticipant;
        if (lp && id === lp.identity) {
          try {
            v.muted = true;
            v.playsInline = true;
            v.autoplay = true;
            localTracksRef.current.video?.attach(v);
            v.play().catch(() => {});
            entry.meta.track = localTracksRef.current.video || null;
          } catch {}
        }
        return entry;
      };

      /* ====== Events ====== */
      room.on('trackSubscribed', (track, pub, participant) => {
        const entry = ensureCard(participant);
        if (track.kind === 'video') {
          entry.meta.track = track;
          try {
            track.attach(entry.meta.videoEl);
            ensurePlaying(entry.meta.videoEl);
          } catch (e) {}
          scheduleRelayout();
        } else if (track.kind === 'audio') {
          entry.wrapper.classList.toggle('is-muted', false);
        }
      });

      room.on('trackUnsubscribed', (track, pub, participant) => {
        const entry = cardMapRef.current.get(participant.identity);
        if (!entry) return;
        try { track.detach(); } catch {}
        scheduleRelayout();
      });

      room.on('participantConnected', (p) => {
        ensureCard(p);
        scheduleRelayout();
      });

      room.on('participantDisconnected', (p) => {
        const entry = cardMapRef.current.get(p.identity);
        if (entry) {
          entry.wrapper.remove();
          cardMapRef.current.delete(p.identity);
        }
        if (focusId === p.identity) setFocusId(null);
        scheduleRelayout();
      });

      room.on('activeSpeakersChanged', (speakers) => {
        const activeIds = new Set(speakers.map(s => s.identity));
        cardMapRef.current.forEach((entry) => {
          entry.meta.isSpeaking = activeIds.has(entry.meta.id);
          entry.wrapper.classList.toggle('is-speaking', entry.meta.isSpeaking);
        });
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

      // 接続
      await room.connect(wsUrl, token);

      // publish
      const lp = room.localParticipant;

      if (localAudio) {
        try { await lp.publishTrack(localAudio); } catch (e) {}
      }
      if (localVideo) {
        try {
          await lp.publishTrack(localVideo);
          const selfEntry = cardMapRef.current.get(lp.identity) || ensureCard(lp);
          try {
            selfEntry.meta.videoEl.muted = true;
            selfEntry.meta.videoEl.playsInline = true;
            selfEntry.meta.videoEl.autoplay = true;
            localVideo.attach(selfEntry.meta.videoEl);
            ensurePlaying(selfEntry.meta.videoEl);
            selfEntry.meta.track = localVideo;
          } catch {}
        } catch (e) {}
      }

      setStatus('connected');
      setIsMuted(lp.isMicrophoneEnabled ? false : true);
      setIsCamOff(lp.isCameraEnabled ? false : true);

      // 既存 publications の反映
      const remoteMap =
        (room.participants && room.participants instanceof Map && room.participants) ||
        (room.remoteParticipants && room.remoteParticipants instanceof Map && room.remoteParticipants) ||
        new Map();

      const everyone = [room.localParticipant, ...Array.from(remoteMap.values())];
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
        const entry = cardMapRef.current.get(p.identity) || ensureCard(p);
        for (const pub of pubsOf(p)) {
          const track = pub.track;
          if (track?.kind === 'video') {
            try { track.attach(entry.meta.videoEl); } catch {}
            ensurePlaying(entry.meta.videoEl);
            entry.meta.track = track;
          }
        }
      }
      scheduleRelayout();
    } catch (e) {
      console.error('join failed', e);
      setStatus('error');
    }
  };

  // 画面サイズ変化でレイアウト再計算
  useEffect(() => {
    if (status !== 'connected') return;
    const grid = gridRef.current;
    if (!grid) return;
    const ro = new ResizeObserver(() => scheduleRelayout());
    ro.observe(grid);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // ページ切替時
  useEffect(() => { scheduleRelayout(); }, [page, pageCap]);

  // ページ離脱時の解放
  useEffect(() => {
    const onBeforeUnload = () => {
      hardStopLocal();
      roomRef.current?.disconnect();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // トグル
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

  const leave = async () => {
    try {
      await roomRef.current?.disconnect();
    } finally {
      cleanupRemotes();
      hardStopLocal();
      roomRef.current = null;
      setStatus('idle');
      setDeviceHint('');
      setFocusId(null);
      setPage(0);
    }
  };

  // オーバーレイ用：対象の track を探して video に attach
  const overlayVideoRef = useRef(null);
  useEffect(() => {
    const id = focusId;
    const v = overlayVideoRef.current;
    if (!v) return;
    try { v.pause(); } catch {}
    v.srcObject = null;

    if (!id) return;

    const entry = cardMapRef.current.get(id);
    const track = entry?.meta?.track;
    try {
      if (track) {
        track.attach(v);
        Object.assign(v, { muted: id === roomRef.current?.localParticipant?.identity, playsInline: true, autoplay: true });
        v.play().catch(() => {});
      }
    } catch {}
  }, [focusId]);

  /* ===================== UI ===================== */
  const entriesCount = cardMapRef.current.size;
  const pages = Math.max(1, Math.ceil(entriesCount / pageCap));
  const isJoinDisabled = status === 'loading' || !meeting || !(name && name.trim());

  return (
    <>
      {/* 接続前ヘッダー */}
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

      {/* Join */}
      {status !== 'connected' && (
        <main style={styles.main}>
          <div style={styles.wrap}>
            {/* ▼ 変更：見出しを Online 改行 Meeting、イタリック */}
            <h1 style={styles.hero}>
              <em>Online<br />Meeting</em>
            </h1>
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
                  {/* 下線は残す（四角枠は作らない） */}
                  <div style={styles.inputBorder} />
                </div>
              </div>

              <div style={styles.center}>
                <button
                  onClick={join}
                  disabled={isJoinDisabled}
                  aria-disabled={isJoinDisabled}
                  style={merge(
                    styles.btnBase,
                    styles.btnJoin,
                    isJoinDisabled && styles.btnDisabled
                  )}
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

      {/* 接続後：ギャラリー均等割 */}
      {status === 'connected' && (
        <div style={styles.stage}>
          {/* ヘッダー（右：ハンバーガー） */}
          <div style={styles.stageHeader}>
            {/* 左側は空（"Gallery" 見出しは削除） */}
            <div />
            <div style={{ marginLeft: 'auto' }}>
              <button
                aria-label="Open menu"
                onClick={() => setShowSideMenu(true)}
                style={styles.hamburgerBtn}
              >
                <GiHamburgerMenu size={22} />
              </button>
            </div>
          </div>

          {/* グリッド（均等割） */}
          <div ref={gridRef} style={styles.galleryGrid} />

          {/* ページング */}
          {pages > 1 && (
            <div style={styles.pager}>
              <button
                style={styles.pagerBtn}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                ◀
              </button>
              <span style={{ minWidth: 80, textAlign: 'center' }}>{page + 1} / {pages}</span>
              <button
                style={styles.pagerBtn}
                onClick={() => setPage(p => Math.min(pages - 1, p + 1))}
                disabled={page >= pages - 1}
              >
                ▶
              </button>
            </div>
          )}

          {/* ブロッカー解除 */}
          {needAudioStart && (
            <button
              onClick={() => roomRef.current?.startAudio().then(() => setNeedAudioStart(false)).catch(()=>{})}
              style={styles.floatingBtn}
            >
              Enable audio
            </button>
          )}
        </div>
      )}

      {status === 'error' && (
        <p style={{ color: 'crimson', textAlign: 'center', marginTop: 16 }}>
          Failed to join. Open DevTools console for details.
        </p>
      )}

      {/* === 一時拡大オーバーレイ === */}
      {focusId && (
        <div style={styles.overlay} onClick={() => setFocusId(null)}>
          <div style={styles.overlayInner} onClick={(e) => e.stopPropagation()}>
            <video ref={overlayVideoRef} style={styles.overlayVideo} autoPlay playsInline />
            <button style={styles.overlayClose} onClick={() => setFocusId(null)}>×</button>
          </div>
        </div>
      )}

      {/* === SideMenu（Purchase / index のトーンを踏襲） === */}
      <div
        style={{
          ...styles.sideMenuOverlay,
          display: showSideMenu ? 'block' : 'none',
          opacity: showSideMenu ? 1 : 0
        }}
        onClick={() => setShowSideMenu(false)}
      >
        <div
          style={{
            ...styles.sideMenu,
            transform: showSideMenu ? 'translateX(0)' : 'translateX(100%)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={styles.menuTitle}>Controls</h3>

          <button style={styles.menuItem} onClick={() => { toggleMic(); }}>
            {isMuted ? <FiMicOff size={18} style={{ marginRight: 10 }} /> : <FiMic size={18} style={{ marginRight: 10 }} />}
            {isMuted ? 'Unmute' : 'Mute'}
          </button>

          <button style={styles.menuItem} onClick={() => { toggleCam(); }}>
            {isCamOff ? <FiVideoOff size={18} style={{ marginRight: 10 }} /> : <FiVideo size={18} style={{ marginRight: 10 }} />}
            {isCamOff ? 'Start Video' : 'Stop Video'}
          </button>

          <div style={{ height: 12 }} />

          <button
            style={{ ...styles.menuItem, ...styles.leaveBtn }}
            onClick={async () => {
              const ok = window.confirm('Leave this meeting?');
              if (!ok) return;
              setShowSideMenu(false);
              await leave();
            }}
          >
            <FiLogOut size={18} style={{ marginRight: 10 }} />
            Leave
          </button>
        </div>
      </div>

      {/* 追加CSS */}
      <style jsx global>{`
        .lk-card { position: relative; aspect-ratio: 16/9; background:#000; border-radius:12px; overflow:hidden; border:1px solid #1b1b1b; cursor: default; }
        .lk-videoWrap { width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#000; }
        .lk-videoWrap video { width:100%; height:100%; object-fit: contain; background:#000; }

        .lk-badges { position:absolute; left:8px; bottom:8px; display:flex; gap:6px; align-items:center; }
        .lk-name { font-size:12px; background:rgba(0,0,0,.55); color:#fff; padding:3px 8px; border-radius:6px; }
        .lk-mic::before { content:''; width:8px; height:8px; border-radius:50%; display:inline-block; background:#22c55e; }
        .lk-card.is-muted .lk-mic::before { background:#ef4444; }
        .lk-pin { position:absolute; right:8px; top:8px; font-size:12px; background:rgba(0,0,0,.55); color:#fff; border:1px solid #444; padding:3px 6px; border-radius:6px; cursor:pointer; }
        .lk-card.is-speaking { outline: 2px solid #facc15; outline-offset:-2px; box-shadow: 0 0 0 2px rgba(250, 204, 21, .15) inset; }

        /* 入力欄の四角枠を完全に排除（ブラウザデフォルトも潰す） */
        .joinNameInput { border: none !important; outline: none !important; box-shadow: none !important; background: transparent !important; }
        .joinNameInput::placeholder { color: rgba(107, 114, 128, 0.7); }
      `}</style>
    </>
  );
}

/* ===== Styles ===== */
const styles = {
  // Header（接続前）
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
  wrap: { width: '100%', maxWidth: 620, margin: '0 auto' },
    hero: {
    margin: '8px 0 8px',        // ▼ 下マージンを拡大
    textAlign: 'center',
    fontSize: 44,
    fontWeight: 900,
    lineHeight: 1.18,            // ▼ 行間をゆったりに（gのディセンダ対策）
    letterSpacing: 0.2,
    fontStyle: 'italic',
    display: 'inline-block',     // ▼ ブロック化で描画の切れを防止
    paddingBottom: 6,            // ▼ 下側に余白を追加（切れ防止＆下要素との間隔）
    WebkitBackgroundClip: 'text',
    background: 'linear-gradient(135deg, #093dcdff 100%, #2563eb 45%, #38bdf8 0%)',
    backgroundClip: 'text',
    color: 'transparent',
  },
  subtitle: { margin: 0, textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#111827' },
  card: {
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    background: '#ffffff',
    // 「user name / join を囲む四角枠」ではないので card の枠線は外観維持したい場合は無くてもOK
    // border: '1px solid rgba(0,0,0,0.08)',
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
    border: 'none', // ★ Join の薄い四角枠を撤去
    fontWeight: 700,
    background: '#fff',
    cursor: 'pointer',
  },
  btnJoin: {
    color: '#fff',
    background: 'linear-gradient(135deg,#2563eb,#0ea5e9)',
    boxShadow: '0 10px 20px rgba(37,99,235,.25)',
  },
  btnDisabled: { opacity: 0.55, pointerEvents: 'none' },

  // 接続後
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
    minHeight: 38,
  },
  hamburgerBtn: {
    padding: '8px 10px',
    borderRadius: 10,
    background: '#222',
    color: '#fff',
    border: '1px solid #444',
    cursor: 'pointer',
  },

  // ギャラリー
  galleryGrid: {
    flex: 1,
    minHeight: 0,
    display: 'grid',
    gap: GRID_GAP,
    alignContent: 'center',
    justifyContent: 'center',
  },

  // ページャ
  pager: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '4px 0 2px',
    fontSize: 13,
    color: '#bbb',
  },
  pagerBtn: {
    padding: '6px 10px',
    borderRadius: 8,
    background: '#1a1a1a',
    color: '#fff',
    border: '1px solid #333',
    cursor: 'pointer',
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

  // Overlay（拡大）
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,.6)',
    display: 'grid',
    placeItems: 'center',
    zIndex: 50,
  },
  overlayInner: {
    position: 'relative',
    width: 'min(90vw, 1200px)',
    aspectRatio: '16/9',
    background: '#000',
    borderRadius: 14,
    border: '1px solid #333',
    overflow: 'hidden',
    boxShadow: '0 30px 80px rgba(0,0,0,.5)',
  },
  overlayVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    background: '#000',
  },
  overlayClose: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    border: '1px solid #444',
    background: 'rgba(0,0,0,.5)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 18,
  },

  // SideMenu（参考のPurchase / index トーン）
  sideMenuOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 1200,
    transition: 'opacity .28s ease',
  },
  sideMenu: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: 'min(360px, 80vw)',
    height: '100%',
    color: '#fff',
    padding: 18,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.65), rgba(90,90,90,0.15))',
    borderLeft: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(6px)',
    transition: 'transform .28s ease',
  },
  menuTitle: { margin: '6px 0 12px', fontSize: 14, opacity: .8, fontWeight: 700 },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '12px 10px',
    borderRadius: 10,
    background: 'rgba(24,24,24,0.85)',
    border: '1px solid #333',
    color: '#fff',
    cursor: 'pointer',
    marginBottom: 10,
    textAlign: 'left',
    fontWeight: 700,
  },
  leaveBtn: {
    background: 'linear-gradient(135deg, rgba(120,0,0,0.9), rgba(50,0,0,0.9))',
    borderColor: '#642',
  },
};

function merge(...xs) {
  return Object.assign({}, ...xs.filter(Boolean));
}
