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

  return (
    <div
      className="container"
      style={{
        minHeight: '100vh',
        // 中央付近にごく薄いラジアル、ベースはオフホワイト
        background: `
          radial-gradient(
            520px 520px at 50% calc(50% - 40px),
            rgba(0,0,0,0.035),
            rgba(0,0,0,0) 60%
          ), #FBFAF7
        `,
      }}
    >
  
>

      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* FileUploadButton is currently commented out */}
        {/* <FileUploadButton onFileSelected={handleFileUpload} /> */}

        {!showFullScreen && <PurchaseMenu />}

{/* 新しい録音ボタン（グラデーション画像を使用、枠なし・大サイズ） */}
<div
  style={{
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: `translate(-50%, -50%) scale(${audioLevel})`,
    zIndex: 5,
  }}
>
  <button
    onClick={toggleRecording}
    aria-label={isRecording ? 'Stop recording' : 'Start recording'}
    style={{
      width: 420,   // 280px → 1.5倍の420px
      height: 420,
      border: 'none',
      padding: 0,
      background: 'transparent',
      borderRadius: '50%',
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden',
      transform: isRecording ? 'scale(0.98)' : 'none',
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

      {/* Bottom centered navigation links */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '20px',
        zIndex: 1000
      }}>
<Link href="/pricing">
  <span style={{ padding: '10px 20px', color: '#fff', textDecoration: 'none', cursor: 'pointer' }}>
    Services and Pricing
  </span>
</Link>
<Link href="/ai-news">
  <span style={{ padding: '10px 20px', color: '#fff', textDecoration: 'none', cursor: 'pointer' }}>
    AI News
  </span>
</Link>

      </div>

      {isUserDataLoaded && (
        <>
          <div style={{
            position: 'absolute',
            bottom: 'calc((50vh - 160px) / 2)',
            left: '50%',
            transform: 'translateX(-50%)',
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
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            width: 'fit-content',
            zIndex: 10,
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(45deg, rgb(153,184,255), rgba(115,115,255,1), rgba(102,38,153,1), rgb(95,13,133), rgba(255,38,38,1), rgb(199,42,76))',
              borderRadius: '40px',
            }} />
            <div style={{
              position: 'absolute',
              top: '2px',
              left: '2px',
              right: '2px',
              bottom: '2px',
              background: 'white',
              borderRadius: '38px',
            }} />
            <div style={{
              position: 'relative',
              padding: '10px 20px',
              color: 'black',
              fontSize: '15px',
              textAlign: 'center',
            }}>
              <div style={{
                background: 'linear-gradient(45deg, rgba(102,38,153,1), rgb(95,13,133), rgba(255,38,38,1), rgb(199,42,76))',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                fontStyle: 'italic',
                fontWeight: 'bold',
                fontSize: '25px'
              }}>Beta</div>
              <div style={{
                background: 'linear-gradient(45deg, rgb(153,184,255), rgba(115,115,255,1), rgba(102,38,153,1), rgb(95,13,133), rgba(255,38,38,1), rgb(199,42,76))',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                fontStyle: 'italic',
                fontWeight: 'bold',
                fontSize: '16px'
              }}>
                {t("The maximum duration for a single recording is 60 minutes")}
              </div>
              <div style={{
                fontSize: '22px',
                fontFamily: 'Impact, sans-serif',
                marginTop: '5px'
              }}>
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
