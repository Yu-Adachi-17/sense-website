/* eslint-disable no-console */
const express = require('express');
const {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const router = express.Router();

/* ========= S3 Config ========= */
const S3_REGION   = process.env.EGRESS_S3_REGION || 'ap-northeast-1';
const S3_BUCKET   = process.env.EGRESS_S3_BUCKET;
const S3_ENDPOINT = process.env.EGRESS_S3_ENDPOINT || undefined;
const S3_ACCESS_KEY_ID     = process.env.EGRESS_S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.EGRESS_S3_SECRET_ACCESS_KEY;

if (!S3_BUCKET) console.warn('[recordings] EGRESS_S3_BUCKET not set');

const s3 = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  forcePathStyle: !!S3_ENDPOINT,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
});

/* ========= In-memory room state =========
  state[roomName] = {
    latestKey: string|null,
    ready: boolean,
    url: string|null,             // presigned url when ready
    updatedAt: ISOString,
    waiters: Set<ServerResponse>, // SSE clients
  }
*/
const state = new Map();

function getRoom(rec) {
  if (!state.has(rec)) {
    state.set(rec, { latestKey: null, ready: false, url: null, updatedAt: new Date().toISOString(), waiters: new Set() });
  }
  return state.get(rec);
}

async function headExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    return true;
  } catch (e) {
    const sc = e?.$metadata?.httpStatusCode;
    if (sc === 404 || e?.name === 'NotFound') return false;
    // 一時的な 403/400 も再試行対象
    return false;
  }
}

async function presignGet(key, expiresSec = 600) {
  const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn: expiresSec });
}

async function probeAndNotify(roomName) {
  const st = getRoom(roomName);
  if (!st.latestKey || st.ready) return;

  // エクスポネンシャルバックオフで HEAD
  const start = Date.now();
  const timeoutMs = 120 * 1000; // 2min まで
  let attempt = 0;

  while (Date.now() - start < timeoutMs) {
    // まず HEAD で存在確認
    const ok = await headExists(st.latestKey);
    if (ok) {
      const url = await presignGet(st.latestKey, 600);
      st.ready = true;
      st.url = url;
      st.updatedAt = new Date().toISOString();

      // SSE へ通知
      for (const res of st.waiters) {
        try {
          res.write(`event: ready\n`);
          res.write(`data: ${JSON.stringify({ roomName, key: st.latestKey, url })}\n\n`);
          res.end();
        } catch (_) {}
      }
      st.waiters.clear();
      return;
    }
    attempt += 1;
    const backoff = Math.min(500 + attempt * 300, 3000); // 0.5s→…→3s
    await new Promise(r => setTimeout(r, backoff));
  }
  // タイムアウトしても何もしない（クライアントはフォールバックで取得）
}

/* ========= REST endpoints ========= */

// 既存: presign（存在しない時は 404 を返すように修正）
router.get('/recordings/presign', async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) return res.status(400).json({ error: 'missing key' });

    // 先に HEAD で存在を確定
    const ok = await headExists(key);
    if (!ok) return res.status(404).json({ error: 'not_ready_or_not_found' });

    const url = await presignGet(key, 600);
    res.json({ url });
  } catch (e) {
    console.error('[presign GET] error', e);
    res.status(500).json({ error: 'failed to presign' });
  }
});

// 追加: byRoom（サーバ側の ready 状態をみて presign まで一発）
router.get('/recordings/byRoom/:roomName', async (req, res) => {
  try {
    const roomName = req.params.roomName;
    const st = getRoom(roomName);
    if (st.ready && st.url) {
      return res.json({ roomName, key: st.latestKey, url: st.url, expiresIn: 600 });
    }
    // latestKey が分かっていれば HEAD を試す
    if (st.latestKey) {
      const ok = await headExists(st.latestKey);
      if (ok) {
        const url = await presignGet(st.latestKey, 600);
        st.ready = true; st.url = url; st.updatedAt = new Date().toISOString();
        return res.json({ roomName, key: st.latestKey, url, expiresIn: 600 });
      }
    }
    // まだ用意できていない
    res.status(202).set('Retry-After', '3').json({ roomName, ready: false });
  } catch (e) {
    console.error('[byRoom] error', e);
    res.status(500).json({ error: 'byRoom failed' });
  }
});

// 追加: SSE（準備できた瞬間に push）
router.get('/recordings/ready/:roomName', (req, res) => {
  const roomName = req.params.roomName;
  const st = getRoom(roomName);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // 既に ready なら即送って終了
  if (st.ready && st.url) {
    res.write(`event: ready\n`);
    res.write(`data: ${JSON.stringify({ roomName, key: st.latestKey, url: st.url })}\n\n`);
    return res.end();
  }

  // ウェイター登録
  st.waiters.add(res);

  // 心拍（Heroku/Railway対策）
  const ping = setInterval(() => {
    try { res.write(`event: ping\ndata: {}\n\n`); } catch (_) {}
  }, 15000);

  req.on('close', () => {
    clearInterval(ping);
    st.waiters.delete(res);
  });
});

// （任意）PUT 用プリサインはそのまま
router.get('/recordings/presign-put', async (req, res) => {
  try {
    const key = req.query.key;
    const contentType = req.query.contentType || 'application/octet-stream';
    if (!key) return res.status(400).json({ error: 'missing key' });

    const cmd = new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, ContentType: contentType });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 });
    res.json({ url });
  } catch (e) {
    console.error('[presign PUT] error', e);
    res.status(500).json({ error: 'failed to presign' });
  }
});

/* ========= 外部公開ユーティリティ ========= */

// Webhook から呼ばれる：最新キーを保存→HEAD プローブ→ready 通知
router.setLatestKeyAndProbe = function(roomName, key) {
  const st = getRoom(roomName);
  st.latestKey = key;
  st.updatedAt = new Date().toISOString();
  // 非同期でプローブ（失敗してもフォールバックが拾う）
  probeAndNotify(roomName).catch(err => console.error('[probeAndNotify] failed', err));
};

router.__state = state; // デバッグ用に状態を参照したい場合

module.exports = router;
