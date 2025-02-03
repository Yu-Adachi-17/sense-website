// src/utils/ChatGPTs.js

import axios from 'axios';

// ✅ 本番環境かローカル開発環境かを自動判別して API ベース URL を設定
const BACKEND_API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://www.sense-ai.world/api"  // ✅ 本番環境
    : process.env.REACT_APP_BACKEND_URL || "http://localhost:5001"; // ✅ ローカル開発環境

if (!BACKEND_API_BASE_URL) {
    console.error("[ERROR] BACKEND_API_BASE_URL が設定されていません");
} else {
    console.log("[DEBUG] BACKEND_API_BASE_URL:", BACKEND_API_BASE_URL);
}

// ✅ ここを `fetch` に置き換える
export const transcribeAudio = async (
    file,
    setTranscription,
    setMinutes,
    setIsProcessing,
    setProgress,
    setShowFullScreen
) => {
    setIsProcessing(true);
    setProgress(0);

    try {
        const formData = new FormData();
        formData.append('file', file);

        // ✅ `fetch` を使ってAPIリクエストを送る
        const response = await fetch(`${BACKEND_API_BASE_URL}/transcribe`, {
            method: 'POST',
            headers: {
                // `multipart/form-data` は `fetch` の場合、ブラウザが自動的にセットするので削除
            },
            body: formData,
            mode: 'cors', // CORS対策
            credentials: 'include' // 必要に応じて認証情報を送信
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setTranscription(data.transcription);
        setMinutes(data.minutes);
        setProgress(100);
        setIsProcessing(false);
        setShowFullScreen(true);
    } catch (error) {
        console.error('文字起こしおよび議事録生成中にエラーが発生しました:', error);
        setMinutes('APIが反応していません');
        setIsProcessing(false);
        setProgress(100);
        setShowFullScreen(true);
    }
};
