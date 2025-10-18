// routes/recordings.js
/* eslint-disable no-console */
const express = require('express');
const { S3Client, HeadObjectCommand, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const router = express.Router();

// ==== Env ====
const BUCKET = process.env.EGRESS_S3_BUCKET;
const REGION = process.env.EGRESS_S3_REGION;
const ENDPOINT = process.env.EGRESS_S3_ENDPOINT || undefined;
const ACCESS_KEY_ID = process.env.EGRESS_S3_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.EGRESS_S3_SECRET_ACCESS_KEY;
const FORCE_PATH_STYLE = process.env.EGRESS_S3_FORCE_PATH_STYLE === '1';

const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
  forcePathStyle: !!FORCE_PATH_STYLE,
});

// 入力キーの正規化（空白/改行/URLエンコード混在を排除）
function normalizeKey(raw) {
  if (!raw) return '';
  let k = String(raw).trim();
  try {
    // 既にエンコード済みを二重デコードしないように一度 decode を試すだけ
    const dec = decodeURIComponent(k);
    if (!dec.includes('%')) k = dec;
  } catch (_) {}
  // S3 キーに先頭スラッシュは不要
  if (k.startsWith('/')) k = k.slice(1);
  return k;
}

/**
 * GET /api/recordings/presign?key=...
 * 署名付きダウンロードURLを返す
 */
router.get('/presign', async (req, res) => {
  try {
    if (!BUCKET) return res.status(500).json({ error: 'S3 bucket not configured' });
    const key = normalizeKey(req.query.key);
    if (!key) return res.status(400).json({ error: 'key required' });

    // まず存在確認（404なら即返す）
    try {
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    } catch (e) {
      if (e?.$metadata?.httpStatusCode === 404 || e?.name === 'NotFound' || e?.Code === 'NotFound') {
        return res.status(404).json({ error: 'NoSuchKey', key });
      }
      // 権限など別理由はそのまま進めず返す
      console.error('[presign] head error', e);
      return res.status(500).json({ error: 'head failed', details: String(e?.message || e), key });
    }

    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 600 }); // 10分
    return res.json({ url, expiresIn: 600, bucket: BUCKET, key });
  } catch (e) {
    console.error('[presign] error', e);
    return res.status(500).json({ error: 'presign failed', details: String(e?.message || e) });
  }
});

/**
 * GET /api/recordings/exists?key=...
 * 指定キーの存在を HEAD で確認
 */
router.get('/exists', async (req, res) => {
  try {
    const key = normalizeKey(req.query.key);
    if (!key) return res.status(400).json({ error: 'key required' });
    try {
      const r = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
      return res.json({ exists: true, key, contentLength: r.ContentLength, contentType: r.ContentType });
    } catch (e) {
      if (e?.$metadata?.httpStatusCode === 404 || e?.name === 'NotFound' || e?.Code === 'NotFound') {
        return res.json({ exists: false, key });
      }
      console.error('[exists] head error', e);
      return res.status(500).json({ error: 'head failed', details: String(e?.message || e) });
    }
  } catch (e) {
    console.error('[exists] error', e);
    return res.status(500).json({ error: 'exists failed', details: String(e?.message || e) });
  }
});

/**
 * GET /api/recordings/list?prefix=...
 * prefix 配下のオブジェクト一覧を返す（最大1000件）
 */
router.get('/list', async (req, res) => {
  try {
    const prefix = normalizeKey(req.query.prefix || '');
    const params = { Bucket: BUCKET, Prefix: prefix, MaxKeys: 1000 };
    const r = await s3.send(new ListObjectsV2Command(params));
    const items = (r.Contents || []).map((o) => ({ key: o.Key, size: o.Size, lastModified: o.LastModified }));
    return res.json({ bucket: BUCKET, prefix, count: items.length, items });
  } catch (e) {
    console.error('[list] error', e);
    return res.status(500).json({ error: 'list failed', details: String(e?.message || e) });
  }
});

module.exports = router;
