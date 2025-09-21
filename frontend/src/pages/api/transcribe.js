// pages/api/transcribe.js
export const config = { api: { bodyParser: false } };
export const runtime = 'nodejs';
export const maxDuration = 300; // ← 5分まで許可（ダッシュボード設定と併用）

import formidable from 'formidable';
import fs from 'fs';
import { TRANSCRIBE_PROXY_URL, authHeaders } from '@/lib/api';

// ---- utils ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      multiples: true,
      keepExtensions: true,
      maxFileSize: 1024 * 1024 * 512, // 512MB
    });
    form.parse(req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })));
  });
}

async function forwardToProxy({ blobs, fields }) {
  if (!TRANSCRIBE_PROXY_URL) {
    return { status: 500, body: { error: 'TRANSCRIBE_PROXY_URL not set' } };
  }
  const fd = new FormData();
  for (const b of blobs) {
    fd.append(
      'files',
      new Blob([b.buf], { type: b.type || 'application/octet-stream' }),
      b.name || 'audio.webm'
    );
  }
  fd.append('meetingFormat', String(fields.meetingFormat ?? ''));
  fd.append('outputType', String(fields.outputType ?? 'flexible'));
  fd.append('lang', String(fields.lang ?? 'ja'));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('client-timeout'), 110000); // 110s の自衛（Vercelの実行上限未満）
  const res = await fetch(TRANSCRIBE_PROXY_URL, {
    method: 'POST',
    headers: authHeaders?.() || undefined,
    body: fd,
    signal: controller.signal,
  }).catch((e) => ({ ok: false, status: 504, _timeout: true, _err: String(e) }));
  clearTimeout(timeout);
  const txt = await res.text();
  let json;
  try { json = JSON.parse(txt); } catch { json = { raw: txt }; }
  return { status: res.status, body: json };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const ct = req.headers['content-type'] || '';
    // A) multipart/form-data（ファイル直投げ）
    if (ct.startsWith('multipart/form-data')) {
      const { fields, files } = await parseMultipart(req);
      const list = [];
      const add = (f) => list.push(...(Array.isArray(f) ? f : [f]).filter(Boolean));
      if (files.file) add(files.file);
      if (files.files) add(files.files);
      if (!list.length) return res.status(400).json({ error: 'no_file' });

      const blobs = list.map((f) => ({
        buf: fs.readFileSync(f.filepath),
        type: f.mimetype,
        name: f.originalFilename,
      }));

      const { status, body } = await forwardToProxy({ blobs, fields });
      return res.status(status).json(body);
    }

    // B) JSON（sid 経由）：音声ファイルをサーバ側で取得 → 代理転送
    if (ct.startsWith('application/json')) {
      const raw = await new Promise((r) => {
        let d = '';
        req.on('data', (c) => (d += c));
        req.on('end', () => r(d));
      });
      const parsed = JSON.parse(raw || '{}');

      const sid = parsed.sid;
      const meetingFormat = parsed.meetingFormat ?? '';
      const outputType = parsed.outputType ?? 'flexible';
      const lang = parsed.language || parsed.lang || 'ja';
      const preferred = parsed.preferred || ''; // 例: "segments/seg_000.webm"

      if (!sid) return res.status(400).json({ error: 'missing_sid' });

      const baseUrl =
        process.env.NEXT_PUBLIC_API_BASE ||
        `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host'] || req.headers.host}`;

      const listUrl = `${baseUrl}/api/zoom-bot/files/${encodeURIComponent(sid)}`;

      // 最大 ~12秒程度リトライ（1s → 1s → 1.2s → 1.4s ...）
      let files = [];
      for (let i = 0; i < 10; i++) {
        try {
          const lr = await fetch(listUrl);
          if (lr.ok) {
            const j = await lr.json().catch(() => ({}));
            files = Array.isArray(j.files) ? j.files : [];
            if (files.length > 0) break;
          } else if (lr.status >= 500) {
            // サーバ側一時エラーは少し待って再試行
          }
        } catch {
          // ネットワーク一過性エラーは待って再試行
        }
        await sleep(i < 2 ? 1000 : 800 + i * 200); // 1s,1s,1.0s+,…
      }

      if (!files.length) {
        return res.status(409).json({ error: 'no_audio_ready_yet' });
      }

      // preferred を最優先で採用
      let pick = (preferred && files.includes(preferred)) ? preferred : null;
      if (!pick) {
        const seg = files.filter((f) => f.startsWith('segments/')).sort();
        const singleWebm = files.find((f) => f.toLowerCase().endsWith('.webm') && !f.includes('seg_'));
        const fallbackWav = files.find((f) => f.toLowerCase().endsWith('.wav'));
        pick = seg[0] || singleWebm || fallbackWav || files[0];
      }

      const audioUrl = `${baseUrl}/api/zoom-bot/files/${encodeURIComponent(sid)}/${pick}`;
      const audioRes = await fetch(audioUrl);
      if (!audioRes.ok) {
        const t = await audioRes.text().catch(() => '');
        return res
          .status(audioRes.status)
          .json({ error: 'fetch_segment_failed', detail: t.slice(0, 200) });
      }

      const buf = Buffer.from(await audioRes.arrayBuffer());
      const { status, body } = await forwardToProxy({
        blobs: [{ buf, type: 'audio/webm', name: 'segment.webm' }],
        fields: { meetingFormat, outputType, lang },
      });
      return res.status(status).json(body);
    }

    // C) 未対応
    return res.status(415).json({ error: 'unsupported_content_type', contentType: ct });
  } catch (e) {
    return res.status(500).json({ error: 'transcribe_failed', detail: String(e?.message || e) });
  }
}
