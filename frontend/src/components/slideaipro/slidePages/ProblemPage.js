// src/components/slideaipro/slidePages/ProblemPage.js
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import SlidePageFrame from "./SlidePageFrame";
import { resolveImageSrc } from "../utils/resolveImageSrc";

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Segoe UI", system-ui, sans-serif';

const BASE_W = 1920;
const BASE_H = 1080;

// 計測と描画を一致させる定数
const HEADER_LH = 1.1;
const BULLET_LH = 1.14;
const BOTTOM_LH = 1.1;

const HEADER_LS_BASE = -0.7;
const BULLET_LS_BASE = -0.45;
const BOTTOM_LS_BASE = -0.35;

function normalizeBulletString(raw) {
  let s = String(raw || "");
  s = s.replace(/\u2028|\u2029|\u0085/g, " ");
  s = s.trim().replace(/\s+/g, " ");
  return s;
}

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

function problemsBaseFont(count) {
  switch (count) {
    case 1:
      return 58;
    case 2:
      return 54;
    case 3:
      return 50;
    case 4:
      return 46;
    default:
      return 44;
  }
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

function measureTextHeight(
  node,
  { text, width, fontSize, fontWeight, lineHeight, letterSpacing, textAlign }
) {
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

function measureBulletsHeight(
  node,
  { items, width, fontSize, fontWeight, lineHeight, letterSpacing, rowGap }
) {
  if (!node) return 0;
  setupMeasureBase(node);

  node.style.display = "flex";
  node.style.flexDirection = "column";
  node.style.rowGap = `${rowGap}px`;
  node.style.width = `${Math.max(10, Math.floor(width))}px`;
  node.style.fontSize = `${fontSize}px`;
  node.style.fontWeight = `${fontWeight}`;
  node.style.lineHeight = `${lineHeight}`;
  node.style.letterSpacing = `${letterSpacing}px`;
  node.style.textAlign = "left";

  node.textContent = "";
  for (const s of items) {
    const d = document.createElement("div");
    d.textContent = s;
    node.appendChild(d);
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

export default function ProblemPage({ slide, pageNo, isIntelMode, hasPrefetched, imageUrlByKey }) {
  const rootRef = useRef(null);
  const bodyRef = useRef(null);

  // measure nodes
  const mHeaderRef = useRef(null);
  const mBulletsRef = useRef(null);
  const mBottomRef = useRef(null);

  const cacheKey = String(slide?.image?.cacheKey || "");
  const originalSrc = String(slide?.image?.originalSrc || "");
  const resolvedSrc = resolveImageSrc(imageUrlByKey, cacheKey, originalSrc);

  const headerTitle = useMemo(() => {
    const t = String(slide?.title || "").trim();
    return `${pageNo}. ${t}`.trim();
  }, [pageNo, slide?.title]);

  const bottomMessage = useMemo(() => String(slide?.message || "").trim(), [slide?.message]);

  const problems = useMemo(() => {
    const bulletsRaw = Array.isArray(slide?.bullets) ? slide.bullets : [];
    return bulletsRaw.map(normalizeBulletString).filter(Boolean).slice(0, 5);
  }, [slide?.bullets]);

  const [fit, setFit] = useState(() => ({
    scale: 1,

    // paddings / gaps
    hPad: 24,
    headerTopPad: 26,
    headerBottomPad: 10,
    gap: 56,

    // columns (Swift logic)
    imgColPx: 600, // px basis ( (bodyW-gap)*0.46 )
    imgRatio: 0.46,

    // bullets geometry
    rowGap: 22,
    bulletSize: 16,
    bulletToText: 18,
    trailingPad: 8,

    // typography
    headerFont: 64,
    bulletFont: 44,
    bottomFont: 56,
    headerLS: HEADER_LS_BASE,
    bulletLS: BULLET_LS_BASE,
    bottomLS: BOTTOM_LS_BASE,
    headerLH: HEADER_LH,
    bulletLH: BULLET_LH,
    bottomLH: BOTTOM_LH,

    // image (Swift: min(leftW, h*0.92))
    imgSize: 520,
    radius: 10,

    // colors
    textColor: "#000000",
    dotOpacity: 0.82,
    phColor: "rgba(0,0,0,0.55)",
  }));

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

      // 16:9比例スケール
      const rawScale = Math.min(W / BASE_W, H / BASE_H);
      const scale = clamp(rawScale, 0.72, 1.35);

      // 余白とレイアウト定数
      const hPad = Math.round(24 * scale);
      const headerTopPad = Math.round(26 * scale);
      const headerBottomPad = Math.round(10 * scale);

      const gap = Math.round(56 * scale);

      // bulletsが多いほどrowGapを少し締める（上下欠け防止）
      const rowGapBase =
        problems.length >= 5 ? 16 : problems.length === 4 ? 18 : problems.length === 3 ? 20 : 22;
      const rowGap = Math.round(rowGapBase * scale);

      const bulletToText = Math.round(18 * scale);
      const trailingPad = Math.round(8 * scale);
      const radius = Math.round(10 * scale);

      // Swift: bulletSizeは固定(16)想定（全体スケールで追従）
      const bulletSize = Math.round(16 * scale);

      // letterSpacingは“描画と計測を一致”
      const headerLS = HEADER_LS_BASE * scale;
      const bulletLS = BULLET_LS_BASE * scale;
      const bottomLS = BOTTOM_LS_BASE * scale;

      // 色
      const textColor = isIntelMode ? "rgba(245,247,255,0.98)" : "#000000";
      const phColor = isIntelMode ? "rgba(245,247,255,0.62)" : "rgba(0,0,0,0.55)";
      const dotOpacity = isIntelMode ? 0.8 : 0.82;

      // Swift幅計算：bodyW ≒ (W - 2*hPad)
      const bodyW = Math.max(10, W - hPad * 2);
      const imgRatio = 0.46;
      const leftW = Math.max(0, (bodyW - gap) * imgRatio);
      const rightW = Math.max(0, (bodyW - gap) - leftW);
      const imgColPx = Math.floor(leftW);

      // ---- Header font ----
      const contentW = bodyW;

      const headerFontTarget = 64 * scale;
      const maxHeaderTextH = Math.min(190 * scale, H * 0.22);

      const headerFont = binarySearchMaxFont({
        low: 42 * scale,
        high: headerFontTarget,
        fits: (fs) => {
          const hText = measureTextHeight(mHeaderRef.current, {
            text: headerTitle,
            width: contentW,
            fontSize: fs,
            fontWeight: 900,
            lineHeight: HEADER_LH,
            letterSpacing: headerLS,
            textAlign: "left",
          });
          return hText <= maxHeaderTextH;
        },
      });

      // ---- Bottom font ----
      const baseProblemsFont = problemsBaseFont(problems.length) * scale;

      // BottomはSwiftの“強め”を維持しつつ、bodyを殺しすぎない上限で収める
      const bottomTarget = clamp(baseProblemsFont + 10 * scale, 52 * scale, 66 * scale);
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

      // 先にCSS変数を仮適用 → body高さの実測（grid計算を確定）
      const preVars = {
        "--ppHPad": `${hPad}px`,
        "--ppHeaderTopPad": `${headerTopPad}px`,
        "--ppHeaderBottomPad": `${headerBottomPad}px`,
        "--ppHeaderFont": `${headerFont}px`,
        "--ppHeaderLS": `${headerLS}px`,
        "--ppHeaderLH": `${HEADER_LH}`,

        "--ppGap": `${gap}px`,
        "--ppImgColPx": `${imgColPx}px`,

        "--ppRowGap": `${rowGap}px`,
        "--ppBulletSize": `${bulletSize}px`,
        "--ppBulletToText": `${bulletToText}px`,
        "--ppTrailingPad": `${trailingPad}px`,

        "--ppBottomTopPad": `${Math.round(10 * scale)}px`,
        "--ppBottomBottomPad": `${Math.round(24 * scale)}px`,
        "--ppBottomFont": `${bottomFont}px`,
        "--ppBottomLS": `${bottomLS}px`,
        "--ppBottomLH": `${BOTTOM_LH}`,

        "--ppRadius": `${radius}px`,
        "--ppTextColor": `${textColor}`,
        "--ppDotOpacity": `${dotOpacity}`,
        "--ppPhColor": `${phColor}`,
      };

      for (const [k, v] of Object.entries(preVars)) rootEl.style.setProperty(k, v);

      // reflowを強制
      // eslint-disable-next-line no-unused-expressions
      rootEl.offsetHeight;

      const bodyRect = bodyEl.getBoundingClientRect();
      const bodyH = Math.max(10, bodyRect.height);

      // Swift相当：画像は min(leftW, h*0.92)
      const imgSize = Math.floor(Math.min(leftW, bodyH * 0.92));

      // Bulletテキストの実効幅（dot + 間隔 + trailingPad を差し引く）
      const bulletTextW = Math.max(10, rightW - bulletSize - bulletToText - trailingPad);

      // Bullet font fitting（Swiftと同じく“bodyH内に収める”）
      const availBulletsH = Math.max(10, bodyH);
      const minBullet = 20 * scale;

      const bulletFont = problems.length
        ? binarySearchMaxFont({
            low: minBullet,
            high: baseProblemsFont,
            fits: (fs) => {
              const bulletsH = measureBulletsHeight(mBulletsRef.current, {
                items: problems,
                width: bulletTextW,
                fontSize: fs,
                fontWeight: 900,
                lineHeight: BULLET_LH,
                letterSpacing: bulletLS,
                rowGap,
              });
              // ブラウザの字面差でギリギリ欠けるのを避けるため、極小の安全域だけ引く
              return bulletsH <= (availBulletsH - Math.round(2 * scale));
            },
          })
        : baseProblemsFont;

      const next = {
        scale,

        hPad,
        headerTopPad,
        headerBottomPad,
        gap,

        imgColPx,
        imgRatio,

        rowGap,
        bulletSize,
        bulletToText,
        trailingPad,

        headerFont,
        bulletFont,
        bottomFont,
        headerLS,
        bulletLS,
        bottomLS,
        headerLH: HEADER_LH,
        bulletLH: BULLET_LH,
        bottomLH: BOTTOM_LH,

        imgSize,
        radius,

        textColor,
        dotOpacity,
        phColor,
      };

      setFit((prev) => (nearlySameFit(prev, next) ? prev : next));

      // state反映前でも安定させる
      rootEl.style.setProperty("--ppBulletFont", `${bulletFont}px`);
      rootEl.style.setProperty("--ppBulletLS", `${bulletLS}px`);
      rootEl.style.setProperty("--ppBulletLH", `${BULLET_LH}`);
      rootEl.style.setProperty("--ppImgSize", `${imgSize}px`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerTitle, bottomMessage, problems.join("\n"), isIntelMode]);

  return (
    <SlidePageFrame
      pageNo={pageNo}
      isIntelMode={isIntelMode}
      hasPrefetched={hasPrefetched}
      footerRight={cacheKey ? `image: ${cacheKey}` : ""}
    >
      <div
        ref={rootRef}
        className="ppRoot ppProblemLikeSwift"
        style={{
          "--ppHPad": `${fit.hPad}px`,
          "--ppHeaderTopPad": `${fit.headerTopPad}px`,
          "--ppHeaderBottomPad": `${fit.headerBottomPad}px`,
          "--ppHeaderFont": `${fit.headerFont}px`,
          "--ppHeaderLS": `${fit.headerLS}px`,
          "--ppHeaderLH": `${fit.headerLH}`,

          "--ppGap": `${fit.gap}px`,
          "--ppImgColPx": `${fit.imgColPx}px`,

          "--ppRowGap": `${fit.rowGap}px`,
          "--ppBulletSize": `${fit.bulletSize}px`,
          "--ppBulletToText": `${fit.bulletToText}px`,
          "--ppTrailingPad": `${fit.trailingPad}px`,
          "--ppBulletFont": `${fit.bulletFont}px`,
          "--ppBulletLS": `${fit.bulletLS}px`,
          "--ppBulletLH": `${fit.bulletLH}`,

          "--ppBottomTopPad": `${Math.round(10 * fit.scale)}px`,
          "--ppBottomBottomPad": `${Math.round(24 * fit.scale)}px`,
          "--ppBottomFont": `${fit.bottomFont}px`,
          "--ppBottomLS": `${fit.bottomLS}px`,
          "--ppBottomLH": `${fit.bottomLH}`,

          "--ppImgSize": `${fit.imgSize}px`,
          "--ppRadius": `${fit.radius}px`,
          "--ppTextColor": `${fit.textColor}`,
          "--ppDotOpacity": `${fit.dotOpacity}`,
          "--ppPhColor": `${fit.phColor}`,
        }}
      >
        <div className="ppMain">
          <div className="ppHeader">
            <div className="ppTitle">{headerTitle}</div>
          </div>

          <div ref={bodyRef} className="ppBody">
            <div className="ppImageCol">
              <div className="ppImageSquare">
                {resolvedSrc ? (
                  <img
                    src={resolvedSrc}
                    crossOrigin="anonymous"
                    alt={cacheKey || slide?.title || "problem"}
                    className="ppImg"
                  />
                ) : (
                  <div className="ppImgPh">image loading...</div>
                )}
              </div>
            </div>

            <div className="ppBulletsCol">
              {problems.length ? (
                <ul className="ppBullets">
                  {problems.map((b, i) => (
                    <li key={`${slide?.id || "slide"}-problem-${i}`} className="ppBulletRow">
                      <span className="ppBulletDot" aria-hidden="true" />
                      <span className="ppBulletText">{b}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="ppBulletsEmpty" />
              )}
            </div>
          </div>

          {bottomMessage ? (
            <div className="ppBottom">
              <div className="ppBottomText">{bottomMessage}</div>
            </div>
          ) : (
            <div className="ppBottomEmpty" />
          )}
        </div>

        {/* measure nodes */}
        <div ref={mHeaderRef} className="ppMeasure" />
        <div ref={mBulletsRef} className="ppMeasure" />
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
            font-size: var(--ppHeaderFont);
            font-weight: 900;
            line-height: var(--ppHeaderLH);
            letter-spacing: var(--ppHeaderLS);
            color: var(--ppTextColor);
            white-space: pre-wrap;
            word-break: break-word;
            line-break: strict;
          }

          .ppBody {
            min-height: 0;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: var(--ppGap);
            overflow: hidden;
            box-sizing: border-box;
          }

          /* Swift: leftW = (bodyW-gap)*0.46 を pxで固定 */
          .ppImageCol {
            flex: 0 0 var(--ppImgColPx);
            min-width: 0;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .ppImageSquare {
            width: var(--ppImgSize);
            height: var(--ppImgSize);
            border-radius: var(--ppRadius);
            overflow: hidden;
            background: rgba(0, 0, 0, 0.06);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .ppImg {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }

          .ppImgPh {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: 800;
            color: var(--ppPhColor);
          }

          .ppBulletsCol {
            flex: 1 1 auto;
            min-width: 0;
            height: 100%;
            min-height: 0;
            display: flex;
            align-items: center; /* Swift: h内で中央寄せ */
            justify-content: flex-start;
            padding-right: var(--ppTrailingPad);
            box-sizing: border-box;
            overflow: hidden;
          }

          .ppBullets {
            list-style: none;
            padding: 0;
            margin: 0;
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: var(--ppRowGap);
          }

          /* SwiftはRow alignment=center。dotのmargin-topは計測ズレ＆上下欠けの原因なので削除 */
          .ppBulletRow {
            display: flex;
            align-items: center;
            gap: var(--ppBulletToText);
            min-width: 0;
          }

          .ppBulletDot {
            width: var(--ppBulletSize);
            height: var(--ppBulletSize);
            border-radius: 999px;
            background: var(--ppTextColor);
            opacity: var(--ppDotOpacity);
            flex: 0 0 auto;
          }

          .ppBulletText {
            font-size: var(--ppBulletFont);
            font-weight: 900;
            line-height: var(--ppBulletLH);
            letter-spacing: var(--ppBulletLS);
            color: var(--ppTextColor);
            white-space: pre-wrap;
            word-break: break-word;
            line-break: strict;
            min-width: 0;
          }

          .ppBottom {
            padding-top: var(--ppBottomTopPad);
            padding-bottom: var(--ppBottomBottomPad);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .ppBottomText {
            font-size: var(--ppBottomFont);
            font-weight: 900;
            line-height: var(--ppBottomLH);
            letter-spacing: var(--ppBottomLS);
            text-align: center;
            white-space: pre-wrap;
            word-break: break-word;
            line-break: strict;

            background: linear-gradient(
              135deg,
              rgba(199, 26, 46, 1) 0%,
              rgba(235, 66, 31, 0.98) 55%,
              rgba(255, 140, 41, 0.95) 100%
            );
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
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
