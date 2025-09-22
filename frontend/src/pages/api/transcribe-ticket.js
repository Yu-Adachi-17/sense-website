// frontend/src/pages/api/transcribe-ticket.js
export const config = { api: { bodyParser: false } };
export const runtime = 'nodejs';

import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { TRANSCRIBE_PROXY_URL } = process.env;
    const key = process.env.START_TICKET_SIGNING_KEY;
    if (!TRANSCRIBE_PROXY_URL) return res.status(500).json({ error: 'TRANSCRIBE_PROXY_URL not set' });
    if (!key) return res.status(500).json({ error: 'START_TICKET_SIGNING_KEY not set' });

    const nowSec = Math.floor(Date.now() / 1000);
    // scope=transcribe を付与（Railway 側で検証）
    const token = jwt.sign({ scope: 'transcribe', iat: nowSec, exp: nowSec + 60 }, key, { algorithm: 'HS256' });

    return res.status(200).json({
      uploadUrl: TRANSCRIBE_PROXY_URL,
      token,
      expiresIn: 60
    });
  } catch (e) {
    return res.status(500).json({ error: 'issue_ticket_failed', detail: String(e?.message || e) });
  }
}
