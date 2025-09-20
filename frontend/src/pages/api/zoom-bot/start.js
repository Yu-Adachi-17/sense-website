import { GATEWAY_BASE, authHeadersJSON } from './_utils';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Internal-Token');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const r = await fetch(`${GATEWAY_BASE}/start`, {
      method: 'POST',
      headers: authHeadersJSON(),
      body: JSON.stringify(req.body || {}),
    });
    const text = await r.text();
    res.status(r.status).send(text);
  } catch (e) {
    res.status(502).json({ error: `proxy start failed: ${e.message || e}` });
  }
}
