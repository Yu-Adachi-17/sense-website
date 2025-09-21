// frontend/src/pages/api/transcribe.js
export const config = { api: { bodyParser: false } }; // 生のBodyは使わない

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { sid, language = 'ja', outputType = 'flexible', meetingFormat = '' } = await readJson(req);

    // フロントの files API から最初のセグメントを取得
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host'] || req.headers.host}`;
    const listUrl = `${baseUrl}/api/zoom-bot/files/${encodeURIComponent(sid)}`;
    const listRes = await fetch(listUrl, { headers: { 'x-internal-token': process.env.INTERNAL_TOKEN || '' } });
    const list = await listRes.json().catch(()=> ({}));
    if (!listRes.ok) return res.status(listRes.status).json(list);

    const first = Array.isArray(list.files) ? list.files[0] : null;
    if (!first) return res.status(409).json({ error: 'no_audio_ready_yet' });

    const audioUrl = `${baseUrl}/api/zoom-bot/files/${encodeURIComponent(sid)}/${first}`;
    const audioRes = await fetch(audioUrl, { headers: { 'x-internal-token': process.env.INTERNAL_TOKEN || '' } });
    if (!audioRes.ok) {
      const t = await audioRes.text().catch(()=> '');
      return res.status(audioRes.status).json({ error: 'fetch_segment_failed', detail: t.slice(0,200) });
    }
    const buf = Buffer.from(await audioRes.arrayBuffer()); // webm バイナリ

    // ← ここが“実在のAPI”（既存 backend/server.js の /api/transcribe）
    const target = process.env.TRANSCRIBE_PROXY_URL;
    if (!target) return res.status(500).json({ error: 'TRANSCRIBE_PROXY_URL not set' });

    // Node18 の Web FormData/Blob を利用（境界は自動）
    const fd = new FormData();
    fd.append('file', new Blob([buf], { type: 'audio/webm' }), 'segment.webm');
    fd.append('lang', language);
    fd.append('outputType', outputType);
    if (meetingFormat) fd.append('meetingFormat', meetingFormat);

    const proxied = await fetch(target, { method: 'POST', body: fd });
    const text = await proxied.text(); // Whisper/要約の出力は JSON を期待
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    return res.status(proxied.status).json(json);
  } catch (e) {
    return res.status(500).json({ error: 'transcribe_proxy_failed', detail: String(e?.message || e) });
  }
}

/* ---- helpers ---- */
function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}
