// services/livekitEgress.js
// ------------------------------------------------------
// LiveKit Egress ラッパ
//  - LiveKit Cloud の Egress API を叩いて、S3 に録画を書き出す
//  - 「映像あり(mp4)」と「音声のみ(audio)」の両方をサポート
//  - 出力は必ず oneof: { file: EncodedFileOutput } を渡す（SDK要件）
//  - 音声のみは startRoomCompositeEgress の第3引数で audioOnly: true を指定
//    → 会議参加者の音声をミックスして 1 ファイルに
//
// 必要な環境変数（Railway Vars 等）
//   LIVEKIT_URL                wss(s)://... 例: wss://xxx.livekit.cloud
//   LIVEKIT_API_KEY
//   LIVEKIT_API_SECRET
//
//   EGRESS_S3_BUCKET           例: sense-minutes-recordings-prod-apne1
//   EGRESS_S3_REGION           例: ap-northeast-1
//   EGRESS_S3_ENDPOINT         例: https://s3.ap-northeast-1.amazonaws.com（省略可）
//   EGRESS_S3_ACCESS_KEY_ID
//   EGRESS_S3_SECRET_ACCESS_KEY
//
// 使い方：routes/egress.js から startRoomCompositeEgress / stopEgress を呼ぶだけ
// ------------------------------------------------------

const {
  EgressClient,
  EncodedFileOutput,
  S3Upload,
} = require('livekit-server-sdk');

const REQUIRED_ENVS = [
  'LIVEKIT_URL',
  'LIVEKIT_API_KEY',
  'LIVEKIT_API_SECRET',
  'EGRESS_S3_BUCKET',
  'EGRESS_S3_REGION',
  'EGRESS_S3_ACCESS_KEY_ID',
  'EGRESS_S3_SECRET_ACCESS_KEY',
];

function assertEnvs() {
  const missing = REQUIRED_ENVS.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`[Egress] Missing env(s): ${missing.join(', ')}`);
  }
}

function getClient() {
  assertEnvs();
  return new EgressClient(
    process.env.LIVEKIT_URL,
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET
  );
}

// prefix の正規化（"" or "minutes/2025-10-18/" のような形に）
function normalizePrefix(prefix) {
  const p = (prefix || '').trim().replace(/^\/+/, ''); // 先頭スラッシュ除去
  if (!p) return '';
  return p.endsWith('/') ? p : `${p}/`;
}

// S3Upload を組み立て
function buildS3Upload() {
  return new S3Upload({
    accessKey: process.env.EGRESS_S3_ACCESS_KEY_ID,
    secret: process.env.EGRESS_S3_SECRET_ACCESS_KEY,
    region: process.env.EGRESS_S3_REGION,
    endpoint: process.env.EGRESS_S3_ENDPOINT || undefined, // 純AWSなら省略でもOK
    bucket: process.env.EGRESS_S3_BUCKET,
    forcePathStyle: false,
    // metadata, tagging など必要が出てきたらここに追記
  });
}

/**
 * 音声のみ/映像ありどちらでも「ファイル出力」を作る
 * - LiveKit Egress は outputs の oneof を必ず必要とする
 * - ここでは file 出力（S3 + EncodedFileOutput）を生成
 * - 音声のみでもコンテナは mp4 でOK（扱いやすさ重視）
 */
function buildFileOutput(filepath) {
  return new EncodedFileOutput({
    filepath,     // 例: minutes/2025-10-18/minutes-xxxx/{time}.mp4
    s3: buildS3Upload(),
    // disableManifest: true, // .json を出したくない場合は有効化
  });
}

/**
 * Egress 開始
 * @param {Object} args
 * @param {string} args.roomName  - LiveKit の roomName（例: "minutes-xxxx"）
 * @param {('mp4'|'audio')} [args.mode='mp4'] - 'audio' で音声のみ
 * @param {('grid'|'speaker'|string)} [args.layout='grid'] - 映像あり時のレイアウト
 * @param {string} [args.prefix=''] - S3 キーのプレフィックス（例: "minutes/2025-10-18/"）
 * @returns {Promise<{egressId: string}>}
 */
async function startRoomCompositeEgress({ roomName, mode = 'mp4', layout = 'grid', prefix = '' }) {
  if (!roomName) throw new Error('roomName is required');

  const client = getClient();
  const keyPrefix = normalizePrefix(prefix);
  // 音声のみでも mp4 でOK（コーデックは LiveKit 側既定。必要に応じて EncodingOptions で細かく制御可能）
  const filepath = `${keyPrefix}${roomName}/{time}.mp4`;

  const outputs = { file: buildFileOutput(filepath) };

  // 第3引数が「オプション」。音声のみはここで指定するのが重要！
  const optsBase = { layout }; // 映像あり時に効く（audioOnly=true の場合は映像出力無し）
  const opts = (mode === 'audio')
    ? { ...optsBase, audioOnly: true }
    : { ...optsBase, audioOnly: false };

  // LiveKit v2: startRoomCompositeEgress(roomName, outputs, opts)
  // outputs は oneof: { file } / { segment } / { stream } のいずれかを必ず渡す
  const info = await client.startRoomCompositeEgress(roomName, outputs, opts);

  // 返却される info に egressId / status などが含まれる
  return { egressId: info.egressId };
}

/**
 * Egress 停止
 * @param {string} egressId - start の戻りで得た egressId
 */
async function stopEgress(egressId) {
  if (!egressId) throw new Error('egressId is required');
  const client = getClient();
  await client.stopEgress(egressId);
}

module.exports = {
  startRoomCompositeEgress,
  stopEgress,
};
