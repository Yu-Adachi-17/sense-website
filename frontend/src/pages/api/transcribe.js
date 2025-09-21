// pages/api/transcribe.js
// ✅ Next.js Pages API（Serverless）で multipart を受ける
//    - bodyParser を無効
//    - ランタイムは Node を明示
export const config = { api: { bodyParser: false } };
export const runtime = 'nodejs'; // 念のため Node.js を固定（Edge では formidable が動かないことがある）

import formidable from 'formidable';
import fs from 'fs';

import { TRANSCRIBE_PROXY_URL, authHeaders } from '@/lib/api';

// ---- multipart 受信（formidable） ----
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      multiples: true,
      keepExtensions: true,
      // 必要に応じて拡大
      maxFileSize: 1024 * 1024 * 512, // 512MB
    });
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    if (!TRANSCRIBE_PROXY_URL) {
      return res.status(500).json({ error: 'TRANSCRIBE_PROXY_URL not set' });
    }

    const ct = req.headers['content-type'] || '';
    if (!ct.startsWith('multipart/form-data')) {
      // フロントが JSON で来た時などに原因を特定しやすく
      return res.status(415).json({ error: 'unsupported_content_type', contentType: ct });
    }

    // 1) 受信
    const { fields, files } = await parseMultipart(req);

    // 2) file / files どちらも許可。単体/配列どちらも吸収
    const candidates = [];
    if (files.file) candidates.push(...(Array.isArray(files.file) ? files.file : [files.file]));
    if (files.files) candidates.push(...(Array.isArray(files.files) ? files.files : [files.files]));

    if (candidates.length === 0) {
      // デバッグ用に fields だけ返しておくと原因特定しやすい
      return res.status(400).json({ error: 'no_file', fields: Object.keys(fields || {}) });
    }

    // 3) Whisper プロキシへそのまま転送する multipart を組み立て
    const fd = new FormData();
    for (const f of candidates) {
      const buf = fs.readFileSync(f.filepath);
      fd.append('files', new Blob([buf], { type: f.mimetype || 'application/octet-stream' }), f.originalFilename || 'audio.webm');
    }
    fd.append('meetingFormat', String((fields.meetingFormat ?? '')));
    fd.append('outputType', String((fields.outputType ?? 'flexible')));
    fd.append('lang', String((fields.lang ?? 'ja')));

    const proxied = await fetch(TRANSCRIBE_PROXY_URL, {
      method: 'POST',
      headers: authHeaders?.() || undefined, // 使っていなければ削除OK
      body: fd,
    });

    const text = await proxied.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    return res.status(proxied.status).json(json);
  } catch (e) {
    return res.status(500).json({ error: 'transcribe_failed', detail: String(e?.message || e) });
  }
}
