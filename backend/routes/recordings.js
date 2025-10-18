// routes/recordings.js
/* eslint-disable no-console */
const express = require('express');
const fs = require('fs');
const path = require('path');
const { S3Client, HeadObjectCommand, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { EgressClient } = require('livekit-server-sdk');

const router = express.Router();

// ==== Env ====
const BUCKET = process.env.EGRESS_S3_BUCKET;
const REGION = process.env.EGRESS_S3_REGION;
const ENDPOINT = process.env.EGRESS_S3_ENDPOINT || undefined;
const ACCESS_KEY_ID = process.env.EGRESS_S3_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.EGRESS_S3_SECRET_ACCESS_KEY;
const FORCE_PATH_STYLE = process.env.EGRESS_S3_FORCE_PATH_STYLE === '1';

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
  forcePathStyle: !!FORCE_PATH_STYLE,
});

const lk = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

// Webhookの簡易DB（routes/livekitWebhook.js と同じ場所を参照）
const DB_FILE = path.join(__dirname, '..', 'data', 'egress-events.json');

function normalizeKey(raw) {
  if (!raw) return '';
  let k = String(raw).trim();
  try {
    const dec = decodeURIComponent(k);
    // すでに%エスケープが含まれていない場合のみ採用
    if (!dec.includes('%')) k = dec;
  } catch (_) {}
  if (k.startsWith('/')) k = k.slice(1);
  return k;
}

// --- S3 helpers ---
async function s3Head(key) {
  return s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
}
async function s3Presign(key, expiresIn = 600) {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn });
}
async function s3List(prefix) {
  const r = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, MaxKeys: 1000 }));
  return (r.Contents || []).map(o => ({ key: o.Key, size: o.Size, lastModified: o.LastModified }));
}

// --- Webhook DB helpers ---
function loadWebhookDB() {
  try {
    if (!fs.existsSync(DB_FILE)) return null;
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return null;
  }
}

// --- LiveKit helpers ---
function pickLatestEgressForRoom(items, roomName) {
  const arr = (items || []).filter(it => it.roomName === roomName && Array.isArray(it.fileResults) && it.fileResults.length > 0);
  if (arr.length === 0) return null;
  // endedAt 優先、なければ startedAt で新しいもの
  arr.sort((a, b) => {
    const ea = Number(a.endedAt || 0), eb = Number(b.endedAt || 0);
    if (ea !== eb) return eb - ea;
    const sa = Number(a.startedAt || 0), sb = Number(b.startedAt || 0);
    return sb - sa;
  });
  return arr[0];
}

/**
 * 署名付きURL
 * GET /api/recordings/presign?key=...
 */
router.get('/presign', async (req, res) => {
  try {
    if (!BUCKET) return res.status(500).json({ error: 'S3 bucket not configured' });
    const key = normalizeKey(req.query.key);
    if (!key) return res.status(400).json({ error: 'key required' });

    try {
      await s3Head(key);
    } catch (e) {
      const code = e?.$metadata?.httpStatusCode;
      if (code === 404 || e?.name === 'NotFound' || e?.Code === 'NotFound') {
        return res.status(404).json({ error: 'NoSuchKey', key });
      }
      console.error('[presign] head error', e);
      return res.status(500).json({ error: 'head failed', details: String(e?.message || e), key });
    }

    const url = await s3Presign(key, 600);
    return res.json({ url, expiresIn: 600, bucket: BUCKET, key });
  } catch (e) {
    console.error('[presign] error', e);
    return res.status(500).json({ error: 'presign failed', details: String(e?.message || e) });
  }
});

/**
 * 存在確認
 * GET /api/recordings/exists?key=...
 */
router.get('/exists', async (req, res) => {
  try {
    const key = normalizeKey(req.query.key);
    if (!key) return res.status(400).json({ error: 'key required' });
    try {
      const r = await s3Head(key);
      return res.json({ exists: true, key, contentLength: r.ContentLength, contentType: r.ContentType });
    } catch (e) {
      const code = e?.$metadata?.httpStatusCode;
      if (code === 404 || e?.name === 'NotFound' || e?.Code === 'NotFound') {
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
 * 一覧
 * GET /api/recordings/list?prefix=...
 */
router.get('/list', async (req, res) => {
  try {
    const prefix = normalizeKey(req.query.prefix || '');
    const items = await s3List(prefix);
    return res.json({ bucket: BUCKET, prefix, count: items.length, items });
  } catch (e) {
    console.error('[list] error', e);
    return res.status(500).json({ error: 'list failed', details: String(e?.message || e) });
  }
});

/**
 * ★ ルーム→最新ファイルの “自動解決 + presign”
 * GET /api/recordings/byRoom/:roomName
 * 1) Webhook DB に files[].filename があればそれを採用
 * 2) 無ければ LiveKit listEgress() から当該roomの最新completedの fileResults[0].filename を採用
 * 3) presign して URL を返す
 */
router.get('/byRoom/:roomName', async (req, res) => {
  try {
    const roomName = String(req.params.roomName);
    if (!roomName) return res.status(400).json({ error: 'roomName required' });

    // 1) Webhook DB
    let key = null;
    const db = loadWebhookDB();
    if (db?.byRoomName?.[roomName]) {
      const rec = db.byRoomName[roomName];
      if (Array.isArray(rec.files) && rec.files[0]?.filename) {
        key = rec.files[0].filename;
      } else if (rec.egressInfo?.fileResults?.[0]?.filename) {
        key = rec.egressInfo.fileResults[0].filename;
      }
    }

    // 2) LiveKit listEgress fallback
    if (!key) {
      const list = await lk.listEgress();
      const latest = pickLatestEgressForRoom(list.items || [], roomName);
      if (latest?.fileResults?.[0]?.filename) key = latest.fileResults[0].filename;
    }

    if (!key) return res.status(404).json({ error: 'no recording file for room', roomName });

    const normKey = normalizeKey(key);
    try {
      await s3Head(normKey);
    } catch (e) {
      const code = e?.$metadata?.httpStatusCode;
      if (code === 404 || e?.name === 'NotFound' || e?.Code === 'NotFound') {
        return res.status(404).json({ error: 'NoSuchKey', key: normKey });
      }
      console.error('[byRoom] head error', e);
      return res.status(500).json({ error: 'head failed', details: String(e?.message || e) });
    }

    const url = await s3Presign(normKey, 600);
    return res.json({ roomName, key: normKey, url, expiresIn: 600 });
  } catch (e) {
    console.error('[byRoom] error', e);
    return res.status(500).json({ error: 'byRoom failed', details: String(e?.message || e) });
  }
});

module.exports = router;
