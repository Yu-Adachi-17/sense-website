// services/googleAuth.js
const { GoogleAuth } = require('google-auth-library');

const SCOPES = ['https://www.googleapis.com/auth/cloud-platform'];

function loadServiceAccountFromEnv() {
  const raw = process.env.GOOGLE_SA_JSON && process.env.GOOGLE_SA_JSON.trim();
  const b64 = process.env.GOOGLE_SA_JSON_BASE64 && process.env.GOOGLE_SA_JSON_BASE64.trim();

  console.log('[AUTH] has GOOGLE_SA_JSON =', !!raw, 'len=', raw ? raw.length : 0);
  console.log('[AUTH] has GOOGLE_SA_JSON_BASE64 =', !!b64, 'len=', b64 ? b64.length : 0);

  let jsonText = '';

  // ★ base64 を優先（raw は改行事故が起きやすい）
  if (b64) {
    jsonText = Buffer.from(b64, 'base64').toString('utf8');
    console.log('[AUTH] using GOOGLE_SA_JSON_BASE64');
  } else if (raw) {
    jsonText = raw;
    console.log('[AUTH] using GOOGLE_SA_JSON');
  } else {
    throw new Error('Service account JSON is missing. Set GOOGLE_SA_JSON_BASE64 (recommended) or GOOGLE_SA_JSON');
  }

  let creds;
  try {
    creds = JSON.parse(jsonText);
  } catch {
    throw new Error('Service account JSON parse failed (invalid JSON)');
  }

  if (!creds || creds.type !== 'service_account') throw new Error('Invalid credentials: type must be "service_account"');
  if (!creds.client_email) throw new Error('Invalid credentials: missing client_email');
  if (!creds.private_key) throw new Error('Invalid credentials: missing private_key');

  // private_key が "\\n" を含む形で入っていると署名に失敗するので補正
  if (typeof creds.private_key === 'string' && creds.private_key.includes('\\n')) {
    creds.private_key = creds.private_key.replace(/\\n/g, '\n');
  }

  // ここは安全な範囲の情報だけ
  console.log('[AUTH] creds.type =', creds.type);
  console.log('[AUTH] creds.client_email =', creds.client_email);

  return creds;
}

async function getAuthorizationHeader() {
  const credentials = loadServiceAccountFromEnv();

  const auth = new GoogleAuth({
    credentials,
    scopes: SCOPES,
  });

  const client = await auth.getClient();

  // ★ Authorizationヘッダ生成を確実化：アクセストークンを直に取得
  let tok;
  try {
    const res = await client.getAccessToken(); // string または { token }
    tok = typeof res === 'string' ? res : res && res.token;
  } catch (e) {
    console.error('[AUTH] getAccessToken failed:', e && e.message ? e.message : e);
    throw e;
  }

  if (!tok) {
    throw new Error('Failed to get access token from google-auth-library (empty token)');
  }

  return `Bearer ${tok}`;
}

module.exports = { getAuthorizationHeader };
