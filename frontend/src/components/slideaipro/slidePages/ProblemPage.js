// src/components/slideaipro/slidePages/ProblemPage.js
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import SlidePageFrame from "./SlidePageFrame";
import { resolveImageSrc } from "../utils/resolveImageSrc";

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Segoe UI", system-ui, sans-serif';

// Swiftの“基準サイズ(16:9)”に対して比率を保つための基準。
// Web側のSlideRootが1920x1080であろうが、縮小表示であろうが、ここを基準にスケールします。
const BASE_W = 1920;
const BASE_H = 1080;

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

function measureBulletsHeight(node, { items, width, fontSize, fontWeight, lineHeight, letterSpacing, rowGap }) {
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

  // 計測用（非表示）
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

    // bullets geometry
    rowGap: 22,
    bulletSize: 16,
    bulletToText: 18,
    trailingPad: 8,

    // fonts
    headerFont: 64,
    bulletFont: 44,
    bottomFont: 62,

    // image
    imgSize: 520,
    radius: 10,

    // colors
    textColor: "#000000",
    dotOpacity: 0.8,
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

      // 16:9前提の比例スケール（Swiftの見た目と同じ“比率”に寄せる）
      const rawScale = Math.min(W / BASE_W, H / BASE_H);
      const scale = clamp(rawScale, 0.72, 1.35);

      // Swift相当の定数（scale適用）
      const hPad = Math.round(24 * scale);
      const headerTopPad = Math.round(26 * scale);
      const headerBottomPad = Math.round(10 * scale); // Swift: .padding(.bottom, 10)
      const gap = Math.round(56 * scale);

      const rowGap = Math.round(22 * scale);
      const bulletSize = Math.round(16 * scale);
      const bulletToText = Math.round(18 * scale);
      const trailingPad = Math.round(8 * scale);

      const radius = Math.round(10 * scale);

      // 色（Swiftの backgroundColor.textColor 相当を isIntelMode で近似）
      const textColor = isIntelMode ? "rgba(245,247,255,0.98)" : "#000000";
      const phColor = isIntelMode ? "rgba(245,247,255,0.62)" : "rgba(0,0,0,0.55)";
      const dotOpacity = isIntelMode ? 0.8 : 0.8;

      // ---- Header font (Swift: 64固定。Webは“極端に小さいキャンバス”だけ軽く縮める) ----
      const contentW = Math.max(10, W - hPad * 2);
      const headerFontTarget = 64 * scale;

      const maxHeaderTextH = Math.min(190 * scale, H * 0.26); // “上で支配しすぎ”防止の安全域
      const headerFont = binarySearchMaxFont({
        low: 44 * scale,
        high: headerFontTarget,
        fits: (fs) => {
          const hText = measureTextHeight(mHeaderRef.current, {
            text: headerTitle,
            width: contentW,
            fontSize: fs,
            fontWeight: 900, // .black
            lineHeight: 1.05,
            letterSpacing: -0.7 * scale,
            textAlign: "left",
          });
          return hText <= maxHeaderTextH;
        },
      });

      // ---- Bottom font (Swift: problemsFont + 16, clamp 62..74) を scale で再現 ----
      const baseProblemsFont = problemsBaseFont(problems.length) * scale;
      const bottomTarget = clamp(baseProblemsFont + 16 * scale, 62 * scale, 74 * scale);

      // Bottomが“行数増で下段を食いすぎる”のを抑える（Swiftの見た目を崩さない範囲で）
      const maxBottomTextH = Math.min(170 * scale, H * 0.20);

      const bottomFont = bottomMessage
        ? binarySearchMaxFont({
            low: bottomTarget * 0.55,
            high: bottomTarget,
            fits: (fs) => {
              const hText = measureTextHeight(mBottomRef.current, {
                text: bottomMessage,
                width: contentW,
                fontSize: fs,
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: -0.35 * scale,
                textAlign: "center",
              });
              return hText <= maxBottomTextH;
            },
          })
        : 0;

      // 先に“padding / header / bottom”を root に仮適用して、Body(=GeometryReader相当)の実測を取る
      const preVars = {
        "--ppHPad": `${hPad}px`,
        "--ppHeaderTopPad": `${headerTopPad}px`,
        "--ppHeaderBottomPad": `${headerBottomPad}px`,
        "--ppHeaderFont": `${headerFont}px`,
        "--ppGap": `${gap}px`,
        "--ppRowGap": `${rowGap}px`,
        "--ppBulletSize": `${bulletSize}px`,
        "--ppBulletToText": `${bulletToText}px`,
        "--ppTrailingPad": `${trailingPad}px`,
        "--ppBottomTopPad": `${Math.round(10 * scale)}px`,
        "--ppBottomBottomPad": `${Math.round(24 * scale)}px`,
        "--ppBottomFont": `${bottomFont}px`,
        "--ppRadius": `${radius}px`,
        "--ppTextColor": `${textColor}`,
        "--ppDotOpacity": `${dotOpacity}`,
        "--ppPhColor": `${phColor}`,
      };

      for (const [k, v] of Object.entries(preVars)) rootEl.style.setProperty(k, v);

      // Body実測（ここがSwiftの GeometryReader の h / w に相当）
      const bodyRect = bodyEl.getBoundingClientRect();
      const bodyW = bodyRect.width;
      const bodyH = bodyRect.height;

      // Swift: leftW = (w - gap) * 0.46 / rightW = rest
      const leftW = (bodyW - gap) * 0.46;
      const rightW = (bodyW - gap) - leftW;

      // Swift: imageSize = min(leftW, h*0.92)
      const imgSize = Math.floor(Math.min(leftW, bodyH * 0.92));

      // Bullet text width (dot + spacing + trailing pad を差し引く)
      const bulletTextW = Math.max(10, rightW - bulletSize - bulletToText - trailingPad);

      // Bullet font fitting（SwiftのfitFontSize相当）
      const minBullet = 22 * scale;
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
                lineHeight: 1.08,
                letterSpacing: -0.45 * scale,
                rowGap,
              });
              return bulletsH <= bodyH;
            },
          })
        : baseProblemsFont;

      const next = {
        scale,
        hPad,
        headerTopPad,
        headerBottomPad,
        gap,
        rowGap,
        bulletSize,
        bulletToText,
        trailingPad,
        headerFont,
        bulletFont,
        bottomFont,
        imgSize,
        radius,
        textColor,
        dotOpacity,
        phColor,
      };

      if (!nearlySameFit(fit, next)) {
        setFit(next);
      }

      // 最終値を root に反映（React再描画前でもレイアウトが安定する）
      rootEl.style.setProperty("--ppBulletFont", `${bulletFont}px`);
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
          "--ppBulletFont": `${fit.bulletFont}px`,
          "--ppBottomFont": `${fit.bottomFont}px`,
          "--ppImgSize": `${fit.imgSize}px`,
          "--ppGap": `${fit.gap}px`,
          "--ppRowGap": `${fit.rowGap}px`,
          "--ppBulletSize": `${fit.bulletSize}px`,
          "--ppBulletToText": `${fit.bulletToText}px`,
          "--ppTrailingPad": `${fit.trailingPad}px`,
          "--ppBottomTopPad": `${Math.round(10 * fit.scale)}px`,
          "--ppBottomBottomPad": `${Math.round(24 * fit.scale)}px`,
          "--ppRadius": `${fit.radius}px`,
          "--ppTextColor": `${fit.textColor}`,
          "--ppDotOpacity": `${fit.dotOpacity}`,
          "--ppPhColor": `${fit.phColor}`,
        }}
      >
        <div className="ppMain">
          {/* Header（必ず最上段） */}
          <div className="ppHeader">
            <div className="ppTitle">{headerTitle}</div>
          </div>

          {/* Body（Swift: GeometryReader相当） */}
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

          {/* Bottom（必ず最下段） */}
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

          /* Gridで「上・中・下」を物理分離（被りを構造で防ぐ） */
          .ppMain {
            width: 100%;
            height: 100%;
            padding: 0 var(--ppHPad);
            box-sizing: border-box;
            display: grid;
            grid-template-rows: auto 1fr auto;
            min-height: 0;
          }

          .ppHeader {
            padding-top: var(--ppHeaderTopPad);
            padding-bottom: var(--ppHeaderBottomPad);
          }

          .ppTitle {
            font-size: var(--ppHeaderFont);
            font-weight: 900;
            line-height: 1.05;
            letter-spacing: -0.7px;
            color: var(--ppTextColor);
            white-space: pre-wrap;
            word-break: break-word;
            line-break: strict;
          }

          .ppBody {
            min-height: 0;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: var(--ppGap);
            overflow: hidden;
          }

          .ppImageCol {
            flex: 0 0 46%;
            min-width: 0;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: flex-start;
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
            align-items: center; /* Swift: VStackを frame(height:h, alignment:.center) */
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
            line-height: 1.08;
            letter-spacing: -0.45px;
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
            line-height: 1.05;
            letter-spacing: -0.35px;
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
