// services/googleAuth.js
const { GoogleAuth } = require('google-auth-library');

const SCOPES = ['https://www.googleapis.com/auth/cloud-platform'];

function loadServiceAccountFromEnv() {
  const raw = process.env.GOOGLE_SA_JSON && process.env.GOOGLE_SA_JSON.trim();
  const b64 = process.env.GOOGLE_SA_JSON_BASE64 && process.env.GOOGLE_SA_JSON_BASE64.trim();

  let jsonText = '';

  if (raw) {
    jsonText = raw;
  } else if (b64) {
    try {
      jsonText = Buffer.from(b64, 'base64').toString('utf8');
    } catch (e) {
      throw new Error('GOOGLE_SA_JSON_BASE64 decode failed');
    }
  } else {
    throw new Error('Service account JSON is missing. Set GOOGLE_SA_JSON or GOOGLE_SA_JSON_BASE64');
  }

  let creds;
  try {
    creds = JSON.parse(jsonText);
  } catch (e) {
    throw new Error('Service account JSON parse failed (invalid JSON)');
  }

  // 最低限のバリデーション
  if (!creds || creds.type !== 'service_account') {
    throw new Error('Invalid credentials: type must be "service_account"');
  }
  if (!creds.client_email) {
    throw new Error('Invalid credentials: missing client_email');
  }
  if (!creds.private_key) {
    throw new Error('Invalid credentials: missing private_key');
  }

  // private_key の \n が壊れてるときの救済（よくある：\\n で入ってる）
  if (typeof creds.private_key === 'string' && creds.private_key.includes('\\n')) {
    creds.private_key = creds.private_key.replace(/\\n/g, '\n');
  }

  return creds;
}

async function getAuthorizationHeader() {
  // 秘密をログに出さない
  console.log('[AUTH] has GOOGLE_SA_JSON =', !!process.env.GOOGLE_SA_JSON, 'len=', (process.env.GOOGLE_SA_JSON || '').length);
  console.log('[AUTH] has GOOGLE_SA_JSON_BASE64 =', !!process.env.GOOGLE_SA_JSON_BASE64, 'len=', (process.env.GOOGLE_SA_JSON_BASE64 || '').length);

  const credentials = loadServiceAccountFromEnv();

  const auth = new GoogleAuth({
    credentials,
    scopes: SCOPES,
  });

  const client = await auth.getClient();

  // google-auth-library は Authorization/authorization どちらのキーで返る場合もあるので両対応
  const headers = await client.getRequestHeaders();
  const v = headers.Authorization || headers.authorization;

  if (!v) {
    throw new Error('Failed to get Authorization header from google-auth-library');
  }
  return v;
}

module.exports = {
  getAuthorizationHeader,
};
