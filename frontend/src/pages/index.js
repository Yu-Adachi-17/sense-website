// src/pages/index.js
import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

import FullScreenOverlay from './fullscreenoverlay';
import ProgressIndicator from './progressindicator';
import { transcribeAudio } from '../utils/ChatGPTs';
import { Success, Cancel } from '../AfterPayment';
import PurchaseMenu from './purchasemenu';
import MinutesList from './minutes-list';
import GlassRecordButton from '../components/GlassRecordButton';

import { getClientAuth, getDb } from '../firebaseConfig';

import { v4 as uuidv4 } from 'uuid';
import { useAuthGate } from "../hooks/useAuthGate";
import { isDebug,dbg,pickAudioMimeType,logEnvAndPerms,attachRecorderDebug, RecordingIssueBanner} from '../lib/recordingKit';

/** ============================================================
 *  SEO 共通
 * ============================================================ */
const SITE_URL = "https://www.sense-ai.world";

const OG_LOCALE_MAP = {
  en: "en_US", ja: "ja_JP", ar: "ar_AR", de: "de_DE", es: "es_ES",
  fr: "fr_FR", id: "id_ID", ko: "ko_KR", ms: "ms_MY", pt: "pt_PT",
  sv: "sv_SE", tr: "tr_TR", "zh-CN": "zh_CN", "zh-TW": "zh_TW",
};
const LINK_IOS = "https://apps.apple.com/jp/app/%E8%AD%B2%E4%BA%8B%E9%8C%B2ai/id6504087901";

// === DEBUG transcripts ==========
const DEBUG_TRANSCRIPTS = {
  ja: `
（営業定例・要約テスト）今日は新料金プランとホワイトテーマのリリース準備が中心。価格はTrial, Light, Subscription, Enterpriseの4つ。KPIは今月MAU3,000→3,500。ドイツとオランダのコンバージョンが高い。iOSの審査は通過済み、Androidは今週末。Zoom SDKの外部会議参加でエラー63の再現あり、回避策はドキュメント強化＋内部会議でのデモ動画差し替え。Next.js側は/blog/introductionのhreflang修正、/ja/home をsitemapへ明示追加。サポート面はFAQの英独蘭を優先翻訳。来週はセールス資料の簡略版を用意。`,
  en: `
(Sales Weekly) Focus today: new pricing & white theme release. Tiers: Trial, Light, Subscription, Enterprise. KPI: MAU 3,000 → 3,500 by month-end. Germany & Netherlands convert best. iOS passed review; Android targets this weekend. Zoom SDK external meeting join still hits error 63; mitigation is stronger docs + internal-meeting demo video. Next.js: fix hreflang on /blog/introduction and add /ja/home into sitemap. Support: prioritize FAQ translations (DE/NL). Next week: lightweight sales deck.`
};

function getDebugTranscript(lang) {
  if (lang && DEBUG_TRANSCRIPTS[lang]) return DEBUG_TRANSCRIPTS[lang].trim();
  return DEBUG_TRANSCRIPTS.ja.trim(); // 既定は日本語
}

// ----------------------
// ゲスト用 localStorage キー
// ----------------------
const LOCAL_REMAINING_KEY = "guestRemainingSeconds";
const LOCAL_LAST_RESET_KEY = "guestLastResetDate";

// ----------------------
// Main Component
// ----------------------
function App() {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const { locale, locales = [router.locale], defaultLocale } = router;
  const ogLocale = OG_LOCALE_MAP[locale] || OG_LOCALE_MAP.en;

  const canonical = (locale === defaultLocale) ? `${SITE_URL}/` : `${SITE_URL}/${locale}/`;
  const altURLs = (locales || []).map(l =>
    l === defaultLocale ? { l, href: `${SITE_URL}/` } : { l, href: `${SITE_URL}/${l}/` }
  );

  const pageTitle = t("Minutes.AI — Home");
  const ogTitle  = t("Minutes.AI — AI Meeting Minutes");
  const metaDesc = t("minutes-listful meeting minutes with AI. Record once, get accurate transcripts with clear decisions and action items. Works on iPhone and the web.");
  const ogDesc   = t("Record your meeting and let AI produce clean, human-ready minutes—decisions and to-dos at a glance.");

  // ===== 新：auth / db を保持
  const [authInstance, setAuthInstance] = useState(null);
  const [dbInstance, setDbInstance] = useState(null);

  // ===== 録音・表示用 state 群
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(1);
  const [audioURL, setAudioURL] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [minutes, setMinutes] = useState('');
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState("start");
  const [hasSavedRecord, setHasSavedRecord] = useState(false);
  const [meetingRecordId, setMeetingRecordId] = useState(null);
  const [isUserDataLoaded, setIsUserDataLoaded] = useState(false);
  const [userSubscription, setUserSubscription] = useState(false);
  const DEFAULT_REMAINING = 180;
  const [userRemainingSeconds, setUserRemainingSeconds] = useState(DEFAULT_REMAINING);
  const [selectedMeetingFormat, setSelectedMeetingFormat] = useState(null);
  const [recordingCountdown, setRecordingCountdown] = useState(3600);

  // Refs
  const recordingTimerIntervalRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const lastResetDateRef = useRef(new Date().toDateString());
  const sinkAudioElRef = useRef(null);
  const [recordingIssue, setRecordingIssue] = useState(null);
const zeroChunkCountRef = useRef(0);
const silenceSecondsRef = useRef(0);

  // タイトルとdir
  useEffect(() => { document.title = pageTitle; }, [pageTitle]);
  useEffect(() => {
    document.documentElement.setAttribute("dir", i18n.language === "ar" ? "rtl" : "ltr");
  }, [i18n.language]);

useEffect(() => {
  if (typeof window !== 'undefined') {
    window.__recdbg_on  = () => { localStorage.setItem('rec_debug', '1');  location.reload(); };
    window.__recdbg_off = () => { localStorage.removeItem('rec_debug');    location.reload(); };
    if (isDebug()) console.log('[RECDBG] debug mode ON (latched)');
  }
}, []);


  // ★ auth/db をクライアントで取得（ゲストでも UI は出す）
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [a, d] = await Promise.all([getClientAuth(), getDb()]);
      if (!mounted) return;
      setAuthInstance(a || null);
      setDbInstance(d || null);
      // 認証が取得できなかった場合でも UI を表示する
      if (!a) setIsUserDataLoaded(true);
    })();
    // 念のため 2秒フォールバック（どのみちゲストでも出したい）
    const t = setTimeout(() => setIsUserDataLoaded((v) => v || true), 2000);
    return () => { mounted = false; clearTimeout(t); };
  }, []);

  // 録音の60分カウントダウン
  useEffect(() => {
    if (isRecording) {
      setRecordingCountdown(3600);
      recordingTimerIntervalRef.current = setInterval(() => {
        setRecordingCountdown(prev => {
          if (prev <= 1) {
            clearInterval(recordingTimerIntervalRef.current);
            recordingTimerIntervalRef.current = null;
            stopRecording();
            setIsRecording(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (recordingTimerIntervalRef.current) {
        clearInterval(recordingTimerIntervalRef.current);
        recordingTimerIntervalRef.current = null;
      }
      setRecordingCountdown(3600);
    }
  }, [isRecording]);

  // ローカル meeting format 復元
  useEffect(() => {
    const stored = localStorage.getItem("selectedMeetingFormat");
    if (stored) {
      try { setSelectedMeetingFormat(JSON.parse(stored)); }
      catch { localStorage.removeItem("selectedMeetingFormat"); }
    } else {
      const def = {
        id: "general",
        title: "General",
        template: `【Meeting Name】
【Date】
【Location】
【Attendees】
【Agenda(1)】⚫︎Discussion⚫︎Decision items⚫︎Pending problem
【Agenda(2)】⚫︎Discussion⚫︎Decision items⚫︎Pending problem
【Agenda(3)】⚫︎Discussion⚫︎Decision items⚫︎Pending problem・・・・（Repeat the agenda items (4), (5), (6), and (7), if any, below.）・・`,
        selected: true,
      };
      setSelectedMeetingFormat(def);
      localStorage.setItem("selectedMeetingFormat", JSON.stringify(def));
    }
  }, []);

  // ★ Auth状態監視
  useEffect(() => {
    if (!authInstance) return;
    let unsub = () => {};
    (async () => {
      const { onAuthStateChanged } = await import('firebase/auth');
      unsub = onAuthStateChanged(authInstance, async (user) => {
        if (user && dbInstance) {
          try {
            const { doc, getDoc } = await import('firebase/firestore');
            const ref = doc(dbInstance, "users", user.uid);
            const snap = await getDoc(ref);
            if (snap.exists()) {
              const data = snap.data();
              setUserSubscription(!!data.subscription);
              if (typeof data.remainingSeconds === 'number') {
                setUserRemainingSeconds(data.remainingSeconds);
              }
            }
          } catch (e) {
            console.error("User data retrieval error:", e);
          }
        }
        // ここで UI を解放
        setIsUserDataLoaded(true);
      });
    })();
    return () => { try { unsub(); } catch {} };
  }, [authInstance, dbInstance]);

  // ★ Firestoreリアルタイム監視
  useEffect(() => {
    let stop = null;
    (async () => {
      if (!authInstance?.currentUser || !dbInstance) return;
      const { doc, onSnapshot } = await import('firebase/firestore');
      const ref = doc(dbInstance, "users", authInstance.currentUser.uid);
      stop = onSnapshot(ref, (ds) => {
        if (!ds.exists()) return;
        const data = ds.data();
        if (typeof data.remainingSeconds === 'number') setUserRemainingSeconds(data.remainingSeconds);
        if (typeof data.subscription !== 'undefined') setUserSubscription(!!data.subscription);
      });
    })();
    return () => { if (typeof stop === 'function') stop(); };
  }, [authInstance?.currentUser, dbInstance]);

  // ゲスト残時間の復元
  useEffect(() => {
    if (userSubscription) return;
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem(LOCAL_LAST_RESET_KEY);
    const storedRemaining = localStorage.getItem(LOCAL_REMAINING_KEY);
    if (storedDate === today && storedRemaining !== null) {
      setUserRemainingSeconds(parseInt(storedRemaining, 10));
    } else {
      setUserRemainingSeconds(DEFAULT_REMAINING);
      localStorage.setItem(LOCAL_REMAINING_KEY, DEFAULT_REMAINING);
      localStorage.setItem(LOCAL_LAST_RESET_KEY, today);
    }
  }, [userSubscription]);

  // ゲスト残時間の保存
  useEffect(() => {
    if (userSubscription) return;
    localStorage.setItem(LOCAL_REMAINING_KEY, userRemainingSeconds);
  }, [userRemainingSeconds, userSubscription]);

  // 日付跨ぎリセット
  useEffect(() => {
    if (userSubscription) return;
    const id = setInterval(async () => {
      if (userRemainingSeconds === 0) {
        const now = new Date().toDateString();
        if (lastResetDateRef.current !== now) {
          setUserRemainingSeconds(DEFAULT_REMAINING);
          if (authInstance?.currentUser && dbInstance) {
            try {
              const { doc, setDoc } = await import('firebase/firestore');
              await setDoc(
                doc(dbInstance, "users", authInstance.currentUser.uid),
                { remainingSeconds: DEFAULT_REMAINING },
                { merge: true }
              );
            } catch (err) {
              console.error("Firestore update error:", err);
            }
          }
          lastResetDateRef.current = now;
        }
      } else {
        lastResetDateRef.current = new Date().toDateString();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [userRemainingSeconds, userSubscription, authInstance, dbInstance]);

  // アンマウント時クリーンアップ
  useEffect(() => {
    const interval = progressIntervalRef.current;
    return () => {
      stopRecording();
      clearInterval(interval);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (recordingTimerIntervalRef.current) clearInterval(recordingTimerIntervalRef.current);
    };
  }, []);

  // FullScreenOverlay オープン時
  useEffect(() => { if (showFullScreen) setIsExpanded(false); }, [showFullScreen]);

  // 音声ファイル → STT → Firestore保存
// 音声ファイル → STT → Firestore保存（フル置き換え）
const processAudioFile = async (file) => {
  dbg('[stt] uploading', { name: file?.name, type: file?.type, size: file?.size });

  const url = URL.createObjectURL(file);
  setAudioURL(url);
  setProgressStep("uploading");

  setTimeout(async () => {
    setProgressStep("transcribing");
    try {
      const { transcription: newTranscription, minutes: newMinutes } = await transcribeAudio(
        file,
        selectedMeetingFormat?.template || "",
        setIsProcessing
      );
      setTranscription(newTranscription);
      setMinutes(newMinutes);
      if (newTranscription && newMinutes) {
        await saveMeetingRecord(newTranscription, newMinutes);
      }
    } catch (error) {
      console.error("An error occurred during STT processing:", error);
      setProgressStep("error");
    }
    setProgressStep("transcriptionComplete");
    setShowFullScreen(true);
  }, 500);
};

// === NEW: process a raw transcript (debug path) ===
const processDebugText = async (rawText) => {
  setProgressStep("transcribing");
  setIsProcessing(true);
  try {
    const resp = await fetch("/api/generate-minutes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript: rawText,
        outputType: "flexible", // 既定：Flexible JSON。クラシックにしたければ "classic"
        meetingFormat: selectedMeetingFormat?.template || "",
        lang: i18n.language,
      })
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const { transcription: newTranscription, minutes: newMinutes } = await resp.json();

    setTranscription(newTranscription || "");
    setMinutes(newMinutes || "");

    if (newTranscription && newMinutes) {
      await saveMeetingRecord(newTranscription, newMinutes);
    }
    setProgressStep("transcriptionComplete");
    setShowFullScreen(true);
  } catch (e) {
    console.error("processDebugText error:", e);
    setProgressStep("error");
  } finally {
    setIsProcessing(false);
  }
};



  // Firestore 保存
  const saveMeetingRecord = async (transcription, minutes) => {
    try {
      if (!authInstance?.currentUser || !dbInstance) {
        console.error("User is not logged in or DB not ready. Aborting save.");
        return;
      }
      const { collection, addDoc } = await import('firebase/firestore');

      const finalTranscription = transcription || "No transcription available.";
      const finalMinutes = minutes || "No minutes available.";
      const paperID = uuidv4();
      const creationDate = new Date();

      const docRef = await addDoc(collection(dbInstance, 'meetingRecords'), {
        paperID,
        transcription: finalTranscription,
        minutes: finalMinutes,
        createdAt: creationDate,
        uid: authInstance.currentUser.uid,
      });
      setMeetingRecordId(docRef.id);
      setProgressStep("completed");
    } catch (error) {
      console.error("Error occurred while saving meeting record:", error);
    }
  };

  // 録音トグル
  const toggleRecording = async () => {
    if (!userSubscription && userRemainingSeconds === 0) {
      if (!authInstance?.currentUser) router.push("/login");
      else router.push("/buy-tickets");
      return;
    }
  if (isRecording) {
    // === STOP ===
    if (isDebug()) {
      // デバッグ：録音結果の代わりに用意したテキストをNLPへ
      setIsRecording(false);
      setProgressStep("recordingComplete");
      const text = getDebugTranscript(i18n.language);
      await processDebugText(text);
      return;
    }

    await stopRecording();
    setProgressStep("recordingComplete");
    setIsRecording(false);
  } else {
    // === START ===
    const started = await startRecording();
    if (started) setIsRecording(true);
  }
  };

  // 録音開始
// 録音開始（フル置き換え）
// 録音開始（フル置き換え）
const startRecording = async () => {
  console.log('[RECDBG] startRecording invoked');

    if (isDebug()) {
    dbg('[RECDBG] DEBUG MODE: fake recording start (no getUserMedia)');
    // レベルアニメ等を動かしたい場合は必要に応じてここでrequestAnimationFrame起動も可
    return true; // そのまま isRecording=true へ
  }
  try {
    // === Firestore: 他端末録音ロック ===
    if (authInstance?.currentUser && dbInstance) {
      let currentDeviceId = localStorage.getItem("deviceId");
      if (!currentDeviceId) {
        currentDeviceId = uuidv4();
        localStorage.setItem("deviceId", currentDeviceId);
      }
      const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const userRef = doc(dbInstance, "users", authInstance.currentUser.uid);
      const docSnap = await getDoc(userRef);
      const data = docSnap.data();
      const storedDeviceId = data?.recordingDevice;
      const recordingTimestamp = data?.recordingTimestamp ? data.recordingTimestamp.toDate() : null;
      if (recordingTimestamp && (Date.now() - recordingTimestamp.getTime() < 300 * 1000)) {
        if (storedDeviceId && storedDeviceId !== currentDeviceId) {
          alert("Recording cannot be started because another device is currently recording.");
          return false;
        }
      } else {
        await setDoc(userRef, { recordingDevice: null }, { merge: true });
      }
      await setDoc(userRef, {
        recordingDevice: currentDeviceId,
        recordingTimestamp: serverTimestamp()
      }, { merge: true });
    }

    // === 環境情報ログ ===
    await logEnvAndPerms();

    // === 音声取得（Chrome 安定用に明示パラメータを少し強めに） ===
    const constraints = {
      audio: {
        channelCount: { ideal: 1 },
        sampleRate:   { ideal: 48000 },
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
        autoGainControl:  { ideal: true },
      }
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;

    // === MediaRecorder 準備 ===
    const wanted = pickAudioMimeType();
    const options = wanted ? { mimeType: wanted, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 };
    const mr = new MediaRecorder(stream, options);

    
zeroChunkCountRef.current = 0;

// 0バイト・チャンク検知とUI通知
mr.ondataavailable = (ev) => {
  const size = ev?.data?.size || 0;
  dbg('mr CHUNK', ev?.data?.type, size);
  if (size > 0) {
    window.__recdbg && window.__recdbg.__chunks && window.__recdbg.__chunks.push(ev.data);
    recordedChunksRef.current.push(ev.data);
    zeroChunkCountRef.current = 0; // 正常化したらリセット
  } else {
    zeroChunkCountRef.current++;
    if (zeroChunkCountRef.current >= 3) {
      setRecordingIssue({
        message: "The recorder is producing empty audio chunks.",
        hint: "Select a working input in Chrome’s site settings and ensure no other app is taking exclusive control."
      });
    }
  }
};

// トラックのライフサイクルをUIへ
const t = stream.getAudioTracks?.()[0];
if (t) {
  t.addEventListener('mute',   () => setRecordingIssue({
    message: "Input was muted by the system.",
    hint: "Unmute your mic or choose another device."
  }));
  t.addEventListener('unmute', () => setRecordingIssue(null));
  t.addEventListener('ended',  () => setRecordingIssue({
    message: "The input device was disconnected.",
    hint: "Reconnect or pick a different microphone."
  }));
}

// 念のため、レベル可視化ループを起動
animationFrameRef.current = requestAnimationFrame(updateAudioLevel);

    mediaRecorderRef.current = mr;
    recordedChunksRef.current = [];

    mr.ondataavailable = (ev) => {
      const size = ev?.data?.size || 0;
      dbg('mr CHUNK', ev?.data?.type, size);
      if (size > 0) {
        window.__recdbg && window.__recdbg.__chunks && window.__recdbg.__chunks.push(ev.data);
        recordedChunksRef.current.push(ev.data);
      } else {
        dbg('mr ZERO_CHUNK');
      }
    };

    mr.onstop = async () => {
      const recordedType = mr.mimeType || wanted || 'audio/webm';
      const ext = recordedType.includes('mp4') ? 'm4a' : recordedType.includes('ogg') ? 'ogg' : 'webm';
      const blob = new Blob(recordedChunksRef.current, { type: recordedType });
      const file = new File([blob], `recording.${ext}`, { type: recordedType });
      dbg('onstop file', { name: file.name, type: file.type, size: file.size });

      if (!selectedMeetingFormat) {
        alert("No meeting format selected. Please select one from MeetingFormatsList.");
        return;
      }
      await processAudioFile(file);
    };

    // デバッグ時のみ 1s スライス
    if (isDebug()) { mr.start(1000); } else { mr.start(); }

    // === WebAudio ===
    const AC = (window.AudioContext || window.webkitAudioContext);
    const ac = new AC();
    audioContextRef.current = ac;
    if (ac.state === 'suspended') {
      try { await ac.resume(); dbg('audioContext resumed'); } catch (e) { dbg('audioContext resume failed', e); }
    }

    // 入力 → Analyser
    const source = ac.createMediaStreamSource(stream);
    sourceRef.current = source;
    const analyser = ac.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;
    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);

    // 🔵 重要：Chrome で“消費先”を用意（最小音量で destination へ）
    const zero = ac.createGain();
    zero.gain.value = 0.00001;        // 実質ミュート
    analyser.connect(zero);
    zero.connect(ac.destination);

    // 🔵 重要：ミュートの <audio> にも流しておく（タブ最適化対策）
    try {
      if (!sinkAudioElRef.current) {
        const a = new Audio();
        a.muted = true;
        a.srcObject = stream;
        await a.play().catch(()=>{});
        sinkAudioElRef.current = a;
      } else {
        sinkAudioElRef.current.srcObject = stream;
      }
    } catch (e) { dbg('sink audio attach failed', e); }

    // 継続観測（デバッグ用ログ）
    attachRecorderDebug({ stream, mr, ac, analyser });

    // 🔵 重要：UI のレベル更新ループを開始
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);

    // 残り秒管理（既存ロジック）
    if (!userSubscription) {
      timerIntervalRef.current = setInterval(() => {
        setUserRemainingSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current); timerIntervalRef.current = null;
            stopRecording(0); setIsRecording(false); return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return true;
  } catch (err) {
    console.error("[RECDBG] getUserMedia error:", err?.name, err?.message, err);

    let msg = "";
    switch (err?.name) {
      case "NotAllowedError":
      case "SecurityError":
        msg = "マイクがブラウザまたはOSによりブロックされています。\n1) macOS: 設定>プライバシーとセキュリティ>マイクで Chrome を ON\n2) Chrome: サイト設定で マイク=許可 / chrome://settings/content/microphone を確認";
        break;
      case "NotFoundError":
        msg = "利用可能なマイクが見つかりません。macOSのサウンド入力や物理接続を確認してください。";
        break;
      case "NotReadableError":
        msg = "別のアプリがマイクを使用中の可能性。Zoom/Meet/Discord を終了してからお試しください。";
        break;
      case "OverconstrainedError":
        msg = "指定条件に一致するマイクがありません（deviceId等）。Chromeの既定マイクを確認してください。";
        break;
      default:
        msg = "マイク取得に失敗しました。Chromeのサイト権限、OSのマイク権限、他アプリの占有を確認してください。";
    }
 setRecordingIssue({
   message: "Could not access the microphone.",
   hint: msg.replace(/\n/g, " ")
 });
 return false;
  }
};


  // 録音停止
// 録音停止（フル置き換え）
const stopRecording = async (finalRemaining = userRemainingSeconds) => {
  try {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      try { mr.requestData(); dbg('mr requestData()'); } catch {}
      mr.stop();
    }
    cancelAnimationFrame(animationFrameRef.current);

    if (audioContextRef.current) await audioContextRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());

    audioContextRef.current = null;
    analyserRef.current = null;
    dataArrayRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    mediaRecorderRef.current = null;

    setAudioLevel(1);
    silenceSecondsRef.current = 0;
zeroChunkCountRef.current = 0;
setRecordingIssue(null);

    if (!userSubscription) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      try {
        if (authInstance?.currentUser && dbInstance) {
          const { doc, setDoc } = await import('firebase/firestore');
          await setDoc(
            doc(dbInstance, "users", authInstance.currentUser.uid),
            { remainingSeconds: finalRemaining },
            { merge: true }
          );
        }
      } catch (err) {
        console.error("Error updating remaining time:", err);
      }
    }
    if (authInstance?.currentUser && dbInstance) {
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(
          doc(dbInstance, "users", authInstance.currentUser.uid),
          { recordingDevice: null, recordingTimestamp: null },
          { merge: true }
        );
      } catch (error) {
        console.error("Failed to reset recordingDevice:", error);
      }
    }
  } catch (e) {
    console.error('stopRecording error', e);
  }
};


  // 音量レベル（RAF）
  const updateAudioLevel = () => {
    if (analyserRef.current && dataArrayRef.current) {
      analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
      let sumSquares = 0;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        const normalized = dataArrayRef.current[i] / 128 - 1;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / dataArrayRef.current.length);
      const normalizedRms = Math.min(Math.max(rms * 40, 1), 2);

      const alpha = 0.2;
      setAudioLevel((prev) => alpha * normalizedRms + (1 - alpha) * prev);

        // --- silence watchdog (≈ below -50 dBFS equivalent)
  const SILENCE_TH = 0.006;      // tuned for byteTimeDomainData
  const MAX_SILENT_SECS = 5;
  if (rms < SILENCE_TH) {
    silenceSecondsRef.current += 1/60; // assuming ≈60fps
    if (silenceSecondsRef.current > MAX_SILENT_SECS && isRecording) {
      setRecordingIssue({
        message: "No input detected for a while.",
        hint: "Check your mic level, input source, and noise-suppression/AGC settings."
      });
    }
  } else {
    silenceSecondsRef.current = 0;
    // clear the issue only if it was a silence warning
    if (recordingIssue?.message?.startsWith("No input detected")) {
      setRecordingIssue(null);
    }
  }

      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const RING_SIZE = 80;
  const STROKE = 4;
  const R = (RING_SIZE - STROKE) / 2;
  const C = 2 * Math.PI * R;
  const remainRatio = recordingCountdown / 3600;
  const dashoffset = C * (1 - remainRatio);

  const { ready } = useAuthGate(false);
  if (!ready) return null;

  return (
    <>
      {/* === SEOメタ === */}
      <Head>
        <title>{pageTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={metaDesc} />
        <link rel="canonical" href={canonical} />
        {altURLs.map(({ l, href }) => (
          <link key={l} rel="alternate" hrefLang={l} href={href} />
        ))}
        <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDesc} />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta property="og:locale" content={ogLocale} />
        {(locales || []).filter((l) => (OG_LOCALE_MAP[l] && l !== locale)).map((l) => (
          <meta key={l} property="og:locale:alternate" content={OG_LOCALE_MAP[l]} />
        ))}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@your_brand" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                { "@type": "Organization", name: "Sense LLC", url: SITE_URL, logo: `${SITE_URL}/logo.png` },
                { "@type": "WebSite", url: SITE_URL, name: "Minutes.AI" },
                {
                  "@type": "SoftwareApplication",
                  name: "Minutes.AI",
                  description: ogDesc,
                  applicationCategory: "BusinessApplication",
                  operatingSystem: "iOS, Web",
                  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
                  downloadUrl: LINK_IOS
                }
              ]
            })
          }}
        />
      </Head>
    <RecordingIssueBanner
      issue={recordingIssue}
      onClose={() => setRecordingIssue(null)}
    />
      <div
        className="container"
        style={{
          /* minHeight は CSS 側で svh/dvh を使って指定（ここでは外す） */
          background:
            'radial-gradient(640px 640px at 50% calc(50% - 24px), rgba(0,0,0,0.028), rgba(0,0,0,0) 64%), #F8F7F4'
        }}
      >
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {!showFullScreen && <PurchaseMenu />}

          {/* 中央の録音 UI */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 5,
            }}
          >
            <div
              style={{
                transform: isRecording ? 'none' : `scale(${audioLevel})`,
                transition: 'transform 120ms linear',
                willChange: 'transform',
              }}
            >
              <div className={!isRecording ? 'pulse' : ''} style={{ display: 'inline-block' }}>
                {isRecording ? (
                  <GlassRecordButton
                    isRecording={isRecording}
                    audioLevel={audioLevel}
                    onClick={toggleRecording}
                    size={420}
                  />
                ) : (
                  <button
                    onClick={toggleRecording}
                    aria-label="Start recording"
                    style={{
                      width: 420,
                      height: 420,
                      border: 'none',
                      padding: 0,
                      background: 'transparent',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      transform: 'none',
                      transition: 'transform 120ms ease',
                    }}
                  >
                    <img
                      src="/record-gradient.png"
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        pointerEvents: 'none',
                        userSelect: 'none',
                      }}
                    />
                  </button>
                )}
              </div>
            </div>


          </div>

          {showFullScreen && (
            <FullScreenOverlay
              setShowFullScreen={setShowFullScreen}
              isExpanded={isExpanded}
              setIsExpanded={setIsExpanded}
              transcription={transcription}
              minutes={minutes}
              audioURL={audioURL}
              docId={meetingRecordId}
            />
          )}
          {isProcessing && <ProgressIndicator progressStep={progressStep} />}
        </div>

        {/* 残時間表示 */}
        {isUserDataLoaded && (
          <>
            <div style={{
              position: 'absolute',
              bottom: 'calc((50vh - 160px) / 2)',
              left: '50%',
              transform: 'translate(-50%, 60px)',
              color: 'black',
              fontSize: '54px',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '80px'
            }}>
              {userSubscription ? (
                <span style={{
                  background: 'linear-gradient(45deg, rgb(153,184,255), rgba(115,115,255,1), rgba(102,38,153,1), rgb(95,13,133), rgba(255,38,38,1), rgb(199,42,76))',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  fontSize: '72px',
                  fontFamily: 'Impact, sans-serif',
                  lineHeight: '1'
                }}>♾️</span>
              ) : (
                <span style={{ fontFamily: 'Impact, sans-serif', fontSize: '72px', lineHeight: '1' }}>
                  {userRemainingSeconds === 0 ? "Recovering..." : formatTime(userRemainingSeconds)}
                </span>
              )}
            </div>

            {/* 左上カウントダウン（MAX / 60:00） */}
            <div
              aria-label="Recording countdown (max 60:00)"
              style={{
                position: 'absolute',
                top: 20,
                left: 20,
                width: RING_SIZE,
                height: RING_SIZE,
                zIndex: 10,
                pointerEvents: 'none',
              }}
            >
              <svg
                width={RING_SIZE}
                height={RING_SIZE}
                viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
                style={{ display: 'block' }}
              >
                <g style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}>
                  <circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={R}
                    fill="none"
                    stroke="#000"
                    strokeWidth={STROKE}
                    strokeLinecap="butt"
                    strokeDasharray={C}
                    strokeDashoffset={dashoffset}
                  />
                </g>
              </svg>

              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  color: '#000',
                  userSelect: 'none',
                  pointerEvents: 'none',
                  lineHeight: 1.05,
                }}
              >
                <div style={{ fontSize: 10, letterSpacing: 2, fontWeight: 700 }}>MAX</div>
                <div style={{ fontFamily: 'Impact, sans-serif', fontWeight: 900, fontSize: 22 }}>
                  {formatTime(recordingCountdown)}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <style jsx>{`
  @keyframes pulse {
    0%,100% { transform: scale(0.92); }
    50%     { transform: scale(1.18); }
  }
  .pulse { animation: pulse 6s ease-in-out infinite; }
  @media (prefers-reduced-motion: reduce) {
    .pulse { animation: none; }
  }
`}</style>
      {/* ===== グローバル修正（黒帯対策＋vhの安定化） ===== */}
      <style jsx global>{`
        /* 1) ルートを常に塗りつぶし（背景黒が見えないように） */
        html, body, #__next { height: 100%; background: #F8F7F4; }
        body { margin: 0; overflow-x: hidden; } /* 横のはみ出しを封じる（オーバーフロー原因の可視化は devtools で） */

        /* 2) 100vh 問題：svh/dvh を優先して使い、未対応は vh にフォールバック */
        .container { min-height: 100vh; }                 /* フォールバック */
        @supports (min-height: 100svh) { .container { min-height: 100svh; } } /* アドレスバー表示時でも欠けにくい */
        @supports (min-height: 100dvh) { .container { min-height: 100dvh; } } /* 動的に追従 */

        /* 3) iOS のホームインジケータ等のセーフエリア確保 */
        .container { padding-bottom: env(safe-area-inset-bottom); }
      `}</style>
    </>
  );
}

export default App;

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common','home','seo'])),
    },
    revalidate: 60,
  };
}
