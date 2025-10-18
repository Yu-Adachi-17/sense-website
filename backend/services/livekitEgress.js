// services/livekitEgress.js
const {
  EgressClient,
  EncodedFileOutput,
  S3Upload,
  RoomCompositeOptions,
  EncodedFileType,
} = require('livekit-server-sdk');

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

// S3 環境変数
const S3_BUCKET = process.env.EGRESS_S3_BUCKET;
const S3_REGION = process.env.EGRESS_S3_REGION;
const S3_ENDPOINT = process.env.EGRESS_S3_ENDPOINT || ''; // 空でもOK
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

// S3 Upload 定義（新API：output = { case: 's3', value: new S3Upload(...) }）
function buildS3Upload() {
  return new S3Upload({
    bucket: S3_BUCKET,
    region: S3_REGION,
    endpoint: S3_ENDPOINT,        // AWSなら空でも可（設定していてもOK）
    accessKey: S3_ACCESS_KEY,
    secret: S3_SECRET,
    forcePathStyle: S3_FORCE_PATH_STYLE, // AWSは通常 false
    // metadata, tagging, contentDisposition など必要ならここに
  });
}

/**
 * ルーム合成Egress開始
 * @param {object} p
 * @param {string} p.roomName  LiveKitのroomName（例: "minutes-xxxx"）
 * @param {'mp4'|'audio'} p.mode  mp4=映像+音声 / audio=音声のみ
 * @param {'grid'|'speaker'|string} [p.layout]  mp4時のレイアウト
 * @param {string} [p.prefix] S3内の保存先プレフィックス（末尾は / 推奨）
 */
async function startRoomCompositeEgress({ roomName, mode = 'mp4', layout = 'grid', prefix = '' }) {
  if (!roomName) throw new Error('roomName required');

  const nowIso = new Date().toISOString().replace(/[:]/g, '-');
  const s3 = buildS3Upload();

  // === 出力（EncodedFileOutput）を新APIで作成 ===
  let fileType;
  let filepath;

  if (mode === 'audio') {
    // 音声のみ：コンテナは OGG を推奨（Opus）
    fileType = EncodedFileType.OGG;
    filepath = `${prefix || ''}${roomName}/${nowIso}.ogg`;
  } else {
    // 映像+音声：mp4
    fileType = EncodedFileType.MP4;
    filepath = `${prefix || ''}${roomName}/${nowIso}.mp4`;
  }

  const fileOutput = new EncodedFileOutput({
    fileType,
    filepath,
    // ← ここがポイント：output.oneof の設定
    output: { case: 's3', value: s3 },
  });

  // === オプション ===
  const options = new RoomCompositeOptions({
    // 映像不要なら audioOnly を true
    audioOnly: mode === 'audio',
    // mp4時のみレイアウトや画面サイズを指定
    layout: mode === 'audio' ? undefined : layout,
    // 画面サイズなど必要なら：
    // width: 1280,
    // height: 720,
    // framerate: 30,
  });

  // startRoomCompositeEgress(roomName, output(s), options)
  // SDKの現行ドキュメントでは単一出力を「第2引数」に渡す書き方でもOK
  // 互換のため { file: fileOutput } 形式にも対応していますが、
  // サーバ側の "missing output" を避けるため fileOutput をそのまま渡します。
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
