// services/mailgunService.js

const axios = require('axios');
const { getProductName } = require('./productName');

// ---- Env ----
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY || null;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || null;

// 「環境変数にフル表記が来ていた場合」は、アドレスだけ抜き取る
const RAW_MAILGUN_FROM =
  process.env.MAILGUN_FROM || 'Minutes.AI <no-reply@mg.sense-ai.world>';

function extractAddress(fromHeader) {
  const m = String(fromHeader || '').match(/<(.*)>/);
  return m ? m[1] : String(fromHeader || '');
}

const MAILGUN_FROM_ADDRESS = extractAddress(RAW_MAILGUN_FROM);

// locale ごとに "議事録AI <no-reply@...>" のような from を作る
function buildLocalizedFrom(locale) {
  const productName = getProductName(locale); // ja → 議事録AI, da → Referat AI
  return `${productName} <${MAILGUN_FROM_ADDRESS}>`;
}

// Mailgun Basic 認証ヘッダー生成
function buildMailgunAuthHeader() {
  if (!MAILGUN_API_KEY) {
    throw new Error('MAILGUN_API_KEY is not set.');
  }
  const token = Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64');
  return `Basic ${token}`;
}

function isMailgunConfigured() {
  return !!(MAILGUN_API_KEY && MAILGUN_DOMAIN);
}

/**
 * sendMinutesEmail: Mailgun 経由で議事録メールを送信するヘルパー
 * params = { to, subject, text, html, locale }
 */
async function sendMinutesEmail(params) {
  if (!isMailgunConfigured()) {
    throw new Error('Mailgun is not configured (missing API key or domain).');
  }

  const { to, subject, text, html, locale } = params || {};
  if (!to) throw new Error('"to" is required.');

  const fromHeader = buildLocalizedFrom(locale || 'en');

  const url = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;
  const body = new URLSearchParams();

  body.append('from', fromHeader);
  body.append('to', to);
  body.append('subject', subject || 'Your minutes from Minutes.AI');
  body.append('text', text || '');
  if (html) body.append('html', html);

  const headers = {
    Authorization: buildMailgunAuthHeader(),
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  console.log(`[MAILGUN] Sending minutes email from=${fromHeader} to=${to}`);

  try {
    const resp = await axios.post(url, body.toString(), { headers });
    console.log('[MAILGUN] Response status:', resp.status, resp.data);
    return resp.data;
  } catch (err) {
    console.error('[MAILGUN] Failed to send email:', err.response?.data || err.message);
    throw new Error('Failed to send minutes email via Mailgun');
  }
}

module.exports = {
  isMailgunConfigured,
  sendMinutesEmail,
};
