const {
  EgressClient,
  EncodedFileOutput,
  SegmentedFileOutput,
  S3Upload,
  S3UploadOptions,
  EncodingOptionsPreset,
} = require('livekit-server-sdk');

function buildS3Upload() {
  const { EGRESS_S3_BUCKET, EGRESS_S3_REGION, EGRESS_S3_ENDPOINT, EGRESS_S3_ACCESS_KEY_ID, EGRESS_S3_SECRET_ACCESS_KEY } = process.env;
  const opts = new S3UploadOptions({
    bucket: EGRESS_S3_BUCKET,
    region: EGRESS_S3_REGION,
    endpoint: EGRESS_S3_ENDPOINT || undefined,
    accessKey: EGRESS_S3_ACCESS_KEY_ID,
    secret: EGRESS_S3_SECRET_ACCESS_KEY,
  });
  return new S3Upload({ options: opts });
}

function getClient() {
  const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = process.env;
  return new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
}

async function startRoomCompositeEgress({ roomName, mode = 'mp4', prefix = '', layout = 'grid' }) {
  const client = getClient();
  const s3Upload = buildS3Upload();
  const basePath = `${(prefix || 'recordings/').replace(/\/?$/, '/')}${roomName}/`;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const preset = EncodingOptionsPreset.H264_720P_30;

  if (mode === 'hls') {
    const seg = new SegmentedFileOutput({
      filenamePrefix: `${basePath}${timestamp}/index`,
      playlistName: 'index.m3u8',
      livePlaylistName: 'live.m3u8',
      output: { case: 's3', value: s3Upload },
    });
    const res = await client.startRoomCompositeEgress({ roomName, layout, preset, segmentOutputs: [seg] });
    return { egressId: res.egressId };
  }

  const file = new EncodedFileOutput({
    filepath: `${basePath}${timestamp}.mp4`,
    output: { case: 's3', value: s3Upload },
  });
  const res = await client.startRoomCompositeEgress({ roomName, layout, preset, fileOutputs: [file] });
  return { egressId: res.egressId };
}

async function stopEgress(egressId) {
  const client = getClient();
  await client.stopEgress(egressId);
}

module.exports = { startRoomCompositeEgress, stopEgress }; // ←オブジェクトexportでOK（ルーターではない）
