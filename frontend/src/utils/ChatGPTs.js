// src/utils/ChatGPTs.js

import axios from 'axios';

// 環境変数からバックエンドAPIのベースURLを取得
const BACKEND_API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "https://www.sense-ai.world/api";

if (!BACKEND_API_BASE_URL) {
    console.error("[ERROR] BACKEND_API_BASE_URL が設定されていません");
} else {
    console.log("[DEBUG] BACKEND_API_BASE_URL:", BACKEND_API_BASE_URL);
}


// 環境変数が正しく設定されているかを確認
console.log('BACKEND_API_BASE_URL:', BACKEND_API_BASE_URL);

// 音声文字起こしと議事録生成の処理
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

        // バックエンドの /transcribe エンドポイントにPOSTリクエスト
        const response = await axios.post(`${BACKEND_API_BASE_URL}/transcribe`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setProgress(percentCompleted);
            },
        });

        const { transcription, minutes } = response.data;
        setTranscription(transcription);
        setMinutes(minutes);
        setProgress(100);
        setIsProcessing(false);
        setShowFullScreen(true);
    } catch (error) {
        console.error('文字起こしおよび議事録生成中にエラーが発生しました:', error);
        setMinutes('議事録の生成中にエラーが発生しました。');
        setIsProcessing(false);
        setProgress(100);
        setShowFullScreen(true);
    }
};
