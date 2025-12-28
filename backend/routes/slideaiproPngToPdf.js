"use strict";

const express = require("express");
const { PDFDocument } = require("pdf-lib");

const router = express.Router();

function dataUrlToBuffer(dataUrl) {
  if (typeof dataUrl !== "string") throw new Error("page is not a string");

  const s = dataUrl.trim();
  const m = s.match(/^data:(image\/png|image\/jpeg);base64,(.+)$/i);
  if (!m) throw new Error("invalid dataUrl");

  const mime = (m[1] || "").toLowerCase();
  const buf = Buffer.from(m[2], "base64");
  if (!buf.length) throw new Error("empty image buffer");

  return { mime, buf };
}

// ★ server.js 側で app.use("/api/slideaipro", ...) する前提
// → 実URLは /api/slideaipro/png-to-pdf
router.post(
  "/png-to-pdf",
  express.json({ limit: "80mb" }),
  async (req, res) => {
    try {
      const pages = req?.body?.pages;

      if (!Array.isArray(pages) || pages.length === 0) {
        return res.status(400).json({ error: "pages must be a non-empty array" });
      }
      if (pages.length > 30) {
        return res.status(400).json({ error: "too many pages (max 30)" });
      }

      const pdf = await PDFDocument.create();

      for (let i = 0; i < pages.length; i++) {
        const { mime, buf } = dataUrlToBuffer(pages[i]);

        let embedded;
        if (mime === "image/png") embedded = await pdf.embedPng(buf);
        else if (mime === "image/jpeg") embedded = await pdf.embedJpg(buf);
        else throw new Error(`unsupported mime: ${mime}`);

        const w = embedded.width;
        const h = embedded.height;

        const page = pdf.addPage([w, h]);
        page.drawImage(embedded, { x: 0, y: 0, width: w, height: h });
      }

      const bytes = await pdf.save();
      const out = Buffer.from(bytes);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'attachment; filename="slides.pdf"');
      return res.status(200).send(out);
    } catch (e) {
      console.error("png-to-pdf error:", e);
      return res.status(500).json({ error: String(e?.message || e) });
    }
  }
);

module.exports = router;
