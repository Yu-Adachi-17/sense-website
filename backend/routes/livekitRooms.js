// routes/livekitRooms.js
/* eslint-disable no-console */
// ------------------------------------------------------
// Meeting強制終了API
//  - POST /api/rooms/finish { roomName: string, initiator?: "ios" | "web" | string }
//  動き：該当ルームのEgressを全停止 → RoomをdeleteRoom()で破棄（参加者全員切断）
//  これにより Web は即切断、Webhook は egress_ended を確実に発火。
// ------------------------------------------------------

const express = require('express');
const router = express.Router();
const { EgressClient, RoomServiceClient } = require('livekit-server-sdk');

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.warn('[livekitRooms] LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET 未設定の可能性があります');
}

const egress = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
const rooms  = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

// ---- helpers ----
function isActiveStatus(s) {
  return s === 'EGRESS_STARTING' || s === 'EGRESS_ACTIVE' || s === 'EGRESS_ENDING';
}
function cmpDescByStartedAt(a, b) {
  const ta = new Date(a.startedAt || 0).getTime();
  const tb = new Date(b.startedAt || 0).getTime();
  return tb - ta; // 新しい順
}
async function listByRoom(roomName) {
  const list = await egress.listEgress(); // LiveKit Cloud全件
  return (list.items || []).filter((it) => it.roomName === roomName);
}

// ------------------------------------------------------
// POST /api/rooms/finish
// body: { roomName: string, initiator?: string }
// ------------------------------------------------------
router.post('/finish', async (req, res) => {
  const { roomName, initiator = 'unknown' } = req.body || {};
  if (!roomName) return res.status(400).json({ error: 'roomName required' });

  try {
    // 1) Egress 全停止（STARTING/ACTIVE/ENDING）
    const allByRoom = await listByRoom(roomName);
    const live = allByRoom.filter((it) => isActiveStatus(it.status)).sort(cmpDescByStartedAt);
    const toStopIds = live.map((it) => it.egressId);

    const stoppedIds = [];
    for (const id of toStopIds) {
      try {
        await egress.stopEgress(id);
        stoppedIds.push(id);
      } catch (e) {
        console.warn('[livekitRooms/finish] stopEgress failed', id, e?.message || e);
      }
    }

    // 2) Roomを削除（= 全員強制切断）
    //    既に空 or 存在しない場合も例外を握りつぶしてOK
    let roomDeleted = false;
    try {
      await rooms.deleteRoom(roomName);
      roomDeleted = true;
    } catch (e) {
      // 例: NotFound 等は無視（既に消えているケース）
      console.warn('[livekitRooms/finish] deleteRoom warn:', e?.message || e);
    }

    console.log('[livekitRooms/finish]', { roomName, initiator, stoppedIds, roomDeleted });
    return res.json({ ok: true, roomName, initiator, stoppedIds, roomDeleted });
  } catch (e) {
    console.error('[livekitRooms/finish] error', e);
    return res.status(500).json({ error: 'failed to finish room', details: String(e?.message || e) });
  }
});

module.exports = router;
