const fs = require('fs');
const path = require('path');

function tryParseJSON(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function ensureGoogleCredentials() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  const raw = process.env.GOOGLE_SA_JSON || null;
  const b64 = process.env.GOOGLE_SA_JSON_BASE64 || null;

  let jsonObj = null;

  if (raw) {
    jsonObj = tryParseJSON(raw);
    if (!jsonObj) {
      const decoded = Buffer.from(raw, 'base64').toString('utf8');
      jsonObj = tryParseJSON(decoded);
    }
  } else if (b64) {
    const decoded = Buffer.from(b64, 'base64').toString('utf8');
    jsonObj = tryParseJSON(decoded);
  }

  if (!jsonObj) {
    throw new Error('GCP service account JSON not found. Set GOOGLE_SA_JSON or GOOGLE_SA_JSON_BASE64.');
  }

  const outPath = path.join('/tmp', 'gcp-sa.json');
  fs.writeFileSync(outPath, JSON.stringify(jsonObj));
  process.env.GOOGLE_APPLICATION_CREDENTIALS = outPath;
  return outPath;
}

module.exports = { ensureGoogleCredentials };
