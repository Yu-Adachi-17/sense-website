/* eslint-disable no-console */
const express = require('express');
const router = express.Router();
const { EgressClient } = require('livekit-server-sdk');

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

const lk = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

// インメモリ補助（任意）
const egressStore = new Map();

function isActiveStatus(s) {
  return s === 'EGRESS_STARTING' || s === 'EGRESS_ACTIVE' || s === 'EGRESS_ENDING';
}

async function listActiveForRoom(roomName) {
  const list = await lk.listEgress(); // Cloudは全件→絞り込み
  return (list.items || [])
    .filter(it => it.roomName === roomName && isActiveStatus(it.status))
    .sort((a, b) => {
      const ta = new Date(a.startedAt || 0).getTime();
      const tb = new Date(b.startedAt || 0).getTime();
      return tb - ta; // 新しい順
    });
}

/**
 * POST /api/egress/start
 * body: { roomName, mode="audio", layout="grid", prefix="", audioFormat="ogg" }
 */
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

    // 実装はあなたの services/... を呼ぶ想定。例:
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

/**
 * GET /api/egress/active?roomName=...
 * そのルームの “生きてる or 終了中” egress を新しい順に返す
 */
router.get('/egress/active', async (req, res) => {
  try {
    const { roomName } = req.query;
    if (!roomName) return res.status(400).json({ error: 'roomName required' });
    const items = await listActiveForRoom(roomName);
    const mapped = items.map(it => ({
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

/**
 * POST /api/egress/stop
 * body: { egressId?: string, roomName?: string, all?: boolean }
 * - egressId があればそれを停止（推奨）
 * - そうでなければ roomName で解決
 *   - all=true なら該当ルームの STARTING/ACTIVE/ENDING を全停止
 *   - all=false（既定）なら「最新の1件だけ」停止
 */
router.post('/egress/stop', async (req, res) => {
  try {
    const { roomName, egressId, all = false } = req.body || {};

    let targetIds = [];
    if (egressId) {
      targetIds = [egressId];
    } else {
      if (!roomName) {
        return res.status(400).json({ error: 'egressId or roomName required' });
      }
      const live = await listActiveForRoom(roomName);
      if (live.length === 0) {
        return res.status(409).json({ error: 'no active egress for the room' });
      }
      targetIds = all ? live.map(it => it.egressId) : [live[0].egressId]; // 最新のみ/全停止
    }

    const stopped = [];
    for (const id of targetIds) {
      try {
        await lk.stopEgress(id);
        stopped.push(id);
      } catch (e) {
        console.warn('[egress/stop] stop failed', id, e?.message || e);
      }
    }

    // 補助ストアの current を終了マーク（あるなら）
    if (roomName && egressStore.get(roomName)?.current && stopped.includes(egressStore.get(roomName).current.egressId)) {
      egressStore.get(roomName).current.stoppedAt = new Date().toISOString();
    }

    res.json({ ok: true, stoppedIds: stopped });
  } catch (e) {
    console.error('[egress/stop] error', e);
    res.status(500).json({ error: 'failed to stop egress', details: String(e?.message || e) });
  }
});

/**
 * GET /api/egress/status?roomName=...
 * 任意: インメモリの記録 + LiveKit 実勢
 */
router.get('/egress/status', async (req, res) => {
  try {
    const { roomName } = req.query;
    if (!roomName) return res.status(400).json({ error: 'roomName required' });

    const mem = egressStore.get(roomName) || { current: null, history: [] };
    const list = await lk.listEgress();
    const cloud = (list.items || []).filter((it) => it.roomName === roomName);

    res.json({
      memory: mem,
      livekit: cloud.map((it) => ({
        egressId: it.egressId,
        roomName: it.roomName,
        status: it.status,
        startedAt: it.startedAt?.toISOString?.() || it.startedAt,
        endedAt: it.endedAt?.toISOString?.() || it.endedAt,
        fileResults: it.fileResults || null,
      })),
    });
  } catch (e) {
    console.error('[egress/status] error', e);
    res.status(500).json({ error: String(e) });
  }
});

module.exports = router;
