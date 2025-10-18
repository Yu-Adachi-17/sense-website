// routes/egress.js
const express = require('express');
const crypto = require('crypto');
const { startRoomCompositeEgress, stopEgress } = require('../services/livekitEgress');

const router = express.Router();

// 簡易：メモリで状態保持（本番は Firestore/DB）
const egressStore = new Map();
/*
  egressStore.set(roomName, {
    current: { egressId, mode, layout, startedAt },
    history: [ ... ],
  })
*/

// 開始：POST /api/egress/start
// body: { roomName: string, mode?: 'mp4'|'hls', layout?: 'grid'|'speaker', prefix?: string }
router.post('/egress/start', async (req, res) => {
  try {
    const { roomName, mode = 'mp4', layout = 'grid', prefix = '' } = req.body || {};
    if (!roomName) return res.status(400).json({ error: 'roomName is required' });

    const { egressId } = await startRoomCompositeEgress({ roomName, mode, layout, prefix });

    const now = new Date().toISOString();
    const rec = egressStore.get(roomName) || { history: [] };
    rec.current = { egressId, mode, layout, startedAt: now };
    rec.history.push({ egressId, mode, layout, startedAt: now });
    egressStore.set(roomName, rec);

    return res.json({ ok: true, egressId });
  } catch (e) {
    console.error('[egress/start] error', e);
    return res.status(500).json({ error: 'failed to start egress', details: e.message });
  }
});

// 停止：POST /api/egress/stop
// body: { roomName?: string, egressId?: string }
router.post('/egress/stop', async (req, res) => {
  try {
    const { roomName, egressId } = req.body || {};
    let id = egressId;

    if (!id && roomName) {
      const rec = egressStore.get(roomName);
      id = rec?.current?.egressId;
    }
    if (!id) return res.status(400).json({ error: 'egressId or roomName required' });

    await stopEgress(id);

    // 状態更新
    if (roomName && egressStore.has(roomName) && egressStore.get(roomName).current?.egressId === id) {
      egressStore.get(roomName).current.stoppedAt = new Date().toISOString();
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error('[egress/stop] error', e);
    return res.status(500).json({ error: 'failed to stop egress', details: e.message });
  }
});

// 参照：GET /api/egress/status?roomName=xxx
router.get('/egress/status', (req, res) => {
  const { roomName } = req.query;
  if (!roomName) return res.status(400).json({ error: 'roomName required' });
  return res.json(egressStore.get(roomName) || { current: null, history: [] });
});

module.exports = router;
