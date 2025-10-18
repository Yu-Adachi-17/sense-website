// services/livekitEgress.js
const {
  EgressClient,
  EncodedFileOutput,
  SegmentedFileOutput,
  S3Upload,
  S3UploadOptions,
  EncodingOptionsPreset,
} = require('livekit-server-sdk');

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.warn('[Egress] Missing LiveKit credentials / URL');
}

// ---- S3 出力オプションを生成 ----
function buildS3Upload() {
  const {
    EGRESS_S3_BUCKET,
    EGRESS_S3_REGION,
    EGRESS_S3_ENDPOINT,
    EGRESS_S3_ACCESS_KEY_ID,
    EGRESS_S3_SECRET_ACCESS_KEY,
  } = process.env;

  if (!EGRESS_S3_BUCKET || !EGRESS_S3_REGION || !EGRESS_S3_ACCESS_KEY_ID || !EGRESS_S3_SECRET_ACCESS_KEY) {
    throw new Error('[Egress] S3 environment variables are not set');
  }

  const opts = new S3UploadOptions({
    bucket: EGRESS_S3_BUCKET,
    region: EGRESS_S3_REGION,
    // endpoint は AWS なら省略可（MinIO 等の S3 互換なら必須）
    endpoint: EGRESS_S3_ENDPOINT || undefined,
    accessKey: EGRESS_S3_ACCESS_KEY_ID,
    secret: EGRESS_S3_SECRET_ACCESS_KEY,
  });
  return new S3Upload({ options: opts });
}

// ---- クライアント（軽量なので毎回生成でもOK） ----
function getClient() {
  return new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
}

/**
 * ルーム合成（RoomComposite）Egress を開始
 * @param {Object} params
 * @param {string} params.roomName  - LiveKitのルーム名
 * @param {'mp4'|'hls'} params.mode - 出力モード（MP4 or HLS）
 * @param {string} [params.prefix]  - 出力パスの先頭（例: minutes/2025-10-17/<room>/）
 * @param {string} [params.layout]  - 'grid' | 'speaker' など
 * @returns {Promise<{egressId: string}>}
 */
async function startRoomCompositeEgress({ roomName, mode = 'mp4', prefix = '', layout = 'grid' }) {
  if (!roomName) throw new Error('roomName required');

  const client = getClient();
  const s3Upload = buildS3Upload();

  // 出力先とファイル名
  const basePath = `${(prefix || 'recordings/').replace(/\/?$/, '/')}${roomName}/`;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  const preset = EncodingOptionsPreset.H264_720P_30; // 軽め＆十分な画質（必要なら 1080p に変更）

  if (mode === 'hls') {
    const seg = new SegmentedFileOutput({
      // HLS の .m3u8 & .ts をこの prefix 配下に吐く
      filenamePrefix: `${basePath}${timestamp}/index`,
      playlistName: 'index.m3u8',
      livePlaylistName: 'live.m3u8', // 直近数セグメントのライブリスト（任意）
      output: { case: 's3', value: s3Upload },
    });

    const res = await client.startRoomCompositeEgress({
      roomName,
      layout,                     // 'grid' | 'speaker'
      preset,                     // または advanced
      segmentOutputs: [seg],      // HLS 出力
      // ここに webhookUrl を指定すると、Egress用の専用Webhookも送れる
    });

    return { egressId: res.egressId };
  }

  // 既定: MP4 で1ファイル書き出し
  const file = new EncodedFileOutput({
    filepath: `${basePath}${timestamp}.mp4`,
    output: { case: 's3', value: s3Upload },
  });

  const res = await client.startRoomCompositeEgress({
    roomName,
    layout,
    preset,
    fileOutputs: [file],
  });

  return { egressId: res.egressId };
}

/**
 * Egress の停止
 * @param {string} egressId
 */
async function stopEgress(egressId) {
  if (!egressId) throw new Error('egressId required');
  const client = getClient();
  await client.stopEgress(egressId);
}

module.exports = {
  startRoomCompositeEgress,
  stopEgress,
};
