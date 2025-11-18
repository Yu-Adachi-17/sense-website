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
import { v4 as uuidv4 } from 'uuid';
import PurchaseMenu from './purchasemenu';
import GlassRecordButton from '../components/GlassRecordButton';

import { getClientAuth, getDb } from '../firebaseConfig';
import { useAuthGate } from "../hooks/useAuthGate";
import { isDebug, dbg, pickAudioMimeType, logEnvAndPerms, attachRecorderDebug, RecordingIssueBanner } from '../lib/recordingKit';
import { apiFetch } from "../lib/apiClient";

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
  ja: `（1on1ミーティング・テスト）部下：お疲れ様です、今ちょっとお時間いいですか？上司：いいよ、どうした？部下：今月のプロジェクトの進捗なんですが、目標値の達成が少し厳しいかもしれません。特にAPI連携の部分で外部チームとの調整が遅れていて…。上司：なるほど。遅れてる原因は技術的な問題？それともコミュニケーションの部分？部下：どちらかというと後者です。仕様が確定していないまま進めてしまった部分があって、途中で変更が入ってしまったんです。上司：それは痛いな。でも、原因がはっきりしてるならまだリカバリはできる。今はどの段階？部下：設計書の再確認が終わって、実装を半分くらいまで戻しました。来週中には再度テストまで持っていけると思います。上司：よし、そこまで見えてるなら大丈夫そうだな。ただ、同じことを繰り返さないように、次の案件からは仕様が100%確定してから手を動かすようにしよう。部下：はい、反省してます。自分の中でも焦りがあって、早く形にしようとしすぎました。上司：焦る気持ちは分かるけど、結局修正に時間を取られるとトータルで遅くなる。スピードと正確さのバランスを意識して。部下：わかりました。あと、チーム内のタスク分担も見直したほうがいいと思っています。今は僕がコードレビューまで全部やってるので、ボトルネックになっているかもしれません。上司：それはいい提案だな。権限を少し委譲してもいい。中堅メンバーにレビューの一部を任せてみよう。部下：そうします。あと、次のスプリントで新しい機能追加が予定されていますが、現状だとリスクが高いので、一度優先度を下げる判断もありかと。上司：うん、判断は正しい。まずは既存部分を安定させるのが先だ。リリースに影響が出ると全体が止まるからね。部下：ありがとうございます。今週中に修正版の進捗をまとめて報告します。上司：よろしく。無理しすぎず、でもちゃんと責任は持ってな。成長してるのは見えてるから。部下：はい、ありがとうございます。頑張ります。`,
  en: `（1on1ミーティング・テスト）部下：お疲れ様です、今ちょっとお時間いいですか？上司：いいよ、どうした？部下：今月のプロジェクトの進捗なんですが、目標値の達成が少し厳しいかもしれません。特にAPI連携の部分で外部チームとの調整が遅れていて…。上司：なるほど。遅れてる原因は技術的な問題？それともコミュニケーションの部分？部下：どちらかというと後者です。仕様が確定していないまま進めてしまった部分があって、途中で変更が入ってしまったんです。上司：それは痛いな。でも、原因がはっきりしてるならまだリカバリはできる。今はどの段階？部下：設計書の再確認が終わって、実装を半分くらいまで戻しました。来週中には再度テストまで持っていけると思います。上司：よし、そこまで見えてるなら大丈夫そうだな。ただ、同じことを繰り返さないように、次の案件からは仕様が100%確定してから手を動かすようにしよう。部下：はい、反省してます。自分の中でも焦りがあって、早く形にしようとしすぎました。上司：焦る気持ちは分かるけど、結局修正に時間を取られるとトータルで遅くなる。スピードと正確さのバランスを意識して。部下：わかりました。あと、チーム内のタスク分担も見直したほうがいいと思っています。今は僕がコードレビューまで全部やってるので、ボトルネックになっているかもしれません。上司：それはいい提案だな。権限を少し委譲してもいい。中堅メンバーにレビューの一部を任せてみよう。部下：そうします。あと、次のスプリントで新しい機能追加が予定されていますが、現状だとリスクが高いので、一度優先度を下げる判断もありかと。上司：うん、判断は正しい。まずは既存部分を安定させるのが先だ。リリースに影響が出ると全体が止まるからね。部下：ありがとうございます。今週中に修正版の進捗をまとめて報告します。上司：よろしく。無理しすぎず、でもちゃんと責任は持ってな。成長してるのは見えてるから。部下：はい、ありがとうございます。頑張ります。`
};

// API base
const API_BASE = '';

function getDebugTranscript(lang) {
  if (lang && DEBUG_TRANSCRIPTS[lang]) return DEBUG_TRANSCRIPTS[lang].trim();
  return DEBUG_TRANSCRIPTS.ja.trim();
}

/** ===== NLP locale helpers ===== */
function normalizeLocaleTag(tag) {
  if (!tag) return null;
  const t = String(tag).toLowerCase();
  if (t.startsWith('ja')) return 'ja';
  if (t.startsWith('en')) return 'en';
  if (t.startsWith('sv')) return 'sv';
  if (t.startsWith('de')) return 'de';
  if (t.startsWith('fr')) return 'fr';
  if (t.startsWith('es')) return 'es';
  if (t.startsWith('ko')) return 'ko';
  if (t.startsWith('zh-tw')) return 'zh-TW';
  if (t.startsWith('zh') || t.startsWith('zh-cn')) return 'zh-CN';
  if (t.startsWith('tr')) return 'tr';
  if (t.startsWith('pt')) return 'pt';
  if (t.startsWith('id')) return 'id';
  if (t.startsWith('ms')) return 'ms';
  return t;
}

function guessLocaleFromText(text, fallback) {
  const fb = normalizeLocaleTag(fallback) || 'en';
  if (!text || typeof text !== 'string') return fb;
  const hasHiraganaKatakana = /[\u3040-\u30FF]/.test(text);
  const hasCJK = /[\u4E00-\u9FFF]/.test(text);
  const hasHangul = /[\uAC00-\uD7AF]/.test(text);
  const hasCyrillic = /[\u0400-\u04FF]/.test(text);
  if (hasHiraganaKatakana || (hasCJK && /[ぁ-んァ-ン]/.test(text))) return 'ja';
  if (hasHangul) return 'ko';
  if (hasCJK && !hasHiraganaKatakana) return 'zh-CN';
  if (hasCyrillic) return 'ru';
  return fb;
}

// guest keys
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

  const pageTitle = t("Minutes.AI — Top");
  const ogTitle  = t("Minutes.AI — AI Meeting Minutes");
  const metaDesc = t("minutes-listful meeting minutes with AI. Record once, get accurate transcripts with clear decisions and action items. Works on iPhone and the web.");
  const ogDesc   = t("Record your meeting and let AI produce clean, human-ready minutes—decisions and to-dos at a glance.");

  // auth/db
  const [authInstance, setAuthInstance] = useState(null);
  const [dbInstance, setDbInstance] = useState(null);

  // UI states
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(1);
  const [audioURL, setAudioURL] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [minutes, setMinutes] = useState('');
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState("start");
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

  // ===== スマホ判定 & 画面高から球体サイズを決める =====
  const [isMobile, setIsMobile] = useState(false);
  const [vh, setVh] = useState(0);
  useEffect(() => {
    const refresh = () => {
      if (typeof window === 'undefined') return;
      setIsMobile(window.matchMedia('(max-width: 600px)').matches);
      setVh(window.innerHeight || 0);
    };
    refresh();
    window.addEventListener('resize', refresh);
    window.addEventListener('orientationchange', refresh);
    return () => {
      window.removeEventListener('resize', refresh);
      window.removeEventListener('orientationchange', refresh);
    };
  }, []);

  // 球体サイズ
  const mobileRecordSize = Math.max(220, Math.min(Math.round(vh * 0.44), 300));
  const DESKTOP_RECORD_SIZE = 420;
  const recordSize = isMobile ? mobileRecordSize : DESKTOP_RECORD_SIZE;

  // セーフエリア上端
  const safeTop = 'calc(env(safe-area-inset-top, 0px) + 12px)';

  // title/dir, debug latch
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

  // auth/db
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [a, d] = await Promise.all([getClientAuth(), getDb()]);
      if (!mounted) return;
      setAuthInstance(a || null);
      setDbInstance(d || null);
      if (!a) setIsUserDataLoaded(true);
    })();
    const t = setTimeout(() => setIsUserDataLoaded((v) => v || true), 2000);
    return () => { mounted = false; clearTimeout(t); };
  }, []);

  // 60分カウント
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

  // meeting format 復元
  useEffect(() => {
    const stored = localStorage.getItem("selectedMeetingFormat");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.id) {
          setSelectedMeetingFormat(parsed);
          return;
        }
      } catch { localStorage.removeItem("selectedMeetingFormat"); }
    }
    const def = { id: "general", displayName: "General", schemaId: "general-json@1", selected: true };
    setSelectedMeetingFormat(def);
    localStorage.setItem("selectedMeetingFormat", JSON.stringify(def));
  }, []);

  // Auth 監視
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
          } catch (e) { console.error("User data retrieval error:", e); }
        }
        setIsUserDataLoaded(true);
      });
    })();
    return () => { try { unsub(); } catch {} };
  }, [authInstance, dbInstance]);

  // user doc リアルタイム
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

  // ゲスト残時間
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

  useEffect(() => {
    if (userSubscription) return;
    localStorage.setItem(LOCAL_REMAINING_KEY, userRemainingSeconds);
  }, [userRemainingSeconds, userSubscription]);

  // 日付跨ぎ
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
            } catch (err) { console.error("Firestore update error:", err); }
          }
          lastResetDateRef.current = now;
        }
      } else {
        lastResetDateRef.current = new Date().toDateString();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [userRemainingSeconds, userSubscription, authInstance, dbInstance]);

  // unmount cleanup
  useEffect(() => {
    const interval = progressIntervalRef.current;
    return () => {
      stopRecording();
      clearInterval(interval);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (recordingTimerIntervalRef.current) clearInterval(recordingTimerIntervalRef.current);
    };
  }, []);

  // overlay開時は縮小ビューに戻す
  useEffect(() => { if (showFullScreen) setIsExpanded(false); }, [showFullScreen]);

  // ===== 音声 → STT → minutes =====
// src/pages/index.js

  // ===== 音声 → STT → minutes =====
  const processAudioFile = async (file) => {
    dbg('[stt] uploading', { name: file?.name, type: file?.type, size: file?.size });
    const url = URL.createObjectURL(file);
    setAudioURL(url);
    setProgressStep("uploading");

    // 1. ★ 処理が開始したことをセット (インジケーター表示)
    setIsProcessing(true);

    setTimeout(async () => {
      // 2. "transcribing" (25%) をセット
      setProgressStep("transcribing");

      try {
        // 3. ★ あなたの「正常に動作していた」コードのロジック
        // transcribeAudio が文字起こしと議事録生成の両方を実行する
        const { transcription: newTranscription, minutes: newMinutes } = await transcribeAudio(
          file,
          selectedMeetingFormat.template, // ← おそらく、この引数が重要
          null // ★ setIsProcessing を渡すのをやめる
        );

        // 4. state を更新
        setTranscription(newTranscription || "");
        setMinutes(newMinutes || "");

        // 5. 結果が存在すれば議事録を保存
        if (newTranscription && newMinutes) {
          await saveMeetingRecord(newTranscription, newMinutes);
        }

        // 6. 【成功時】
        setProgressStep("transcriptionComplete");
        setShowFullScreen(true); // 結果画面のアニメーション(0.5s)が開始

        // 7. ★ FIX: 画面遷移のアニメーションが終わるまでインジケーターを消さない
        setTimeout(() => {
          setIsProcessing(false);
        }, 500); // 500msは fullscreenoverlay.js の transition 時間と一致

      } catch (error) {
        // 8. 【エラー発生時】
        console.error("An error occurred during STT/Generate processing:", error);
        setProgressStep("error"); // "0%へ減少" のアニメーションを開始

        // 9. ★ FIX: エラーアニメーションが終わるのを待ってからインジケーターを消す
        setTimeout(() => {
          setIsProcessing(false);
        }, 2000); // 2秒間、エラー表示(0%)をキープする
      }
    }, 500);
  };

  // === デバッグ: テキスト直処理 ===
  const processDebugText = async (rawText) => {
    setProgressStep("transcribing");
    setIsProcessing(true);
    try {
      const fallbackLocale =
        normalizeLocaleTag(i18n.language) ||
        normalizeLocaleTag(router.locale) ||
        normalizeLocaleTag(typeof navigator !== 'undefined' ? navigator.language : 'en') ||
        'en';
      const effectiveLocale = guessLocaleFromText(rawText, fallbackLocale);

      const resp = await apiFetch(`/api/generate-minutes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Locale": effectiveLocale },
        body: JSON.stringify({
          transcript: rawText,
          formatId: selectedMeetingFormat?.id || "general",
          locale: effectiveLocale,
        })
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const { minutes: newMinutes, transcription: maybeEcho } = await resp.json();

      setTranscription(maybeEcho || rawText || "");
      setMinutes(newMinutes || "");

      if ((maybeEcho || rawText) && newMinutes) {
        await saveMeetingRecord(maybeEcho || rawText, newMinutes);
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
  const saveMeetingRecord = async (transcriptionText, minutesText) => {
    try {
      if (!authInstance?.currentUser || !dbInstance) {
        console.error("User is not logged in or DB not ready. Aborting save.");
        return;
      }
      const { collection, addDoc } = await import('firebase/firestore');

      const finalTranscription = transcriptionText || "No transcription available.";
      const finalMinutes = minutesText || "No minutes available.";
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
    if (typeof window !== 'undefined' && window.__side_menu_open === true) return;

    if (!userSubscription && userRemainingSeconds === 0) {
      if (!authInstance?.currentUser) router.push("/login");
      else router.push("/upgrade");
      return;
    }

    if (shouldUseTextMode()) {
      const text = getDebugTranscript(i18n.language);
      await processDebugText(text);
      return;
    }

    if (isRecording) {
      await stopRecording();
      setProgressStep("recordingComplete");
      setIsRecording(false);
    } else {
      const started = await startRecording();
      if (started) setIsRecording(true);
    }
  };

  const shouldUseTextMode = () => {
    try {
      if (isDebug()) return true;
      if (typeof window !== 'undefined') {
        const q = new URLSearchParams(window.location.search);
        if (q.get('debug') === '1' || q.get('text') === '1') return true;
        if (localStorage.getItem('force_text_mode') === '1') return true;
      }
    } catch {}
    return false;
  };

  // 録音開始
  const startRecording = async () => {
    console.log('[RECDBG] startRecording invoked');
    try {
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

      await logEnvAndPerms();

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

      const wanted = pickAudioMimeType();
      const options = wanted ? { mimeType: wanted, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 };
      const mr = new MediaRecorder(stream, options);

      zeroChunkCountRef.current = 0;

      mr.ondataavailable = (ev) => {
        const size = ev?.data?.size || 0;
        dbg('mr CHUNK', ev?.data?.type, size);
        if (size > 0) {
          window.__recdbg && window.__recdbg.__chunks && window.__recdbg.__chunks.push(ev.data);
          recordedChunksRef.current.push(ev.data);
          zeroChunkCountRef.current = 0;
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

      const t = stream.getAudioTracks?.()[0];
      if (t) {
        t.addEventListener('mute',   () => setRecordingIssue({ message: "Input was muted by the system.", hint: "Unmute your mic or choose another device." }));
        t.addEventListener('unmute', () => setRecordingIssue(null));
        t.addEventListener('ended',  () => setRecordingIssue({ message: "The input device was disconnected.", hint: "Reconnect or pick a different microphone." }));
      }

      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);

      mediaRecorderRef.current = mr;
      recordedChunksRef.current = [];

      mr.onstop = async () => {
        const recordedType = mr.mimeType || wanted || 'audio/webm';
        const ext = recordedType.includes('mp4') ? 'm4a' : recordedType.includes('ogg') ? 'ogg' : 'webm';
        const blob = new Blob(recordedChunksRef.current, { type: recordedType });
        const file = new File([blob], `recording.${ext}`, { type: recordedType });
        dbg('onstop file', { name: file.name, type: file.type, size: file.size });

        if (!selectedMeetingFormat) {
          alert("No meeting format selected. Please select one from Meeting Formats.");
          return;
        }
        await processAudioFile(file);
      };

      mr.start();

      const AC = (window.AudioContext || window.webkitAudioContext);
      const ac = new AC();
      audioContextRef.current = ac;
      if (ac.state === 'suspended') { try { await ac.resume(); dbg('audioContext resumed'); } catch (e) { dbg('audioContext resume failed', e); } }

      const source = ac.createMediaStreamSource(stream);
      sourceRef.current = source;
      const analyser = ac.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);

      const zero = ac.createGain();
      zero.gain.value = 0.00001;
      analyser.connect(zero);
      zero.connect(ac.destination);

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

      attachRecorderDebug({ stream, mr, ac, analyser });
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);

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
          msg = "The microphone is blocked by the browser or OS. Please check macOS mic permissions and Chrome’s site settings.";
          break;
        case "NotFoundError":
          msg = "No available microphone was found. Check your macOS input settings and any physical connections.";
          break;
        case "NotReadableError":
          msg = "Another app may be using the microphone. Close Zoom/Meet/Discord and try again.";
          break;
        case "OverconstrainedError":
          msg = "No microphone matches the requested constraints (e.g., deviceId). Verify Chrome’s default input device.";
          break;
        default:
          msg = "Failed to access the microphone. Check Chrome’s site permissions, macOS mic permissions, and whether another app is taking exclusive control.";
      }
      setRecordingIssue({ message: "Could not access the microphone.", hint: msg.replace(/\n/g, " ") });
      return false;
    }
  };

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
        if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }
        try {
          if (authInstance?.currentUser && dbInstance) {
            const { doc, setDoc } = await import('firebase/firestore');
            await setDoc(
              doc(dbInstance, "users", authInstance.currentUser.uid),
              { remainingSeconds: finalRemaining },
              { merge: true }
            );
          }
        } catch (err) { console.error("Error updating remaining time:", err); }
      }
      if (authInstance?.currentUser && dbInstance) {
        try {
          const { doc, setDoc } = await import('firebase/firestore');
          await setDoc(
            doc(dbInstance, "users", authInstance.currentUser.uid),
            { recordingDevice: null, recordingTimestamp: null },
            { merge: true }
          );
        } catch (error) { console.error("Failed to reset recordingDevice:", error); }
      }
    } catch (e) { console.error('stopRecording error', e); }
  };

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

      const SILENCE_TH = 0.006;
      const MAX_SILENT_SECS = 5;
      if (rms < SILENCE_TH) {
        silenceSecondsRef.current += 1/60;
        if (silenceSecondsRef.current > MAX_SILENT_SECS && isRecording) {
          setRecordingIssue({
            message: "No input detected for a while.",
            hint: "Check your mic level, input source, and noise-suppression/AGC settings."
          });
        }
      } else {
        silenceSecondsRef.current = 0;
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
    return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  };

  const RING_SIZE = 80;
  const STROKE = 4;
  const R = (RING_SIZE - STROKE) / 2;
  const C = 2 * Math.PI * R;
  const remainRatio = recordingCountdown / 3600;
  const dashoffset = C * (1 - remainRatio);

  const { ready } = useAuthGate(false);
  if (!ready) return null;

  // ===== Render =====
  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={metaDesc} />
        <link rel="canonical" href={canonical} />
        {altURLs.map(({ l, href }) => (<link key={l} rel="alternate" hrefLang={l} href={href} />))}
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

      <RecordingIssueBanner issue={recordingIssue} onClose={() => setRecordingIssue(null)} />

      <div
        className="container"
        style={{
          background:
            'radial-gradient(640px 640px at 50% calc(50% - 24px), rgba(0,0,0,0.028), rgba(0,0,0,0) 64%), #F8F7F4'
        }}
      >
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {!showFullScreen && (
            <div style={{ position: 'relative', zIndex: 20 }}>
              <PurchaseMenu />
            </div>
          )}

          {/* 中央の録音 UI */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1,
              pointerEvents: (typeof window !== 'undefined' && window.__side_menu_open) ? 'none' : 'auto',
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
                    size={recordSize}
                  />
                ) : (
                  <button
                    onClick={toggleRecording}
                    aria-label="Start recording"
                    style={{
                      width: recordSize,
                      height: recordSize,
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

        {/* 残時間表示（少し上に） */}
        {isUserDataLoaded && (
          <>
            <div style={{
              position: 'absolute',
              left: '50%',
              top: `calc(50% + ${Math.round(recordSize / 2) + (isMobile ? 16 : 10)}px)`,
              transform: 'translateX(-50%)',
              color: 'black',
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
                  fontSize: isMobile ? 64 : 72,
                  fontFamily: 'Impact, sans-serif',
                  lineHeight: '1'
                }}>♾️</span>
              ) : (
                <span style={{ fontFamily: 'Impact, sans-serif', fontSize: isMobile ? 64 : 72, lineHeight: '1' }}>
                  {userRemainingSeconds === 0 ? "Recovering..." : formatTime(userRemainingSeconds)}
                </span>
              )}
            </div>
          </>
        )}

        {/* 残り時間のすぐ下にフォーマット名（Impact / 約1/2サイズ） */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: `calc(50% + ${Math.round(recordSize / 2) + (isMobile ? 80 : 84)}px)`,
            transform: 'translateX(-50%)',
            zIndex: 12,
          }}
        >
          <Link href="/meeting-formats" legacyBehavior>
            <a
              aria-label="Choose Meeting Format"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                fontFamily: 'Impact, sans-serif',
                fontSize: isMobile ? 30 : 34,
                letterSpacing: 1,
                color: '#000',
                lineHeight: '1.1',
              }}
            >
              {selectedMeetingFormat?.displayName || 'General'}
            </a>
          </Link>
        </div>

        {/* 左上 MAX 60:00 */}
        <div
          aria-label="Recording countdown (max 60:00)"
          style={{
            position: 'fixed',
            top: safeTop,
            left: '12px',
            width: RING_SIZE,
            height: RING_SIZE,
            zIndex: 2147483600,
            pointerEvents: 'none',
          }}
        >
          <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} style={{ display: 'block' }}>
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
              position: 'absolute', inset: 0, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 2, color: '#000', userSelect: 'none', pointerEvents: 'none', lineHeight: 1.05,
            }}
          >
            <div style={{ fontSize: 10, letterSpacing: 2, fontWeight: 700 }}>MAX</div>
            <div style={{ fontFamily: 'Impact, sans-serif', fontWeight: 900, fontSize: 22 }}>
              {formatTime(recordingCountdown)}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse { 0%,100% { transform: scale(0.92); } 50% { transform: scale(1.18); } }
        .pulse { animation: pulse 6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .pulse { animation: none; } }
      `}</style>

      {/* ===== グローバル修正 ===== */}
      <style jsx global>{`
        html, body, #__next { height: 100%; background: #F8F7F4; }
        body { margin: 0; overflow-x: hidden; }
        .container { min-height: 100vh; }
        @supports (min-height: 100svh) { .container { min-height: 100svh; } }
        @supports (min-height: 100dvh) { .container { min-height: 100dvh; } }
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
