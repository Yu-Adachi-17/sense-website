// routes/livekitWebhook.js
// ------------------------------------------------------
// LiveKit Cloud Webhook 受信 (署名検証つき) ＋ かんたんDB保存(JSONファイル)
//   ・LIVEKIT_WEBHOOK_SECRET で HMAC-SHA256 検証
//   ・egress_* イベントを data/egress-events.json に upsert
//   ・確認用 GET /livekit/webhook/events / .../egress/:id を提供
// ------------------------------------------------------

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const WEBHOOK_SECRET = process.env.LIVEKIT_WEBHOOK_SECRET || '';
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'egress-events.json');

const router = express.Router();

/* -------------------- ユーティリティ: 署名検証 -------------------- */
// 期待ヘッダ: 'lk-signature'（小文字で届くことが多い）
// 署名は rawBody に対する HMAC-SHA256(secret) の hex
function verifySignature(rawBodyBuf, headers) {
  if (!WEBHOOK_SECRET) {
    console.warn('[Webhook] LIVEKIT_WEBHOOK_SECRET が未設定です（検証をスキップ）');
    return true;
  }
  const sigHeader = headers['lk-signature'] || headers['LK-Signature'] || headers['Lk-Signature'];
  if (!sigHeader) return false;

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(rawBodyBuf);
  const digest = hmac.digest('hex');

  // 安全な比較
  try {
    return crypto.timingSafeEqual(Buffer.from(sigHeader, 'utf8'), Buffer.from(digest, 'utf8'));
  } catch {
    return sigHeader === digest;
  }
}

/* -------------------- ユーティリティ: 簡易DB(JSON) -------------------- */
function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ events: [], byEgressId: {}, byRoomName: {} }, null, 2));
  }
}

function loadDB() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function saveDB(db) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

/* -------------------- Webhook 本体 -------------------- */
// 注意: server.js 側で `app.use('/api/livekit/webhook', express.raw({type:'application/json'}), livekitWebhookRouter)`
// として“rawボディ”を渡すこと。
router.post('/', (req, res) => {
  try {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req._rawBody || '', 'utf8');

    if (!verifySignature(raw, req.headers)) {
      return res.status(401).json({ error: 'invalid signature' });
    }

    // 署名OK → JSON 解析
    const payload = JSON.parse(raw.toString('utf8'));
    // LiveKitの一般的な形を想定（例）
    // {
    //   event: 'egress_ended',
    //   createdAt: 1690000000,
    //   egressInfo: { egressId, roomId, roomName, status, error, fileResults, segmentResults, startedAt, endedAt, ... }
    // }
    const event = payload.event || payload.type || 'unknown';
    const info = payload.egressInfo || payload.data || {};

    const nowISO = new Date().toISOString();

    // DB更新
    const db = loadDB();
    db.events.push({ at: nowISO, event, payload: payload }); // ローイベント（最小ローテ）

    const eid = info.egressId || info.id || null;
    const roomName = info.roomName || info.roomId || null;

    // 正規化されたサマリを作る
    const summary = {
      egressId: eid,
      roomName,
      event,
      status: info.status || null,
      error: info.error || null,
      startedAt: info.startedAt || null,
      endedAt: info.endedAt || null,
      // 出力ファイルの場所（MP4 なら fileResults、HLS なら segmentResults）
      files: Array.isArray(info.fileResults) ? info.fileResults : [],
      segments: Array.isArray(info.segmentResults) ? info.segmentResults : [],
    };

    if (eid) {
      db.byEgressId[eid] = { ...(db.byEgressId[eid] || {}), ...summary, updatedAt: nowISO };
    }
    if (roomName) {
      db.byRoomName[roomName] = { ...(db.byRoomName[roomName] || {}), ...summary, updatedAt: nowISO };
    }

    // ログ
    console.log('[LiveKitWebhook]', event, JSON.stringify({ egressId: eid, roomName, status: summary.status }, null, 2));

    saveDB(db);
    return res.json({ ok: true });
  } catch (e) {
    console.error('[LiveKitWebhook] error', e);
    return res.status(500).json({ error: 'webhook handler failed', details: e.message });
  }
});

/* -------------------- 確認用のGET API（任意・便利） -------------------- */
// 直近のイベント一覧（最大100件）
router.get('/events', (_req, res) => {
  try {
    const db = loadDB();
    const recent = db.events.slice(-100);
    res.json({ count: recent.length, events: recent });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// egressId でサマリ取得
router.get('/egress/:egressId', (req, res) => {
  try {
    const db = loadDB();
    const data = db.byEgressId[req.params.egressId] || null;
    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// roomName でサマリ取得
router.get('/room/:roomName', (req, res) => {
  try {
    const db = loadDB();
    const data = db.byRoomName[req.params.roomName] || null;
    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
