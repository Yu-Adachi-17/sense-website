// frontend/src/pages/api/transcribe.js
export const config = { api: { bodyParser: false } };

import { TRANSCRIBE_PROXY_URL, ZOOM_BOT_BASE, INTERNAL_TOKEN, authHeaders } from '@/lib/api';


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { sid, language = 'ja', outputType = 'flexible', meetingFormat = '' } = await readJson(req);
    if (!sid) return res.status(400).json({ error: 'missing_sid' });

    // 1) セグメント一覧
    const listUrl = `${ZOOM_BOT_BASE}/api/zoom-bot/files/${encodeURIComponent(sid)}`;
    const listRes = await fetch(listUrl, {
      headers: authHeaders(),
      // ネットワーク障害で固まらないよう保険
      signal: AbortSignal.timeout(15000),
    });

    const list = await safeJson(listRes);
    if (!listRes.ok) {
      return res.status(listRes.status).json({ error: 'list_failed', detail: list });
    }

    const first = Array.isArray(list.files) ? list.files[0] : null;
    if (!first) return res.status(409).json({ error: 'no_audio_ready_yet' });

    // 2) 最初のセグメントを取得（webm 想定だが中身は何でも良い）
    const audioUrl = `${ZOOM_BOT_BASE}/api/zoom-bot/files/${encodeURIComponent(sid)}/${first}`;
    const audioRes = await fetch(audioUrl, {
      headers: authHeaders(),
      signal: AbortSignal.timeout(15000),
    });
    if (!audioRes.ok) {
      const t = await audioRes.text().catch(() => '');
      return res.status(audioRes.status).json({ error: 'fetch_segment_failed', detail: t.slice(0, 400) });
    }
    const buf = Buffer.from(await audioRes.arrayBuffer());

    // 3) 実在のバックエンド（Railway）へプロキシ
    const target = TRANSCRIBE_PROXY_URL; // 例: https://sense-website-production.up.railway.app/api/transcribe
    if (!target) return res.status(500).json({ error: 'TRANSCRIBE_PROXY_URL not set' });

    const fd = new FormData();
    fd.append('file', new Blob([buf], { type: 'audio/webm' }), first || 'segment.webm');
    fd.append('lang', language);
    fd.append('outputType', outputType);
    if (meetingFormat) fd.append('meetingFormat', meetingFormat);

    const proxied = await fetch(target, {
      method: 'POST',
      body: fd,
      // バックエンド側で INTERNAL_TOKEN を見るなら必要（CORSは同ドメインなので不要）
      headers: authHeaders(),
      signal: AbortSignal.timeout(600000), // Whisper/要約は時間がかかるので長め
    });

    const text = await proxied.text();
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
      catch (err) { reject(err); }
    });
    req.on('error', reject);
  });
}

async function safeJson(res) {
  try { return await res.json(); } catch { return {}; }
}

function authHeaders(extra) {
  const h = Object.assign({}, extra || {});
  if (INTERNAL_TOKEN) h['x-internal-token'] = INTERNAL_TOKEN;
  return h;
}
