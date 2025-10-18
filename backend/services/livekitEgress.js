// services/livekitEgress.js
// ---------------------------------------------
// LiveKit Cloud の Egress をサーバーから開始/停止するユーティリティ
//  - 出力先: AWS S3（.env の EGRESS_S3_* を使用）
//  - モード: "mp4" or "hls"
//  - レイアウト: "grid" or "speaker"
// ---------------------------------------------

const {
  EgressClient,
  EncodedFileOutput,
  SegmentedFileOutput,
  S3Upload,
  EncodingOptionsPreset,
} = require('livekit-server-sdk');

/* ================================
 * ENV チェック（起動時に警告）
 * ================================ */
const REQUIRED_ENV = [
  'LIVEKIT_URL',
  'LIVEKIT_API_KEY',
  'LIVEKIT_API_SECRET',
  'EGRESS_S3_BUCKET',
  'EGRESS_S3_REGION',
  'EGRESS_S3_ACCESS_KEY_ID',
  'EGRESS_S3_SECRET_ACCESS_KEY',
  // AWS純正S3なら EGRESS_S3_ENDPOINT は省略可
];

for (const k of REQUIRED_ENV) {
  if (!process.env[k]) {
    console.warn(`[Egress][WARN] Missing env: ${k}`);
  }
}

/* ================================
 * S3 Upload 設定を生成
 * ================================ */
function buildS3Upload() {
  const {
    EGRESS_S3_BUCKET,
    EGRESS_S3_REGION,
    EGRESS_S3_ENDPOINT,
    EGRESS_S3_ACCESS_KEY_ID,
    EGRESS_S3_SECRET_ACCESS_KEY,
  } = process.env;

  // livekit-server-sdk v2 系は S3Upload を“直”で new する
  // endpoint は AWS 公式S3なら空でもOK（Wasabi/MinIO 等の互換S3なら必須）
  return new S3Upload({
    accessKey: EGRESS_S3_ACCESS_KEY_ID,
    secret: EGRESS_S3_SECRET_ACCESS_KEY,
    region: EGRESS_S3_REGION,
    bucket: EGRESS_S3_BUCKET,
    endpoint: EGRESS_S3_ENDPOINT || '',
    // forcePathStyle: true, // MinIO など path-style 強制が必要な場合のみ有効化
  });
}

/* ================================
 * LiveKit Egress クライアント
 * ================================ */
function getClient() {
  const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = process.env;
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error('[Egress] LIVEKIT_* の環境変数が不足しています');
  }
  return new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
}

/* ================================
 * プリセット解決（必要に応じて拡張）
 * ================================ */
function resolvePreset(presetName) {
  switch ((presetName || '').toLowerCase()) {
    case '720p30':
    case 'h264_720p_30':
      return EncodingOptionsPreset.H264_720P_30;
    case '1080p30':
    case 'h264_1080p_30':
      return EncodingOptionsPreset.H264_1080P_30;
    default:
      return EncodingOptionsPreset.H264_720P_30; // デフォルトは軽め
  }
}

/* ================================
 * 開始: Room Composite Egress
 * ================================
 * @param {Object} params
 * @param {string} params.roomName  - 例: "minutes-<id>"
 * @param {'mp4'|'hls'} [params.mode='mp4']
 * @param {'grid'|'speaker'} [params.layout='grid']
 * @param {string} [params.prefix=''] - S3 キーパスの先頭（末尾に/が付くよう整形）
 * @param {string} [params.preset='720p30'] - エンコードプリセット
 * @returns {Promise<{egressId: string}>}
 */
async function startRoomCompositeEgress({
  roomName,
  mode = 'mp4',
  layout = 'grid',
  prefix = '',
  preset = '720p30',
}) {
  if (!roomName) throw new Error('[Egress] roomName is required');

  const client = getClient();
  const s3Upload = buildS3Upload();

  const base = `${(prefix || 'recordings/').replace(/\/?$/, '/')}${roomName}/`;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const encPreset = resolvePreset(preset);

  if (mode === 'hls') {
    // 会議中にも .m3u8 / .ts が増える（近リアルタイム取得向け）
    const seg = new SegmentedFileOutput({
      // 例: recordings/<room>/<ts>/index.m3u8 とセグメント群
      filenamePrefix: `${base}${timestamp}/index`,
      playlistName: 'index.m3u8',
      livePlaylistName: 'live.m3u8', // 直近セグメントのみのライブ用（任意）
      output: { case: 's3', value: s3Upload },
    });

    const res = await client.startRoomCompositeEgress({
      roomName,
      layout,
      preset: encPreset,
      segmentOutputs: [seg],
    });

    return { egressId: res.egressId };
  }

  // 既定: MP4 1ファイル書き出し
  const file = new EncodedFileOutput({
    filepath: `${base}${timestamp}.mp4`,
    output: { case: 's3', value: s3Upload },
  });

  const res = await client.startRoomCompositeEgress({
    roomName,
    layout,
    preset: encPreset,
    fileOutputs: [file],
  });

  return { egressId: res.egressId };
}

/* ================================
 * 停止
 * ================================ */
async function stopEgress(egressId) {
  if (!egressId) throw new Error('[Egress] egressId is required');
  const client = getClient();
  await client.stopEgress(egressId);
}

/* ================================
 * exports
 * ================================ */
module.exports = {
  startRoomCompositeEgress,
  stopEgress,
};
