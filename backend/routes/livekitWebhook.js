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
//          /room/:room で latestFileKey を返す（後方互換のため data 内にも格納）
// ------------------------------------------------------

const express = require('express');
const fs = require('fs');
const path = require('path');
const { WebhookReceiver } = require('livekit-server-sdk');

// ★ recordings ルーター（SSE 通知＆HEAD 確認）にキーを受け渡す
//   前回お渡しの routes/recordings.js（setLatestKeyAndProbe 実装あり）を想定。
//   未適用でも動作は壊れないように存在チェックします。
let recordingsRouter = null;
try {
  recordingsRouter = require('./recordings');
} catch (_) {
  recordingsRouter = null;
}

const router = express.Router();

// ▼ 環境変数（あなたのVar名に合わせています）
const WEBHOOK_API_KEY = process.env.LIVEKIT_API_KEY;       // LiveKit Cloud の API Key
const WEBHOOK_API_SECRET = process.env.LIVEKIT_API_SECRET; // LiveKit Cloud の API Secret

if (!WEBHOOK_API_KEY || !WEBHOOK_API_SECRET) {
  console.warn('[LiveKitWebhook] LIVEKIT_API_KEY / LIVEKIT_API_SECRET が未設定です（署名検証できません）');
}

// LiveKit 公式の検証器（Authorization: Bearer <signed JWT> を検証）
const receiver = new WebhookReceiver(WEBHOOK_API_KEY, WEBHOOK_API_SECRET);

// 超簡易“DB”として JSON ファイルに保存（必要に応じて実DBへ差し替えてください）
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

// BigInt を JSON 保存できるように文字列化
const jsonSafe = (obj) =>
  JSON.parse(JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));

// egressInfo から S3 の Key をできるだけ頑健に抽出
function extractS3KeyFromEgressInfo(info) {
  if (!info) return null;

  // 1) fileResults 優先
  if (Array.isArray(info.fileResults)) {
    for (const f of info.fileResults) {
      if (f?.filename) return String(f.filename);    // 例: minutes/.../....ogg
      if (f?.filepath) return String(f.filepath);    // 環境によってはこちら
      if (f?.location && typeof f.location === 'string') {
        const m = f.location.match(/^s3:\/\/[^/]+\/(.+)$/i);
        if (m) return m[1];
      }
    }
  }

  // 2) segmentResults（HLS 等）の場合（必要ならプレイリストや代表キーに寄せる）
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

/**
 * POST /
 * Webhook受信本体
 *
 * server.js 側で **必ず** 次のように raw で受ける設定にしてください（順序重要・express.jsonより前）:
 *   app.use('/api/livekit/webhook',
 *     express.raw({ type: 'application/webhook+json' }),
 *     livekitWebhookRouter
 *   );
 */
router.post('/', async (req, res) => {
  try {
    // server.js から raw(body) が Buffer で渡ってくる前提
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req._rawBody || '', 'utf8');
    const authHeader = req.headers.authorization || '';

    // 署名JWTを検証し、イベントを復元（失敗すると例外）
    const event = await receiver.receive(raw.toString('utf8'), authHeader);

    // BigInt を含む場合があるので安全化
    const eventSafe = jsonSafe(event);

    const type = eventSafe.event || 'unknown';
    const info = eventSafe.egressInfo || {}; // egress_* の場合ここに詳細が入る
    const nowISO = new Date().toISOString();

    // 簡易DB更新（ローイベント + サマリ）
    const db = loadDB();

    // 直近イベントを蓄積（最大件数ローテは必要に応じて）
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
      // MP4/OGG 等の単一ファイル出力
      files: Array.isArray(info.fileResults) ? info.fileResults : [],
      // HLS 等のセグメント出力
      segments: Array.isArray(info.segmentResults) ? info.segmentResults : [],
      updatedAt: nowISO,
    };

    if (eid) db.byEgressId[eid] = { ...(db.byEgressId[eid] || {}), ...summary };
    if (roomName) db.byRoomName[roomName] = { ...(db.byRoomName[roomName] || {}), ...summary };

    // ★ 追加：EGRESS_COMPLETE の瞬間に S3 のキーを抽出して記録＆recordings に通知
    if (type === 'egress_ended' && info.status === 'EGRESS_COMPLETE') {
      const key = extractS3KeyFromEgressInfo(info);
      if (key) {
        // DB にも latestFileKey として保存（既存データは温存しつつ拡張）
        if (eid) db.byEgressId[eid].latestFileKey = key;
        if (roomName) {
          db.byRoomName[roomName].latestFileKey = key;

          // recordings.js（SSE＆HEAD確認）側へ通知（存在する場合のみ）
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
    // 署名不一致・パース失敗・保存失敗 いずれもここに来る
    console.error('[LiveKitWebhook] handler failed:', err?.message || err);
    // 署名失敗の可能性もあるため 401 を返す
    return res.status(401).json({ error: 'invalid signature' });
  }
});

/**
 * GET /events
 * 直近イベントを確認（最大100件）
 */
router.get('/events', (_req, res) => {
  try {
    const db = loadDB();
    const recent = db.events.slice(-100);
    res.json({ count: recent.length, events: recent });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /egress/:egressId
 * egressId でサマリ取得
 */
router.get('/egress/:egressId', (req, res) => {
  try {
    const db = loadDB();
    const data = db.byEgressId[req.params.egressId] || null;
    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /room/:roomName
 * roomName でサマリ取得（後方互換の data を維持しつつ latestFileKey を返す）
 * iOS の EgressClient.webhookLatestFileKey() は
 *  - data.latestFileKey 形式（新）
 *  - もしくは top-level latestFileKey（レガシー）
 * のどちらにも対応できる実装にしています。
 */
router.get('/room/:roomName', (req, res) => {
  try {
    const db = loadDB();
    const data = db.byRoomName[req.params.roomName] || null;

    const latestFileKey = data && data.latestFileKey ? data.latestFileKey : null;

    // 後方互換: 既存の { data } を残しつつ、トップにも latestFileKey を併記
    res.json({
      roomName: req.params.roomName,
      latestFileKey,   // ← 新規（トップレベル）
      data: data ? { ...data, latestFileKey } : null, // ← 既存 + 拡張
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
