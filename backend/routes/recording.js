// routes/recording.js
const express = require('express');
const { presign } = require('../services/s3Presign');
const router = express.Router();

router.get('/recordings/url', async (req, res) => {
  const { date, roomName, file } = req.query;
  if (!date || !roomName || !file) return res.status(400).json({ error: 'date, roomName, file required' });
  const key = `minutes/${date}/${roomName}/${file}`;
  const url = await presign({ key, expiresIn: 3600 });
  res.json({ url });
});

module.exports = router;
