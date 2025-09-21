// frontend/src/pages/api/transcribe.js
export const config = { api: { bodyParser: false } };
export const runtime = 'nodejs';

import formidable from 'formidable';
import fs from 'fs';
import { TRANSCRIBE_PROXY_URL, authHeaders } from '@/lib/api';

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      multiples: true,
      keepExtensions: true,
      maxFileSize: 1024 * 1024 * 512,
    });
    form.parse(req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })));
  });
}

async function forwardToProxy({ blob, fields }) {
  if (!TRANSCRIBE_PROXY_URL) return { status: 500, body: { error: 'TRANSCRIBE_PROXY_URL not set' } };

  const fd = new FormData();
  // ← ★ プロキシ(multer.single('file'))対策：必ず 'file' で 1 個だけ送る
  fd.append(
    'file',
    new Blob([blob.buf], { type: blob.type || 'application/octet-stream' }),
    blob.name || 'audio.webm'
  );

  fd.append('meetingFormat', String(fields.meetingFormat ?? ''));
  fd.append('outputType', String(fields.outputType ?? 'flexible'));
  fd.append('lang', String(fields.lang ?? 'ja'));

  const res = await fetch(TRANSCRIBE_PROXY_URL, {
    method: 'POST',
    headers: authHeaders?.() || undefined,
    body: fd,
  });
  const txt = await res.text();
  let json;
  try { json = JSON.parse(txt); } catch { json = { raw: txt }; }

  return { status: res.status, body: json };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const ct = req.headers['content-type'] || '';

    // A) multipart/form-data: フロントで Blob を直接投げたパス
    if (ct.startsWith('multipart/form-data')) {
      const { fields, files } = await parseMultipart(req);

      const list = [];
      const add = f => list.push(...(Array.isArray(f) ? f : [f]).filter(Boolean));
      // 互換のため複数キーを許容
      files.file && add(files.file);
      files.files && add(files.files);

      if (!list.length) return res.status(400).json({ error: 'no_file' });

      // ★ 1つ目だけ使う（multer.single('file') 前提）
      const f = list[0];
      const blob = {
        buf: fs.readFileSync(f.filepath),
        type: f.mimetype,
        name: f.originalFilename,
      };

      const { status, body } = await forwardToProxy({ blob, fields });
      return res.status(status).json(body);
    }

    // B) application/json: { sid, preferred?, meetingFormat, outputType, lang }
    if (ct.startsWith('application/json')) {
      const raw = await new Promise(r => { let d=''; req.on('data',c=>d+=c); req.on('end',()=>r(d));});
      const { sid, meetingFormat = '', outputType = 'flexible', lang = 'ja', preferred } = JSON.parse(raw || '{}');
      if (!sid) return res.status(400).json({ error: 'missing_sid' });

      const base = process.env.NEXT_PUBLIC_API_BASE ||
        `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host'] || req.headers.host}`;

      // ファイル一覧取得
      const listRes = await fetch(`${base}/api/zoom-bot/files/${encodeURIComponent(sid)}`);
      const listJson = await listRes.json().catch(() => ({}));
      const files = Array.isArray(listJson.files) ? listJson.files : [];

      // 優先候補 → 先頭
      let pick = files.find(f => f === preferred) || files[0];
      if (!pick) return res.status(409).json({ error: 'no_audio_ready_yet' });

      // 実体取得
      const audioRes = await fetch(`${base}/api/zoom-bot/files/${encodeURIComponent(sid)}/${pick}`);
      if (!audioRes.ok) {
        const t = await audioRes.text().catch(()=>'');
        return res.status(audioRes.status).json({ error: 'fetch_segment_failed', detail: t.slice(0,200) });
      }
      const buf = Buffer.from(await audioRes.arrayBuffer());

      const { status, body } = await forwardToProxy({
        blob: { buf, type: 'audio/webm', name: pick.split('/').pop() || 'segment.webm' },
        fields: { meetingFormat, outputType, lang },
      });
      return res.status(status).json(body);
    }

    // C) それ以外は 415
    return res.status(415).json({ error: 'unsupported_content_type', contentType: ct });
  } catch (e) {
    return res.status(500).json({ error: 'transcribe_failed', detail: String(e?.message || e) });
  }
}
