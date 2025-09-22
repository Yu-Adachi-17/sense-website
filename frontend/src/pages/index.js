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


import ServicesWrapper from '../routes/ServicesWrapper';
import RedirectToServices from '../routes/RedirectToServices';
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';
import { useAuthGate } from "../hooks/useAuthGate";

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
   ★ 音声同期リップル（軽量版・オフスクリーンまで一定速度）
   - activity: DEAD_ZONE=0.02 / SENSITIVITY=1.35（従来通り）
   - 発生管理だけRAF、拡散はCSS keyframes（GPU）
   - 画面対角に基づく farScale まで直線速度で拡大
   ============================================================ */
   function GlassRecordButton({ isRecording, audioLevel, onClick, size = 420 }) {
    const [ripples, setRipples] = React.useState([]);
    const rafRef = React.useRef(null);
    const lastRef = React.useRef(0);
    const emitAccRef = React.useRef(0);
    const idRef = React.useRef(0);
    const activityRef = React.useRef(0);
    const reduceMotionRef = React.useRef(false);
  
    // === activity マッピング（白ライン版と同一） ===
    const DEAD_ZONE = 0.02;
    const SENSITIVITY = 1.35;
    const lvl = Math.max(1, Math.min(audioLevel ?? 1, 2));
    const norm = Math.max(0, lvl - 1 - DEAD_ZONE);
    const activity = Math.min(1, (norm / (1 - DEAD_ZONE)) * SENSITIVITY);
    React.useEffect(() => { activityRef.current = activity; }, [activity, audioLevel]);
  
    const lerp = (a, b, t) => a + (b - a) * t;
  
    // === 発生管理（RAF）。削除は CSS 側の onAnimationEnd に委譲 ===
    React.useEffect(() => {
      if (typeof window !== 'undefined') {
        reduceMotionRef.current =
          window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false;
      }
      if (!isRecording || reduceMotionRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        lastRef.current = 0;
        emitAccRef.current = 0;
        return;
      }
  
      const tick = (t) => {
        if (!lastRef.current) lastRef.current = t;
        const dt = (t - lastRef.current) / 1000; // sec
        lastRef.current = t;
  
        const act = activityRef.current; // 0..1
        const pulsesPerSec = act <= 0 ? 0 : lerp(0.6, 3.0, act);
        emitAccRef.current += dt * pulsesPerSec;
  
        // ★ 画面外まで行くための farScale を算出（ビューポート対角）
        const w = typeof window !== 'undefined' ? window.innerWidth  : size;
        const h = typeof window !== 'undefined' ? window.innerHeight : size;
        const diag = Math.hypot(w, h);
        const farScale = Math.max(4, (diag / size) * 1.1); // 余裕をもってオフスクリーンへ
  
        // 見た目パラメータ（生成時に固定）
        const baseOpacity = lerp(0.55, 0.92, act);
        const baseLife    = lerp(1700, 900, act); // もともとの尺
        // ★ スケール距離に比例して尺も延長（速度一定化）
        const life = Math.round(baseLife * (farScale / 3.4)); // 3.4 は従来の最大endScale基準
  
        // 発生（acc 1超で1枚）
        while (emitAccRef.current >= 1) {
          emitAccRef.current -= 1;
          setRipples((prev) => {
            const id = idRef.current++;
            const next = [...prev, { id, farScale, baseOpacity, life }];
            // 過密対策：上限10
            return next.length > 10 ? next.slice(-10) : next;
          });
        }
  
        rafRef.current = requestAnimationFrame(tick);
      };
  
      rafRef.current = requestAnimationFrame(tick);
      return () => { cancelAnimationFrame(rafRef.current); rafRef.current = null; };
    }, [isRecording, size]);
  
    // アニメ終了で1枚削除
    const handleEnd = (id) => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    };
  
    return (
      <div className="recordWrap" style={{ width: size, height: size }} aria-live="polite">
        {isRecording && !reduceMotionRef.current && (
          <div className="ripples" aria-hidden="true">
            {ripples.map((r) => (
              <span
                key={r.id}
                className="ring"
                onAnimationEnd={() => handleEnd(r.id)}
                style={{
                  '--farScale': r.farScale,
                  '--baseOpacity': r.baseOpacity,
                  '--duration': `${r.life}ms`,
                }}
              />
            ))}
          </div>
        )}
  
        {/* 中央ボタン（1個） */}
        <button
          onClick={onClick}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          className={`neuBtn ${isRecording ? 'recording' : ''}`}
          style={{ width: size, height: size }}
        />
  
        <style jsx>{`
          .recordWrap {
            position: relative;
            display: inline-block;
            overflow: visible;
            isolation: isolate;
            --ripple-color: rgba(255, 92, 125, 0.86);
            --ripple-glow:  rgba(255, 72,  96,  0.34);
          }
          .ripples {
            position: absolute;
            inset: 0;
            pointer-events: none;
            overflow: visible;                      /* 画面外まで見せる */
            filter: drop-shadow(0 0 28px var(--ripple-glow));
            transform: translateZ(0);
            will-change: transform, opacity;
          }
          .ring {
            position: absolute;
            left: 50%;
            top: 50%;
            width: 100%;
            height: 100%;
            border-radius: 9999px;
            border: 3px solid var(--ripple-color);
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
            backface-visibility: hidden;
            contain: paint;
            will-change: transform, opacity;
  
            /* ★ 一定速度でオフスクリーンまで（線形） */
            animation: ripple var(--duration) linear forwards;
            mix-blend-mode: screen;
          }
  
          /* ★ 中間点を廃止し、開始→終了を一直線で */
          @keyframes ripple {
            0% {
              transform: translate(-50%, -50%) scale(1);
              opacity: var(--baseOpacity);
            }
            100% {
              transform: translate(-50%, -50%) scale(var(--farScale));
              opacity: 0;
            }
          }
  
          .neuBtn {
            position: relative;
            border: none;
            border-radius: 9999px;
            padding: 0;
            cursor: pointer;
            overflow: hidden;
            outline: none;
            background:
              radial-gradient(140% 140% at 50% 35%, rgba(255, 82, 110, 0.26), rgba(255, 82, 110, 0) 60%),
              linear-gradient(180deg, rgba(255,120,136,0.42), rgba(255,90,120,0.36)),
              #ffe9ee;
            box-shadow:
              -4px -4px 8px rgba(255,255,255,0.9),
              6px 10px 16px rgba(0,0,0,0.12),
              0 34px 110px rgba(255, 64, 116, 0.30);
            border: 1px solid rgba(255,255,255,0.7);
            filter: saturate(120%);
            transform: translateZ(0);
            will-change: transform;
          }
          .neuBtn::after {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 9999px;
            border: 8px solid rgba(255,72,96,0.10);
            filter: blur(6px);
            transform: translateY(2px);
            pointer-events: none;
            mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 55%, rgba(0,0,0,1) 100%);
            -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 55%, rgba(0,0,0,1) 100%);
          }
          .neuBtn.recording { animation: none; }
  
          @media (prefers-reduced-motion: reduce) {
            .ripples { display: none; }
          }
        `}</style>
      </div>
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
  const { ready } = useAuthGate(false);
  if (!ready) return null;
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
