// services/livekitEgress.js
const { EgressClient } = require('livekit-server-sdk');

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

// S3 環境変数（Railway/Env に設定済みの前提）
const S3_BUCKET  = process.env.EGRESS_S3_BUCKET;
const S3_REGION  = process.env.EGRESS_S3_REGION;           // 例: "ap-northeast-1"
const S3_ENDPOINT = process.env.EGRESS_S3_ENDPOINT || '';   // 例: "https://s3.ap-northeast-1.amazonaws.com"
const S3_ACCESS  = process.env.EGRESS_S3_ACCESS_KEY_ID;
const S3_SECRET  = process.env.EGRESS_S3_SECRET_ACCESS_KEY;

// LiveKit Egress クライアント
const egress = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

/**
 * 会議全体の録画/録音（Room Composite Egress）
 * - mode: 'mp4' | 'audio'
 * - 'audio' の場合: audioOnly = true, fileType = 'MP3'
 */
async function startRoomCompositeEgress({ roomName, mode = 'mp4', layout = 'grid', prefix = '' }) {
  if (!roomName) throw new Error('roomName required');

  // S3 出力共通
  const s3 = {
    accessKey: S3_ACCESS,
    secret: S3_SECRET,
    region: S3_REGION,
    endpoint: S3_ENDPOINT,     // 空でも可（AWS 純正なら空でも動く）
    bucket: S3_BUCKET,
    forcePathStyle: false,
  };

  const now = new Date().toISOString().replace(/[:.]/g, '-');

  // ファイル名と fileType をモードに応じて
  let fileType = 'MP4';
  let audioOnly = false;
  let filename;
  if (mode === 'audio') {
    audioOnly = true;
    fileType = 'MP3';
    filename = `${prefix || ''}${roomName}/${now}.mp3`;
  } else {
    // デフォルト: 映像+音声（MP4）
    filename = `${prefix || ''}${roomName}/${now}.mp4`;
  }

  // リクエストは “プレーンなオブジェクト” で OK（コンストラクタ不要）
  const request = {
    roomName,
    layout,             // 'grid' / 'speaker' など
    audioOnly,          // ← 音声のみの肝
    videoOnly: false,   // 念のため明示
    fileOutputs: [
      {
        fileType,       // 'MP3' or 'MP4'
        filepath: filename,
        s3,
      },
    ],
  };

  // 実行
  const info = await egress.startRoomCompositeEgress(request);
  // info.egressId を返す
  return { egressId: info.egressId };
}

async function stopEgress(egressId) {
  await egress.stopEgress(egressId);
}

module.exports = {
  startRoomCompositeEgress,
  stopEgress,
};
