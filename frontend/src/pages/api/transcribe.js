// frontend/src/pages/api/transcribe.js
// Pages Router の API Route。multipart を受けるので bodyParser を切る
export const config = { api: { bodyParser: false } };

import { TRANSCRIBE_PROXY_URL, authHeaders } from '@/lib/api'; // 既存のまま

import formidable from 'formidable';
import fs from 'fs';

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: true, keepExtensions: true });
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

    // 1) 受信した multipart を読む
    const { fields, files } = await parseMultipart(req);

    // file or files（単一/複数どちらも許可）
    const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
    const fileList = [
      ...toArray(files.file),
      ...toArray(files.files),
    ];
    if (fileList.length === 0) {
      return res.status(400).json({ error: 'no_file' });
    }

    // 2) Whisperプロキシへ転送する multipart を組み立て
    const fd = new FormData();
    for (const f of fileList) {
      fd.append('files', new Blob([fs.readFileSync(f.filepath)], { type: f.mimetype || 'application/octet-stream' }), f.originalFilename || 'audio.webm');
    }
    fd.append('meetingFormat', String(fields.meetingFormat || ''));
    fd.append('outputType', String(fields.outputType || 'flexible'));
    fd.append('lang', String(fields.lang || 'ja'));

    // 3) 転送
    const proxied = await fetch(TRANSCRIBE_PROXY_URL, {
      method: 'POST',
      headers: authHeaders(),        // 使っていなければ削除OK
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
