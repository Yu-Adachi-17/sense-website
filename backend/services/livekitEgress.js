// services/livekitEgress.js
const { EgressClient } = require('livekit-server-sdk');

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

// S3設定（.envの値をそのまま使う）
const S3_BUCKET   = process.env.EGRESS_S3_BUCKET;
const S3_REGION   = process.env.EGRESS_S3_REGION;
const S3_ENDPOINT = process.env.EGRESS_S3_ENDPOINT || '';     // AWS純正なら https://s3.<region>.amazonaws.com
const S3_ACCESS   = process.env.EGRESS_S3_ACCESS_KEY_ID;
const S3_SECRET   = process.env.EGRESS_S3_SECRET_ACCESS_KEY;

// LiveKit JS SDK クライアント
const egressClient = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

/**
 * 音声のみ or 映像つきコンポジットの開始
 * @param {object} p
 *  - roomName: string
 *  - mode: 'audio' | 'mp4' | 'hls'
 *  - layout: 'grid' | 'speaker' | 'custom'（audioでは無視される）
 *  - prefix: 'minutes/2025-10-18/' など（S3の保存プレフィックス）
 *  - audioFormat: 'mp3' | 'ogg'（省略可: 既定mp3）
 */
async function startRoomCompositeEgress(p) {
  const {
    roomName,
    mode = 'audio',
    layout = 'grid',
    prefix = '',
    audioFormat = 'mp3',
  } = p || {};

  if (!roomName) throw new Error('roomName required');

  // 出力ファイル名
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const baseKey = `${prefix}${roomName}/${ts}`;

  // S3出力（protoの型名ではなく “ただのオブジェクト” でOK）
  const s3Upload = {
    accessKey: S3_ACCESS,
    secret: S3_SECRET,
    region: S3_REGION,
    endpoint: S3_ENDPOINT,       // AWS純正なら https://s3.ap-northeast-1.amazonaws.com
    bucket: S3_BUCKET,
    forcePathStyle: false
  };

  // ======== 音声のみ（会議全体を1ファイルへミックス）========
  if (mode === 'audio') {
    // ファイル拡張子とエンコードタイプ
    const isMp3 = (audioFormat || 'mp3').toLowerCase() === 'mp3';
    const ext = isMp3 ? 'mp3' : 'ogg';
    // fileOutputs の “fileType” はエンムですが、JSは文字列名でOK（サーバ側で解釈）
    const fileOutputs = [{
      filepath: `${baseKey}.${ext}`,
      fileType: isMp3 ? 'MP3' : 'OGG',
      s3: s3Upload
    }];

    // RoomCompositeEgressRequest 相当のプレーンオブジェクト
    const req = {
      roomComposite: {
        roomName,
        // audioOnly を true にすると映像はレンダリングされず、全参加者の音声が1ファイルにミックスされます
        audioOnly: true,
        layout,              // 無視されるが入っていてもOK
        fileOutputs
      }
    };

    const info = await egressClient.startRoomCompositeEgress(req);
    return { egressId: info.egressId };
  }

  // ======== 映像付き（従来のMP4/HLS）========
  if (mode === 'mp4') {
    const req = {
      roomComposite: {
        roomName,
        layout,
        fileOutputs: [{
          filepath: `${baseKey}.mp4`,
          fileType: 'MP4',
          s3: s3Upload
        }]
      }
    };
    const info = await egressClient.startRoomCompositeEgress(req);
    return { egressId: info.egressId };
  }

  if (mode === 'hls') {
    const req = {
      roomComposite: {
        roomName,
        layout,
        segmentOutputs: [{
          // HLSはセグメント/プレイリストが作られます
          filenamePrefix: `${baseKey}`,
          playlistName: 'index.m3u8',
          s3: s3Upload
        }]
      }
    };
    const info = await egressClient.startRoomCompositeEgress(req);
    return { egressId: info.egressId };
  }

  throw new Error(`unsupported mode: ${mode}`);
}

async function stopEgress(egressId) {
  if (!egressId) throw new Error('egressId required');
  await egressClient.stopEgress(egressId);
  return true;
}

module.exports = { startRoomCompositeEgress, stopEgress };
