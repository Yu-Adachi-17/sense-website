const express = require('express');
const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const router = express.Router();

const REGION = process.env.EGRESS_S3_REGION || 'ap-northeast-1';
const BUCKET = process.env.EGRESS_S3_BUCKET;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.EGRESS_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.EGRESS_S3_SECRET_ACCESS_KEY,
  },
  endpoint: process.env.EGRESS_S3_ENDPOINT || undefined,
  forcePathStyle: false,
});

// 1) 書き込みテスト: /api/s3/debug/put?key=debug/test.txt
router.post('/s3/debug/put', async (req, res) => {
  try {
    const key = req.query.key || `debug/${Date.now()}.txt`;
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: `hello @ ${new Date().toISOString()}`,
      ContentType: 'text/plain',
    }));
    res.json({ ok: true, bucket: BUCKET, key });
  } catch (e) {
    console.error('[s3/debug/put] err', e);
    res.status(500).json({ error: e.name, message: e.message });
  }
});

// 2) 一覧: /api/s3/debug/ls?prefix=minutes/
router.get('/s3/debug/ls', async (req, res) => {
  try {
    const prefix = req.query.prefix || '';
    const out = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, MaxKeys: 200 }));
    res.json({
      bucket: BUCKET,
      prefix,
      count: (out.Contents || []).length,
      keys: (out.Contents || []).map(o => o.Key),
    });
  } catch (e) {
    console.error('[s3/debug/ls] err', e);
    res.status(500).json({ error: e.name, message: e.message });
  }
});

module.exports = router;
