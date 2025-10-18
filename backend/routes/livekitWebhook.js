// routes/livekitWebhook.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const { WebhookReceiver } = require('livekit-server-sdk');

const router = express.Router();

// LiveKit Cloud の「API keys」で作った “API Key / API Secret” を環境変数で渡す
const WEBHOOK_API_KEY = process.env.LIVEKIT_WEBHOOK_API_KEY;
const WEBHOOK_API_SECRET = process.env.LIVEKIT_WEBHOOK_API_SECRET;

// 署名検証ヘルパ
const receiver = new WebhookReceiver(WEBHOOK_API_KEY, WEBHOOK_API_SECRET);

// 超簡易“DB”（JSONファイル）
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'egress-events.json');
function ensureDB() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ events: [], byEgressId: {}, byRoomName: {} }, null, 2)
    );
  }
}
function loadDB() { ensureDB(); return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
function saveDB(db) { ensureDB(); fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2)); }

// Webhook受信（server.js 側で raw ボディを渡している前提）
router.post('/', async (req, res) => {
  try {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req._rawBody || '', 'utf8');
    const authHeader = req.headers.authorization || '';

    // 署名付JWTを検証＆デコード（失敗で例外）
    const event = await receiver.receive(raw.toString('utf8'), authHeader);

    // event.event には 'egress_started' / 'egress_updated' / 'egress_ended' などが入る
    // event.egressInfo に egressId / roomName / fileResults / segmentResults... が入る
    // 仕様：JS Server SDK リファレンスの WebhookEvent を参照。:contentReference[oaicite:2]{index=2}

    const type = event.event || 'unknown';
    const info = event.egressInfo || {};
    const nowISO = new Date().toISOString();

    const db = loadDB();
    db.events.push({ at: nowISO, type, event }); // ローイベント蓄積

    const eid = info.egressId || null;
    const roomName = info.roomName || null;
    const summary = {
      egressId: eid,
      roomName,
      event: type,
      status: info.status ?? null,
      error: info.error ?? null,
      startedAt: info.startedAt ?? null,
      endedAt: info.endedAt ?? null,
      files: Array.isArray(info.fileResults) ? info.fileResults : [],
      segments: Array.isArray(info.segmentResults) ? info.segmentResults : [],
      updatedAt: nowISO,
    };
    if (eid) db.byEgressId[eid] = { ...(db.byEgressId[eid] || {}), ...summary };
    if (roomName) db.byRoomName[roomName] = { ...(db.byRoomName[roomName] || {}), ...summary };

    saveDB(db);
    console.log('[LiveKitWebhook]', type, { egressId: eid, roomName, status: summary.status });

    res.json({ ok: true });
  } catch (err) {
    console.error('[LiveKitWebhook] verify failed:', err?.message || err);
    res.status(401).json({ error: 'invalid signature' });
  }
});

// 確認用
router.get('/events', (_req, res) => {
  try { const db = loadDB(); res.json({ count: db.events.length, events: db.events.slice(-100) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/egress/:egressId', (req, res) => {
  try { const db = loadDB(); res.json({ data: db.byEgressId[req.params.egressId] || null }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/room/:roomName', (req, res) => {
  try { const db = loadDB(); res.json({ data: db.byRoomName[req.params.roomName] || null }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
