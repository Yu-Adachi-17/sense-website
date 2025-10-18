// routes/egress.js
const express = require('express');
const {
  startRoomCompositeEgress,
  stopEgress,
} = require('../services/livekitEgress');

const router = express.Router();

// メモリ内の簡易ステータス
const egressStore = new Map();

/**
 * POST /api/egress/start
 * body: {
 *   roomName: string,              // 必須: 例 "minutes-xxxx"
 *   mode?: "audio" | "mp4" | "hls" // 既定: "audio"（音声のみ 1ファイル）
 *   layout?: "grid" | "speaker" | string, // mp4/hls用（audioの時は無視）
 *   prefix?: string                // S3のキー接頭辞 ex: "minutes/2025-10-18/"
 * }
 */
router.post('/egress/start', async (req, res) => {
  try {
    const {
      roomName,
      mode = 'audio',      // ★ 既定は音声のみ
      layout = 'grid',
      prefix = '',
    } = req.body || {};

    if (!roomName) {
      return res.status(400).json({ error: 'roomName is required' });
    }

    // services 側は mode に応じて RoomCompositeOptions を組み立てる想定
    // mode === 'audio' のときは audioOnly=true, videoOnly=false で呼び出す
    const { egressId } = await startRoomCompositeEgress({
      roomName,
      mode,
      layout,
      prefix,
    });

    const now = new Date().toISOString();
    const rec = egressStore.get(roomName) || { history: [] };
    rec.current = { egressId, mode, layout, startedAt: now };
    rec.history.push({ egressId, mode, layout, startedAt: now });
    egressStore.set(roomName, rec);

    return res.json({ ok: true, egressId });
  } catch (e) {
    console.error('[egress/start] error', e);
    return res
      .status(500)
      .json({ error: 'failed to start egress', details: e.message });
  }
});

/**
 * POST /api/egress/stop
 * body: { roomName?: string, egressId?: string }
 */
router.post('/egress/stop', async (req, res) => {
  try {
    const { roomName, egressId } = req.body || {};
    let id = egressId;
    if (!id && roomName) {
      id = egressStore.get(roomName)?.current?.egressId;
    }
    if (!id) {
      return res.status(400).json({ error: 'egressId or roomName required' });
    }

    await stopEgress(id);

    if (roomName && egressStore.get(roomName)?.current?.egressId === id) {
      egressStore.get(roomName).current.stoppedAt = new Date().toISOString();
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error('[egress/stop] error', e);
    return res
      .status(500)
      .json({ error: 'failed to stop egress', details: e.message });
  }
});

/**
 * GET /api/egress/status?roomName=minutes-xxxx
 */
router.get('/egress/status', (req, res) => {
  const { roomName } = req.query;
  if (!roomName) return res.status(400).json({ error: 'roomName required' });
  return res.json(egressStore.get(roomName) || { current: null, history: [] });
});

module.exports = router;
