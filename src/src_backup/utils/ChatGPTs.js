// src/utils/ChatGPTs.js

// ※ axios は不要な場合は削除してください
// import axios from 'axios';

// 一時的に直接バックエンドURLを使用
const BACKEND_API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://sense-website-production.up.railway.app/api" // Railwayで公開されている正しいバックエンドURL
    : process.env.REACT_APP_BACKEND_URL || "http://localhost:5001"; // ローカル開発環境

if (!BACKEND_API_BASE_URL) {
  console.error("[ERROR] BACKEND_API_BASE_URL が設定されていません");
} else {
  console.log("[DEBUG] BACKEND_API_BASE_URL:", BACKEND_API_BASE_URL);
}

/**
 * transcribeAudio
 *  - file と meetingFormat（議事録フォーマットのテンプレートまたはID）を受け取ります
 *  - ファイルとフォーマット情報を FormData にまとめてバックエンドへ送信
 *  - 成功時は { transcription, minutes } を返す Promise を解決します
 *  - エラー時はエラーを throw します
 *
 * @param {File} file - アップロード対象の音声ファイル
 * @param {string} meetingFormat - 議事録フォーマットのテンプレート文字列（またはID）
 * @param {Function} setIsProcessing - ローディング状態を更新するための関数
 * @returns {Promise<{transcription: string, minutes: string}>}
 */
export const transcribeAudio = async (
  file,
  meetingFormat,
  setIsProcessing
) => {
  setIsProcessing(true);

  try {
    const formData = new FormData();
    formData.append('file', file);
    // meetingFormat を FormData に追加（テンプレート文字列やIDを送信）
    formData.append('meetingFormat', meetingFormat);

    console.log("[DEBUG] Sending request to:", `${BACKEND_API_BASE_URL}/transcribe`);

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

    // 呼び出し側で結果を利用できるように返す
    return { transcription: data.transcription, minutes: data.minutes };
  } catch (error) {
    console.error('文字起こしおよび議事録生成中にエラーが発生しました:', error);
    throw error;
  } finally {
    setIsProcessing(false);
  }
};
