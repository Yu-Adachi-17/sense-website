// routes/recordings.js
const express = require('express');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const router = express.Router();

const S3_REGION   = process.env.EGRESS_S3_REGION || 'ap-northeast-1';
const S3_BUCKET   = process.env.EGRESS_S3_BUCKET;
const S3_ENDPOINT = process.env.EGRESS_S3_ENDPOINT || undefined; // AWSなら省略OK
const S3_ACCESS_KEY_ID     = process.env.EGRESS_S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.EGRESS_S3_SECRET_ACCESS_KEY;

if (!S3_BUCKET) {
  console.warn('[recordings] EGRESS_S3_BUCKET not set');
}

const s3 = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT,        // AWS純正なら未設定でOK
  forcePathStyle: !!S3_ENDPOINT, // 互換S3を使うときは true が必要なことが多い
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
});

// 例1: 再生/ダウンロード用の一時URLを発行
// GET /api/recordings/presign?key=minutes/2025-10-18/....mp4
router.get('/recordings/presign', async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) return res.status(400).json({ error: 'missing key' });

    const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 10 }); // 10分
    res.json({ url });
  } catch (e) {
    console.error('[presign GET] error', e);
    res.status(500).json({ error: 'failed to presign' });
  }
});

// 例2（任意）: クライアント直PUT用の一時URL
// GET /api/recordings/presign-put?key=debug/test.txt&contentType=text/plain
router.get('/recordings/presign-put', async (req, res) => {
  try {
    const key = req.query.key;
    const contentType = req.query.contentType || 'application/octet-stream';
    if (!key) return res.status(400).json({ error: 'missing key' });

    const cmd = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 }); // 5分
    res.json({ url });
  } catch (e) {
    console.error('[presign PUT] error', e);
    res.status(500).json({ error: 'failed to presign' });
  }
});

module.exports = router;
