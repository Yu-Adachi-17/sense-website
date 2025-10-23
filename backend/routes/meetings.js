// meeting.js  （/routes/meeting.js）
// ─────────────────────────────────────────────────────
// 会議の発行～参照までの最小構成。in-memory 版（本番はDBに置換）
// - POST /api/meetings/schedule       … 会議URLを発行（state=preparing）
// - GET  /api/meetings/:id            … レコードを返す（404は本当に無い時のみ）
// - POST /api/meetings/:id/mark-ready … ホスト接続後に ready 化（冪等）
// - GET  /api/meetings/:id/status     … state だけ見る簡易API（任意）
//
// ※ iOS/ホスト側は LiveKit へ接続完了後に mark-ready を一度叩いてください。
//   例: POST https://.../api/meetings/<id>/mark-ready
// ─────────────────────────────────────────────────────

const express = require('express');
const crypto = require('crypto');

const router = express.Router();

// 簡易ストア（本番は Firestore / SQL / KV へ）
/*
  meeting = {
    id, roomName, title, startsAt,
    joinUrl, hostUrl,
    state: "preparing" | "ready" | "ended",
    createdAt: ISOString,
    readyAt: ISOString | null,
    endedAt: ISOString | null
  }
*/
const meetings = new Map();

// Helpers
const nowISO = () => new Date().toISOString();

// ── Create (issue URL) ───────────────────────────────
router.post('/schedule', async (req, res) => {
  try {
    const { title = 'Untitled', startsAt = null } = req.body || {};

    const id = crypto.randomBytes(5).toString('hex'); // 例: 10桁
    const roomName = `minutes-${id}`;
    const joinUrl = `https://www.sense-ai.world/m/${id}`;
    const hostUrl = `minutesai://join?meeting=${id}`;

    const rec = {
      id,
      roomName,
      title,
      startsAt,
      joinUrl,
      hostUrl,
      state: 'preparing',
      createdAt: nowISO(),
      readyAt: null,
      endedAt: null,
    };

    meetings.set(id, rec);
    return res.json(rec);
  } catch (e) {
    console.error('[meetings] schedule error', e);
    return res.status(500).json({ error: 'schedule failed' });
  }
});

// ── Read (for join pages / iOS) ──────────────────────
router.get('/:id', (req, res) => {
  const rec = meetings.get(req.params.id);
  if (!rec) return res.status(404).json({ error: 'not found' });
  return res.json(rec); // state 付きで返す（preparing でも 200）
});

// ── Mark Ready (host connected) ──────────────────────
router.post('/:id/mark-ready', (req, res) => {
  const id = req.params.id;
  const rec = meetings.get(id);
  if (!rec) return res.status(404).json({ error: 'not found' });

  if (rec.state !== 'ready') {
    rec.state = 'ready';
    rec.readyAt = nowISO();
    meetings.set(id, rec);
  }
  return res.json({ ok: true, id, state: rec.state });
});

// （任意）state のみ軽量チェック
router.get('/:id/status', (req, res) => {
  const rec = meetings.get(req.params.id);
  if (!rec) return res.status(404).json({ error: 'not found' });
  return res.json({ id: rec.id, state: rec.state, readyAt: rec.readyAt, endedAt: rec.endedAt });
});

module.exports = router;
