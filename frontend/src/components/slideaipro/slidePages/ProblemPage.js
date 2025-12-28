// src/components/slideaipro/slidePages/ProblemPage.js
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import SlidePageFrame from "./SlidePageFrame";
import { resolveImageSrc } from "../utils/resolveImageSrc";

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
    leftRatio: 0.46,
    footerReserve: 44, // SlidePageFrameのフッター/バッジに食われない安全域
  });

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => recompute());
    ro.observe(el);
    recompute();

    return () => ro.disconnect();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerTitle, bottomMessage, problems.join("\n"), isIntelMode]);

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
    node.style.fontSynthesis = "none"; // 擬似ボールド抑制（古臭さ対策）
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

  function recompute() {
    const root = rootRef.current;
    if (!root) return;

    const rect = root.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;

    // Swift相当の定数
    const horizontalPadding = 24;
    const headerTopPad = 26;
    const headerBottomPad = 10;
    const bottomTopPad = bottomMessage ? 10 : 0;
    const bottomBottomPad = 24;

    const bulletDot = 16;
    const bulletToText = 18;
    const trailingPad = 8;
    const rowGap = 22;

    // テキスト見た目（Swiftに寄せる）
    const fontFamily =
      '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Segoe UI", system-ui, sans-serif';

    // content領域（左右padding）
    const contentW = Math.max(10, W - horizontalPadding * 2);

    // 1) タイトル：64を基準に、長いときだけ縮める（最大高さを制限）
    const maxHeaderBlockH = Math.min(170, H * 0.22);
    const headerFont = binarySearchMaxFont({
      low: 40,
      high: 64,
      fits: (fs) => {
        const hText = measureTextHeight(mHeaderRef.current, {
          text: headerTitle,
          width: contentW,
          fontSize: fs,
          fontWeight: 800, // 900だと日本語が擬似ボールドになりやすいので800に寄せる
          lineHeight: 1.05,
          letterSpacing: -0.6,
          textAlign: "left",
        });
        const blockH = headerTopPad + hText + headerBottomPad;
        return blockH <= maxHeaderBlockH;
      },
    });

    const headerTextH = measureTextHeight(mHeaderRef.current, {
      text: headerTitle,
      width: contentW,
      fontSize: headerFont,
      fontWeight: 800,
      lineHeight: 1.05,
      letterSpacing: -0.6,
      textAlign: "left",
    });
    const headerBlockH = headerTopPad + headerTextH + headerBottomPad;

    // 2) 体の横レイアウト（Swift: gap=56, leftRatio=0.46）
    const gap = 56;
    const leftW = (contentW - gap) * 0.46;
    const rightW = (contentW - gap) - leftW;

    // bulletsの実効幅（dot + spacing + trailingを引く）
    const bulletTextW = Math.max(10, rightW - bulletDot - bulletToText - trailingPad);

    // 3) 一旦 bulletsFont を base で置いて bottom を概算 → bodyH → bulletsFont fitting
    const baseBullet = problemsBaseFont(problems.length);
    const minBullet = 22;

    // bottomFontは bulletsFont+16（62..74）を基準に、長文なら0.55まで縮める
    function fitBottomFont(relatedBulletFont) {
      if (!bottomMessage) return 0;

      const desired = clamp(relatedBulletFont + 16, 62, 74);
      const min = desired * 0.55;

      // bottomは大きいほど良いが、最大高さを制限
      const maxBottomTextH = Math.min(140, H * 0.22);

      const best = binarySearchMaxFont({
        low: min,
        high: desired,
        fits: (fs) => {
          const hText = measureTextHeight(mBottomRef.current, {
            text: bottomMessage,
            width: contentW,
            fontSize: fs,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -0.3,
            textAlign: "center",
          });
          return hText <= maxBottomTextH;
        },
      });

      return best;
    }

    // 1st pass
    let bottomFont = fitBottomFont(baseBullet);
    let bottomTextH = bottomMessage
      ? measureTextHeight(mBottomRef.current, {
          text: bottomMessage,
          width: contentW,
          fontSize: bottomFont,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: -0.3,
          textAlign: "center",
        })
      : 0;

    let bottomBlockH = (bottomMessage ? bottomTopPad + bottomTextH : 0) + bottomBottomPad;

    // SlidePageFrameの下部表示分を安全域として引く（見切れ対策）
    const footerReserve = 44;

    let bodyH = Math.max(10, H - headerBlockH - bottomBlockH - footerReserve);

    // bullets fitting (SwiftのfitFontSize相当)
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
              letterSpacing: -0.4,
              rowGap,
            });
            return bulletsH <= bodyH;
          },
        })
      : baseBullet;

    // 2nd pass（bulletFont確定後の bottomFont を再計算して bodyH を微調整）
    bottomFont = fitBottomFont(bulletFont);
    bottomTextH = bottomMessage
      ? measureTextHeight(mBottomRef.current, {
          text: bottomMessage,
          width: contentW,
          fontSize: bottomFont,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: -0.3,
          textAlign: "center",
        })
      : 0;

    bottomBlockH = (bottomMessage ? bottomTopPad + bottomTextH : 0) + bottomBottomPad;
    bodyH = Math.max(10, H - headerBlockH - bottomBlockH - footerReserve);

    // 画像サイズ（Swift: imageSize = min(leftW, h*0.92)）
    const imgSize = Math.floor(Math.min(leftW, bodyH * 0.92));

    // 適用
    setFit((prev) => ({
      ...prev,
      headerFont,
      bulletFont,
      bottomFont,
      imgSize,
      gap,
      leftRatio: 0.46,
      footerReserve,
      fontFamily,
    }));
  }

  const styleVars = {
    "--ppFontFamily": fit.fontFamily,
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
          {/* Header */}
          <div className="ppHeader">
            <div className="ppTitle">{headerTitle}</div>
          </div>

          {/* Body */}
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

          {/* Bottom */}
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
            overflow: hidden; /* 見切れを外に逃さない */
          }

          .ppMain {
            width: 100%;
            height: 100%;
            padding: 0 24px;
            padding-bottom: 44px; /* footerReserve：SlidePageFrameの下端表示に被らない */
            box-sizing: border-box;

            display: flex;
            flex-direction: column;
            align-items: stretch;
            justify-content: flex-start;

            font-family: var(--ppFontFamily);
            text-rendering: geometricPrecision;
            -webkit-font-smoothing: antialiased;
            font-kerning: normal;
            font-feature-settings: "palt";
            font-synthesis: none;
          }

          /* Header */
          .ppHeader {
            padding-top: 26px;
            padding-bottom: 10px;
            flex: 0 0 auto;
          }

          .ppTitle {
            font-size: var(--ppHeaderFont);
            font-weight: 800;
            line-height: 1.05;
            letter-spacing: -0.6px;
            color: #000;

            white-space: pre-wrap;
            word-break: break-word;
            line-break: strict;
          }

          /* Body */
          .ppBody {
            flex: 1 1 auto;
            min-height: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--ppGap);
          }

          .ppImageCol {
            flex: 0 0 46%;
            min-width: 0;
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
            object-fit: cover; /* Swift scaledToFill */
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
            align-items: center; /* Swift: bullets are vertically centered */
            justify-content: flex-start;
            padding-right: 8px; /* trailingPadding */
            box-sizing: border-box;
          }

          .ppBullets {
            list-style: none;
            padding: 0;
            margin: 0;
            width: 100%;

            display: flex;
            flex-direction: column;
            gap: 22px; /* rowSpacing */
          }

          .ppBulletRow {
            display: flex;
            align-items: center; /* Swift HStack(.center) */
            gap: 18px; /* bulletToTextSpacing */
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
            letter-spacing: -0.4px;
            color: #000;

            white-space: pre-wrap;
            word-break: break-word;
            line-break: strict;
            min-width: 0;
          }

          /* Bottom */
          .ppBottom {
            padding-top: 10px;
            padding-bottom: 24px;
            flex: 0 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .ppBottomText {
            font-size: var(--ppBottomFont);
            font-weight: 800;
            line-height: 1.05;
            letter-spacing: -0.3px;
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
            flex: 0 0 auto;
          }

          /* measure */
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
