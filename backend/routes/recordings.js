// routes/recordings.js
// Issue presigned URLs ONLY AFTER the recorded object actually exists in S3.
// Includes blocking “await” endpoints that resolve the final S3 key from LiveKit
// and wait until S3 confirms existence before returning a presigned URL.
//
// Runtime: Node.js 18+
// Deps: express, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, livekit-server-sdk
//
// Required ENVs (reader must match writer used by LiveKit egress):
//   EGRESS_S3_REGION=ap-northeast-1
//   EGRESS_S3_BUCKET=your-bucket
//   EGRESS_S3_ENDPOINT=           (optional for AWS S3; set for MinIO etc.)
//   EGRESS_S3_ACCESS_KEY_ID=...   (read permission)
//   EGRESS_S3_SECRET_ACCESS_KEY=...
//   EGRESS_S3_FORCE_PATH_STYLE=0  (set "1" when using path-style endpoints)
//
//   LIVEKIT_URL=...               (e.g., https://cloud.livekit.io)
//   LIVEKIT_API_KEY=...
//   LIVEKIT_API_SECRET=...

/* eslint-disable no-console */
const express = require('express');
const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
  waitUntilObjectExists,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { EgressClient } = require('livekit-server-sdk');

const router = express.Router();

/* -------------------- S3 Setup -------------------- */
const S3_REGION   = process.env.EGRESS_S3_REGION || 'ap-northeast-1';
const S3_BUCKET   = process.env.EGRESS_S3_BUCKET;
const S3_ENDPOINT = process.env.EGRESS_S3_ENDPOINT || ''; // empty = AWS S3
const S3_FORCE_PATH_STYLE = process.env.EGRESS_S3_FORCE_PATH_STYLE === '1';
const S3_ACCESS_KEY_ID     = process.env.EGRESS_S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.EGRESS_S3_SECRET_ACCESS_KEY;

if (!S3_BUCKET) {
  console.warn('[recordings] EGRESS_S3_BUCKET not set');
}
if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
  console.warn('[recordings] S3 credentials are missing or incomplete');
}

const s3 = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT || undefined,
  forcePathStyle: !!S3_ENDPOINT || S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
});

/* -------------------- LiveKit Setup -------------------- */
const LIVEKIT_URL        = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY    = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.warn('[recordings] LIVEKIT_* envs missing');
}

const lk = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

/* -------------------- Helpers -------------------- */
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function parseIntOr(defaultValue, raw, { min, max } = {}) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return defaultValue;
  const i = Math.floor(n);
  if (typeof min === 'number' || typeof max === 'number') {
    return clamp(i, min ?? i, max ?? i);
  }
  return i;
}

function parseExpiresSec(raw, fallback = 600) {
  // presign expiry: 60s .. 3600s
  return parseIntOr(fallback, raw, { min: 60, max: 3600 });
}

function parseWaitWindow(raw, fallback = { maxWaitSec: 20, minDelaySec: 1, maxDelaySec: 2 }) {
  // bounds
  const maxWaitSec   = parseIntOr(fallback.maxWaitSec, raw?.maxWaitSec, { min: 1, max: 120 });
  const minDelaySec  = parseIntOr(fallback.minDelaySec, raw?.minDelaySec, { min: 1, max: 10 });
  const maxDelaySec  = parseIntOr(fallback.maxDelaySec, raw?.maxDelaySec, { min: minDelaySec, max: 10 });
  return { maxWaitSec, minDelaySec, maxDelaySec };
}

function jsonError(res, status, message, details) {
  if (details) console.error(message, details);
  return res.status(status).json({ error: message });
}

// Pick the “best” egress for a room: COMPLETE > ENDING > ACTIVE, then latest by time
function pickBestEgress(items, roomName) {
  const list = (items || []).filter((it) => it.roomName === roomName);
  if (!list.length) return null;

  const rank = (status) => {
    switch (status) {
      case 'EGRESS_COMPLETE': return 3;
      case 'EGRESS_ENDING':   return 2;
      case 'EGRESS_ACTIVE':   return 1;
      default:                return 0;
    }
  };
  return list
    .slice()
    .sort((a, b) => (rank(b.status) - rank(a.status)) ||
      (new Date(b.endedAt || b.startedAt) - new Date(a.endedAt || a.startedAt)))[0];
}

/* -------------------- Basic (non-blocking) endpoints -------------------- */

// GET /api/recordings/presign?key=...&expires=600
router.get('/recordings/presign', async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) return jsonError(res, 400, 'missing key');

    const expiresIn = parseExpiresSec(req.query.expires, 600);
    const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: String(key) });
    const url = await getSignedUrl(s3, cmd, { expiresIn });

    return res.json({ url, key, expiresIn });
  } catch (e) {
    return jsonError(res, 500, 'failed to presign', e);
  }
});

// GET /api/recordings/presign-put?key=...&contentType=...&expires=300
router.get('/recordings/presign-put', async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) return jsonError(res, 400, 'missing key');

    const contentType = req.query.contentType || 'application/octet-stream';
    const expiresIn = parseExpiresSec(req.query.expires, 300);

    const cmd = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: String(key),
      ContentType: String(contentType),
    });
    const url = await getSignedUrl(s3, cmd, { expiresIn });

    return res.json({ url, key, contentType, expiresIn });
  } catch (e) {
    return jsonError(res, 500, 'failed to presign-put', e);
  }
});

// GET /api/recordings/head?key=...
// Debug: 200 when exists, 404 when not
router.get('/recordings/head', async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) return jsonError(res, 400, 'missing key');

    const head = new HeadObjectCommand({ Bucket: S3_BUCKET, Key: String(key) });
    await s3.send(head);
    return res.json({ ok: true, key });
  } catch (_e) {
    return res.status(404).json({ ok: false, error: 'NoSuchKey', key: req.query.key });
  }
});

// GET /api/recordings/byRoom/:roomName?expires=600
// Resolve a key from LiveKit (best egress) and presign immediately (non-blocking).
router.get('/recordings/byRoom/:roomName', async (req, res) => {
  try {
    const { roomName } = req.params;
    if (!roomName) return jsonError(res, 400, 'roomName required');

    const expiresIn = parseExpiresSec(req.query.expires, 600);

    const list = await lk.listEgress();
    const best = pickBestEgress(list.items, roomName);
    if (!best) return jsonError(res, 404, 'no egress found for this room');

    if (!best.fileResults || !best.fileResults.length) {
      return jsonError(res, 404, 'no fileResults for this room yet');
    }

    const key = best.fileResults[0].filepath; // authoritative key from LiveKit
    const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
    const url = await getSignedUrl(s3, cmd, { expiresIn });

    return res.json({ roomName, status: best.status, key, url, expiresIn });
  } catch (e) {
    return jsonError(res, 500, 'failed to presign by room', e);
  }
});

/* -------------------- Blocking “await” endpoints -------------------- */
/**
 * These ensure the object exists in S3 before returning the presigned URL.
 * They are designed for your UX: “URL becomes available only after it’s valid”.
 */

// GET /api/recordings/await-key?key=...&expires=600&maxWaitSec=20&minDelaySec=1&maxDelaySec=2
// Wait until the given key exists, then presign.
router.get('/recordings/await-key', async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) return jsonError(res, 400, 'missing key');

    const expiresIn = parseExpiresSec(req.query.expires, 600);
    const { maxWaitSec, minDelaySec, maxDelaySec } = parseWaitWindow(req.query, {
      maxWaitSec: 20,
      minDelaySec: 1,
      maxDelaySec: 2,
    });

    // Waiter will poll HeadObject until it exists or timeout
    await waitUntilObjectExists(
      { client: s3, maxWaitTime: maxWaitSec, minDelay: minDelaySec, maxDelay: maxDelaySec },
      { Bucket: S3_BUCKET, Key: String(key) }
    );

    const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: String(key) });
    const url = await getSignedUrl(s3, cmd, { expiresIn });

    return res.json({
      mode: 'await-key',
      key,
      url,
      expiresIn,
      waited: { maxWaitSec, minDelaySec, maxDelaySec },
    });
  } catch (e) {
    // waiter throws on timeout / 404 progression; map to 504 for clarity
    const isTimeout = /waiter|Max wait time exceeded/i.test(String(e?.message || e));
    return jsonError(res, isTimeout ? 504 : 500, 'await-key failed', e);
  }
});

// ---------- GET /api/recordings/await-room/:roomName?expires=600&maxWaitSec=60&minDelaySec=1&maxDelaySec=2 ----------
// 2段待ち：
// (A) LiveKit 完了待ち（EGRESS_COMPLETE かつ fileResults[0].filepath を得るまで）
//     ※重複egressがあっても、最新(endedAt優先)の COMPLETE を採用
// (B) S3 実在待ち（HeadObject waiter）
// その後 presign を返却
router.get('/recordings/await-room/:roomName', async (req, res) => {
  const startedAt = Date.now();
  const elapsedSec = () => Math.floor((Date.now() - startedAt) / 1000);

  try {
    const { roomName } = req.params;
    if (!roomName) return res.status(400).json({ error: 'roomName required' });

    const expiresIn = parseExpiresSec(req.query.expires, 600);
    const { maxWaitSec, minDelaySec, maxDelaySec } = parseWaitWindow(req.query, {
      maxWaitSec: 60,  // ← 既定を長めに
      minDelaySec: 1,
      maxDelaySec: 2,
    });

    // ---- (A) LiveKit 完了 + fileResults 待ち ----
    const pollDelayMs = Math.max(500, Math.min(1500, minDelaySec * 1000));
    let fileKey = null;
    let lastStatuses = [];

    const rank = (st) => st === 'EGRESS_COMPLETE' ? 3 : st === 'EGRESS_ENDING' ? 2 : st === 'EGRESS_ACTIVE' ? 1 : 0;
    const pickLatestComplete = (items) => {
      const complete = items.filter(it => it.status === 'EGRESS_COMPLETE' && it.fileResults?.length && it.fileResults[0].filepath);
      if (!complete.length) return null;
      // 最新（endedAt > startedAt）を優先
      return complete.slice().sort((a, b) =>
        (new Date(b.endedAt || b.startedAt) - new Date(a.endedAt || a.startedAt))
      )[0];
    };

    while (elapsedSec() < maxWaitSec) {
      const list = await lk.listEgress();
      const items = (list.items || []).filter(it => it.roomName === roomName);
      lastStatuses = items.map(it => ({ id: it.egressId, status: it.status, startedAt: it.startedAt, endedAt: it.endedAt }));

      // 1) すでに COMPLETE があればそれを使う
      const complete = pickLatestComplete(items);
      if (complete) {
        fileKey = complete.fileResults[0].filepath;
        break;
      }

      // 2) まだなら、次点（ENDING/ACTIVE）の“最新”も把握だけはしておく（デバッグ用）
      //    ここでは使わず、次ループで再評価
      await new Promise(r => setTimeout(r, pollDelayMs));
    }

    if (!fileKey) {
      return res.status(504).json({
        error: 'timeout: egress not completed yet (no fileResults)',
        roomName,
        elapsed: elapsedSec(),
        maxWaitSec,
        lastStatuses,
      });
    }

    // ---- (B) S3 実在待ち ----
    const remain = Math.max(1, maxWaitSec - elapsedSec()); // Aで使った分を考慮（一応の保険）
    try {
      await waitUntilObjectExists(
        { client: s3, maxWaitTime: remain, minDelay: minDelaySec, maxDelay: maxDelaySec },
        { Bucket: S3_BUCKET, Key: fileKey }
      );
    } catch (e) {
      return res.status(504).json({
        error: 'timeout: s3 object did not appear in time',
        roomName,
        key: fileKey,
        elapsed: elapsedSec(),
        maxWaitSec,
      });
    }

    // ---- presign ----
    const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: fileKey });
    const url = await getSignedUrl(s3, cmd, { expiresIn });

    return res.json({
      mode: 'await-room',
      roomName,
      status: 'READY',
      key: fileKey,
      url,
      expiresIn,
      waitedSec: elapsedSec(),
    });

  } catch (e) {
    console.error('[recordings/await-room] error', e);
    return res.status(500).json({ error: 'failed to await room', details: String(e?.message || e) });
  }
});


module.exports = router;
