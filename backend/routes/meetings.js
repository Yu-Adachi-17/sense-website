// routes/meeting.js
const express = require('express');
const crypto = require('crypto');

const router = express.Router();

// メモリ保持（本番はDBへ）
const meetings = new Map();
/*
  meeting = {
    id, roomName, title, startsAt,
    joinUrl, hostUrl,
    state: 'preparing' | 'ready' | 'ended',
    createdAt, readyAt, endedAt
  }
*/
const nowISO = () => new Date().toISOString();

// 作成
router.post('/schedule', async (req, res) => {
  try {
    const { title = 'Untitled', startsAt = null } = req.body || {};
    const id = crypto.randomBytes(5).toString('hex');
    const roomName = `minutes-${id}`;
    const joinUrl = `https://www.sense-ai.world/m/${id}`;
    const hostUrl = `minutesai://join?meeting=${id}`;
    const rec = {
      id, roomName, title, startsAt, joinUrl, hostUrl,
      state: 'preparing',
      createdAt: nowISO(),
      readyAt: null,
      endedAt: null,
    };
    meetings.set(id, rec);
    res.json(rec);
  } catch (e) {
    console.error('[meetings] schedule error', e);
    res.status(500).json({ error: 'schedule failed' });
  }
});

// 解決
router.get('/:id', (req, res) => {
  const rec = meetings.get(req.params.id);
  if (!rec) return res.status(404).json({ error: 'not found' });
  res.json(rec);
});

// 既存：救済 ready
router.post('/:id/mark-ready', (req, res) => {
  const rec = meetings.get(req.params.id);
  if (!rec) return res.status(404).json({ error: 'not found' });
  if (rec.state !== 'ready') {
    rec.state = 'ready';
    rec.readyAt = nowISO();
  }
  meetings.set(rec.id, rec);
  res.json({ ok: true, id: rec.id, state: rec.state, readyAt: rec.readyAt });
});

// ★追加：終了マーク
router.post('/:id/end', (req, res) => {
  const rec = meetings.get(req.params.id);
  if (!rec) return res.status(404).json({ error: 'not found' });
  if (rec.state !== 'ended') {
    rec.state = 'ended';
    rec.endedAt = nowISO();
    meetings.set(rec.id, rec);
  }
  res.json({ ok: true, id: rec.id, state: rec.state, endedAt: rec.endedAt });
});

module.exports = router;
module.exports.meetings = meetings;
