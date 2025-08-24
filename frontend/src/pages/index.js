import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import FullScreenOverlay from './fullscreenoverlay';
import ProgressIndicator from './progressindicator';
import { transcribeAudio } from '../utils/ChatGPTs';
import { Success, Cancel } from '../AfterPayment';
import PurchaseMenu from './purchasemenu';


import MinutesList from './minutes-list';
import MinutesDetail from './minutesdetail';


import ServicesWrapper from '../routes/ServicesWrapper';
import RedirectToServices from '../routes/RedirectToServices';
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';


// ----------------------
// FileUploadButton Component (for debugging file uploads)
// ----------------------
function FileUploadButton({ onFileSelected }) {
  const fileInputRef = useRef(null);

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log("Selected file:", file.name);
      console.log("Detected MIME type:", file.type);
      // ファイル形式のバリデーションを完全に削除
      onFileSelected(file);
    }
  };

  return (
    <div style={{ position: 'absolute', top: 20, right: 30 }}>
      <input
        type="file"
        accept="*/*"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button
        onClick={handleButtonClick}
        style={{ background: 'red', color: 'black', padding: '10px', borderRadius: '5px', cursor: 'pointer' }}
      >
        Debug Upload
      </button>
    </div>
  );
}

/* ============================================================
   ★ 録音中だけ使うボタン（SwiftUIの見た目をJS/CSSで再現）
   - 白に近い均一面 + 1px白ストローク
   - 外側：白の持ち上げシャドウ / 黒の落ち影
   - 下側だけに出る 8px の極薄リング（blur+mask）
   - 外側は静止、動くのは白ラインのみ
   ============================================================ */
function GlassRecordButton({ isRecording, audioLevel, onClick, size = 420 }) {
  const [phase, setPhase] = useState(0);
  const phaseRef = useRef(0);
  const rafRef = useRef(null);

  // === 音量→アクティビティ変換（しきい値＆感度） ===
  // audioLevel: 1.0〜2.0（既存の実装）
  // DEAD_ZONE を 0.02 に設定：1.02 未満は完全静止（無音時の“勝手に動く”を防止）
// ==== 👇ここが閾値＆感度のつまみ ====
const LVL_BASE = 1.0;       // audioLevel の無音基準（既存ロジックで 1）
const THRESHOLD = 0.008;    // ← 閾値。小さくすると反応しやすい（例: 0.003〜0.015）
const GAIN = 1.9;           // ← 感度。大きくすると振幅/速度が増える（例: 1.2〜2.5）
const SPEED_BASE = 0.04;    // 最低速度（微小入力時）
const SPEED_GAIN = 1.0;     // 入力に応じた加速
const AMP_MIN = 0;          // 無音時に完全停止したいなら 0（少しでも揺らしたいなら 4 など）
const AMP_MAX = 56;         // 最大振幅
// ====================================

// 0〜1 に正規化した “activity”
const raw = Math.max(0, audioLevel - (LVL_BASE + THRESHOLD));
const activity = Math.min(1, (raw * GAIN) / (2 - LVL_BASE)); // audioLevel の上限は ~2

// 位相（速度）：activity が 0 の時は更新しない＝完全静止
const speed = SPEED_BASE + activity * SPEED_GAIN;

// 振幅：activity に比例（無音は AMP_MIN）
const amp = activity === 0 ? 0 : AMP_MIN + activity * (AMP_MAX - AMP_MIN);


  useEffect(() => {
    const tick = () => {
      // activity が 0 のときは位相を更新しない＝完全静止
      if (activity > 0) {
        // 音が大きいほど速く
        const speed = 0.06 + activity * 0.90; // 0.06〜0.96 rad/frame
        phaseRef.current = (phaseRef.current + speed) % (Math.PI * 2);
        setPhase(phaseRef.current);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [activity]);

  // 振幅：音が大きいほど大きく、でも破綻しない範囲で
  const amp = activity === 0 ? 0 : 6 + activity * 46; // 0 / 6〜52px

  // 円内部で波を描く
  const padding = Math.floor(size * 0.18);
  const w = size - padding * 2;
  const cy = Math.floor(size / 2);

  const makeWavePath = (A, ph) => {
    const steps = 140;
    let d = `M ${padding} ${cy}`;
    for (let i = 0; i <= steps; i++) {
      const x = padding + (w * i) / steps;
      const t = (i / steps) * Math.PI * 2;
      const env = 0.85 + 0.15 * Math.cos((t - Math.PI) * 0.6);
      const y =
        cy +
        env * (
          Math.sin(t * 1.25 + ph) * A * 0.62 +
          Math.sin(t * 2.3  - ph * 1.05) * A * 0.38
        );
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    return d;
  };

  const pathD = makeWavePath(amp, phase);

  return (
    <button
      onClick={onClick}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      className={`neuBtn ${isRecording ? 'recording' : ''}`}
      style={{ width: size, height: size }}
    >
      {/* 白ライン（下＝グロー / 上＝シャープ） */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        <defs>
          <clipPath id="circle-clip">
            <circle cx={size / 2} cy={size / 2} r={(size / 2) - 1} />
          </clipPath>
          <filter id="line-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.0" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"  stopColor="#ffffff" stopOpacity="0"/>
            <stop offset="18%" stopColor="#ffffff" stopOpacity="0.40"/>
            <stop offset="50%" stopColor="#ffffff" stopOpacity="1"/>
            <stop offset="82%" stopColor="#ffffff" stopOpacity="0.40"/>
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
          </linearGradient>
        </defs>

        <g clipPath="url(#circle-clip)">
          {/* 1) ソフトグロー（太め） */}
          <path
            d={pathD}
            fill="none"
            stroke="#ffffff"
            strokeWidth={10}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.45}
            style={{ filter: 'url(#line-glow)', mixBlendMode: 'screen' }}
          />
          {/* 2) シャープな本線（細め） */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#line-grad)"
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.98}
            style={{ mixBlendMode: 'screen' }}
          />
        </g>
      </svg>

      {/* SwiftUI スタイルの見た目をCSSで再現 */}
      <style jsx>{`
  .neuBtn {
    position: relative;
    border: none;
    border-radius: 9999px;
    padding: 0;
    cursor: pointer;
    overflow: hidden;
    outline: none;

    /* ← 赤みをしっかり追加（上から順に強い順で効きます） */
    background:
      radial-gradient(140% 140% at 50% 35%, rgba(255, 82, 110, 0.26), rgba(255, 82, 110, 0) 60%),
      linear-gradient(180deg, rgba(255,120,136,0.42), rgba(255,90,120,0.36)),
      #ffe9ee; /* 旧: #f9fafb（ほぼ白）→薄いピンクに */

    /* ほんのり赤い外側グローを1本追加 */
    box-shadow:
      -4px -4px 8px rgba(255,255,255,0.9),
      6px 10px 16px rgba(0,0,0,0.12),
      0 34px 110px rgba(255, 64, 116, 0.30);

    border: 1px solid rgba(255,255,255,0.7);

    /* 全体を少しだけ彩度アップ（やり過ぎ注意） */
    filter: saturate(120%);
  }

  /* 下側リングも赤寄りに（ニュアンス強化） */
  .neuBtn::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 9999px;
    border: 8px solid rgba(255,72,96,0.10); /* 旧: rgba(0,0,0,0.03) */
    filter: blur(6px);
    transform: translateY(2px);
    pointer-events: none;
    mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 55%, rgba(0,0,0,1) 100%);
    -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 55%, rgba(0,0,0,1) 100%);
  }

  .neuBtn.recording { animation: none; }
`}</style>

    </button>
  );
}


// ----------------------
// Constants for localStorage keys (guest user)
// ----------------------
const LOCAL_REMAINING_KEY = "guestRemainingSeconds";
const LOCAL_LAST_RESET_KEY = "guestLastResetDate";

// ----------------------
// Main HomePage Component (pages/index.js)
// ----------------------
function App() {
  console.log("[DEBUG] App component loaded");
  const router = useRouter();
  const { t, i18n } = useTranslation();

  // State declarations
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

  // Refs for intervals, animation, media
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

  // Update document title on language change
  useEffect(() => {
    document.title = t("Minutes.AI");
  }, [t, i18n.language]);

  // Set direction attribute based on language (for Arabic support)
  useEffect(() => {
    document.documentElement.setAttribute("dir", i18n.language === "ar" ? "rtl" : "ltr");
  }, [i18n.language]);

  // Recording countdown effect
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

  // Load selected meeting format from localStorage on mount
  useEffect(() => {
    const storedFormat = localStorage.getItem("selectedMeetingFormat");
    if (storedFormat) {
      const parsedFormat = JSON.parse(storedFormat);
      console.log("[DEBUG] Retrieved selectedMeetingFormat from localStorage:", parsedFormat);
      setSelectedMeetingFormat(parsedFormat);
    } else {
      const defaultFormat = {
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
      console.log("[DEBUG] No selectedMeetingFormat in localStorage. Setting default:", defaultFormat);
      setSelectedMeetingFormat(defaultFormat);
      localStorage.setItem("selectedMeetingFormat", JSON.stringify(defaultFormat));
    }
  }, []);

  // Monitor Firebase Auth state and fetch user data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserSubscription(data.subscription);
            setUserRemainingSeconds(data.remainingSeconds);
          }
        } catch (error) {
          console.error("User data retrieval error:", error);
        }
      }
      setIsUserDataLoaded(true);
    });
    return unsubscribe;
  }, []);

  // Listen for real-time updates to user data in Firestore
  useEffect(() => {
    if (auth.currentUser) {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserRemainingSeconds(data.remainingSeconds);
          setUserSubscription(data.subscription);
        }
      });
      return () => unsubscribe();
    }
  }, [auth.currentUser]);

  // For guest users, restore remaining seconds from localStorage
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

  // Update localStorage when userRemainingSeconds changes (for guest users)
  useEffect(() => {
    if (userSubscription) return;
    localStorage.setItem(LOCAL_REMAINING_KEY, userRemainingSeconds);
  }, [userRemainingSeconds, userSubscription]);

  // Reset remaining seconds to default when date changes (for Firebase users)
  useEffect(() => {
    if (userSubscription) return;
    const checkDateInterval = setInterval(() => {
      if (userRemainingSeconds === 0) {
        const currentDate = new Date().toDateString();
        if (lastResetDateRef.current !== currentDate) {
          setUserRemainingSeconds(DEFAULT_REMAINING);
          if (auth.currentUser) {
            setDoc(doc(db, "users", auth.currentUser.uid), { remainingSeconds: DEFAULT_REMAINING }, { merge: true })
              .catch(err => console.error("Firestore update error:", err));
          }
          lastResetDateRef.current = currentDate;
        }
      } else {
        lastResetDateRef.current = new Date().toDateString();
      }
    }, 1000);
    return () => clearInterval(checkDateInterval);
  }, [userRemainingSeconds, userSubscription]);

  // Cleanup intervals on unmount
  useEffect(() => {
    const interval = progressIntervalRef.current;
    return () => {
      stopRecording();
      clearInterval(interval);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (recordingTimerIntervalRef.current) {
        clearInterval(recordingTimerIntervalRef.current);
      }
    };
  }, []);

  // When FullScreenOverlay is opened, reset isExpanded to false
  useEffect(() => {
    if (showFullScreen) {
      setIsExpanded(false);
    }
  }, [showFullScreen]);

  // Process audio file: generate blob URL, transcribe, and save meeting record
  const processAudioFile = async (file) => {
    const url = URL.createObjectURL(file);
    setAudioURL(url);
    setProgressStep("uploading");

    setTimeout(async () => {
      setProgressStep("transcribing");
      try {
        const { transcription: newTranscription, minutes: newMinutes } = await transcribeAudio(
          file,
          selectedMeetingFormat.template,
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

  // Save meeting record to Firestore
  const saveMeetingRecord = async (transcription, minutes) => {
    try {
      if (!auth.currentUser) {
        console.error("User is not logged in. Aborting save.");
        return;
      }
      const finalTranscription = transcription || "No transcription available.";
      const finalMinutes = minutes || "No minutes available.";
  
      const paperID = uuidv4();
      const creationDate = new Date();
      const recordData = {
        paperID,
        transcription: finalTranscription,
        minutes: finalMinutes,
        createdAt: creationDate,
        uid: auth.currentUser.uid,
      };
  
      const docRef = await addDoc(collection(db, 'meetingRecords'), recordData);
      console.log("✅ Meeting record saved. Document ID:", docRef.id);
      setMeetingRecordId(docRef.id);
      setProgressStep("completed");
    } catch (error) {
      console.error("Error occurred while saving meeting record:", error);
    }
  };

  // Toggle recording start/stop
  const toggleRecording = async () => {
    if (!userSubscription && userRemainingSeconds === 0) {
      if (!auth.currentUser) {
        router.push("/login");
      } else {
        router.push("/buy-tickets");
      }
      return;
    }

    if (isRecording) {
      await stopRecording();
      setProgressStep("recordingComplete");
      setIsRecording(false);
    } else {
      const started = await startRecording();
      if (started) {
        setIsRecording(true);
      }
    }
  };

  // Start recording: check multi-device recording, set up MediaRecorder, etc.
  const startRecording = async () => {
    if (auth.currentUser) {
      let currentDeviceId = localStorage.getItem("deviceId");
      if (!currentDeviceId) {
        currentDeviceId = uuidv4();
        localStorage.setItem("deviceId", currentDeviceId);
      }

      try {
        const userRef = doc(db, "users", auth.currentUser.uid);
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
        console.log("✅ Firestoreの録音データ更新完了");
      } catch (error) {
        console.error("Failed to check recording status in Firestore:", error);
        return false;
      }
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/ogg';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/wav';
      }

      const options = { mimeType, audioBitsPerSecond: 32000 };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const fileExtension = mimeType === 'audio/mp4' ? 'm4a' : 'webm';
        const file = new File([blob], `recording.${fileExtension}`, { type: mimeType });

        if (!selectedMeetingFormat) {
          alert("No meeting format selected. Please select one from MeetingFormatsList.");
          return;
        }
        await processAudioFile(file);
      };

      mediaRecorder.start();

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      source.connect(analyser);
      updateAudioLevel();

      if (!userSubscription) {
        timerIntervalRef.current = setInterval(() => {
          setUserRemainingSeconds(prev => {
            if (prev <= 1) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
              stopRecording(0);
              setIsRecording(false);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }

      return true;

    } catch (err) {
      console.error("Failed to access the microphone:", err);
      alert("Microphone access was denied. Please check your settings.");
      return false;
    }
  };

  // Stop recording and clean up resources
  const stopRecording = async (finalRemaining = userRemainingSeconds) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    cancelAnimationFrame(animationFrameRef.current);

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    audioContextRef.current = null;
    analyserRef.current = null;
    dataArrayRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    mediaRecorderRef.current = null;

    setAudioLevel(1);

    if (!userSubscription) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      try {
        if (auth.currentUser) {
          await setDoc(doc(db, "users", auth.currentUser.uid), { remainingSeconds: finalRemaining }, { merge: true });
        }
      } catch (err) {
        console.error("Error updating remaining time:", err);
      }
    }
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, "users", auth.currentUser.uid), { recordingDevice: null, recordingTimestamp: null }, { merge: true });
        console.log("✅ recordingDevice has been reset");
      } catch (error) {
        console.error("Failed to reset recordingDevice:", error);
      }
    }
  };

  // Update audio level continuously using requestAnimationFrame
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

      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // File upload handler
  const handleFileUpload = async (file) => {
    const allowedFormats = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg"];
    if (!allowedFormats.includes(file.type)) {
      alert("Unsupported file format. Please use m4a, webm, mp3, wav, or ogg.");
      return;
    }
    await processAudioFile(file);
  };

// ===== 円形カウントダウン（左上）用の計算値 =====
const RING_SIZE = 80;       // 直径
const STROKE = 4;            // 線の太さ
const R = (RING_SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;   // 周長
const remainRatio = recordingCountdown / 3600; // 1 → 0
const dashoffset = C * (1 - remainRatio);      // 経過に応じて増える

return (
  <div
    className="container"
    style={{
      minHeight: '100vh',
      background:
        'radial-gradient(640px 640px at 50% calc(50% - 24px), rgba(0,0,0,0.028), rgba(0,0,0,0) 64%), #F8F7F4'
    }}
  >
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* FileUploadButton is currently commented out */}
      {/* <FileUploadButton onFileSelected={handleFileUpload} /> */}

      {!showFullScreen && <PurchaseMenu />}

      {/* 中央：非録音中は元画像、録音中だけ上のコンポーネント */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 5,
        }}
      >
        {/* 非録音中は元の音量スケール。録音中は外側スケール停止 */}
        <div
          style={{
            transform: isRecording ? 'none' : `scale(${audioLevel})`,
            transition: 'transform 120ms linear',
            willChange: 'transform',
          }}
        >
          {/* 待機中のみパルス（録音中OFF） */}
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

        {/* パルスは非録音時のみ */}
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { transform: scale(0.92); }
            50%      { transform: scale(1.18); }
          }
          .pulse { animation: pulse 6s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) { .pulse { animation: none; } }
        `}</style>
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

    {/* Bottom centered navigation links (非表示のまま残置) */}
    {/* ...（省略：前回のままコメントアウト） ... */}

    {isUserDataLoaded && (
      <>
        {/* 中央下の大きい残時間（既存のまま） */}
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
            <span style={{
              fontFamily: 'Impact, sans-serif',
              fontSize: '72px',
              lineHeight: '1'
            }}>
              {userRemainingSeconds === 0 ? "Recovering..." : formatTime(userRemainingSeconds)}
            </span>
          )}
        </div>

        {/* ←← 新しい左上カウントダウン（MAX / 60:00 の縦並び） */}
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
            {/* 進捗（黒）※時計回り・上から開始 */}
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

          {/* 中央のテキストを縦並び（VStack） */}
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
            <div style={{ fontSize: 10, letterSpacing: 2, fontWeight: 700 }}>
              MAX
            </div>
            <div style={{ fontFamily: 'Impact, sans-serif', fontWeight: 900, fontSize: 22 }}>
              {formatTime(recordingCountdown)}
            </div>
          </div>
        </div>
      </>
    )}
  </div>
);
}

export default App;
