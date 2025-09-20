import { GATEWAY_BASE, authHeaders } from '../../_utils';

export const config = { api: { responseLimit: false } };

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD')
    return res.status(405).json({ error: 'Method not allowed' });

  const { sid, name } = req.query;
  const url = `${GATEWAY_BASE}/files/${encodeURIComponent(sid)}/${encodeURIComponent(name)}`;
  try {
    const r = await fetch(url, { method: req.method, headers: authHeaders() });
    // ヘッダを転送
    r.headers.forEach((v, k) => res.setHeader(k, v));
    if (req.method === 'HEAD') return res.status(r.status).end();
    const buf = Buffer.from(await r.arrayBuffer());
    res.status(r.status).send(buf);
  } catch (e) {
    res.status(502).json({ error: `proxy file failed: ${e.message || e}` });
  }
}
