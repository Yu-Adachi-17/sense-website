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
import { collection, addDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';
import MinutesList from './components/MinutesList';
import MinutesDetail from './components/MinutesDetail';
import MeetingFormatsList from './components/MeetingFormatsList'; // ← 新たに追加
import { PiGridFourFill } from "react-icons/pi";
import EmailVerification from "./components/EmailVerification"; // ← ここ
import PrivacyPolicy from "./components/PrivacyPolicy";
import TermsOfUse from "./components/TermsOfUse";

// ----------------------
// ファイルアップロード用コンポーネント
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
      onFileSelected(file);
    }
  };

  return (
    <div style={{ position: 'absolute', top: 20, right: 30 }}>
      {/* 隠しファイル入力 */}
      <input
        type="file"
        accept=".webm"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      {/* ボタンとして表示 */}
      <button 
        onClick={handleButtonClick} 
        style={{
          padding: '10px 15px',
          borderRadius: '4px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        .webm ファイルをアップロード
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
  // 新規保存時に生成された議事録のドキュメントIDを保持する state
  const [meetingRecordId, setMeetingRecordId] = useState(null);

  // ★ ユーザーデータ取得完了かどうかを示す state（false の場合は表示しない）
  const [isUserDataLoaded, setIsUserDataLoaded] = useState(false);
  // ★ ユーザーのサブスクリプション情報と残秒数を保持する state
  const [userSubscription, setUserSubscription] = useState(false);
  const [userRemainingSeconds, setUserRemainingSeconds] = useState(180);

  // ★ 追加：ユーザーが選択した会議フォーマット情報（MeetingFormatsList で選択されたもの）
  // 初回は localStorage から読み込むか、なければデフォルト（General）を設定する
  const [selectedMeetingFormat, setSelectedMeetingFormat] = useState(null);

  // ★ App.js マウント時に localStorage から selectedMeetingFormat を読み込む
  useEffect(() => {
    const storedFormat = localStorage.getItem("selectedMeetingFormat");
    if (storedFormat) {
      const parsedFormat = JSON.parse(storedFormat);
      console.log("[DEBUG] Retrieved selectedMeetingFormat from localStorage:", parsedFormat);
      setSelectedMeetingFormat(parsedFormat);
    } else {
      // localStorage になければ「General」をデフォルトとして設定（MeetingFormatElements 側の定義に合わせてください）
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
  // ★ 日付跨ぎでリセット判定用：最後にチェックした日付を保持する ref
  const lastResetDateRef = useRef(new Date().toDateString());

  // mm:ss形式にフォーマットするヘルパー関数
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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
          console.error("ユーザーデータ取得エラー:", error);
        }
      }
      // ユーザー情報のフェッチ完了（user がいなくても完了）
      setIsUserDataLoaded(true);
    });
    return unsubscribe;
  }, []);

  // ★ 日付跨ぎで残時間が 0 の場合、再び 180 にリセットする処理（非購読ユーザーのみ）
  useEffect(() => {
    if (userSubscription) return; // 購読ユーザーは対象外
    const checkDateInterval = setInterval(() => {
      if (userRemainingSeconds === 0) {
        const currentDate = new Date().toDateString();
        if (lastResetDateRef.current !== currentDate) {
          setUserRemainingSeconds(180);
          if (auth.currentUser) {
            setDoc(doc(db, "users", auth.currentUser.uid), { remainingSeconds: 180 }, { merge: true })
              .catch(err => console.error("Firebase更新エラー:", err));
          }
          lastResetDateRef.current = currentDate;
        }
      } else {
        // 残時間が 0 でなければ最新の日付を保持
        lastResetDateRef.current = new Date().toDateString();
      }
    }, 1000);
    return () => clearInterval(checkDateInterval);
  }, [userRemainingSeconds, userSubscription]);

  // ----- 共通処理：アップロードファイル／録音停止時に STT で議事録生成 ----- //
  const processAudioFile = async (file) => {
    // 録音停止時と同様に、blob URL を生成して audioURL を設定
    const url = URL.createObjectURL(file);
    setAudioURL(url);

    // ※ ここでは file.type が 'audio/mp4' なら m4a、それ以外は webm とする例
    // （既存録音処理と同じロジック）
    // ※ ファイルが File オブジェクトであればそのままで OK
    await transcribeAudio(
      file,
      selectedMeetingFormat.template,
      setTranscription,
      setMinutes,
      setIsProcessing,
      setProgress,
      setShowFullScreen
    );
  };

  // 録音ボタン（中央のボタン）押下時の処理
  const toggleRecording = async () => {
    // 「Recovering...」（残秒数0）の状態の場合
    if (userRemainingSeconds === 0) {
      if (!auth.currentUser) {
        // 非ログインユーザーならログイン画面へ
        window.location.href = '/login';
      } else {
        // ログインユーザーならアイテム購入画面へ
        window.location.href = '/buy-tickets';
      }
      return; // 通常の録音処理は実行しない
    }

    if (isRecording) {
      await stopRecording();
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
        const fileExtension = mimeType === 'audio/mp4' ? 'm4a' : 'webm';
        // ファイルオブジェクトを生成（録音の場合は File にする）
        const file = new File([blob], `recording.${fileExtension}`, { type: mimeType });

        // 会議フォーマットが未選択の場合はエラー
        if (!selectedMeetingFormat) {
          alert("議事録フォーマットが選択されていません。MeetingFormatsList から選択してください。");
          return;
        }
        // 共通処理を呼び出し
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

      // ★ サブスクライバー（購読ユーザー）でなければ、録音開始と同時に残秒数のカウントダウンを開始
      if (!userSubscription) {
        timerIntervalRef.current = setInterval(() => {
          setUserRemainingSeconds(prev => {
            if (prev <= 1) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
              // 残秒が0になったら自動的に録音停止＋議事録生成
              stopRecording(0); // Firebase 更新にも 0 を渡す
              setIsRecording(false);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }

    } catch (err) {
      console.error('マイクへのアクセスに失敗しました:', err);
      alert('マイクへのアクセスが拒否されました。設定を確認してください。');
    }
  };

  // stopRecording にオプション引数 finalRemaining を追加（デフォルトは現在の userRemainingSeconds）
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

    // ★ カウントダウンの interval をクリアし、非購読ユーザーの場合は Firebase に新たな残秒数を反映
    if (!userSubscription) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      try {
        await setDoc(doc(db, "users", auth.currentUser.uid), { remainingSeconds: finalRemaining }, { merge: true });
      } catch (err) {
        console.error("残時間更新エラー:", err);
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
  // ※ アップロード後、processAudioFile() を呼び出して録音停止時と同じ処理（STT 経由の議事録生成）を行います。
  const handleFileUpload = async (file) => {
    // file.type に "webm" が含まれているかチェック（"audio/webm" や "video/webm" の両方を許可）
    if (!file.type.includes("webm")) {
      alert('アップロード可能なファイル形式は .webm です');
      return;
    }
    if (!selectedMeetingFormat) {
      alert("議事録フォーマットが選択されていません。MeetingFormatsList から選択してください。");
      return;
    }
    await processAudioFile(file);
  };
  

  // コンポーネントのアンマウント時に録音や interval を停止
  useEffect(() => {
    const interval = progressIntervalRef.current;
    return () => {
      stopRecording();
      clearInterval(interval);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // FullScreenOverlay を開く際に isExpanded を false にリセット
  useEffect(() => {
    if (showFullScreen) {
      setIsExpanded(false);
    }
  }, [showFullScreen]);

  // 議事録が作成され FullScreenOverlay が表示されたタイミングで Firebase に保存
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
          // audioURL など必要なデータがあれば追加
        };

        console.log("🟢 [DEBUG] Firestore に保存するデータ:", recordData);

        const docRef = await addDoc(collection(db, 'meetingRecords'), recordData);
        console.log("✅ [SUCCESS] Firebase Firestore にデータが格納されました");
        // 生成したドキュメントのIDを state に保持
        setMeetingRecordId(docRef.id);
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
        <Route
          path="/"
          element={
            <div className="container">
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <button
                  onClick={() => {
                    // グリッドアイコンタップ時：非ログインユーザーの場合はログイン画面へ、それ以外は通常の議事録一覧へ
                    if (!auth.currentUser) {
                      window.location.href = '/login';
                    } else {
                      window.location.href = '/minutes-list';
                    }
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
                  <PiGridFourFill />
                </button>

                {/* ファイルアップロード用コンポーネント */}
                <FileUploadButton onFileSelected={handleFileUpload} />

                {/* 追加：議事録フォーマット一覧へ遷移するボタン */}
                <button
                  onClick={() => {
                    window.location.href = '/meeting-formats';
                  }}
                  style={{
                    position: 'absolute',
                    bottom: 20,
                    right: 20,
                    backgroundColor: '#1e1e1e',
                    border: 'none',
                    padding: '10px 15px',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '18px',
                    cursor: 'pointer'
                  }}
                >
                  議事録フォーマット確認
                </button>

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
                {isProcessing && <ProgressIndicator progress={progress} />}
              </div>

              {isUserDataLoaded && (
                <div style={{
                  position: 'absolute',
                  bottom: 'calc((50vh - 160px) / 2)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  color: 'white',
                  fontSize: '72px',
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
        {/* 追加：議事録フォーマット一覧のルート */}
        <Route path="/meeting-formats" element={<MeetingFormatsList />} />
        <Route path="*" element={<h1 style={{ color: "white", textAlign: "center" }}>404 Not Found</h1>} />
      </Routes>
    </Router>
  );
}

export default App;
