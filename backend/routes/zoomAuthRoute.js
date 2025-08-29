// routes/zoomAuthRoute.js
const express = require('express');
const { issueZoomSdkJwt } = require('../lib/zoomAuth');

const router = express.Router();

router.post('/zoom/sdk-jwt', (req, res) => {
  const hdr = req.headers['x-internal-token']; // header名は小文字で参照
  if (!hdr || hdr !== process.env.ZOOM_JWT_ROUTE_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    const token = issueZoomSdkJwt();
    return res.json({ token, expiresInSec: 300 });
  } catch (e) {
    console.error('[zoom/sdk-jwt] error', e);
    return res.status(500).json({ error: 'failed_to_issue_sdk_jwt' });
  }
});

module.exports = router;
