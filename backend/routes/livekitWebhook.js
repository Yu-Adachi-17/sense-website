// routes/livekitWebhook.js
// ------------------------------------------------------
// LiveKit Cloud Webhook 受信 (署名検証つき) ＋ かんたんDB保存(JSONファイル)
//  - Content-Type: application/webhook+json を raw で受ける（server.js側で設定）
//  - Authorization ヘッダの署名JWTを LIVEKIT_API_KEY / LIVEKIT_API_SECRET で検証
//  - egress_* を含む全イベントを data/egress-events.json に保存
//  - 確認用 GET /api/livekit/webhook/events
//           GET /api/livekit/webhook/egress/:id
//           GET /api/livekit/webhook/room/:room
//  - 追加: egress_ended(EGRESS_COMPLETE) で S3 キーを抽出 → recordings.setLatestKeyAndProbe()
//          /room/:room で latestFileKey を返す
//  - 追加: roomName→最新egressId のインメモリ記録を内蔵し、外部（routes/egress.js）から参照できるよう公開
// ------------------------------------------------------

const express = require('express');
const fs = require('fs');
const path = require('path');
const { WebhookReceiver } = require('livekit-server-sdk');

let recordingsRouter = null;
try {
  recordingsRouter = require('./recordings');
} catch (_) {
  recordingsRouter = null;
}

const router = express.Router();

const WEBHOOK_API_KEY = process.env.LIVEKIT_API_KEY;
const WEBHOOK_API_SECRET = process.env.LIVEKIT_API_SECRET;

if (!WEBHOOK_API_KEY || !WEBHOOK_API_SECRET) {
  console.warn('[LiveKitWebhook] LIVEKIT_API_KEY / LIVEKIT_API_SECRET が未設定です（署名検証できません）');
}

const receiver = new WebhookReceiver(WEBHOOK_API_KEY, WEBHOOK_API_SECRET);

// ===== 内蔵：軽量アクティブEgressストア =====
const _activeByRoom = new Map(); // roomName -> { egressId, updatedAt }

function _setActive(roomName, egressId) {
  if (!roomName || !egressId) return;
  _activeByRoom.set(roomName, { egressId, updatedAt: Date.now() });
  console.log('[egressStore] setActive', roomName, egressId);
}
function _clearActive(roomName, egressIdHint) {
  const cur = _activeByRoom.get(roomName);
  if (!cur) return;
  if (!egressIdHint || cur.egressId === egressIdHint) {
    _activeByRoom.delete(roomName);
    console.log('[egressStore] clearActive', roomName, egressIdHint || '(any)');
  }
}
function getActiveEgressId(roomName) {
  const v = _activeByRoom.get(roomName);
  const id = v?.egressId || null;
  if (id) console.log('[egressStore] getActive', roomName, id);
  return id;
}
// （必要ならデバッグ用に一覧を見たいとき用）
function _debugActiveMap() {
  return Object.fromEntries(_activeByRoom);
}

// ===== JSON “簡易DB” =====
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
function loadDB() {
  ensureDB();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function saveDB(db) {
  ensureDB();
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

const jsonSafe = (obj) =>
  JSON.parse(JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));

function extractS3KeyFromEgressInfo(info) {
  if (!info) return null;
  if (Array.isArray(info.fileResults)) {
    for (const f of info.fileResults) {
      if (f?.filename) return String(f.filename);
      if (f?.filepath) return String(f.filepath);
      if (f?.location && typeof f.location === 'string') {
        const m = f.location.match(/^s3:\/\/[^/]+\/(.+)$/i);
        if (m) return m[1];
      }
    }
  }
  if (Array.isArray(info.segmentResults)) {
    for (const s of info.segmentResults) {
      if (s?.playlistName) return String(s.playlistName);
      if (s?.filename) return String(s.filename);
      if (s?.location && typeof s.location === 'string') {
        const m = s.location.match(/^s3:\/\/[^/]+\/(.+)$/i);
        if (m) return m[1];
      }
    }
  }
  return null;
}

// ===== Webhook 本体 =====
router.post('/', async (req, res) => {
  try {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req._rawBody || '', 'utf8');
    const authHeader = req.headers.authorization || '';
    const event = await receiver.receive(raw.toString('utf8'), authHeader);

    const eventSafe = jsonSafe(event);
    const type = eventSafe.event || 'unknown';
    const info = eventSafe.egressInfo || {};
    const nowISO = new Date().toISOString();

    const db = loadDB();
    db.events.push({ at: nowISO, type, event: eventSafe });

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

    // ★ 内蔵ストア更新（ここが “確実に止める” 鍵）
    if (type === 'egress_started' || type === 'egress_updated') {
      if (roomName && eid) _setActive(roomName, eid);
    } else if (type === 'egress_ended') {
      if (roomName) _clearActive(roomName, eid || undefined);
    }

    // 完了時は S3 キーを拾って recordings へ通知
    if (type === 'egress_ended' && info.status === 'EGRESS_COMPLETE') {
      const key = extractS3KeyFromEgressInfo(info);
      if (key) {
        if (eid) db.byEgressId[eid].latestFileKey = key;
        if (roomName) {
          db.byRoomName[roomName].latestFileKey = key;
          if (recordingsRouter && typeof recordingsRouter.setLatestKeyAndProbe === 'function') {
            try {
              recordingsRouter.setLatestKeyAndProbe(roomName, key);
            } catch (e) {
              console.warn('[LiveKitWebhook] notify recordings failed:', e?.message || e);
            }
          }
        }
      } else {
        console.warn('[LiveKitWebhook] egress_ended but cannot resolve file key');
      }
    }

    saveDB(db);

    console.log('[LiveKitWebhook]', type, { egressId: eid, roomName, status: summary.status });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[LiveKitWebhook] handler failed:', err?.message || err);
    return res.status(401).json({ error: 'invalid signature' });
  }
});

// ===== 調査用 GET =====
router.get('/events', (_req, res) => {
  try {
    const db = loadDB();
    const recent = db.events.slice(-100);
    res.json({ count: recent.length, events: recent });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/egress/:egressId', (req, res) => {
  try {
    const db = loadDB();
    const data = db.byEgressId[req.params.egressId] || null;
    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/room/:roomName', (req, res) => {
  try {
    const db = loadDB();
    const data = db.byRoomName[req.params.roomName] || null;
    const latestFileKey = data && data.latestFileKey ? data.latestFileKey : null;
    res.json({
      roomName: req.params.roomName,
      latestFileKey,
      data: data ? { ...data, latestFileKey } : null,
      activeMap: _debugActiveMap(), // デバッグ用（不要なら消してOK）
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ルーターに “ユーティリティ” を合体して export
module.exports = Object.assign(router, {
  getActiveEgressId,  // ← routes/egress.js から参照
});
