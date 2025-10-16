const express = require('express');
const crypto = require('crypto');

const router = express.Router();

// ここでは簡易にメモリ保持（本番は Firestore 等に保存）
const meetings = new Map();
/*
  meeting = {
    id, roomName, title, startsAt, // 任意
    joinUrl, hostUrl
  }
*/

router.post('/schedule', async (req, res) => {
  try {
    const { title = 'Untitled', startsAt = null } = req.body || {};
    const id = crypto.randomBytes(5).toString('hex');           // 例: 10桁
    const roomName = `minutes-${id}`;                            // LiveKitの部屋名
    const joinUrl = `https://www.sense-ai.world/m/${id}`;
    const hostUrl = `minutesai://join?meeting=${id}`;            // 任意: ディープリンク

    const rec = { id, roomName, title, startsAt, joinUrl, hostUrl };
    meetings.set(id, rec);

    res.json(rec);
  } catch (e) {
    console.error('[meetings] schedule error', e);
    res.status(500).json({ error: 'schedule failed' });
  }
});

// 参加ページやiOSが roomName を解決する
router.get('/:id', (req, res) => {
  const rec = meetings.get(req.params.id);
  if (!rec) return res.status(404).json({ error: 'not found' });
  res.json(rec);
});

module.exports = router;
