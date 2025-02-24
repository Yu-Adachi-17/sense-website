// App.js
import React, { useState, useRef, useEffect } from 'react';
import FullScreenOverlay from './components/FullScreenOverlay.js';
import ProgressIndicator from './components/ProgressIndicator';
import { transcribeAudio } from './utils/ChatGPTs';
import { Success, Cancel } from './AfterPayment';
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import PurchaseMenu from './components/PurchaseMenu';
import BuyTicketsPage from "./components/BuyTicketsPage";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import './App.css';

// Firebase 関連のインポート
import { db, auth } from './firebaseConfig';
import { collection, addDoc, doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';
import MinutesList from './components/MinutesList';
import MinutesDetail from './components/MinutesDetail';
import MeetingFormatsList from './components/MeetingFormatsList'; // 新たに追加
import { PiGridFourFill } from "react-icons/pi";
import EmailVerification from "./components/EmailVerification"; // ここ
import PrivacyPolicy from "./components/PrivacyPolicy";
import TermsOfUse from "./components/TermsOfUse";
import TransactionsLaw from "./components/TransactionsLaw";
import SEOPage from "./components/SEO";
import { useTranslation } from "react-i18next";

// ----------------------
// 重要：ファイルアップロード用コンポーネント
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
        style={{ background: 'red', color: 'white', padding: '10px', borderRadius: '5px', cursor: 'pointer' }}
      >
        Debug Upload
      </button>
    </div>
  );
}

// ----------------------
// DebugRouter（ルートのデバッグ用）
// ----------------------
function DebugRouter() {
  const location = useLocation();
  console.log("[DEBUG] Current path:", location.pathname);
  return null;
}

// ★ ローカルストレージ用のキー設定（ゲスト用）
const LOCAL_REMAINING_KEY = "guestRemainingSeconds";
const LOCAL_LAST_RESET_KEY = "guestLastResetDate";

// ----------------------
// App コンポーネント
// ----------------------
function App() {
  console.log("[DEBUG] App component loaded");
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(1);
  const [audioURL, setAudioURL] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [minutes, setMinutes] = useState('');
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState("start");
  // 議事録が保存済みかどうかを管理する state（今回の実装では useEffect は削除）
  const [hasSavedRecord, setHasSavedRecord] = useState(false);
  // 新規保存時に生成された議事録のドキュメントIDを保持する state
  const [meetingRecordId, setMeetingRecordId] = useState(null);

  // ★ ユーザーデータ取得完了かどうかを示す state（false の場合は表示しない）
  const [isUserDataLoaded, setIsUserDataLoaded] = useState(false);
  // ★ ユーザーのサブスクリプション情報と残秒数を保持する state
  const [userSubscription, setUserSubscription] = useState(false);
  // ★ ゲストの場合は1日3分（180秒）をデフォルトにする
  const DEFAULT_REMAINING = 180;
  const [userRemainingSeconds, setUserRemainingSeconds] = useState(DEFAULT_REMAINING);

  // ★ 追加：ユーザーが選択した会議フォーマット情報
  const [selectedMeetingFormat, setSelectedMeetingFormat] = useState(null);

  // ★ 新規追加：録音の最大時間（60分＝3600秒）のカウントダウン用 state と interval 用 ref
  const [recordingCountdown, setRecordingCountdown] = useState(3600);
  const recordingTimerIntervalRef = useRef(null);

  // mm:ss形式にフォーマットするヘルパー関数
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };
  const { t } = useTranslation();

  // 録音中の最大時間カウントダウンの開始／リセット（isRecording で管理）
  useEffect(() => {
    if (isRecording) {
      // 録音開始時に60分にリセット
      setRecordingCountdown(3600);
      recordingTimerIntervalRef.current = setInterval(() => {
        setRecordingCountdown(prev => {
          if (prev <= 1) {
            clearInterval(recordingTimerIntervalRef.current);
            recordingTimerIntervalRef.current = null;
            // 最大時間に達したら強制停止
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

  // App.js マウント時に localStorage から selectedMeetingFormat を読み込む
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

  const progressIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null); // ★ カウントダウン用の interval を保持
  const animationFrameRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  // ★ 日付跨ぎでリセット判定用（Firebase 連携済みの場合は使用）
  const lastResetDateRef = useRef(new Date().toDateString());

  // ★ Firebase Auth の状態変化を監視してユーザーデータを取得する
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

  // ★ Firebase Firestore のリアルタイムリスナーで残り秒数・サブスクリプション状態を検知
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

  // ★ ゲストユーザーの場合、マウント時に localStorage から残り秒数を復元
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

  // ★ 残り秒数が変化するたびに localStorage を更新（ゲストの場合）
  useEffect(() => {
    if (userSubscription) return;
    localStorage.setItem(LOCAL_REMAINING_KEY, userRemainingSeconds);
  }, [userRemainingSeconds, userSubscription]);

  // ★ 日付跨ぎで残時間が 0 の場合、再度 180 にリセット（Firebase 利用時のみ）
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

  // コンポーネントのアンマウント時の処理
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

  // FullScreenOverlay を開く際に isExpanded を false にリセット
  useEffect(() => {
    if (showFullScreen) {
      setIsExpanded(false);
    }
  }, [showFullScreen]);

  // ----- 【変更箇所】transcribeAudio() の完了時点で議事録保存を実行する processAudioFile 関数 -----
  const processAudioFile = async (file) => {
    // blob URL 生成
    const url = URL.createObjectURL(file);
    setAudioURL(url);
    setProgressStep("uploading");

    // 少し待ってから STT 処理へ
    setTimeout(async () => {
      setProgressStep("transcribing");
      try {
        // transcribeAudio() は Promise を返し、{ transcription, minutes } を解決する
        const { transcription: newTranscription, minutes: newMinutes } = await transcribeAudio(
          file,
          selectedMeetingFormat.template,
          setIsProcessing
        );
        // state を更新
        setTranscription(newTranscription);
        setMinutes(newMinutes);

        // 結果が存在すれば議事録を保存
        if (newTranscription && newMinutes) {
          await saveMeetingRecord(newTranscription, newMinutes);
        }
      } catch (error) {
        console.error("An error occurred during STT processing:", error);
        setProgressStep("error");
      }
      setProgressStep("transcriptionComplete");
      // 議事録生成完了後、FullScreenOverlay を表示
      setShowFullScreen(true);
    }, 500);
  };

  // ----- 【変更箇所】transcribeAudio() の結果を利用して即保存する saveMeetingRecord 関数 -----
  const saveMeetingRecord = async (transcription, minutes) => {
    try {
      if (!auth.currentUser) {
        console.error("User is not logged in. Aborting save.");
        return;
      }
      if (!transcription || !minutes) {
        console.error("Transcription or minutes is empty. Aborting save.");
        return;
      }
      const paperID = uuidv4();
      const creationDate = new Date();
      const recordData = {
        paperID,
        transcription,
        minutes,
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

  // 録音ボタン押下時の処理
  const toggleRecording = async () => {
    if (!userSubscription && userRemainingSeconds === 0) {
      if (!auth.currentUser) {
        window.location.href = '/login';
      } else {
        window.location.href = '/buy-tickets';
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

  // 録音開始前に、ログインユーザーの場合は Firestore で多重録音チェック
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

  // ------------- ファイルアップロード時のハンドラー ------------- //
  const handleFileUpload = async (file) => {
    const allowedFormats = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg"];
    if (!allowedFormats.includes(file.type)) {
      alert("Unsupported file format. Please use m4a, webm, mp3, wav, or ogg.");
      return;
    }
    await processAudioFile(file);
  };

  return (
    <Router basename="/">
      <Routes>
        <Route
          path="/"
          element={
            <div className="container">
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                {/* FileUploadButton は右上に配置 */}
                {/* <FileUploadButton onFileSelected={handleFileUpload} /> */}

                {!showFullScreen && <PurchaseMenu />}

                <div
                  className="outer-gradient"
                  style={{ transform: `translate(-50%, -50%) scale(${audioLevel})` }}
                >
                  <div className="outer-circle"></div>
                </div>

                <div className="inner-container">
                  <div className={`inner-circle ${isRecording ? 'recording' : ''}`}>
                    <button
                      className={`center-button ${isRecording ? 'recording' : ''}`}
                      onClick={toggleRecording}
                    ></button>
                  </div>
                </div>

                {/* FullScreenOverlay に meetingRecordId を渡す */}
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
                {/* isProcessing が true の間、進捗表示 */}
                {isProcessing && <ProgressIndicator progressStep={progressStep} />}
              </div>

              {isUserDataLoaded && (
                <>
                  <div style={{
                    position: 'absolute',
                    bottom: 'calc((50vh - 160px) / 2)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    color: 'white',
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
                  {/* 追加：録音の最大60分カウントダウン表示（白文字・指定グラデーション背景・角丸） */}
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    width: 'fit-content',
                    zIndex: 10,
                  }}>
                    {/* 最下層：グラデーションの枠 */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(45deg, rgb(153,184,255), rgba(115,115,255,1), rgba(102,38,153,1), rgb(95,13,133), rgba(255,38,38,1), rgb(199,42,76))',
                      borderRadius: '40px',
                    }} />
                    {/* 中間層：内側の黒背景（枠線として見えるように余白を設ける） */}
                    <div style={{
                      position: 'absolute',
                      top: '2px',
                      left: '2px',
                      right: '2px',
                      bottom: '2px',
                      background: 'black',
                      borderRadius: '38px',
                    }} />
                    {/* 最上層：テキスト */}
                    <div style={{
                      position: 'relative',
                      padding: '10px 20px',
                      color: 'white',
                      fontSize: '15px',
                      textAlign: 'center',
                    }}>
                      {/* Beta の文字をグラデーションにしつつイタリックに */}
                      <div style={{
                        background: 'linear-gradient(45deg, rgba(102,38,153,1), rgb(95,13,133), rgba(255,38,38,1), rgb(199,42,76))',
                        WebkitBackgroundClip: 'text',
                        color: 'transparent',
                        fontStyle: 'italic',
                        fontWeight: 'bold',
                        fontSize: '25px' // 少し強調
                      }}>Beta</div>

                      {/* 中央のテキストを.boldに */}
                      <div style={{
                        background: 'linear-gradient(45deg, rgb(153,184,255), rgba(115,115,255,1), rgba(102,38,153,1), rgb(95,13,133), rgba(255,38,38,1), rgb(199,42,76))',
                        WebkitBackgroundClip: 'text',
                        color: 'transparent',
                        fontStyle: 'italic',
                        fontWeight: 'bold',
                        fontSize: '16px' // 少し強調
                      }}>{t("The maximum duration for a single recording is 60 minutes")}</div>


                      {/* mm:ss のフォントサイズを大きく & Impactに */}
                      <div style={{
                        fontSize: '22px', // 大きく
                        fontFamily: 'Impact, sans-serif', // Impactフォント
                        marginTop: '5px' // ちょっと間隔を空ける
                      }}>
                        {formatTime(recordingCountdown)}
                      </div>
                    </div>
                  </div>

                </>
              )}
            </div>
          }
        />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/email-verification" element={<EmailVerification />} />
        <Route path="/buy-tickets" element={<BuyTicketsPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-use" element={<TermsOfUse />} />
        <Route path="/success" element={<Success />} />
        <Route path="/cancel" element={<Cancel />} />
        <Route path="/minutes-list" element={<MinutesList />} />
        <Route path="/minutes/:id" element={<MinutesDetail />} />
        <Route path="/transactions-law" element={<TransactionsLaw />} />
        <Route path="/meeting-formats" element={<MeetingFormatsList />} />
        <Route path="*" element={<h1 style={{ color: "white", textAlign: "center" }}>404 Not Found</h1>} />
        <Route path="/seo" element={<SEOPage />} />
      </Routes>
    </Router>
  );
}

export default App;
