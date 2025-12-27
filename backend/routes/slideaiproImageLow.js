// routes/slideaiproImageLow.js
"use strict";

const express = require("express");
const router = express.Router();

const { generateLowImages } = require("../services/slideAiProImageLow");

/**
 * POST /api/slideaipro/image-low
 *
 * Single:
 * { "cacheKey": "...", "prompt": "...", "model?": "...", "quality?": "low", "output_format?": "png" }
 *
 * Batch:
 * { "items": [{ "cacheKey": "...", "prompt": "..." }, ...], "model?": "...", ... }
 */
router.post("/image-low", async (req, res) => {
  try {
    const body = req.body || {};
    const items = Array.isArray(body.items)
      ? body.items
      : [{ cacheKey: body.cacheKey, prompt: body.prompt }];

    // 乱暴な大量投げを防ぐ（必要になったら増やす）
    if (items.length > 8) {
      return res.status(400).json({ error: "Too many items (max 8)" });
    }

    const opts = {
      model: body.model, // defaultはservice側
      quality: body.quality, // "low" 推奨
      size: body.size, // "1024x1024" 推奨
      output_format: body.output_format, // "png" 推奨
      output_compression: body.output_compression, // 0-100（webp/jpegの時に効く）
    };

    const results = await generateLowImages(items, opts);

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      ok: true,
      results,
    });
  } catch (e) {
    console.error("[slideaipro/image-low] error:", e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Internal Server Error",
    });
  }
});

module.exports = router;
