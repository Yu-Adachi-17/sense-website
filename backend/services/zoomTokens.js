// services/zoomTokens.js
const axios = require('axios');
const qs = require('querystring');

let cachedZoomToken = null;
let cachedZoomTokenExp = 0; // epoch seconds

async function getZoomAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedZoomToken && now < cachedZoomTokenExp - 60) return cachedZoomToken;

  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId  = process.env.ZOOM_S2S_CLIENT_ID;
  const clientSecret = process.env.ZOOM_S2S_CLIENT_SECRET;
  if (!accountId || !clientId || !clientSecret) {
    throw new Error('Missing Zoom S2S env: ZOOM_ACCOUNT_ID / ZOOM_S2S_CLIENT_ID / ZOOM_S2S_CLIENT_SECRET');
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const resp = await axios.post(
    'https://zoom.us/oauth/token',
    qs.stringify({ grant_type: 'account_credentials', account_id: accountId }),
    { headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
  );

  cachedZoomToken = resp.data.access_token;
  cachedZoomTokenExp = now + (resp.data.expires_in || 3600);
  return cachedZoomToken;
}

module.exports = { getZoomAccessToken };
