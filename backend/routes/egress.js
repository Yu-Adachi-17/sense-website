// routes/egress.js
/* eslint-disable no-console */
// ------------------------------------------------------
// LiveKit Egress 操作用エンドポイント群（堅牢化版・即ACK版）
//
// 変更点（重要）:
// - /egress/finishRoom は 200 で即 ACK を返し、停止処理は非同期で実行
// - listEgress / stopEgress は pTimeout(3s) で包んでハングを回避
// - “生きている(STARTING/ACTIVE/ENDING)” を優先停止、無ければ直近が ENDING/COMPLETE なら alreadyComplete
// ------------------------------------------------------

const express = require('express');
const router = express.Router();
const { EgressClient } = require('livekit-server-sdk');

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.warn('[egress] LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET が未設定の可能性があります。');
}

const lk = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

// 補助メモリ（任意）
const egressStore = new Map();

// ---- small utils ----
function pTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error(`${label || 'operation'} timeout after ${ms}ms`)), ms)
    ),
  ]);
}

function isActiveStatus(s) {
  // ENDING も「生きてる」に含める
  return s === 'EGRESS_STARTING' || s === 'EGRESS_ACTIVE' || s === 'EGRESS_ENDING';
}
function cmpDescByStartedAt(a, b) {
  const ta = new Date(a.startedAt || 0).getTime();
  const tb = new Date(b.startedAt || 0).getTime();
  return tb - ta; // 新しい順
}

async function listByRoom(roomName) {
  // Cloud 全件 → こちらで roomName で絞る（3s ガード）
  const list = await pTimeout(lk.listEgress(), 3000, 'listEgress');
  return (list.items || []).filter((it) => it.roomName === roomName);
}
async function listActiveForRoom(roomName) {
  return (await listByRoom(roomName))
    .filter((it) => isActiveStatus(it.status))
    .sort(cmpDescByStartedAt);
}

// ------------------------------------------------------
// POST /api/egress/start
// body: { roomName, mode="audio", layout="grid", prefix="", audioFormat="ogg" }
// ------------------------------------------------------
router.post('/egress/start', async (req, res) => {
  try {
    const {
      roomName,
      mode = 'audio',
      layout = 'grid',
      prefix = '',
      audioFormat = 'ogg',
    } = req.body || {};

    if (!roomName) return res.status(400).json({ error: 'roomName is required' });

    const { startRoomCompositeEgress } = require('../services/livekitEgress');
    const { egressId } = await startRoomCompositeEgress({
      roomName, mode, layout, prefix, audioFormat,
    });

    // 補助保存
    const now = new Date().toISOString();
    const rec = egressStore.get(roomName) || { history: [] };
    rec.current = { egressId, mode, layout, audioFormat, startedAt: now };
    rec.history.push(rec.current);
    egressStore.set(roomName, rec);

    res.json({ ok: true, egressId });
  } catch (e) {
    console.error('[egress/start] error', e);
    res.status(500).json({ error: 'failed to start egress', details: String(e?.message || e) });
  }
});

// ------------------------------------------------------
// GET /api/egress/active?roomName=...
// ------------------------------------------------------
router.get('/egress/active', async (req, res) => {
  try {
    const { roomName } = req.query;
    if (!roomName) return res.status(400).json({ error: 'roomName required' });

    const items = await listActiveForRoom(roomName);
    const mapped = items.map((it) => ({
      egressId: it.egressId,
      roomName: it.roomName,
      status: it.status,
      startedAt: it.startedAt?.toISOString?.() || it.startedAt,
      endedAt: it.endedAt?.toISOString?.() || it.endedAt,
      fileResults: it.fileResults ?? null,
    }));
    res.json({ roomName, items: mapped });
  } catch (e) {
    console.error('[egress/active] error', e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// ------------------------------------------------------
// POST /api/egress/stop
// body: { egressId?: string, roomName?: string, all?: boolean }
// ------------------------------------------------------
router.post('/egress/stop', async (req, res) => {
  try {
    const { roomName, egressId, all = false } = req.body || {};
    let targetIds = [];

    if (egressId) {
      targetIds = [egressId];
    } else {
      if (!roomName) return res.status(400).json({ error: 'egressId or roomName required' });
      let allByRoom = [];
      try {
        allByRoom = await listByRoom(roomName);
      } catch (err) {
        console.warn('[egress/stop] listByRoom failed, fallback to memory only:', err.message);
        const mem = egressStore.get(roomName)?.current;
        if (mem?.egressId) targetIds = [mem.egressId];
      }
      if (targetIds.length === 0 && allByRoom.length) {
        const live = allByRoom.filter((it) => isActiveStatus(it.status)).sort(cmpDescByStartedAt);
        if (live.length > 0) {
          targetIds = all ? live.map((it) => it.egressId) : [live[0].egressId];
        } else {
          const last = [...allByRoom].sort(cmpDescByStartedAt)[0];
          if (last && (last.status === 'EGRESS_ENDING' || last.status === 'EGRESS_COMPLETE')) {
            return res.json({ ok: true, egressId: last.egressId, alreadyComplete: true });
          }
        }
      }
    }

    if (targetIds.length === 0) {
      return res.status(409).json({ error: 'no active egress for the room' });
    }

    const stopped = [];
    for (const id of targetIds) {
      try {
        await pTimeout(lk.stopEgress(id), 3000, 'stopEgress');
        stopped.push(id);
      } catch (e) {
        console.warn('[egress/stop] stop failed', id, e?.message || e);
      }
    }

    // 補助ストア
    if (roomName && egressStore.get(roomName)?.current) {
      const cur = egressStore.get(roomName).current;
      if (stopped.includes(cur.egressId)) {
        egressStore.get(roomName).current.stoppedAt = new Date().toISOString();
      }
    }

    return res.json({ ok: true, stoppedIds: stopped });
  } catch (e) {
    console.error('[egress/stop] error', e);
    return res.status(500).json({ error: 'failed to stop egress', details: String(e?.message || e) });
  }
});

// ------------------------------------------------------
// POST /api/egress/finishRoom  ← 即ACK・非同期停止
// body: { roomName: string, all?: boolean }
//
// サーバは **必ずすぐレスポンス** を返す：{ ok: true, accepted: true }
// バックグラウンドで listEgress(<=3s) → stopEgress(<=3s) を試行。
// 何も生きてなければ alreadyComplete 扱いで内部ログに出すだけ。
// 最終確定は webhook の egress_ended / egress_updated を信頼。
// ------------------------------------------------------
router.post('/egress/finishRoom', async (req, res) => {
  const { roomName, all = true } = req.body || {};
  if (!roomName) return res.status(400).json({ error: 'roomName is required' });

  // 1) 即 ACK（iOS の -1001 を防ぐ）
  res.json({ ok: true, accepted: true });

  // 2) 非同期で停止処理（ログのみ）
  ;(async () => {
    try {
      let allByRoom = [];
      try {
        allByRoom = await listByRoom(roomName);
      } catch (err) {
        console.warn('[finishRoom] listByRoom timed out, fallback to memory only:', err.message);
      }

      // メモリ上の current（ensure/start 経由で格納されている場合あり）
      const memId = egressStore.get(roomName)?.current?.egressId;

      let targetIds = [];
      if (allByRoom.length) {
        const live = allByRoom.filter((it) => isActiveStatus(it.status)).sort(cmpDescByStartedAt);
        if (live.length) {
          targetIds = all ? live.map((it) => it.egressId) : [live[0].egressId];
        } else {
          const last = [...allByRoom].sort(cmpDescByStartedAt)[0];
          if (last && (last.status === 'EGRESS_ENDING' || last.status === 'EGRESS_COMPLETE')) {
            console.log('[finishRoom] alreadyComplete (cloud)', roomName, last.egressId, last.status);
            return;
          }
        }
      }
      if (!targetIds.length && memId) {
        targetIds = [memId];
      }
      if (!targetIds.length) {
        console.log('[finishRoom] nothing to stop', roomName);
        return;
      }

      await Promise.all(targetIds.map(async (id) => {
        try {
          await pTimeout(lk.stopEgress(id), 3000, 'stopEgress');
          console.log('[finishRoom] stop requested', roomName, id);
        } catch (e) {
          console.warn('[finishRoom] stop failed', roomName, id, e?.message || e);
        }
      }));
    } catch (e) {
      console.error('[finishRoom] unexpected error', e?.message || e);
    }
  })();
});

// ------------------------------------------------------
// GET /api/egress/status?roomName=...
// ------------------------------------------------------
router.get('/egress/status', async (req, res) => {
  try {
    const { roomName } = req.query;
    if (!roomName) return res.status(400).json({ error: 'roomName required' });

    let cloud = [];
    try {
      const list = await listByRoom(roomName);
      cloud = list.map((it) => ({
        egressId: it.egressId,
        roomName: it.roomName,
        status: it.status,
        startedAt: it.startedAt?.toISOString?.() || it.startedAt,
        endedAt: it.endedAt?.toISOString?.() || it.endedAt,
        fileResults: it.fileResults || null,
      }));
    } catch (err) {
      console.warn('[egress/status] listByRoom timeout:', err.message);
    }

    const mem = egressStore.get(roomName) || { current: null, history: [] };

    res.json({ memory: mem, livekit: cloud });
  } catch (e) {
    console.error('[egress/status] error', e);
    res.status(500).json({ error: String(e) });
  }
});

module.exports = router;
