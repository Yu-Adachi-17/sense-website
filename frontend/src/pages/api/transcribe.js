// pages/api/transcribe.js
export const config = { api: { bodyParser: false } };
export const runtime = 'nodejs';

import formidable from 'formidable';
import fs from 'fs';
import { TRANSCRIBE_PROXY_URL, authHeaders } from '@/lib/api';

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: true, keepExtensions: true, maxFileSize: 1024 * 1024 * 512 });
    form.parse(req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })));
  });
}

async function forwardToProxy({ blobs, fields }) {
  const fd = new FormData();
  for (const b of blobs) {
    fd.append('files', new Blob([b.buf], { type: b.type || 'application/octet-stream' }), b.name || 'audio.webm');
  }
  fd.append('meetingFormat', String(fields.meetingFormat ?? ''));
  fd.append('outputType', String(fields.outputType ?? 'flexible'));
  fd.append('lang', String(fields.lang ?? 'ja'));

  const res = await fetch(TRANSCRIBE_PROXY_URL, { method: 'POST', headers: authHeaders?.() || undefined, body: fd });
  const txt = await res.text();
  let json; try { json = JSON.parse(txt); } catch { json = { raw: txt }; }
  return { status: res.status, body: json };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  if (!TRANSCRIBE_PROXY_URL) return res.status(500).json({ error: 'TRANSCRIBE_PROXY_URL not set' });

  try {
    const ct = req.headers['content-type'] || '';

    // A) multipart/form-data（推奨ルート）
    if (ct.startsWith('multipart/form-data')) {
      const { fields, files } = await parseMultipart(req);
      const list = [];
      const add = f => list.push(...(Array.isArray(f) ? f : [f]).filter(Boolean));
      files.file && add(files.file);
      files.files && add(files.files);
      if (!list.length) return res.status(400).json({ error: 'no_file' });

      const blobs = list.map(f => ({
        buf: fs.readFileSync(f.filepath),
        type: f.mimetype,
        name: f.originalFilename,
      }));
      const { status, body } = await forwardToProxy({ blobs, fields });
      return res.status(status).json(body);
    }

    // B) 旧仕様フォールバック：application/json で { sid } が来たらサーバ側で音声を拾って転送
    if (ct.startsWith('application/json')) {
      const raw = await new Promise(r => { let d=''; req.on('data',c=>d+=c); req.on('end',()=>r(d));});
      const { sid, meetingFormat = '', outputType = 'flexible', lang = 'ja' } = JSON.parse(raw || '{}');

      if (!sid) return res.status(415).json({ error: 'unsupported_content_type', contentType: ct });

      const base = process.env.NEXT_PUBLIC_API_BASE ||
        `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host'] || req.headers.host}`;

      const listRes = await fetch(`${base}/api/zoom-bot/files/${encodeURIComponent(sid)}`);
      const listJson = await listRes.json().catch(() => ({}));
      if (!listRes.ok || !Array.isArray(listJson.files) || !listJson.files[0]) {
        return res.status(409).json({ error: 'no_audio_ready_yet' });
      }
      const first = listJson.files[0];
      const audioRes = await fetch(`${base}/api/zoom-bot/files/${encodeURIComponent(sid)}/${first}`);
      if (!audioRes.ok) return res.status(audioRes.status).json({ error: 'fetch_segment_failed' });
      const buf = Buffer.from(await audioRes.arrayBuffer());

      const { status, body } = await forwardToProxy({
        blobs: [{ buf, type: 'audio/webm', name: 'segment.webm' }],
        fields: { meetingFormat, outputType, lang }
      });
      return res.status(status).json(body);
    }

    // C) それ以外は 415（デバッグ情報付き）
    return res.status(415).json({ error: 'unsupported_content_type', contentType: ct });
  } catch (e) {
    return res.status(500).json({ error: 'transcribe_failed', detail: String(e?.message || e) });
  }
}
