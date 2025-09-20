import { GATEWAY_BASE, authHeaders } from '../_utils';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { sid } = req.query;
  try {
    const r = await fetch(`${GATEWAY_BASE}/stop/${encodeURIComponent(sid)}`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const text = await r.text();
    res.status(r.status).send(text);
  } catch (e) {
    res.status(502).json({ error: `proxy stop failed: ${e.message || e}` });
  }
}
