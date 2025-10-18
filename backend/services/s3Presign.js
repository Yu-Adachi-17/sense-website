// services/s3Presign.js
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({ region: 'ap-northeast-1' });

async function presign({ key, expiresIn = 3600 }) { // 1h
  const cmd = new GetObjectCommand({
    Bucket: process.env.EGRESS_S3_BUCKET,
    Key: key,
  });
  return await getSignedUrl(s3, cmd, { expiresIn });
}

module.exports = { presign };
