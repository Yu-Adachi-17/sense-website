// routes/s3.js
const express = require('express');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const router = express.Router();

const S3_REGION = process.env.EGRESS_S3_REGION; // 例: 'ap-northeast-1'
const S3_BUCKET = process.env.EGRESS_S3_BUCKET; // 例: 'sense-minutes-recordings-prod-apne1'
const S3_ENDPOINT = process.env.EGRESS_S3_ENDPOINT || undefined; // 例: 'https://s3.ap-northeast-1.amazonaws.com'
const s3 = new S3Client({ region: S3_REGION, endpoint: S3_ENDPOINT });

router.get('/s3/presign', async (req, res) => {
  try {
    const key = String(req.query.key || '');
    if (!key) return res.status(400).json({ error: 'missing key' });

    const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 60 }); // 1時間
    res.json({ url, bucket: S3_BUCKET, key });
  } catch (e) {
    console.error('[presign] error', e);
    res.status(500).json({ error: 'presign failed', details: e.message });
  }
});

module.exports = router;
