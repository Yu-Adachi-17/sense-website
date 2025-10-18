// services/livekitEgress.js
const {
  EgressClient,
  EncodedFileOutput,
  S3Upload,
  EncodedFileType,
} = require('livekit-server-sdk'); // ← RoomCompositeOptions は import しない（型のみ）

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

// S3 環境変数
const S3_BUCKET = process.env.EGRESS_S3_BUCKET;
const S3_REGION = process.env.EGRESS_S3_REGION;
const S3_ENDPOINT = process.env.EGRESS_S3_ENDPOINT || '';
const S3_ACCESS_KEY = process.env.EGRESS_S3_ACCESS_KEY_ID;
const S3_SECRET = process.env.EGRESS_S3_SECRET_ACCESS_KEY;
const S3_FORCE_PATH_STYLE = process.env.EGRESS_S3_FORCE_PATH_STYLE === '1';

if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.warn('[Egress] LIVEKIT credentials missing');
}
if (!S3_BUCKET || !S3_REGION || !S3_ACCESS_KEY || !S3_SECRET) {
  console.warn('[Egress] S3 configs missing');
}

const egressClient = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

function buildS3Upload() {
  return new S3Upload({
    bucket: S3_BUCKET,
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    accessKey: S3_ACCESS_KEY,
    secret: S3_SECRET,
    forcePathStyle: S3_FORCE_PATH_STYLE,
  });
}

/**
 * ルーム合成Egress開始
 * @param {object} p
 * @param {string} p.roomName  例: "minutes-xxxx"
 * @param {'mp4'|'audio'} p.mode  mp4=映像+音声 / audio=音声のみ
 * @param {'grid'|'speaker'|string} [p.layout]  mp4時のレイアウト
 * @param {string} [p.prefix]  S3保存先の先頭キー（末尾/推奨）
 * @param {'ogg'|'mp3'} [p.audioFormat]  ※mp3は推奨外。実際はOGG固定にフォールバック
 */
async function startRoomCompositeEgress({
  roomName,
  mode = 'mp4',
  layout = 'grid',
  prefix = '',
  audioFormat = 'ogg',
}) {
  if (!roomName) throw new Error('roomName required');

  const nowIso = new Date().toISOString().replace(/[:]/g, '-');
  const s3 = buildS3Upload();

  // 出力ファイル種別とパス
  let fileType;
  let filepath;

  if (mode === 'audio') {
    // 公式は Opus in OGG を明示。mp3指定でもOGGにフォールバック
    fileType = EncodedFileType.OGG;
    filepath = `${prefix || ''}${roomName}/${nowIso}.ogg`;
  } else {
    fileType = EncodedFileType.MP4;
    filepath = `${prefix || ''}${roomName}/${nowIso}.mp4`;
  }

  const fileOutput = new EncodedFileOutput({
    fileType,
    filepath,
    output: { case: 's3', value: s3 },
  });

  // ★ v2系SDKでは RoomCompositeOptions は“型”。プレーンobjectでOK
  //    https://docs.livekit.io/reference/server-sdk-js/classes/EgressClient.html#startRoomCompositeEgress
  //    https://docs.livekit.io/reference/server-sdk-js/interfaces/RoomCompositeOptions.html
  const options = {
    audioOnly: mode === 'audio',
    layout: mode === 'audio' ? undefined : layout,
    // 必要に応じて:
    // encodingOptions: 'H264_720P_30',
    // customBaseUrl: 'https://your-template-host/page.html',
    // audioMixing: { ... },
  };

  // シグネチャ：startRoomCompositeEgress(roomName, output, opts)
  const res = await egressClient.startRoomCompositeEgress(roomName, fileOutput, options);
  return { egressId: res.egressId };
}

async function stopEgress(egressId) {
  if (!egressId) throw new Error('egressId required');
  await egressClient.stopEgress(egressId);
}

module.exports = {
  startRoomCompositeEgress,
  stopEgress,
};
