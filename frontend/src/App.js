import React, { useState, useRef, useEffect } from 'react';
import FullScreenOverlay from './components/FullScreenOverlay.js';
import ProgressIndicator from './components/ProgressIndicator';
import { transcribeAudio } from './utils/ChatGPTs';
import { Success, Cancel } from './AfterPayment';
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import PurchaseMenu from './components/PurchaseMenu'; 
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import './App.css';

// Firebase 関連のインポート
import { db, auth } from './firebaseConfig';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';
import MinutesList from './components/MinutesList';
import { RxViewGrid } from "react-icons/rx";


function DebugRouter() {
  const location = useLocation();
  console.log("[DEBUG] Current path:", location.pathname);
  return null;
}

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
  const [progress, setProgress] = useState(0);
  // 議事録が保存済みかどうかを管理する state
  const [hasSavedRecord, setHasSavedRecord] = useState(false);

  const progressIntervalRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
    setIsRecording(!isRecording);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let mimeType = 'audio/mp4';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }
      const options = { mimeType };
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
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        const fileExtension = mimeType === 'audio/mp4' ? 'm4a' : 'webm';
        const file = new File([blob], `recording.${fileExtension}`, { type: mimeType });

        // バックエンドに音声ファイルを送信し、transcriptionとminutesがセットされる
        await transcribeAudio(
          file,
          setTranscription,
          setMinutes,
          setIsProcessing,
          setProgress,
          setShowFullScreen
        );
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
    } catch (err) {
      console.error('マイクへのアクセスに失敗しました:', err);
      alert('マイクへのアクセスが拒否されました。設定を確認してください。');
    }
  };

  const stopRecording = () => {
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

      // 閾値を超えた場合に波紋を生成
      if (normalizedRms > 1.5) {
        const container = document.querySelector('.container');
        const existingRipples = container.getElementsByClassName('ripple');

        // 波紋が存在しない場合のみ新しい波紋を作成
        if (existingRipples.length === 0) {
          const ripple = document.createElement('div');
          ripple.classList.add('ripple');

          // .containerの中央に配置
          const containerRect = container.getBoundingClientRect();
          ripple.style.top = `${containerRect.height / 2}px`;
          ripple.style.left = `${containerRect.width / 2}px`;

          container.appendChild(ripple);

          // アニメーション終了後に要素を削除し、新しい波紋を作成
          ripple.addEventListener('animationend', () => {
            ripple.remove();

            // 音声レベルがまだ閾値を超えている場合は新しい波紋を作成
            if (normalizedRms > 1.5) {
              const newRipple = document.createElement('div');
              newRipple.classList.add('ripple');
              newRipple.style.top = `${containerRect.height / 2}px`;
              newRipple.style.left = `${containerRect.width / 2}px`;
              container.appendChild(newRipple);

              newRipple.addEventListener('animationend', () => {
                newRipple.remove();
              });
            }
          });
        }
      }

      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  };

  // コンポーネントのアンマウント時に録音やintervalを停止
  useEffect(() => {
    const interval = progressIntervalRef.current; // ローカル変数にコピー
    return () => {
      stopRecording();
      clearInterval(interval);
    };
  }, []);

  // FullScreenOverlay を開く際に isExpanded を false にリセット
  useEffect(() => {
    if (showFullScreen) {
      setIsExpanded(false);
    }
  }, [showFullScreen]);

  // 議事録が作成されFullScreenOverlayが表示されたタイミングでFirebaseに保存
// App.js の useEffect にデバッグ用の console.log を追加
useEffect(() => {
  const saveMeetingRecord = async () => {
    try {
      console.log("🟡 [DEBUG] saveMeetingRecord が呼ばれました");

      if (!auth.currentUser) {
        console.log("🔴 [ERROR] ユーザーがログインしていません");
        return;
      }

      console.log("🟢 [DEBUG] ユーザーはログインしています:", auth.currentUser.uid);
      console.log("🟢 [DEBUG] transcription:", transcription);
      console.log("🟢 [DEBUG] minutes:", minutes);

      if (!transcription || !minutes) {
        console.log("🔴 [ERROR] transcription または minutes が空のため保存しません");
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

      console.log("🟢 [DEBUG] Firestore に保存するデータ:", recordData);

      await addDoc(collection(db, 'meetingRecords'), recordData);
      console.log("✅ [SUCCESS] Firebase Firestore にデータが格納されました");
    } catch (err) {
      console.error("🔴 [ERROR] Firebase Firestore の保存中にエラー発生:", err);
    }
  };

  if (showFullScreen && transcription && minutes && !hasSavedRecord) {
    console.log("🟢 [DEBUG] showFullScreen が true になったので saveMeetingRecord を実行");
    saveMeetingRecord();
    setHasSavedRecord(true);
  }
}, [showFullScreen, transcription, minutes, hasSavedRecord]);


return (
  <Router basename="/">
    {/* ルーティング用 */}
    <Routes>
      {/* ホームページ */}
      <Route
        path="/"
        element={
          <div className="container" style={{ backgroundColor: '#000', position: 'relative' }}>
            {/* 左上に RxViewGrid ボタンを配置 */}
            <button
              onClick={() => {
                // react-router-dom の useNavigate を用いる場合は、
                // 下記のようにカスタムフック内で navigate() を呼び出すか、
                // App 内にヘッダーコンポーネントを作成して useNavigate を利用してください
                window.location.href = '/minutes-list';
              }}
              style={{
                position: 'absolute',
                top: 20,
                left: 30,
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: 30,
                cursor: 'pointer'
              }}
            >
              <RxViewGrid />
            </button>

            {/* 必要に応じて PurchaseMenu など */}
            {!showFullScreen && <PurchaseMenu />}
            <div className="outer-gradient" style={{ transform: `scale(${audioLevel})` }}>
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
            {showFullScreen && (
              <FullScreenOverlay
                setShowFullScreen={setShowFullScreen}
                isExpanded={isExpanded}
                setIsExpanded={setIsExpanded}
                transcription={transcription}
                minutes={minutes}
                audioURL={audioURL}
              />
            )}
            {isProcessing && <ProgressIndicator progress={progress} />}
          </div>
        }
      />

      {/* サインアップ、ログイン、決済後のページ */}
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<Login />} />
      <Route path="/success" element={<Success />} />
      <Route path="/cancel" element={<Cancel />} />

      {/* MinutesList のルート */}
      <Route path="/minutes-list" element={<MinutesList />} />

      {/* 404 */}
      <Route path="*" element={<h1 style={{ color: "white", textAlign: "center" }}>404 Not Found</h1>} />
    </Routes>
  </Router>
);
}

export default App;
