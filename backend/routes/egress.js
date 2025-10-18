// routes/egress.js
const express = require('express');
const router = express.Router();

const {
  startRoomCompositeEgress,
  stopEgress
} = require('../services/livekitEgress');

// LiveKit REST クライアント（server-sdk でも REST でもOK。あなたの実装に合わせて）
const { EgressClient } = require('livekit-server-sdk');

const LIVEKIT_URL = process.env.LIVEKIT_URL;        // 例: https://cloud.liv
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

const lk = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

// ⚠️ インメモリは残すが「補助」扱いにする（再起動で飛ぶことを前提に）
const egressStore = new Map();

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
      audioFormat = 'ogg'   // 既定を ogg に統一（サマリ文書と一致）
    } = req.body || {};
    if (!roomName) return res.status(400).json({ error: 'roomName is required' });

    const { egressId } = await startRoomCompositeEgress({
      roomName, mode, layout, prefix, audioFormat
    });

    // インメモリにも記録（補助）
    const now = new Date().toISOString();
    const rec = egressStore.get(roomName) || { history: [] };
    rec.current = { egressId, mode, layout, audioFormat, startedAt: now };
    rec.history.push({ egressId, mode, layout, audioFormat, startedAt: now });
    egressStore.set(roomName, rec);

    res.json({ ok: true, egressId });
  } catch (e) {
    console.error('[egress/start] error', e);
    res.status(500).json({ error: 'failed to start egress', details: String(e?.message || e) });
  }
});

/**
 * POST /api/egress/stop
 * body: { egressId?: string, roomName?: string }
 * 優先: egressId。無ければ listEgress で roomName のアクティブを解決して止める。
 */
router.post('/egress/stop', async (req, res) => {
  try {
    const { roomName, egressId } = req.body || {};
    let id = egressId;

    // 1) まずメモリで解決（同一プロセス内で開始→停止の典型ケース）
    if (!id && roomName) {
      id = egressStore.get(roomName)?.current?.egressId || null;
    }

    // 2) それでも無ければ LiveKit REST から“今生きてる”ものを引く（重要）
    if (!id && roomName) {
      const list = await lk.listEgress(); // LiveKit Cloud の現在一覧
      const live = list.items?.find(it =>
        it.roomName === roomName &&
        (it.status === 'EGRESS_STARTING' || it.status === 'EGRESS_ACTIVE')
      );
      if (live?.egressId) id = live.egressId;
    }

    if (!id) {
      return res.status(400).json({ error: 'egressId or roomName (resolvable) required' });
    }

    await stopEgress(id);

    // インメモリの current を終了マーク（あれば）
    if (roomName && egressStore.get(roomName)?.current?.egressId === id) {
      egressStore.get(roomName).current.stoppedAt = new Date().toISOString();
    }

    res.json({ ok: true, egressId: id });
  } catch (e) {
    console.error('[egress/stop] error', e);
    res.status(500).json({ error: 'failed to stop egress', details: String(e?.message || e) });
  }
});

/**
 * GET /api/egress/status?roomName=...
 * インメモリの記録＋LiveKit の実勢を併記して返す
 */
router.get('/egress/status', async (req, res) => {
  try {
    const { roomName } = req.query;
    if (!roomName) return res.status(400).json({ error: 'roomName required' });

    const mem = egressStore.get(roomName) || { current: null, history: [] };

    // LiveKit 実勢
    const list = await lk.listEgress();
    const cloud = list.items?.filter(it => it.roomName === roomName) || [];

    res.json({
      memory: mem,
      livekit: cloud.map(it => ({
        egressId: it.egressId,
        roomName: it.roomName,
        status: it.status,              // EGRESS_STARTING / EGRESS_ACTIVE / EGRESS_ENDING / EGRESS_COMPLETE / EGRESS_FAILED
        startedAt: it.startedAt?.toISOString?.() || it.startedAt,
        endedAt: it.endedAt?.toISOString?.() || it.endedAt,
        fileResults: it.fileResults || null
      }))
    });
  } catch (e) {
    console.error('[egress/status] error', e);
    res.status(500).json({ error: String(e) });
  }
});

module.exports = router;
