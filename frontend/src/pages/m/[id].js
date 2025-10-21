// pages/m/[id].js
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FaApple } from 'react-icons/fa';
import HomeIcon from '../homeIcon';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'https://sense-website-production.up.railway.app';

const LINK_IOS =
  'https://apps.apple.com/jp/app/%E8%AD%B2%E4%BA%8B%E9%8C%B2ai/id6504087901';

const LAST_JOIN_NAME_KEY = 'minutesai.joinName';
const GRID_GAP = 12;
const TOP_STRIP_HEIGHT = 108;        // 上部サムネイル帯の高さ
const TOP_THUMB_AR = 16 / 9;
const TOP_THUMB_W = 160;             // サムネイルのベース幅（横スクロールするため固定気味）

/* ===================== Utilities ===================== */
function FixedHeaderPortal({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

// 16:9タイルで (W,H) の枠に N枚 を最大で敷き詰める（ギャラリー用）
function computeBestGrid(N, W, H, gap = GRID_GAP, ar = 16 / 9) {
  const s = Math.floor(Math.sqrt(N));
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
    if (area > best.area || (cols === s && rows === Math.ceil(N / s))) {
      best = { cols, rows, tileW, tileH, area };
    }
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

  // Zoom風UI
  const [viewMode, setViewMode] = useState('speaker'); // 'speaker' | 'gallery'
  const [pinnedId, setPinnedId] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  // Refs（LiveKit / DOM）
  const roomRef = useRef(null);
  const remoteGridRef = useRef(null);    // メイン表示エリア
  const topStripRef = useRef(null);      // 上部サムネイル帯
  const localTracksRef = useRef({ audio: null, video: null });

  // 自分だけの時の中央ドン表示
  const selfMainRef = useRef(null); // { wrapper, videoEl }
  const [selfCentered, setSelfCentered] = useState(false);

  // 参加者カード管理
  const cardMapRef = useRef(new Map()); // id -> { wrapper, meta }

  // ====== 最新 state をイベントから読めるように ======
  const viewModeRef = useRef(viewMode);
  const pinnedIdRef = useRef(pinnedId);
  useEffect(() => { viewModeRef.current = viewMode; }, [viewMode]);
  useEffect(() => { pinnedIdRef.current = pinnedId; }, [pinnedId]);

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

  // ===== DOM掃除 =====
  const cleanupRemotes = () => {
    cardMapRef.current.forEach(({ wrapper }) => wrapper.remove());
    cardMapRef.current.clear();
  };

  // ===== デバイス解放 =====
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

  // 実映像の比率メタ更新（Speaker/Gallery 共通）
  const computeAspectMeta = (entry) => {
    const v = entry?.meta?.videoEl;
    if (!v) return;
    const w = v.videoWidth || 0;
    const h = v.videoHeight || 0;
    if (!w || !h) return;
    entry.meta.ar = `${w}/${h}`;
    entry.meta.portrait = h > w;
  };

  /* ===== レイアウトのデバウンス & 安全な子入替 ===== */
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

  // ギャラリー：現在のgrid領域に全員が入るよう敷き詰め（サイズ計算のみ）
  function applyGalleryLayout() {
    const grid = remoteGridRef.current;
    if (!grid) return;
    const entries = Array.from(cardMapRef.current.values());
    if (entries.length === 0) return;
    const W = grid.clientWidth;
    const H = grid.clientHeight > 0 ? grid.clientHeight : grid.getBoundingClientRect().height;
    const { cols, rows, tileW, tileH } = computeBestGrid(entries.length, W, H);
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${cols}, ${tileW}px)`;
    grid.style.gridAutoRows = `${tileH}px`;
    grid.style.gap = `${GRID_GAP}px`;
    grid.style.justifyContent = 'center';
    grid.style.alignContent = 'center';
    entries.forEach(e => {
      e.wrapper.classList.remove('lk-main');
      e.wrapper.style.width = `${tileW}px`;
      e.wrapper.style.height = `${tileH}px`;
      e.wrapper.style.aspectRatio = '16/9';
    });
  }

  // ===== レイアウト更新（最新state参照 & 安全な子入替）=====
  const doRelayout = () => {
    const grid = remoteGridRef.current;
    const strip = topStripRef.current;
    if (!grid) return;

    const entries = Array.from(cardMapRef.current.values());
    const localId = roomRef.current?.localParticipant?.identity;

    // 並び順（ピン→話者→名前）
    const pinnedNow = pinnedIdRef.current;
    entries.sort((a, b) => {
      const pa = a.meta.id === pinnedNow ? 1 : 0;
      const pb = b.meta.id === pinnedNow ? 1 : 0;
      if (pa !== pb) return pb - pa;
      const sa = a.meta.isSpeaking ? 1 : 0;
      const sb = b.meta.isSpeaking ? 1 : 0;
      if (sa !== sb) return sb - sa;
      return (a.meta.name || '').localeCompare(b.meta.name || '');
    });

    // 上部サムネイル帯：自分を含む全員を均一サイズで横スクロール
    if (strip) {
      strip.style.height = `${TOP_STRIP_HEIGHT}px`;
      const thumbs = entries.map((e) => {
        e.wrapper.classList.remove('lk-main');
        e.wrapper.style.width = `${TOP_THUMB_W}px`;
        e.wrapper.style.height = `${Math.round(TOP_THUMB_W / TOP_THUMB_AR)}px`;
        e.wrapper.style.aspectRatio = '16/9';
        e.wrapper.classList.add('lk-thumb');
        return e.wrapper;
      });
      safeReplaceChildren(strip, thumbs);
    }

    // メイン表示
    const nonEmpty = entries.length > 0;
    if (nonEmpty) {
      setSelfCentered(false);

      const mode = viewModeRef.current;
      let main = entries[0];

      if (mode === 'speaker') {
        // ピンがあればそれを最優先、なければ activeSpeakers 先頭（上の sort で先頭になる）
        if (main) {
          main.wrapper.classList.add('lk-main');
          main.wrapper.style.aspectRatio = main.meta.ar || '16/9';
          main.wrapper.style.width = '';
          main.wrapper.style.height = '';
          safeReplaceChildren(grid, [main.wrapper]);
        }
      } else {
        applyGalleryLayout(); // サイズ計算のみ
        safeReplaceChildren(grid, entries.map(e => e.wrapper));
      }
    } else {
      // リモート不在：自分を中央（上帯は空）
      const vtrack = localTracksRef.current?.video || null;
      if (!selfMainRef.current) {
        const wrapper = document.createElement('div');
        wrapper.className = 'lk-card lk-main';
        wrapper.style.aspectRatio = '16/9';
        const videoWrap = document.createElement('div');
        videoWrap.className = 'lk-videoWrap';
        const v = document.createElement('video');
        Object.assign(v, { autoplay: true, playsInline: true, muted: true });
        v.style.objectFit = 'contain';
        videoWrap.appendChild(v);
        wrapper.appendChild(videoWrap);
        selfMainRef.current = { wrapper, videoEl: v };
        try { vtrack?.attach(v); } catch {}
        ensurePlaying(v);
      }
      safeReplaceChildren(grid, [selfMainRef.current.wrapper]);
      setSelfCentered(true);
    }

    // 自分タイルの強制再生（黒防止）
    try {
      const lp = roomRef.current?.localParticipant;
      if (lp) {
        const selfEntry = cardMapRef.current.get(lp.identity);
        ensurePlaying(selfEntry?.meta?.videoEl);
      }
    } catch {}
  };

  /* ===================== Join (LiveKit) ===================== */
  const join = async () => {
    if (!meeting) return;

    // 名前保存
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

      // ローカルトラック生成
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

      // 参加者カード生成
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

        // サムネイル帯でのピン切替しやすいよう、ボタンは残す
        const pinBtn = document.createElement('button');
        pinBtn.className = 'lk-pin';
        pinBtn.title = 'Pin / Unpin';
        pinBtn.textContent = '📌';
        pinBtn.onclick = () => {
          setPinnedId(prev => (prev === id ? null : id));
          scheduleRelayout();
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
          ar: '16/9',
          portrait: false,
        };
        const entry = { wrapper, meta };

        v.addEventListener('loadedmetadata', () => { computeAspectMeta(entry); scheduleRelayout(); });
        v.addEventListener('resize', () => { computeAspectMeta(entry); scheduleRelayout(); });

        cardMapRef.current.set(id, entry);

        // ローカル参加者は即アタッチ＆ミュート（自分の黒化防止）
        const lp = roomRef.current?.localParticipant;
        if (lp && id === lp.identity) {
          try {
            v.muted = true;
            v.playsInline = true;
            v.autoplay = true;
            localTracksRef.current.video?.attach(v);
            v.play().catch(() => {});
          } catch {}
        }
        return entry;
      };

      /* ====== Events ====== */
      room.on('trackSubscribed', (track, pub, participant) => {
        const entry = ensureCard(participant);
        if (track.kind === 'video') {
          entry.meta.publication = pub;
          try {
            track.attach(entry.meta.videoEl);
            ensurePlaying(entry.meta.videoEl);
            computeAspectMeta(entry);
            scheduleRelayout();
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
        if (pinnedIdRef.current === p.identity) setPinnedId(null);
        scheduleRelayout();
      });

      room.on('activeSpeakersChanged', (speakers) => {
        const activeIds = new Set(speakers.map(s => s.identity));
        cardMapRef.current.forEach((entry) => {
          entry.meta.isSpeaking = activeIds.has(entry.meta.id);
          entry.wrapper.classList.toggle('is-speaking', entry.meta.isSpeaking);
        });
        scheduleRelayout();
      });

      // 自分の映像が publish されたら必ず再アタッチ（黒防止）
      room.on('localTrackPublished', (pub) => {
        try {
          if (pub?.kind === 'video') {
            const lp = roomRef.current?.localParticipant;
            if (!lp) return;
            const selfEntry = cardMapRef.current.get(lp.identity) || ensureCard(lp);
            localTracksRef.current.video?.attach(selfEntry.meta.videoEl);
            selfEntry.meta.videoEl.muted = true;
            ensurePlaying(selfEntry.meta.videoEl);
            computeAspectMeta(selfEntry);
            scheduleRelayout();
          }
        } catch {}
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
        try { await lp.publishTrack(localAudio); } catch (e) { console.warn('[audio publish]', e); }
      }
      if (localVideo) {
        try {
          await lp.publishTrack(localVideo);
          const selfEntry = ensureCard(lp);
          try {
            selfEntry.meta.videoEl.muted = true;
            selfEntry.meta.videoEl.playsInline = true;
            selfEntry.meta.videoEl.autoplay = true;
            localVideo.attach(selfEntry.meta.videoEl);
            ensurePlaying(selfEntry.meta.videoEl);
          } catch {}
        } catch (e) { console.warn('[video publish]', e); }
      }

      setStatus('connected');
      setIsMuted(lp.isMicrophoneEnabled ? false : true);
      setIsCamOff(lp.isCameraEnabled ? false : true);

      // 既存publicationの取りこぼし反映
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
          const entry = (p === lp2) ? (cardMapRef.current.get(lp2.identity) || ensureCard(lp2)) : ensureCard(p);
          if (track.kind === 'video') {
            try { track.attach(entry.meta.videoEl); } catch {}
            ensurePlaying(entry.meta.videoEl);
            computeAspectMeta(entry);
          }
        }
      }
      scheduleRelayout();
    } catch (e) {
      console.error('join failed', e);
      setStatus('error');
    }
  };

  // ピン留めの反映（meta同期）
  useEffect(() => {
    const now = pinnedId;
    cardMapRef.current.forEach((entry, id) => {
      entry.meta.pinned = (now === id);
      entry.wrapper.classList.toggle('is-pinned', entry.meta.pinned);
    });
    scheduleRelayout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinnedId, viewMode]);

  // 画面サイズ変化でレイアウト再計算
  useEffect(() => {
    if (status !== 'connected') return;
    const stage = remoteGridRef.current?.parentElement;
    if (!stage) return;
    const ro = new ResizeObserver(() => scheduleRelayout());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [status, viewMode]);

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
      setPinnedId(null);
    }
  };

  /* ===================== UI ===================== */
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

      {/* 接続後ステージ */}
      {status === 'connected' && (
        <div style={styles.stage}>
          <div style={styles.stageHeader} data-stage-header>
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

          {/* === 上部サムネイル帯（自分を含む全員・均一サイズ・横スクロール） === */}
          <div ref={topStripRef} style={styles.topStrip} />

          {/* メイン領域（スピーカー拡大 or ギャラリー） */}
          <div
            ref={remoteGridRef}
            style={viewMode === 'speaker' ? styles.speakerMain : styles.galleryGrid}
          />

          {/* ブロッカー解除 */}
          {needAudioStart && (
            <button onClick={() => roomRef.current?.startAudio().then(() => setNeedAudioStart(false)).catch(()=>{})}
                    style={styles.floatingBtn}>
              Enable audio
            </button>
          )}

          {/* ツールバー */}
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

      {/* 追加CSS */}
      <style jsx global>{`
        .lk-card { position: relative; aspect-ratio: 16/9; background:#000; border-radius:12px; overflow:hidden; border:1px solid #1b1b1b; }
        .lk-card.lk-main { border-color:#3b82f6; box-shadow:0 0 0 2px rgba(59,130,246,.35) inset; }
        .lk-card.lk-thumb { flex: 0 0 auto; } /* サムネイル帯で横スクロール */

        .lk-videoWrap { width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#000; }
        .lk-videoWrap video { width:100%; height:100%; object-fit: contain; background:#000; }

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

  // 接続後ステージ
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

  // === 新：上部サムネイル帯 ===
  topStrip: {
    height: TOP_STRIP_HEIGHT,
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    padding: '6px',
    borderBottom: '1px solid #111',
    background: 'linear-gradient(180deg,#0a0a0a,#090909)',
  },

  // Speaker：中央拡大
  speakerMain: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Gallery：列数・サイズはJSで固定化
  galleryGrid: {
    flex: 1,
    minHeight: 0,
    display: 'grid',
    gap: GRID_GAP,
    alignContent: 'center',
    justifyContent: 'center',
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
