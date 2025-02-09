// src/utils/ChatGPTs.js

import axios from 'axios';

// ✅ 一時的に直接バックエンドURLを使用
const BACKEND_API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://sense-website-production.up.railway.app/api" // ✅ Railwayで公開されている正しいバックエンドURL
    : process.env.REACT_APP_BACKEND_URL || "http://localhost:5001"; // ✅ ローカル開発環境

if (!BACKEND_API_BASE_URL) {
    console.error("[ERROR] BACKEND_API_BASE_URL が設定されていません");
} else {
    console.log("[DEBUG] BACKEND_API_BASE_URL:", BACKEND_API_BASE_URL);
}

/**
 * 修正ポイント：
 *  - 第2引数として meetingFormat を受け取る
 *  - FormData に meetingFormat を追加
 */
export const transcribeAudio = async (
    file,
    meetingFormat,      // 追加：選択された議事録フォーマットのテンプレート（またはID）
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
        // meetingFormat を FormData に追加（ここではテンプレート文字列を送る場合）
        formData.append('meetingFormat', meetingFormat);

        console.log("[DEBUG] Sending request to:", `${BACKEND_API_BASE_URL}/transcribe`);

        // fetch を使用してAPIリクエストを送る
        const response = await fetch(`${BACKEND_API_BASE_URL}/transcribe`, {
            method: 'POST',
            body: formData,
            mode: 'cors', // CORS対策
            credentials: 'include' // 必要に応じて認証情報を送信
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("[DEBUG] API Response:", data);

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
