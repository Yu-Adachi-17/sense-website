const axios = require('axios');
const { getProductName } = require('../../services/productName');

const DEFAULT_RAW_FROM = 'Minutes.AI <no-reply@mg.sense-ai.world>';

function extractAddress(fromHeader) {
  const m = String(fromHeader).match(/<(.*)>/);
  return m ? m[1] : String(fromHeader);
}

function getMailgunConfig() {
  const apiKey = process.env.MAILGUN_API_KEY || null;
  const domain = process.env.MAILGUN_DOMAIN || null;
  const rawFrom = process.env.MAILGUN_FROM || DEFAULT_RAW_FROM;
  const fromAddress = extractAddress(rawFrom);
  return { apiKey, domain, rawFrom, fromAddress };
}

function isMailgunConfigured() {
  const { apiKey, domain } = getMailgunConfig();
  return !!(apiKey && domain);
}

function buildLocalizedFrom(locale) {
  const { fromAddress } = getMailgunConfig();
  const productName = getProductName(locale);
  return `${productName} <${fromAddress}>`;
}

function buildMailgunAuthHeader() {
  const { apiKey } = getMailgunConfig();
  if (!apiKey) throw new Error('MAILGUN_API_KEY is not set.');
  const token = Buffer.from(`api:${apiKey}`).toString('base64');
  return `Basic ${token}`;
}

/**
 * sendMinutesEmail: Mailgun 経由で議事録メールを送信するヘルパー
 * params = { to, subject, text, html, locale }
 */
async function sendMinutesEmail(params) {
  const { domain } = getMailgunConfig();
  if (!isMailgunConfigured()) {
    throw new Error('Mailgun is not configured (missing API key or domain).');
  }

  const { to, subject, text, html, locale } = params;

  const fromHeader = buildLocalizedFrom(locale || 'en');
  const url = `https://api.mailgun.net/v3/${domain}/messages`;
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
  sendMinutesEmail,
  isMailgunConfigured,
  extractAddress,
  buildLocalizedFrom,
};
