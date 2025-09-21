export const config = { api: { bodyParser: false } }; // 生のBodyは使わない（自前で読む）

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { sid, language = 'ja', outputType = 'flexible', meetingFormat = '' } =
      await readJson(req);

    // -------------------------------
    // どの Origin に取りに行くかを決定
    // 優先: NEXT_PUBLIC_API_BASE_URL > NEXT_PUBLIC_API_BASE > 現在のホスト
    // -------------------------------
    const envBase =
      process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || '';
    const headerProto = req.headers['x-forwarded-proto'] || 'https';
    const headerHost = req.headers['x-forwarded-host'] || req.headers.host;
    const fallbackBase = `${headerProto}://${headerHost}`;
    const baseUrl = (envBase || fallbackBase).replace(/\/+$/, '');

    // -------------------------------
    // フロントの files API から最初のセグメント名を取得
    // -------------------------------
    const listUrl = `${baseUrl}/api/zoom-bot/files/${encodeURIComponent(sid)}`;
    const listRes = await fetch(listUrl, {
      headers: { 'x-internal-token': process.env.INTERNAL_TOKEN || '' },
    });
    const listJson = await listRes.json().catch(() => ({}));
    if (!listRes.ok) {
      return res.status(listRes.status).json(listJson);
    }

    const files = Array.isArray(listJson.files) ? listJson.files : [];
    // 先頭を使用（必要なら webm 優先に絞る）
    const first = files.find((f) => typeof f === 'string') || null;
    if (!first) {
      return res.status(409).json({ error: 'no_audio_ready_yet' });
    }

    // セグメント本体を取得（webm想定だが実際は何でもOK、MIMEはここで付与）
    const audioUrl = `${baseUrl}/api/zoom-bot/files/${encodeURIComponent(
      sid
    )}/${first}`;
    const audioRes = await fetch(audioUrl, {
      headers: { 'x-internal-token': process.env.INTERNAL_TOKEN || '' },
    });
    if (!audioRes.ok) {
      const t = await audioRes.text().catch(() => '');
      return res
        .status(audioRes.status)
        .json({ error: 'fetch_segment_failed', detail: t.slice(0, 200) });
    }
    const buf = Buffer.from(await audioRes.arrayBuffer()); // webm バイナリ

    // -------------------------------
    // “実在の API”（backend/server.js の /api/transcribe）にプロキシ
    // TRANSCRIBE_PROXY_URL は絶対URLで:
    //   例) https://sense-website-production.up.railway.app/api/transcribe
    //       または https://api.sense-ai.world/api/transcribe
    // -------------------------------
    const target = process.env.TRANSCRIBE_PROXY_URL;
    if (!target) {
      return res.status(500).json({ error: 'TRANSCRIBE_PROXY_URL not set' });
    }

    // Node 18+ の fetch / FormData / Blob を利用
    const fd = new FormData();
    // Blob の MIME は webm を付与（Whisper 側で問題あればサーバが m4a 変換してくれる方針）
    fd.append('file', new Blob([buf], { type: 'audio/webm' }), 'segment.webm');
    fd.append('lang', language);
    fd.append('outputType', outputType);
    if (meetingFormat) fd.append('meetingFormat', meetingFormat);

    const proxied = await fetch(target, { method: 'POST', body: fd });
    const text = await proxied.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    return res.status(proxied.status).json(json);
  } catch (e) {
    return res
      .status(500)
      .json({ error: 'transcribe_proxy_failed', detail: String(e?.message || e) });
  }
}

/* ---- helpers ---- */
function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}
