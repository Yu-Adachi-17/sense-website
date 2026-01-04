// routes/slideaiproScreenshotExport.js
const express = require("express");
const puppeteer = require("puppeteer");
const JSZip = require("jszip");
const { PDFDocument } = require("pdf-lib");

const router = express.Router();

// このルート配下だけ巨大JSONを許可（server.js の 2mb を回避している前提）
router.use(express.json({ limit: "80mb" }));

function safeStr(x) {
  return typeof x === "string" ? x : "";
}

function safeNum(x, d) {
  const n = Number(x);
  return Number.isFinite(n) ? n : d;
}

async function slideaiproScreenshotExport(req, res) {
  const format =
    safeStr(req.body?.format || "pdf").toLowerCase() === "png" ? "png" : "pdf";
  const html = safeStr(req.body?.html || "");
  const backgroundColor = safeStr(req.body?.backgroundColor || "#ffffff");
  const deviceScaleFactor = Math.max(
    1,
    Math.min(3, safeNum(req.body?.deviceScaleFactor, 2))
  );

  if (!html || html.length < 100) {
    res.status(400).json({ error: "html is required" });
    return;
  }

  let browser = null;

  try {
browser = await puppeteer.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--no-zygote",
    "--single-process",
  ],
});


    const page = await browser.newPage();

    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor,
    });

    await page.setContent(html, { waitUntil: "networkidle0" });

    await page.evaluate(async (bg) => {
      try {
        document.documentElement.style.background = bg;
        document.body.style.background = bg;
      } catch {}
      try {
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }
      } catch {}
    }, backgroundColor);

    await page.waitForTimeout(120);

    let nodes = await page.$$('[data-slide-page="true"]');
    if (!nodes.length) nodes = await page.$$(".slidePage");
    if (!nodes.length) {
      res.status(400).json({ error: "No slide nodes found" });
      return;
    }

    const pngBuffers = [];
    for (let i = 0; i < nodes.length; i++) {
      const buf = await nodes[i].screenshot({ type: "png" });
      pngBuffers.push(buf);
    }

    if (format === "png") {
      const zip = new JSZip();
      for (let i = 0; i < pngBuffers.length; i++) {
        const name = `slide-${String(i + 1).padStart(2, "0")}.png`;
        zip.file(name, pngBuffers[i]);
      }
      const zipBuf = await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
      });
      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="slides_png.zip"'
      );
      res.status(200).send(zipBuf);
      return;
    }

    const pdf = await PDFDocument.create();
    for (const buf of pngBuffers) {
      const img = await pdf.embedPng(buf);
      const w = img.width;
      const h = img.height;
      const p = pdf.addPage([w, h]);
      p.drawImage(img, { x: 0, y: 0, width: w, height: h });
    }
    const pdfBytes = await pdf.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="slides.pdf"');
    res.status(200).send(Buffer.from(pdfBytes));
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json({ error: "screenshot-export failed", message: String(e?.message || e) });
  } finally {
    try {
      if (browser) await browser.close();
    } catch {}
  }
}

// POST /api/slideaipro/screenshot-export
router.post("/screenshot-export", slideaiproScreenshotExport);

module.exports = router;
