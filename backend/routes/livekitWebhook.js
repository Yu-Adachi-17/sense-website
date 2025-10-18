const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const WEBHOOK_SECRET = process.env.LIVEKIT_WEBHOOK_SECRET || '';

function verifySignature(rawBody, headers) {
  if (!WEBHOOK_SECRET) return true;
  const sig = headers['lk-signature'];
  if (!sig) return false;
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(rawBody || '');
  return sig === hmac.digest('hex');
}

router.post('/livekit/webhook', (req, res) => {
  try {
    if (!verifySignature(req._rawBody, req.headers)) {
      return res.status(401).json({ error: 'invalid signature' });
    }
    const { event, data } = req.body || {};
    console.log('[LiveKitWebhook]', event, JSON.stringify(data || {}, null, 2));
    res.json({ ok: true });
  } catch (e) {
    console.error('[LiveKitWebhook] error', e);
    res.status(500).json({ error: 'webhook handler failed' });
  }
});

module.exports = router; // ←これが超重要
