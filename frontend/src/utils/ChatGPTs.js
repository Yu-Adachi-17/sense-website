// src/utils/ChatGPTs.js

import axios from 'axios';

// バックエンドAPIのベースURL
const BACKEND_API_BASE_URL = 'http://localhost:5002'; // 必要に応じて変更

// transcribeAudio 関数をバックエンドに対応
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

