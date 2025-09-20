import { GATEWAY_BASE, authHeaders } from '../_utils';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { sid } = req.query;
  try {
    const r = await fetch(`${GATEWAY_BASE}/status/${encodeURIComponent(sid)}`, {
      headers: authHeaders(),
    });
    const text = await r.text();
    res.status(r.status).send(text);
  } catch (e) {
    res.status(502).json({ error: `proxy status failed: ${e.message || e}` });
  }
}
