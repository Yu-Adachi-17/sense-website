// routes/recordings.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '..', 'data', 'egress-events.json');
const S3_REGION = process.env.EGRESS_S3_REGION;
const S3_BUCKET = process.env.EGRESS_S3_BUCKET;
const S3_ENDPOINT = process.env.EGRESS_S3_ENDPOINT || undefined;
const s3 = new S3Client({ region: S3_REGION, endpoint: S3_ENDPOINT });

function loadDB() {
  if (!fs.existsSync(DATA_FILE)) return { events: [], byRoomName: {}, byEgressId: {} };
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

router.get('/recordings/last', async (req, res) => {
  try {
    const roomName = String(req.query.roomName || '');
    if (!roomName) return res.status(400).json({ error: 'missing roomName' });

    const db = loadDB();
    const summary = db.byRoomName[roomName];
    if (!summary || !Array.isArray(summary.files) || summary.files.length === 0) {
      return res.status(404).json({ error: 'no file for room' });
    }

    const key = summary.files[0].filename; // ← egress_ended の filename
    const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
    res.json({ roomName, key, url });
  } catch (e) {
    console.error('[recordings/last]', e);
    res.status(500).json({ error: 'failed', details: e.message });
  }
});

module.exports = router;
