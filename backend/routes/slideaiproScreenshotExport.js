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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function slideaiproScreenshotExport(req, res) {
  const format =
    safeStr(req.body?.format || "pdf").toLowerCase() === "png" ? "png" : "pdf";
  const html = safeStr(req.body?.html || "");
  const backgroundColor = safeStr(req.body?.backgroundColor || "#ffffff");

  // 1〜3（PNGの解像度用）。PDFページサイズは常に 1920x1080 に固定して描画します。
  const deviceScaleFactor = Math.max(
    1,
    Math.min(3, safeNum(req.body?.deviceScaleFactor, 2))
  );

  if (!html || html.length < 100) {
    res.status(400).json({ error: "html is required" });
    return;
  }

  const SLIDE_W = 1920;
  const SLIDE_H = 1080;

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
    page.setDefaultTimeout(60000);

    await page.setViewport({
      width: SLIDE_W,
      height: SLIDE_H,
      deviceScaleFactor,
    });

    // HTMLを流し込み（外部アクセスが絡む場合に networkidle0 が詰まるケースがあるので networkidle2）
    await page.setContent(html, { waitUntil: "networkidle2" });

    // 背景 & フォント待ち
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

    // Export用の強制CSS（プレビュー用のscale/zoom/余計な余白/アニメーションを潰す）
    await page.addStyleTag({
      content: `
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: ${SLIDE_W}px !important;
          height: ${SLIDE_H}px !important;
          overflow: hidden !important;
          background: ${backgroundColor} !important;
        }
        * {
          animation: none !important;
          transition: none !important;
          caret-color: transparent !important;
        }
        /* よくある「プレビュー縮小」を無効化する（親も含めて効かせる） */
        .slideScale, .deckScale, .previewScale, .scaleWrap, .slidePreviewWrap {
          transform: none !important;
          zoom: 1 !important;
        }
        [data-slide-page="true"], .slidePage {
          transform: none !important;
          zoom: 1 !important;
          width: ${SLIDE_W}px !important;
          height: ${SLIDE_H}px !important;
          margin: 0 !important;
        }
      `,
    });

    // 1拍おいてレイアウトを安定させる
    await sleep(120);

    // スライドノード収集
    let nodes = await page.$$('[data-slide-page="true"]');
    if (!nodes.length) nodes = await page.$$(".slidePage");
    if (!nodes.length) {
      res.status(400).json({ error: "No slide nodes found" });
      return;
    }

    // 「そのままスクショ」を満たすための撮り方：
    // - 対象スライドだけを表示
    // - position: fixed で 0,0 に固定
    // - transform を強制解除
    // - ページ全体を clip(0,0,1920,1080) で撮影
    const pngBuffers = [];

    for (let i = 0; i < nodes.length; i++) {
      await page.evaluate(
        (index, w, h) => {
          const primary = Array.from(document.querySelectorAll('[data-slide-page="true"]'));
          const fallback = Array.from(document.querySelectorAll(".slidePage"));

          // どちらかに揃える（primary があればそれ優先）
          const slides = primary.length ? primary : fallback;

          for (let j = 0; j < slides.length; j++) {
            const el = slides[j];

            if (j === index) {
              el.style.display = "block";
              el.style.visibility = "visible";
              el.style.position = "fixed";
              el.style.left = "0";
              el.style.top = "0";
              el.style.right = "auto";
              el.style.bottom = "auto";
              el.style.margin = "0";
              el.style.width = `${w}px`;
              el.style.height = `${h}px`;
              el.style.transform = "none";
              el.style.zoom = "1";
              el.style.transformOrigin = "top left";
              el.style.overflow = "hidden";
            } else {
              el.style.display = "none";
              el.style.visibility = "hidden";
            }
          }

          // ついでに body も固定
          document.body.style.width = `${w}px`;
          document.body.style.height = `${h}px`;
          document.body.style.overflow = "hidden";
        },
        i,
        SLIDE_W,
        SLIDE_H
      );

      // レイアウト安定待ち
      await sleep(60);

      const buf = await page.screenshot({
        type: "png",
        clip: { x: 0, y: 0, width: SLIDE_W, height: SLIDE_H },
        omitBackground: false,
      });

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
      res.setHeader("Content-Disposition", 'attachment; filename="slides_png.zip"');
      res.status(200).send(zipBuf);
      return;
    }

    // PDF：
    // - ページサイズを必ず 1920x1080 に固定
    // - 画像は等倍で貼る（deviceScaleFactorで解像度が上がっても見た目は変えない）
    const pdf = await PDFDocument.create();
    for (const buf of pngBuffers) {
      const img = await pdf.embedPng(buf);

      const p = pdf.addPage([SLIDE_W, SLIDE_H]);
      p.drawImage(img, {
        x: 0,
        y: 0,
        width: SLIDE_W,
        height: SLIDE_H,
      });
    }

    const pdfBytes = await pdf.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="slides.pdf"');
    res.status(200).send(Buffer.from(pdfBytes));
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: "screenshot-export failed",
      message: String(e?.message || e),
    });
  } finally {
    try {
      if (browser) await browser.close();
    } catch {}
  }
}

// POST /api/slideaipro/screenshot-export
router.post("/screenshot-export", slideaiproScreenshotExport);

module.exports = router;
