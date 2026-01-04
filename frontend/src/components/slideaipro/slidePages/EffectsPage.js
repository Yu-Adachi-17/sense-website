// src/components/slideaipro/slidePages/EffectsPage.js
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import SlidePageFrame from "./SlidePageFrame";

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Segoe UI", system-ui, sans-serif';

const BASE_W = 1920;
const BASE_H = 1080;

// Proposal/Problem と同一の計測・描画係数
const HEADER_LH = 1.1;
const BULLET_LH = 1.14;
const BOTTOM_LH = 1.1;

const HEADER_LS_BASE = -0.7;
const BULLET_LS_BASE = -0.45;
const BOTTOM_LS_BASE = -0.35;

// Swift: effectBlueGradient 相当（下部メッセージ）
const EFFECT_BLUE_STOPS = [
  [0, "rgba(5, 71, 199, 1.0)"],
  [0.55, "rgba(15, 122, 245, 0.98)"],
  [1, "rgba(26, 199, 235, 0.96)"],
];

// Swift: effectSubBlueGradient 相当（Afterのタイトル・本文）
const EFFECT_SUB_BLUE_STOPS = [
  [0, "rgba(5, 71, 199, 1.0)"],
  [0.55, "rgba(15, 122, 245, 0.98)"],
];

// Swift: effectCheckGreen（=名前はGreenだが実体はブルー）
const EFFECT_CHECK_COLOR = "rgba(5, 71, 199, 1.0)";
const EFFECT_SOLID_BLUE_FALLBACK = "rgba(5, 71, 199, 1.0)";

function normalizeBulletString(raw) {
  let s = String(raw || "");
  s = s.replace(/\u2028|\u2029|\u0085/g, " ");
  s = s.trim().replace(/\s+/g, " ");
  return s;
}

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

// CJK（日本語/中国語/韓国語）判定：N.が相対的に小さく見えるケースにだけ強め補正
function hasCJK(s) {
  const t = String(s || "");
  return /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(t);
}

function setupMeasureBase(node) {
  if (!node) return;
  node.style.position = "absolute";
  node.style.left = "-99999px";
  node.style.top = "-99999px";
  node.style.visibility = "hidden";
  node.style.pointerEvents = "none";
  node.style.whiteSpace = "pre-wrap";
  node.style.wordBreak = "break-word";
  node.style.lineBreak = "strict";
  node.style.textRendering = "geometricPrecision";
  node.style.webkitFontSmoothing = "antialiased";
  node.style.fontKerning = "normal";
  node.style.fontFeatureSettings = '"palt"';
  node.style.fontSynthesis = "none";
  node.style.fontFamily = FONT_FAMILY;
}

function measureTextHeight(node, { text, width, fontSize, fontWeight, lineHeight, letterSpacing, textAlign }) {
  if (!node) return 0;
  setupMeasureBase(node);

  node.style.display = "block";
  node.style.width = `${Math.max(10, Math.floor(width))}px`;
  node.style.fontSize = `${fontSize}px`;
  node.style.fontWeight = `${fontWeight}`;
  node.style.lineHeight = `${lineHeight}`;
  node.style.letterSpacing = `${letterSpacing}px`;
  node.style.textAlign = textAlign || "left";
  node.textContent = text || "";

  return Math.ceil(node.scrollHeight || 0);
}

function measureTextWidth(node, { text, fontSize, fontWeight, letterSpacing }) {
  if (!node) return 0;
  setupMeasureBase(node);

  node.style.display = "inline-block";
  node.style.width = "auto";
  node.style.maxWidth = "none";
  node.style.whiteSpace = "nowrap";
  node.style.wordBreak = "normal";
  node.style.lineBreak = "strict";

  node.style.fontSize = `${fontSize}px`;
  node.style.fontWeight = `${fontWeight}`;
  node.style.lineHeight = "normal";
  node.style.letterSpacing = `${letterSpacing}px`;
  node.textContent = text || "";

  const w = node.getBoundingClientRect?.().width || node.scrollWidth || 0;
  return Math.ceil(w);
}

// ヘッダーを「N.」と「タイトル」に分けた実レイアウトで計測
function measureHeaderHeight(
  node,
  { noText, titleText, width, fontSize, fontWeight, lineHeight, letterSpacing, textAlign, noScale, noGapPx }
) {
  if (!node) return 0;
  setupMeasureBase(node);

  node.style.display = "block";
  node.style.width = `${Math.max(10, Math.floor(width))}px`;
  node.style.fontWeight = `${fontWeight}`;
  node.style.lineHeight = `${lineHeight}`;
  node.style.letterSpacing = `${letterSpacing}px`;
  node.style.textAlign = textAlign || "left";

  node.textContent = "";
  while (node.firstChild) node.removeChild(node.firstChild);

  const spanNo = document.createElement("span");
  spanNo.textContent = String(noText || "");
  spanNo.style.fontSize = `${Math.max(1, fontSize * (noScale || 1))}px`;
  spanNo.style.fontWeight = `${fontWeight}`;
  spanNo.style.lineHeight = `${lineHeight}`;
  spanNo.style.letterSpacing = `${letterSpacing}px`;
  spanNo.style.display = "inline";
  spanNo.style.marginRight = `${Math.max(0, noGapPx || 0)}px`;

  node.appendChild(spanNo);

  if (String(titleText || "").trim()) {
    const spanTitle = document.createElement("span");
    spanTitle.textContent = String(titleText || "");
    spanTitle.style.fontSize = `${fontSize}px`;
    spanTitle.style.fontWeight = `${fontWeight}`;
    spanTitle.style.lineHeight = `${lineHeight}`;
    spanTitle.style.letterSpacing = `${letterSpacing}px`;
    spanTitle.style.display = "inline";
    node.appendChild(spanTitle);
  }

  return Math.ceil(node.scrollHeight || 0);
}

function binarySearchMaxFont({ low, high, fits }) {
  let lo = low;
  let hi = high;
  let best = low;

  while (hi - lo > 0.5) {
    const mid = (lo + hi) * 0.5;
    if (fits(mid)) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return best;
}

function nearlySameFit(a, b) {
  if (!a || !b) return false;
  const keys = Object.keys(a);
  for (const k of keys) {
    const av = a[k];
    const bv = b[k];
    if (typeof av === "number" && typeof bv === "number") {
      if (Math.abs(av - bv) > 0.5) return false;
    } else if (av !== bv) {
      return false;
    }
  }
  return true;
}

// ---- Effects（Before/After）専用：SwiftのBaseMetrics/fit/rowHeights をJSで再現 ----

function effectsBaseMetrics(boxHeight, maxItemCount, scale) {
  let titleSize = clamp(boxHeight * 0.185, 76 * scale, 124 * scale) * 0.9;
  if (maxItemCount >= 3) titleSize *= 0.95;

  const bulletMul = maxItemCount >= 3 ? 0.14 : 0.155;
  let bulletBase = clamp(boxHeight * bulletMul, 46 * scale, 92 * scale);

  let gap = clamp(boxHeight * 0.056, 20 * scale, 34 * scale);
  if (maxItemCount >= 3) gap *= 0.98;

  const leadingInset = 44 * scale;
  const trailingInset = 44 * scale;
  const verticalInset = clamp(boxHeight * 0.07, 22 * scale, 44 * scale);

  return {
    titleSize: Math.floor(titleSize),
    bulletBaseSize: Math.floor(bulletBase),
    gap: Math.floor(gap),
    leadingInset,
    trailingInset,
    verticalInset: Math.floor(verticalInset),
    iconToTextSpacing: 20 * scale,
  };
}

function effectsIconSize(bulletFont, isAfter) {
  const v = bulletFont * (isAfter ? 0.4 : 0.46);
  const lo = isAfter ? 18 : 20;
  const hi = isAfter ? 30 : 34;
  return Math.min(Math.max(Math.floor(v), lo), hi);
}

function cappedHeightForLines(fontSize, lineHeight, maxLines) {
  return Math.ceil(fontSize * lineHeight * maxLines + 0.5);
}

/**
 * ✅ 省略禁止のため「capで切らない」。
 * 行数は fit（フォント縮小）で保証し、rowHeight は実測値を採用する。
 * 端数ズレの安全マージンで +2px。
 */
function measuredTextHeightCapped(node, { text, width, fontSize, fontWeight, lineHeight, letterSpacing, maxLines }) {
  const raw = measureTextHeight(node, {
    text,
    width,
    fontSize,
    fontWeight,
    lineHeight,
    letterSpacing,
    textAlign: "left",
  });
  return Math.ceil(raw + 2);
}

function fitsWithinLines(node, { text, width, fontSize, fontWeight, lineHeight, letterSpacing, maxLines }) {
  if (maxLines === 1) {
    const w = measureTextWidth(node, { text, fontSize, fontWeight, letterSpacing });
    return w <= Math.max(0, width - 2) * 0.99;
  }

  const h = measureTextHeight(node, {
    text,
    width,
    fontSize,
    fontWeight,
    lineHeight,
    letterSpacing,
    textAlign: "left",
  });

  const cap = cappedHeightForLines(fontSize, lineHeight, maxLines);
  return h <= cap - 2;
}

function unifiedBulletFontSize(node, texts, { base, min, width, maxLines, lineHeight, letterSpacing }) {
  const cleaned = (texts || []).map(normalizeBulletString).filter(Boolean);
  if (!cleaned.length) return Math.floor(base);

  const perText = cleaned.map((t) =>
    binarySearchMaxFont({
      low: min,
      high: base,
      fits: (fs) =>
        fitsWithinLines(node, {
          text: t,
          width,
          fontSize: fs,
          fontWeight: 900,
          lineHeight,
          letterSpacing,
          maxLines,
        }),
    })
  );

  return Math.floor((Math.min(...perText) || base) * 0.975);
}

function effectsRowHeightsLayout(node, beforeTexts, afterTexts, { fontSize, beforeWidth, afterWidth, maxLines, lineHeight, letterSpacing }) {
  const b = (beforeTexts || []).map(normalizeBulletString);
  const a = (afterTexts || []).map(normalizeBulletString);
  const paired = Math.min(b.length, a.length);

  const beforeHeights = [];
  const afterHeights = [];

  for (let i = 0; i < paired; i++) {
    const hb = measuredTextHeightCapped(node, {
      text: b[i],
      width: beforeWidth,
      fontSize,
      fontWeight: 900,
      lineHeight,
      letterSpacing,
      maxLines,
    });
    const ha = measuredTextHeightCapped(node, {
      text: a[i],
      width: afterWidth,
      fontSize,
      fontWeight: 900,
      lineHeight,
      letterSpacing,
      maxLines,
    });
    const h = Math.max(hb, ha);
    beforeHeights.push(h);
    afterHeights.push(h);
  }

  for (let i = paired; i < b.length; i++) {
    beforeHeights.push(
      measuredTextHeightCapped(node, {
        text: b[i],
        width: beforeWidth,
        fontSize,
        fontWeight: 900,
        lineHeight,
        letterSpacing,
        maxLines,
      })
    );
  }

  for (let i = paired; i < a.length; i++) {
    afterHeights.push(
      measuredTextHeightCapped(node, {
        text: a[i],
        width: afterWidth,
        fontSize,
        fontWeight: 900,
        lineHeight,
        letterSpacing,
        maxLines,
      })
    );
  }

  return { beforeRowHeights: beforeHeights, afterRowHeights: afterHeights };
}

function approxTitleLineHeightPx(titleFontPx) {
  return Math.ceil(titleFontPx * 1.07);
}

function usedHeightPaired({ titleSize, gap, rowHeights }) {
  const titleH = approxTitleLineHeightPx(titleSize);
  if (!rowHeights || !rowHeights.length) return titleH;

  const rowsH = rowHeights.reduce((s, v) => s + v, 0);
  const gapsBetween = gap * Math.max(rowHeights.length - 1, 0);
  return titleH + gap + rowsH + gapsBetween;
}

function effectsFitSizer(
  node,
  {
    boxHeight,
    base,
    titleSize,
    bulletFont,
    gap,
    vInset,
    beforeTexts,
    afterTexts,
    beforeTextWidth,
    afterTextWidth,
    maxLines,
    lineHeight,
    letterSpacing,
  }
) {
  let t = Math.floor(titleSize);
  let b = Math.floor(bulletFont);
  let g = Math.floor(gap);
  let vi = Math.floor(vInset);

  for (let iter = 0; iter < 10; iter++) {
    const layout = effectsRowHeightsLayout(node, beforeTexts, afterTexts, {
      fontSize: b,
      beforeWidth: beforeTextWidth,
      afterWidth: afterTextWidth,
      maxLines,
      lineHeight,
      letterSpacing,
    });

    const usedBefore = usedHeightPaired({ titleSize: t, gap: g, rowHeights: layout.beforeRowHeights });
    const usedAfter = usedHeightPaired({ titleSize: t, gap: g, rowHeights: layout.afterRowHeights });

    const usedMax = Math.max(usedBefore, usedAfter);
    const available = boxHeight - vi * 2;

    if (usedMax <= available) break;

    t = Math.floor(Math.max(t * 0.94, 60));
    b = Math.floor(Math.max(b * 0.94, 20));
    g = Math.floor(Math.max(g * 0.92, 16));
    vi = Math.floor(Math.max(vi * 0.92, 16));
  }

  const beforeIconSize = effectsIconSize(b, false);
  const afterIconSize = effectsIconSize(b, true);

  const finalLayout = effectsRowHeightsLayout(node, beforeTexts, afterTexts, {
    fontSize: b,
    beforeWidth: beforeTextWidth,
    afterWidth: afterTextWidth,
    maxLines,
    lineHeight,
    letterSpacing,
  });

  const usedBefore = usedHeightPaired({ titleSize: t, gap: g, rowHeights: finalLayout.beforeRowHeights });
  const usedAfter = usedHeightPaired({ titleSize: t, gap: g, rowHeights: finalLayout.afterRowHeights });
  const usedMax = Math.max(usedBefore, usedAfter);

  const available = boxHeight - vi * 2;
  const extra = Math.max(Math.floor(available - usedMax), 0);
  const contentTopExtra = Math.floor(extra * 0.5);
  const contentBottomExtra = Math.floor(extra - contentTopExtra);

  return {
    titleSize: t,
    bulletFont: b,
    gap: g,
    verticalInset: vi,
    beforeIconSize,
    afterIconSize,
    contentTopExtra,
    contentBottomExtra,
    rowLayout: finalLayout,
  };
}

/**
 * ===== export崩れ対策（重要）=====
 * CSSの「background-clip:text」グラデは html-to-image / PDFで “青い矩形” 化しやすい。
 * なので EffectsPage のグラデ箇所はすべて canvas で PNG 化して <img> で描画する。
 */

// ざっくり折返し用（単語境界 + CJK）
function isBreakChar(ch) {
  return ch === " " || ch === "\t" || ch === "、" || ch === "。" || ch === "," || ch === ".";
}

function measureWithLetterSpacing(ctx, s, ls) {
  const t = String(s || "");
  if (!t) return 0;
  if (!ls) return ctx.measureText(t).width;

  let w = 0;
  for (let i = 0; i < t.length; i++) {
    w += ctx.measureText(t[i]).width;
    if (i < t.length - 1) w += ls;
  }
  return w;
}

function wrapTextByWidth(ctx, text, maxW, ls) {
  const raw = String(text || "");
  const paras = raw.split(/\n/);
  const lines = [];

  for (const p of paras) {
    const s = String(p || "");
    if (!s) {
      lines.push("");
      continue;
    }

    let line = "";
    let lastBreakIndex = -1;

    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      const next = line + ch;
      const w = measureWithLetterSpacing(ctx, next, ls);

      if (w <= maxW || !line) {
        line = next;
        if (isBreakChar(ch)) lastBreakIndex = line.length - 1;
        continue;
      }

      if (lastBreakIndex >= 0) {
        const head = line.slice(0, lastBreakIndex + 1).trimEnd();
        const tail = (line.slice(lastBreakIndex + 1) + ch).trimStart();
        lines.push(head);
        line = tail;
        lastBreakIndex = -1;
        for (let k = 0; k < line.length; k++) if (isBreakChar(line[k])) lastBreakIndex = k;
      } else {
        lines.push(line.trimEnd());
        line = ch.trimStart();
        lastBreakIndex = isBreakChar(ch) ? 0 : -1;
      }
    }

    lines.push(line);
  }

  while (lines.length > 1 && lines[lines.length - 1] === "" && lines[lines.length - 2] === "") {
    lines.pop();
  }
  return lines;
}

function drawTextLineLeft(ctx, text, xLeft, baselineY, ls) {
  const s = String(text || "");
  if (!s) return;

  if (!ls) {
    ctx.textAlign = "left";
    ctx.fillText(s, xLeft, baselineY);
    return;
  }

  let x = xLeft;
  ctx.textAlign = "left";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    ctx.fillText(ch, x, baselineY);
    x += ctx.measureText(ch).width + (i < s.length - 1 ? ls : 0);
  }
}

function drawTextLineCentered(ctx, text, centerX, baselineY, ls) {
  const s = String(text || "");
  if (!s) return;

  if (!ls) {
    ctx.textAlign = "center";
    ctx.fillText(s, centerX, baselineY);
    return;
  }

  const totalW = measureWithLetterSpacing(ctx, s, ls);
  let x = centerX - totalW / 2;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    ctx.fillText(ch, x, baselineY);
    x += ctx.measureText(ch).width + (i < s.length - 1 ? ls : 0);
  }
}

function buildGradientTextPngSync({
  text,
  widthPx,
  heightPx,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeightUnit,
  letterSpacingPx,
  dpr,
  gradientStops,
  align = "left",
}) {
  if (typeof document === "undefined") return "";
  const W = Math.max(10, Math.floor(widthPx));
  const H = Math.max(10, Math.floor(heightPx));

  const ratio = clamp(dpr || 1, 1, 2);
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(W * ratio);
  canvas.height = Math.floor(H * ratio);

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const fw = String(fontWeight || 900);
  ctx.font = `${fw} ${Math.max(1, Math.floor(fontSize))}px ${fontFamily || FONT_FAMILY}`;
  ctx.textBaseline = "alphabetic";

  const grad = ctx.createLinearGradient(0, 0, W, H);
  const stops = Array.isArray(gradientStops) && gradientStops.length ? gradientStops : EFFECT_BLUE_STOPS;
  for (const [pos, color] of stops) grad.addColorStop(clamp(Number(pos) || 0, 0, 1), String(color || "#000"));
  ctx.fillStyle = grad;

  const ls = Number.isFinite(letterSpacingPx) ? letterSpacingPx : 0;
  const lh = Math.max(1, (Number.isFinite(lineHeightUnit) ? lineHeightUnit : 1.1) * fontSize);

  const innerPadX = Math.max(0, Math.floor(fontSize * 0.06));
  const innerPadY = Math.max(0, Math.floor(fontSize * 0.06));

  const maxW = Math.max(10, W - innerPadX * 2);
  const lines = wrapTextByWidth(ctx, text, maxW, ls);

  const textBlockH = lines.length * lh;
  const topY = (H - textBlockH) / 2 + innerPadY;

  const base = fontSize * 0.82; // descender吸収
  for (let i = 0; i < lines.length; i++) {
    const y = topY + i * lh + base;
    if (align === "center") drawTextLineCentered(ctx, lines[i], W / 2, y, ls);
    else drawTextLineLeft(ctx, lines[i], innerPadX, y, ls);
  }

  try {
    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
}

export default function EffectsPage({ slide, pageNo, isIntelMode, hasPrefetched }) {
  const rootRef = useRef(null);
  const bodyRef = useRef(null);

  // measure nodes
  const mHeaderRef = useRef(null);
  const mTextRef = useRef(null); // bullets/box
  const mBottomRef = useRef(null);

  const headerNo = useMemo(() => `${pageNo}.`, [pageNo]);
  const headerText = useMemo(() => String(slide?.title || "").trim(), [slide?.title]);
  const bottomMessage = useMemo(() => String(slide?.message || "").trim(), [slide?.message]);

  const beforeItems = useMemo(() => {
    const raw = Array.isArray(slide?.before) ? slide.before : [];
    return raw.map(normalizeBulletString).filter(Boolean).slice(0, 3);
  }, [slide?.before]);

  const afterItems = useMemo(() => {
    const raw = Array.isArray(slide?.after) ? slide.after : [];
    return raw.map(normalizeBulletString).filter(Boolean).slice(0, 3);
  }, [slide?.after]);

  const [fit, setFit] = useState(() => ({
    scale: 1,

    // Proposal/Problem と同一
    hPad: 24,
    headerTopPad: 26,
    headerBottomPad: 10,

    headerNoScale: 1.06,
    headerNoGap: 18,

    headerFont: 64,
    headerLS: HEADER_LS_BASE,
    headerLH: HEADER_LH,

    bottomFont: 56,
    bottomLS: BOTTOM_LS_BASE,
    bottomLH: BOTTOM_LH,
    bottomTopPad: 10,
    bottomBottomPad: 24,

    // 実測（PNG化用）
    contentW: 1200,
    bottomTextH: 60,
    bottomPadTop: 10,
    bottomPadBottom: 24,

    textColor: "#000000",
    phColor: "rgba(0,0,0,0.55)",

    // Effects layout
    efBoxH: 520,
    efSideW: 640,
    efColGap: 56,
    efRightInset: 44,
    efSlant: 64,
    efBleedLeft: 64,

    efTitleFont: 96,
    efBulletFont: 56,
    efRowGap: 26,
    efVInset: 34,
    efLeadInset: 44,
    efTrailInset: 44,
    efIconGap: 20,

    efBeforeIcon: 28,
    efAfterIcon: 24,

    efTopExtra: 0,
    efBottomExtra: 0,

    efBeforeTextW: 420,
    efAfterTextW: 420,

    efMaxLines: 2,
    efBulletLS: 0,

    // row heights (paired)
    efBeforeRowHeights: [],
    efAfterRowHeights: [],
  }));

  // PNG（グラデ箇所はすべてここで管理）
  const [afterTitlePng, setAfterTitlePng] = useState("");
  const [afterTextPngs, setAfterTextPngs] = useState([]);
  const [bottomPng, setBottomPng] = useState("");
  const [bottomPngW, setBottomPngW] = useState(0);
  const [bottomPngH, setBottomPngH] = useState(0);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const recompute = () => {
      const rootEl = rootRef.current;
      const bodyEl = bodyRef.current;
      if (!rootEl || !bodyEl) return;

      const rect = rootEl.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;

      const rawScale = Math.min(W / BASE_W, H / BASE_H);
      const scale = clamp(rawScale, 0.72, 1.35);

      // Proposal/Problem 同一の外枠
      const hPad = Math.round(24 * scale);
      const headerTopPad = Math.round(26 * scale);
      const headerBottomPad = Math.round(10 * scale);

      const headerLS = HEADER_LS_BASE * scale;
      const bottomLS = BOTTOM_LS_BASE * scale;

      const textColor = isIntelMode ? "rgba(245,247,255,0.98)" : "#000000";
      const phColor = isIntelMode ? "rgba(245,247,255,0.62)" : "rgba(0,0,0,0.55)";

      const bodyW = Math.max(10, W - hPad * 2);
      const contentW = bodyW;

      // Header font (Proposal/Problem 同一)
      const cjk = hasCJK(headerText);
      const headerNoScale = cjk ? 1.18 : 1.06;
      const headerNoGap = Math.round((cjk ? 18 : 16) * scale);

      const headerFontTarget = 58 * scale;
      const maxHeaderTextH = Math.min(190 * scale, H * 0.22);

      const headerFont = binarySearchMaxFont({
        low: 42 * scale,
        high: headerFontTarget,
        fits: (fs) => {
          const hText = measureHeaderHeight(mHeaderRef.current, {
            noText: headerNo,
            titleText: headerText,
            width: contentW,
            fontSize: fs,
            fontWeight: 900,
            lineHeight: HEADER_LH,
            letterSpacing: headerLS,
            textAlign: "left",
            noScale: headerNoScale,
            noGapPx: headerNoGap,
          });
          return hText <= maxHeaderTextH;
        },
      });

      // Bottom font (Proposal/Problem 同一)
      const baseBulletFontGuess = 44 * scale;
      const bottomTarget = clamp(baseBulletFontGuess + 22 * scale, 60 * scale, 74 * scale);
      const maxBottomTextH = Math.min(140 * scale, H * 0.14);

      const bottomFont = bottomMessage
        ? binarySearchMaxFont({
            low: bottomTarget * 0.58,
            high: bottomTarget,
            fits: (fs) => {
              const hText = measureTextHeight(mBottomRef.current, {
                text: bottomMessage,
                width: contentW,
                fontSize: fs,
                fontWeight: 900,
                lineHeight: BOTTOM_LH,
                letterSpacing: bottomLS,
                textAlign: "center",
              });
              return hText <= maxBottomTextH;
            },
          })
        : 0;

      const bottomTextH = bottomMessage
        ? measureTextHeight(mBottomRef.current, {
            text: bottomMessage,
            width: contentW,
            fontSize: bottomFont,
            fontWeight: 900,
            lineHeight: BOTTOM_LH,
            letterSpacing: bottomLS,
            textAlign: "center",
          })
        : 0;

      // 先にCSS変数を仮適用 → body高さの実測
      const preVars = {
        "--ppHPad": `${hPad}px`,
        "--ppHeaderTopPad": `${headerTopPad}px`,
        "--ppHeaderBottomPad": `${headerBottomPad}px`,
        "--ppHeaderFont": `${headerFont}px`,
        "--ppHeaderLS": `${headerLS}px`,
        "--ppHeaderLH": `${HEADER_LH}`,
        "--ppHeaderNoScale": `${headerNoScale}`,
        "--ppHeaderNoGap": `${headerNoGap}px`,

        "--ppBottomTopPad": `${Math.round(10 * scale)}px`,
        "--ppBottomBottomPad": `${Math.round(24 * scale)}px`,
        "--ppBottomFont": `${bottomFont}px`,
        "--ppBottomLS": `${bottomLS}px`,
        "--ppBottomLH": `${BOTTOM_LH}`,

        "--ppTextColor": `${textColor}`,
        "--ppPhColor": `${phColor}`,
      };
      for (const [k, v] of Object.entries(preVars)) rootEl.style.setProperty(k, v);

      rootEl.offsetHeight;

      const bodyRect = bodyEl.getBoundingClientRect();
      const bodyH = Math.max(10, bodyRect.height);

      // ---- Effects: GeometryReader 相当 ----
      const efBoxH = Math.floor(Math.min(bodyH * 0.92, 660 * scale));
      const efRightInset = Math.floor(Math.max(bodyW * 0.035, 44 * scale));
      const efColGap = Math.floor(Math.max(bodyW * 0.03, 40 * scale));

      const usableW = Math.max(bodyW - efRightInset, 0);
      const efSideW = Math.floor(Math.max((usableW - efColGap) / 2, 260 * scale));

      const maxCount = Math.max(beforeItems.length, afterItems.length);
      const base = effectsBaseMetrics(efBoxH, maxCount, scale);

      const efBulletLS = BULLET_LS_BASE * scale;

      // 一旦 baseBullet で「1行成立」判定（左右統一）
      const tempBeforeIcon = effectsIconSize(base.bulletBaseSize, false);
      const tempAfterIcon = effectsIconSize(base.bulletBaseSize, true);

      const efIconGap = base.iconToTextSpacing;

      const efBeforeTextW = Math.max(
        efSideW -
          base.leadingInset -
          (base.trailingInset + efSideW * 0.06) -
          (tempBeforeIcon + efIconGap),
        180 * scale
      );

      const efAfterTextW = Math.max(
        efSideW - base.leadingInset - base.trailingInset - (tempAfterIcon + efIconGap),
        180 * scale
      );

      const commonTextW = Math.min(efBeforeTextW, efAfterTextW);

      const oneLineFont = unifiedBulletFontSize(mTextRef.current, [...beforeItems, ...afterItems], {
        base: base.bulletBaseSize,
        min: Math.max(20 * scale, base.bulletBaseSize * 0.64),
        width: commonTextW,
        maxLines: 1,
        lineHeight: BULLET_LH,
        letterSpacing: efBulletLS,
      });
      const twoLineFont = unifiedBulletFontSize(mTextRef.current, [...beforeItems, ...afterItems], {
        base: base.bulletBaseSize,
        min: Math.max(20 * scale, base.bulletBaseSize * 0.64),
        width: commonTextW,
        maxLines: 2,
        lineHeight: BULLET_LH,
        letterSpacing: efBulletLS,
      });
      const minOneLineFont = Math.max(22 * scale, base.bulletBaseSize * 0.52);

      const useOneLine = oneLineFont >= minOneLineFont;
      const maxLines = useOneLine ? 1 : 2;
      const unifiedBulletFont = useOneLine ? oneLineFont : twoLineFont;

      const fitted = effectsFitSizer(mTextRef.current, {
        boxHeight: efBoxH,
        base,
        titleSize: base.titleSize,
        bulletFont: unifiedBulletFont,
        gap: base.gap,
        vInset: base.verticalInset,
        beforeTexts: beforeItems,
        afterTexts: afterItems,
        beforeTextWidth: efBeforeTextW,
        afterTextWidth: efAfterTextW,
        maxLines,
        lineHeight: BULLET_LH,
        letterSpacing: efBulletLS,
      });

      const efSlant = Math.floor(efSideW * 0.1);
      const efBleedLeft = Math.floor(64 * scale);

      const next = {
        scale,

        hPad,
        headerTopPad,
        headerBottomPad,

        headerNoScale,
        headerNoGap,

        headerFont,
        headerLS,
        headerLH: HEADER_LH,

        bottomFont,
        bottomLS,
        bottomLH: BOTTOM_LH,
        bottomTopPad: Math.round(10 * scale),
        bottomBottomPad: Math.round(24 * scale),

        contentW,
        bottomTextH,
        bottomPadTop: Math.round(10 * scale),
        bottomPadBottom: Math.round(24 * scale),

        textColor,
        phColor,

        efBoxH,
        efSideW,
        efColGap,
        efRightInset,
        efSlant,
        efBleedLeft,

        efTitleFont: fitted.titleSize,
        efBulletFont: fitted.bulletFont,
        efRowGap: fitted.gap,
        efVInset: fitted.verticalInset,
        efLeadInset: base.leadingInset,
        efTrailInset: base.trailingInset,
        efIconGap,

        efBeforeIcon: fitted.beforeIconSize,
        efAfterIcon: fitted.afterIconSize,

        efTopExtra: fitted.contentTopExtra,
        efBottomExtra: fitted.contentBottomExtra,

        efBeforeTextW,
        efAfterTextW,

        efBeforeRowHeights: fitted.rowLayout.beforeRowHeights,
        efAfterRowHeights: fitted.rowLayout.afterRowHeights,

        efMaxLines: maxLines,
        efBulletLS,
      };

      setFit((prev) => (nearlySameFit(prev, next) ? prev : next));
    };

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(() => recompute());
    });
    ro.observe(root);

    requestAnimationFrame(() => recompute());
    if (document?.fonts?.ready) {
      document.fonts.ready.then(() => requestAnimationFrame(() => recompute()));
    }

    return () => ro.disconnect();
  }, [headerNo, headerText, bottomMessage, beforeItems.join("\n"), afterItems.join("\n"), isIntelMode]);

  // ===== グラデPNG生成：Afterタイトル / After本文（Strings） / Bottom =====
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    const run = () => {
      if (cancelled) return;

      const dpr = window.devicePixelRatio || 1;

      // After title
      const afterTitleText = "After";
      const titleW = Math.ceil(Math.max(10, (fit.efSideW || 0) - (fit.efLeadInset || 0) - (fit.efTrailInset || 0)));
      const titleH = Math.ceil(Math.max(10, approxTitleLineHeightPx(fit.efTitleFont) + 10));

      const titlePng = buildGradientTextPngSync({
        text: afterTitleText,
        widthPx: titleW,
        heightPx: titleH,
        fontFamily: FONT_FAMILY,
        fontSize: fit.efTitleFont,
        fontWeight: 900,
        lineHeightUnit: 1.05,
        letterSpacingPx: 0,
        dpr,
        gradientStops: EFFECT_SUB_BLUE_STOPS,
        align: "left",
      });

      // After bullets（Strings）
      const rowHeights = Array.isArray(fit.efAfterRowHeights) ? fit.efAfterRowHeights : [];
      const textW = Math.ceil(Math.max(10, fit.efAfterTextW || 0));

      const bulletPngs = afterItems.map((t, i) => {
        const h = Math.ceil(Math.max(10, (rowHeights[i] || 0) + 2));
        return buildGradientTextPngSync({
          text: t,
          widthPx: textW,
          heightPx: h,
          fontFamily: FONT_FAMILY,
          fontSize: fit.efBulletFont,
          fontWeight: 900,
          lineHeightUnit: BULLET_LH,
          letterSpacingPx: fit.efBulletLS || 0,
          dpr,
          gradientStops: EFFECT_SUB_BLUE_STOPS,
          align: "left",
        });
      });

      // Bottom
      let bottom = "";
      let bw = 0;
      let bh = 0;
      if (bottomMessage && fit.bottomFont > 0) {
        bw = Math.ceil(Math.max(10, fit.contentW || 1200));
        // パディング分も含めて “見た目の中心” を崩さない
        bh = Math.ceil(Math.max(10, (fit.bottomTextH || 0) + 8 * (fit.scale || 1)));

        bottom = buildGradientTextPngSync({
          text: bottomMessage,
          widthPx: bw,
          heightPx: bh,
          fontFamily: FONT_FAMILY,
          fontSize: fit.bottomFont,
          fontWeight: 900,
          lineHeightUnit: BOTTOM_LH,
          letterSpacingPx: fit.bottomLS || 0,
          dpr,
          gradientStops: EFFECT_BLUE_STOPS,
          align: "center",
        });
      }

      if (cancelled) return;

      setAfterTitlePng(titlePng || "");
      setAfterTextPngs(Array.isArray(bulletPngs) ? bulletPngs : []);
      setBottomPng(bottom || "");
      setBottomPngW(bw || 0);
      setBottomPngH(bh || 0);
    };

    // 先に即実行、フォント準備後にもう一度（WebFont確定）
    run();
    if (document?.fonts?.ready) {
      Promise.resolve(document.fonts.ready)
        .then(() => requestAnimationFrame(run))
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [
    afterItems.join("\n"),
    bottomMessage,
    fit.efTitleFont,
    fit.efBulletFont,
    fit.efBulletLS,
    fit.efAfterTextW,
    JSON.stringify(fit.efAfterRowHeights || []),
    fit.bottomFont,
    fit.bottomLS,
    fit.bottomTextH,
    fit.contentW,
    fit.scale,
  ]);

  const beforeRowHeights = fit.efBeforeRowHeights || [];
  const afterRowHeights = fit.efAfterRowHeights || [];

  // export側が待てるように（任意）
  const renderReady =
    !!afterTitlePng &&
    afterTextPngs.length === afterItems.length &&
    (!!bottomMessage ? !!bottomPng : true);

  return (
    <SlidePageFrame pageNo={pageNo} isIntelMode={isIntelMode} hasPrefetched={hasPrefetched} footerRight="">
      <div
        ref={rootRef}
        className="ppRoot efRoot"
        data-render-ready={renderReady ? "1" : "0"}
        style={{
          "--ppHPad": `${fit.hPad}px`,
          "--ppHeaderTopPad": `${fit.headerTopPad}px`,
          "--ppHeaderBottomPad": `${fit.headerBottomPad}px`,
          "--ppHeaderFont": `${fit.headerFont}px`,
          "--ppHeaderLS": `${fit.headerLS}px`,
          "--ppHeaderLH": `${fit.headerLH}`,
          "--ppHeaderNoScale": `${fit.headerNoScale}`,
          "--ppHeaderNoGap": `${fit.headerNoGap}px`,

          "--ppBottomTopPad": `${fit.bottomTopPad}px`,
          "--ppBottomBottomPad": `${fit.bottomBottomPad}px`,
          "--ppBottomFont": `${fit.bottomFont}px`,
          "--ppBottomLS": `${fit.bottomLS}px`,
          "--ppBottomLH": `${fit.bottomLH}`,

          "--ppContentW": `${Math.floor(fit.contentW || 1200)}px`,
          "--ppBottomTextH": `${Math.floor(Math.max(0, fit.bottomTextH || 0))}px`,

          "--ppTextColor": `${fit.textColor}`,
          "--ppPhColor": `${fit.phColor}`,

          "--efBoxH": `${fit.efBoxH}px`,
          "--efSideW": `${fit.efSideW}px`,
          "--efColGap": `${fit.efColGap}px`,
          "--efRightInset": `${fit.efRightInset}px`,
          "--efSlant": `${fit.efSlant}px`,
          "--efBleedLeft": `${fit.efBleedLeft}px`,

          "--efTitleFont": `${fit.efTitleFont}px`,
          "--efBulletFont": `${fit.efBulletFont}px`,
          "--efRowGap": `${fit.efRowGap}px`,
          "--efVInset": `${fit.efVInset}px`,
          "--efLeadInset": `${fit.efLeadInset}px`,
          "--efTrailInset": `${fit.efTrailInset}px`,
          "--efIconGap": `${fit.efIconGap}px`,

          "--efBeforeIcon": `${fit.efBeforeIcon}px`,
          "--efAfterIcon": `${fit.efAfterIcon}px`,

          "--efTopExtra": `${fit.efTopExtra}px`,
          "--efBottomExtra": `${fit.efBottomExtra}px`,

          "--efAfterTextW": `${fit.efAfterTextW}px`,
          "--efMaxLines": `${fit.efMaxLines || 2}`,
          "--efBulletLS": `${fit.efBulletLS || 0}px`,
        }}
      >
        <div className="ppMain">
          <div className="ppHeader">
            <div className="ppTitle">
              <span className="ppTitleNo">{headerNo}</span>
              {headerText ? <span className="ppTitleText">{headerText}</span> : null}
            </div>
          </div>

          <div ref={bodyRef} className="ppBody efBody">
            <div className="efStage">
              <div className="efCol efBeforeCol">
                <div className="efBeforeBg" aria-hidden="true" />
                <div className="efBoxInner efBeforeInner">
                  <div className="efBoxTitle efBeforeTitle">Before</div>

                  <div className="efList">
                    {beforeItems.map((t, i) => (
                      <div
                        key={`${slide?.id || "slide"}-ef-b-${i}`}
                        className="efRow"
                        style={{
                          minHeight: beforeRowHeights[i] ? `${beforeRowHeights[i]}px` : undefined,
                        }}
                      >
                        <span className="efIcon efIconBefore" aria-hidden="true" />
                        <span className="efBulletText efBeforeText">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="efCol efAfterCol">
                <div className="efBoxInner efAfterInner">
                  <div className="efBoxTitle efAfterTitle">
                    {afterTitlePng ? (
                      <img className="efTitleImg" src={afterTitlePng} alt="" aria-hidden="true" />
                    ) : (
                      <span className="efAfterFallbackTitle">After</span>
                    )}
                  </div>

                  <div className="efList">
                    {afterItems.map((t, i) => (
                      <div
                        key={`${slide?.id || "slide"}-ef-a-${i}`}
                        className="efRow"
                        style={{
                          minHeight: afterRowHeights[i] ? `${afterRowHeights[i]}px` : undefined,
                        }}
                      >
                        <span className="efIcon efIconAfter" aria-hidden="true" />
                        <span className="efBulletText efAfterText">
                          {afterTextPngs[i] ? (
                            <img className="efAfterTextImg" src={afterTextPngs[i]} alt="" aria-hidden="true" />
                          ) : (
                            <span className="efAfterFallbackText">{t}</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="efSpacer" aria-hidden="true" />
            </div>
          </div>

          {bottomMessage ? (
            <div className="ppBottom">
              {bottomPng ? (
                <img
                  className="ppBottomImg"
                  src={bottomPng}
                  alt=""
                  aria-hidden="true"
                  style={{
                    width: bottomPngW ? `${bottomPngW}px` : "var(--ppContentW)",
                    height: bottomPngH ? `${bottomPngH}px` : "auto",
                  }}
                />
              ) : (
                <div className="ppBottomFallback">{bottomMessage}</div>
              )}
            </div>
          ) : (
            <div className="ppBottomEmpty" />
          )}
        </div>

        {/* measure nodes */}
        <div ref={mHeaderRef} className="ppMeasure" />
        <div ref={mTextRef} className="ppMeasure" />
        <div ref={mBottomRef} className="ppMeasure" />

        <style jsx>{`
          .ppRoot {
            width: 100%;
            height: 100%;
            overflow: hidden;
            font-family: ${FONT_FAMILY};
            text-rendering: geometricPrecision;
            -webkit-font-smoothing: antialiased;
            font-synthesis: none;
            font-feature-settings: "palt";
          }

          .ppMain {
            width: 100%;
            height: 100%;
            padding: 0 var(--ppHPad);
            box-sizing: border-box;
            display: grid;
            grid-template-rows: auto minmax(0, 1fr) auto;
            min-height: 0;
          }

          .ppHeader {
            padding-top: var(--ppHeaderTopPad);
            padding-bottom: var(--ppHeaderBottomPad);
          }

          .ppTitle {
            font-weight: 900;
            line-height: var(--ppHeaderLH);
            letter-spacing: var(--ppHeaderLS);
            color: var(--ppTextColor);
            white-space: pre-wrap;
            word-break: break-word;
            line-break: strict;
          }

          .ppTitleNo {
            font-size: calc(var(--ppHeaderFont) * var(--ppHeaderNoScale));
            margin-right: var(--ppHeaderNoGap);
          }

          .ppTitleText {
            font-size: var(--ppHeaderFont);
          }

          .ppBody {
            min-height: 0;
            height: 100%;
            overflow: hidden;
            box-sizing: border-box;
          }

          /* Effects body */
          .efBody {
            display: flex;
            align-items: flex-start;
            justify-content: flex-start;
            overflow: visible;
          }

          .efStage {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: flex-start;
            justify-content: flex-start;
            gap: var(--efColGap);
          }

          .efCol {
            width: var(--efSideW);
            height: var(--efBoxH);
            min-width: 0;
            position: relative;
          }

          .efSpacer {
            width: var(--efRightInset);
            flex: 0 0 auto;
          }

          /* Before background (slanted, grey) */
          .efBeforeBg {
            position: absolute;
            top: 0;
            bottom: 0;

            left: calc(-1 * var(--ppHPad));
            width: calc(100% + var(--ppHPad));

            background: linear-gradient(
              135deg,
              rgba(0, 0, 0, 0.55) 0%,
              rgba(0, 0, 0, 0.45) 55%,
              rgba(0, 0, 0, 0.35) 100%
            );

            clip-path: polygon(
              0% 0%,
              100% 0%,
              calc(100% - var(--efSlant)) 100%,
              0% 100%
            );
          }

          .efBeforeBg::after {
            content: "";
            position: absolute;
            inset: 0;
            border: 1px solid rgba(255, 255, 255, 0.1);
            clip-path: polygon(
              0% 0%,
              100% 0%,
              calc(100% - var(--efSlant)) 100%,
              0% 100%
            );
            pointer-events: none;
          }

          .efBoxInner {
            position: relative;
            width: 100%;
            height: 100%;
            box-sizing: border-box;

            padding-top: calc(var(--efVInset) + var(--efTopExtra));
            padding-bottom: calc(var(--efVInset) + var(--efBottomExtra));
            padding-left: var(--efLeadInset);
            padding-right: var(--efTrailInset);

            display: flex;
            flex-direction: column;
            gap: var(--efRowGap);
            overflow: hidden;
          }

          /* Before: 右側だけ少し余白を足す（Swift: trailingInset + sideW*0.06） */
          .efBeforeInner {
            padding-right: calc(var(--efTrailInset) + (var(--efSideW) * 0.06));
          }

          .efBoxTitle {
            font-size: var(--efTitleFont);
            font-weight: 900;
            line-height: 1.05;
            letter-spacing: 0px;
            white-space: nowrap;
            overflow: visible;
            text-overflow: clip;
            display: block;
          }

          .efBeforeTitle {
            color: rgba(255, 255, 255, 0.98);
          }

          .efAfterTitle {
            /* グラデはPNG化して<img>で描画（CSSグラデ禁止） */
            color: ${EFFECT_SOLID_BLUE_FALLBACK};
          }

          .efTitleImg {
            display: block;
            width: 100%;
            height: auto;
          }

          .efAfterFallbackTitle {
            color: ${EFFECT_SOLID_BLUE_FALLBACK};
          }

          .efList {
            display: flex;
            flex-direction: column;
            gap: var(--efRowGap);
            min-height: 0;
          }

          .efRow {
            display: flex;
            align-items: center;
            gap: var(--efIconGap);
            min-width: 0;
          }

          .efIcon {
            flex: 0 0 auto;
            position: relative;
            display: inline-block;
          }

          /* Before icon: xmark.circle.fill の見え方に寄せる（白い円 + 暗めの×） */
          .efIconBefore {
            width: var(--efBeforeIcon);
            height: var(--efBeforeIcon);
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.88);
          }

          .efIconBefore::before,
          .efIconBefore::after {
            content: "";
            position: absolute;
            left: 50%;
            top: 50%;
            width: 62%;
            height: 10%;
            background: rgba(0, 0, 0, 0.38);
            transform-origin: center;
            border-radius: 999px;
          }

          .efIconBefore::before {
            transform: translate(-50%, -50%) rotate(45deg);
          }

          .efIconBefore::after {
            transform: translate(-50%, -50%) rotate(-45deg);
          }

          /* After icon: checkmark.circle.fill（青い円 + 白いチェック） */
          .efIconAfter {
            width: var(--efAfterIcon);
            height: var(--efAfterIcon);
            border-radius: 999px;
            background: ${EFFECT_CHECK_COLOR};
          }

          .efIconAfter::before {
            content: "";
            position: absolute;
            left: 50%;
            top: 52%;
            width: 52%;
            height: 28%;
            border-left: calc(var(--efAfterIcon) * 0.14) solid rgba(255, 255, 255, 0.96);
            border-bottom: calc(var(--efAfterIcon) * 0.14) solid rgba(255, 255, 255, 0.96);
            transform: translate(-50%, -50%) rotate(-45deg);
            border-radius: 2px;
          }

          .efBulletText {
            font-size: var(--efBulletFont);
            font-weight: 900;
            line-height: ${BULLET_LH};
            letter-spacing: var(--efBulletLS);
            min-width: 0;

            display: block;
            white-space: normal;
            word-break: break-word;
            line-break: strict;

            overflow: visible;
            text-overflow: clip;
          }

          .efBeforeText {
            color: rgba(255, 255, 255, 0.92);
          }

          .efAfterText {
            /* CSSグラデ禁止（PNG化して<img>で描画） */
            color: ${EFFECT_SOLID_BLUE_FALLBACK};
          }

          .efAfterTextImg {
            display: block;
            width: var(--efAfterTextW);
            height: 100%;
            max-width: 100%;
            object-fit: contain;
            image-rendering: auto;
          }

          .efAfterFallbackText {
            color: ${EFFECT_SOLID_BLUE_FALLBACK};
          }

          .ppBottom {
            padding-top: var(--ppBottomTopPad);
            padding-bottom: var(--ppBottomBottomPad);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .ppBottomImg {
            max-width: 100%;
            display: block;
            object-fit: contain;
            image-rendering: auto;
          }

          .ppBottomFallback {
            font-size: var(--ppBottomFont);
            font-weight: 900;
            line-height: var(--ppBottomLH);
            letter-spacing: var(--ppBottomLS);
            text-align: center;
            white-space: pre-wrap;
            word-break: break-word;
            line-break: strict;
            color: ${EFFECT_SOLID_BLUE_FALLBACK};
          }

          .ppBottomEmpty {
            padding-bottom: var(--ppBottomBottomPad);
          }

          .ppMeasure {
            position: absolute;
            left: -99999px;
            top: -99999px;
            visibility: hidden;
            pointer-events: none;
          }
        `}</style>
      </div>
    </SlidePageFrame>
  );
}
