const express = require('express');
const { startRoomCompositeEgress, stopEgress } = require('../services/livekitEgress');

const router = express.Router();
const egressStore = new Map();

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

    res.json({ ok: true, egressId });
  } catch (e) {
    console.error('[egress/start] error', e);
    res.status(500).json({ error: 'failed to start egress', details: e.message });
  }
});

router.post('/egress/stop', async (req, res) => {
  try {
    const { roomName, egressId } = req.body || {};
    let id = egressId;
    if (!id && roomName) id = egressStore.get(roomName)?.current?.egressId;
    if (!id) return res.status(400).json({ error: 'egressId or roomName required' });

    await stopEgress(id);
    if (roomName && egressStore.get(roomName)?.current?.egressId === id) {
      egressStore.get(roomName).current.stoppedAt = new Date().toISOString();
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('[egress/stop] error', e);
    res.status(500).json({ error: 'failed to stop egress', details: e.message });
  }
});

router.get('/egress/status', (req, res) => {
  const { roomName } = req.query;
  if (!roomName) return res.status(400).json({ error: 'roomName required' });
  res.json(egressStore.get(roomName) || { current: null, history: [] });
});

module.exports = router; // ←これが超重要
