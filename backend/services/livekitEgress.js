// services/livekitEgress.js
/* eslint-disable no-console */
const {
  EgressClient,
  EncodedFileOutput,
  S3Upload,
  EncodedFileType,
} = require('livekit-server-sdk');

// ==== Env ====
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

// S3
const S3_BUCKET = process.env.EGRESS_S3_BUCKET;
const S3_REGION = process.env.EGRESS_S3_REGION;
const S3_ENDPOINT = process.env.EGRESS_S3_ENDPOINT || '';
const S3_ACCESS_KEY = process.env.EGRESS_S3_ACCESS_KEY_ID;
const S3_SECRET = process.env.EGRESS_S3_SECRET_ACCESS_KEY;
const S3_FORCE_PATH_STYLE = process.env.EGRESS_S3_FORCE_PATH_STYLE === '1';

// Sanity checks (警告は出すが処理は続行)
if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.warn('[Egress] LIVEKIT credentials missing');
}
if (!S3_BUCKET || !S3_REGION || !S3_ACCESS_KEY || !S3_SECRET) {
  console.warn('[Egress] S3 configs missing');
}

const egressClient = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

// ==== Helpers ====
function buildS3Upload() {
  return new S3Upload({
    bucket: S3_BUCKET,
    region: S3_REGION,
    endpoint: S3_ENDPOINT || undefined, // 空文字は渡さない
    accessKey: S3_ACCESS_KEY,
    secret: S3_SECRET,
    forcePathStyle: !!S3_FORCE_PATH_STYLE,
  });
}

function ensureTrailingSlash(prefix = '') {
  if (!prefix) return '';
  return prefix.endsWith('/') ? prefix : `${prefix}/`;
}

function isoForFilename(d = new Date()) {
  // 例: 2025-10-18T06-40-48.399Z （: を - に）
  return d.toISOString().replace(/:/g, '-');
}

// LiveKit ステータスの “稼働中/起動中/終了中” 判定
function isEgressAlive(status) {
  return (
    status === 'EGRESS_STARTING' ||
    status === 'EGRESS_ACTIVE' ||
    status === 'EGRESS_ENDING'
  );
}

// ==== Public APIs ==== //

/**
 * ルーム合成Egress開始
 * @param {object} p
 * @param {string} p.roomName  例: "minutes-xxxx"
 * @param {'mp4'|'audio'} [p.mode='mp4']  mp4=映像+音声 / audio=音声のみ
 * @param {'grid'|'speaker'|string} [p.layout='grid']  mp4時のレイアウト
 * @param {string} [p.prefix='']  S3保存先の先頭キー（末尾/推奨）
 * @param {'ogg'|'mp3'} [p.audioFormat='ogg']  ※mp3指定でもOGGにフォールバック
 * @returns {Promise<{ egressId: string, filepath: string }>}
 */
async function startRoomCompositeEgress({
  roomName,
  mode = 'mp4',
  layout = 'grid',
  prefix = '',
  audioFormat = 'ogg',
}) {
  if (!roomName) throw new Error('roomName required');

  // S3 出力先の前置きを整形（空ならそのまま）
  const normalizedPrefix = ensureTrailingSlash(prefix);

  const nowIso = isoForFilename(new Date());
  const s3 = buildS3Upload();

  // 出力ファイル種別とパス
  let fileType;
  let filepath;

  if (mode === 'audio') {
    // LiveKitのエンコードは Opus-in-OGG を使用
    // 明示的に mp3 を指定されても OGG を使う（サーバ保守方針どおり）
    fileType = EncodedFileType.OGG;
    filepath = `${normalizedPrefix}${roomName}/${nowIso}.ogg`;
  } else {
    fileType = EncodedFileType.MP4;
    filepath = `${normalizedPrefix}${roomName}/${nowIso}.mp4`;
  }

  const fileOutput = new EncodedFileOutput({
    fileType,
    filepath,
    output: { case: 's3', value: s3 },
  });

  // v2 SDK の RoomCompositeOptions は“型”なのでプレーンオブジェクトでOK
  // ref:
  // https://docs.livekit.io/reference/server-sdk-js/classes/EgressClient.html#startRoomCompositeEgress
  const options = {
    audioOnly: mode === 'audio',
    layout: mode === 'audio' ? undefined : layout,
    // encodingOptions: 'H264_720P_30', // 必要なら有効化
    // customBaseUrl: 'https://your-template-host/page.html',
    // audioMixing: { ... },
  };

  const res = await egressClient.startRoomCompositeEgress(roomName, fileOutput, options);
  return { egressId: res.egressId, filepath };
}

/**
 * egress を停止
 * @param {string} egressId
 */
async function stopEgress(egressId) {
  if (!egressId) throw new Error('egressId required');
  await egressClient.stopEgress(egressId);
}

/**
 * その roomName で “稼働中 or 起動中 or 終了中” の egress がなければ、
 * 音声のみ(OGG)の合成Egressを起動する
 * @param {object} p
 * @param {string} p.roomName
 * @param {string} [p.prefix]
 * @param {'ogg'|'mp3'} [p.audioFormat='ogg']
 * @returns {Promise<{ok: true, started: boolean, egressId: string}>}
 */
async function ensureAudioEgress({ roomName, prefix = '', audioFormat = 'ogg' }) {
  if (!roomName) throw new Error('roomName required');

  const list = await egressClient.listEgress();
  const alive = (list.items || []).find(
    (it) => it.roomName === roomName && isEgressAlive(it.status),
  );

  if (alive?.egressId) {
    return { ok: true, started: false, egressId: alive.egressId };
  }

  const { egressId } = await startRoomCompositeEgress({
    roomName,
    mode: 'audio',
    layout: 'grid',
    prefix,
    audioFormat: 'ogg', // 方針としてOGG固定（mp3指定は無視）
  });

  return { ok: true, started: true, egressId };
}

/**
 * LiveKit 全 egress の一覧を返す（運用/デバッグ用）
 * @returns {Promise<Array>}
 */
async function listEgress() {
  const res = await egressClient.listEgress();
  return res.items || [];
}

/**
 * 指定 roomName の egress をフィルタして返す（運用/デバッグ用）
 * @param {string} roomName
 * @returns {Promise<Array>}
 */
async function listRoomEgress(roomName) {
  if (!roomName) throw new Error('roomName required');
  const items = await listEgress();
  return items.filter((it) => it.roomName === roomName);
}

module.exports = {
  // main ops
  startRoomCompositeEgress,
  stopEgress,
  ensureAudioEgress,
  // helpers (routes/status などから利用可)
  listEgress,
  listRoomEgress,
};
