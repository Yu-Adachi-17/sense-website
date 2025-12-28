// src/components/slideaipro/slidePages/ProblemPage.js
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import SlidePageFrame from "./SlidePageFrame";
import { resolveImageSrc } from "../utils/resolveImageSrc";

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Segoe UI", system-ui, sans-serif';

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

export default function ProblemPage({ slide, pageNo, isIntelMode, hasPrefetched, imageUrlByKey }) {
  const rootRef = useRef(null);

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

  const [fit, setFit] = useState({
    headerFont: 64,
    bulletFont: 44,
    bottomFont: 70,
    imgSize: 420,
    gap: 56,
  });

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const recompute = () => {
      const root = rootRef.current;
      if (!root) return;

      const rect = root.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;

      // Swift相当の定数
      const horizontalPadding = 24;

      // タイトルは「明確に上」＝ Web側は余白を少し強める
      const headerTopPad = 26;
      const headerBottomPad = 18; // 10 → 18（タイトルとBodyの分離を明確化）

      // 下段は「明確に下」
      const bottomTopPad = bottomMessage ? 10 : 0;
      const bottomBottomPad = 24;

      // Bullets
      const bulletDot = 16;
      const bulletToText = 18;
      const trailingPad = 8;
      const rowGap = 22;

      // SlidePageFrameの下部ステータス領域に被らない安全域（必要最小）
      const footerReserve = 22;

      const contentW = Math.max(10, W - horizontalPadding * 2);

      // Header font fitting
      const maxHeaderTextH = Math.min(160, H * 0.20);
      const headerFont = binarySearchMaxFont({
        low: 42,
        high: 66,
        fits: (fs) => {
          const hText = measureTextHeight(mHeaderRef.current, {
            text: headerTitle,
            width: contentW,
            fontSize: fs,
            fontWeight: 800, // 日本語の見た目が最も安定
            lineHeight: 1.05,
            letterSpacing: -0.7,
            textAlign: "left",
          });
          return hText <= maxHeaderTextH;
        },
      });

      const headerTextH = measureTextHeight(mHeaderRef.current, {
        text: headerTitle,
        width: contentW,
        fontSize: headerFont,
        fontWeight: 800,
        lineHeight: 1.05,
        letterSpacing: -0.7,
        textAlign: "left",
      });
      const headerBlockH = headerTopPad + headerTextH + headerBottomPad;

      // Columns (Swift: gap=56, leftRatio=0.46)
      const gap = 56;
      const leftW = (contentW - gap) * 0.46;
      const rightW = (contentW - gap) - leftW;

      const bulletTextW = Math.max(10, rightW - bulletDot - bulletToText - trailingPad);

      // Bullet font fitting (SwiftのfitFontSize相当)
      const baseBullet = problemsBaseFont(problems.length);
      const minBullet = 22;

      // Bottom font fitting（problemsFont + 16, clamp 62..74 / SwiftのminimumScaleFactor相当をWebで近似）
      const desiredBottom = clamp(baseBullet + 16, 62, 74);

      // Bottomが取りうる最大高さ（ここを取りすぎるとBodyが痩せて画像が小さくなる）
      const maxBottomTextH = Math.min(140, H * 0.20);

      const bottomFont = bottomMessage
        ? binarySearchMaxFont({
            low: desiredBottom * 0.55,
            high: desiredBottom,
            fits: (fs) => {
              const hText = measureTextHeight(mBottomRef.current, {
                text: bottomMessage,
                width: contentW,
                fontSize: fs,
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: -0.35,
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
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -0.35,
            textAlign: "center",
          })
        : 0;

      const bottomBlockH = (bottomMessage ? bottomTopPad + bottomTextH : 0) + bottomBottomPad;

      const bodyH = Math.max(10, H - headerBlockH - bottomBlockH - footerReserve);

      const bulletFont = problems.length
        ? binarySearchMaxFont({
            low: minBullet,
            high: baseBullet,
            fits: (fs) => {
              const bulletsH = measureBulletsHeight(mBulletsRef.current, {
                items: problems,
                width: bulletTextW,
                fontSize: fs,
                fontWeight: 800,
                lineHeight: 1.08,
                letterSpacing: -0.45,
                rowGap,
              });
              return bulletsH <= bodyH;
            },
          })
        : baseBullet;

      // Image size（Swift: min(leftW, bodyH*0.92)）
      const imgSize = Math.floor(Math.min(leftW, bodyH * 0.92));

      setFit({
        headerFont,
        bulletFont,
        bottomFont,
        imgSize,
        gap,
      });
    };

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(() => requestAnimationFrame(recompute));
    });
    ro.observe(el);

    // 初回
    requestAnimationFrame(() => requestAnimationFrame(recompute));
    // フォント読み込み後にも再計算（ズレ防止）
    if (document?.fonts?.ready) {
      document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(recompute)));
    }

    return () => ro.disconnect();
  }, [headerTitle, bottomMessage, problems.join("\n"), isIntelMode]);

  const styleVars = {
    "--ppHeaderFont": `${fit.headerFont}px`,
    "--ppBulletFont": `${fit.bulletFont}px`,
    "--ppBottomFont": `${fit.bottomFont}px`,
    "--ppImgSize": `${fit.imgSize}px`,
    "--ppGap": `${fit.gap}px`,
  };

  return (
    <SlidePageFrame
      pageNo={pageNo}
      isIntelMode={isIntelMode}
      hasPrefetched={hasPrefetched}
      footerRight={cacheKey ? `image: ${cacheKey}` : ""}
    >
      <div ref={rootRef} className="ppRoot ppProblemLikeSwift" style={styleVars}>
        <div className="ppMain">
          {/* Header（必ず最上段） */}
          <div className="ppHeader">
            <div className="ppTitle">{headerTitle}</div>
          </div>

          {/* Body（必ず中段：画像＋バレット） */}
          <div className="ppBody">
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

          /* Gridで「上・中・下」を物理的に分離（被りを構造で防ぐ） */
          .ppMain {
            width: 100%;
            height: 100%;
            padding: 0 24px;
            box-sizing: border-box;

            display: grid;
            grid-template-rows: auto 1fr auto;
          }

          .ppHeader {
            padding-top: 26px;
            padding-bottom: 18px; /* タイトルを明確に上に */
          }

          .ppTitle {
            font-size: var(--ppHeaderFont);
            font-weight: 800;
            line-height: 1.05;
            letter-spacing: -0.7px;
            color: #000;
            white-space: pre-wrap;
            word-break: break-word;
            line-break: strict;
          }

          .ppBody {
            min-height: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--ppGap);
            overflow: hidden; /* 万が一でも下段へ侵食しない */
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
            border-radius: 10px;
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
            font-weight: 700;
            color: rgba(0, 0, 0, 0.55);
          }

          .ppBulletsCol {
            flex: 1 1 auto;
            min-width: 0;
            height: 100%;
            min-height: 0;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            padding-right: 8px;
            box-sizing: border-box;
            overflow: hidden; /* バレットが下段へ侵食しない */
          }

          .ppBullets {
            list-style: none;
            padding: 0;
            margin: 0;
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 22px;
          }

          .ppBulletRow {
            display: flex;
            align-items: center;
            gap: 18px;
            min-width: 0;
          }

          .ppBulletDot {
            width: 16px;
            height: 16px;
            border-radius: 999px;
            background: #000;
            opacity: 0.92;
            flex: 0 0 auto;
          }

          .ppBulletText {
            font-size: var(--ppBulletFont);
            font-weight: 800;
            line-height: 1.08;
            letter-spacing: -0.45px;
            color: #000;
            white-space: pre-wrap;
            word-break: break-word;
            line-break: strict;
            min-width: 0;
          }

          .ppBottom {
            padding-top: 10px;
            padding-bottom: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .ppBottomText {
            font-size: var(--ppBottomFont);
            font-weight: 800;
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
            padding-bottom: 24px;
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
