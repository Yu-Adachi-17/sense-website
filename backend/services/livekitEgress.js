// services/livekitEgress.js
const { EgressClient, RoomCompositeOptions, EncodedFileOutput, AudioFileType, StopEgressRequest } = require('livekit-server-sdk');

const LK_URL = process.env.LIVEKIT_URL;
const LK_API_KEY = process.env.LIVEKIT_API_KEY;
const LK_API_SECRET = process.env.LIVEKIT_API_SECRET;

const S3_BUCKET = process.env.EGRESS_S3_BUCKET;
const S3_REGION = process.env.EGRESS_S3_REGION;
const S3_ENDPOINT = process.env.EGRESS_S3_ENDPOINT;
const S3_ACCESS_KEY_ID = process.env.EGRESS_S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.EGRESS_S3_SECRET_ACCESS_KEY;

const client = new EgressClient(LK_URL, LK_API_KEY, LK_API_SECRET);

function buildS3(filePath) {
  return {
    accessKey: S3_ACCESS_KEY_ID,
    secret: S3_SECRET_ACCESS_KEY,
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    bucket: S3_BUCKET,
    forcePathStyle: false,
  };
}

async function startRoomCompositeEgress({ roomName, mode = 'mp4', layout = 'grid', prefix = '' }) {
  // 共通: S3 パス先頭
  const basePrefix = prefix || `minutes/${new Date().toISOString().slice(0,10)}/`;
  const timeToken = new Date().toISOString().replace(/[:.]/g, '-');

  if (mode === 'audio') {
    // === 音声のみ: 参加者全員のミックスを 1 本の OGG に ===
    const options = new RoomCompositeOptions({
      roomName,
      audioOnly: true,      // ← これがポイント（全員のミックス音声、映像なし）
      layout: 'speaker',    // 映像出力しないので layout は実質無関係
    });

    const output = new EncodedFileOutput({
      // OGG(=Opus) を明示。拡張子も .ogg に
      fileType: AudioFileType.OGG,
      filepath: `${basePrefix}${roomName}/${timeToken}.ogg`,
      s3: buildS3(`${basePrefix}${roomName}/${timeToken}.ogg`),
    });

    const res = await client.roomCompositeEgress(options, [output]);
    return { egressId: res.egressId };
  }

  // 既存: 動画（mp4）など
  const options = new RoomCompositeOptions({
    roomName,
    layout,
    audioOnly: false,
    videoOnly: false,
  });

  const output = new EncodedFileOutput({
    // 既定は MP4（ビデオ＋オーディオ）
    filepath: `${basePrefix}${roomName}/${timeToken}.mp4`,
    s3: buildS3(`${basePrefix}${roomName}/${timeToken}.mp4`),
  });

  const res = await client.roomCompositeEgress(options, [output]);
  return { egressId: res.egressId };
}

async function stopEgress(egressId) {
  const req = new StopEgressRequest({ egressId });
  await client.stopEgress(req);
}

module.exports = { startRoomCompositeEgress, stopEgress };
