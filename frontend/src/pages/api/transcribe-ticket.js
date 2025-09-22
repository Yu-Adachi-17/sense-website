// frontend/src/pages/api/transcribe-ticket.js
// 追加パッケージ不要（jsonwebtoken非依存）
export const config = { api: { bodyParser: false } };
export const runtime = 'nodejs';

import { createHmac } from 'crypto';

// base64url エンコード（= JWT 仕様に合わせる）
function b64url(objOrBuf) {
  const buf = Buffer.isBuffer(objOrBuf)
    ? objOrBuf
    : Buffer.from(typeof objOrBuf === 'string' ? objOrBuf : JSON.stringify(objOrBuf));
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// HS256 で署名して JWT を作る（header.payload.signature）
function signHS256(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encHeader = b64url(header);
  const encPayload = b64url(payload);
  const data = `${encHeader}.${encPayload}`;
  const sig = createHmac('sha256', secret).update(data).digest();
  return `${data}.${b64url(sig)}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { TRANSCRIBE_PROXY_URL, START_TICKET_SIGNING_KEY } = process.env;
    if (!TRANSCRIBE_PROXY_URL) return res.status(500).json({ error: 'TRANSCRIBE_PROXY_URL not set' });
    if (!START_TICKET_SIGNING_KEY) return res.status(500).json({ error: 'START_TICKET_SIGNING_KEY not set' });

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      scope: 'transcribe',
      iat: now,
      exp: now + 60, // 60秒で失効
    };

    const token = signHS256(payload, START_TICKET_SIGNING_KEY);

    return res.status(200).json({
      uploadUrl: TRANSCRIBE_PROXY_URL,
      token,
      expiresIn: 60,
    });
  } catch (e) {
    return res.status(500).json({ error: 'issue_ticket_failed', detail: String(e?.message || e) });
  }
}
