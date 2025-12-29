// src/components/slideaipro/slidePages/CoverPage.js
import React, { useLayoutEffect, useRef, useState } from "react";
import SlidePageFrame from "./SlidePageFrame";

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Segoe UI", system-ui, sans-serif';

function isDateLike(s) {
  const t = String(s || "").trim();
  if (!t) return false;
  // 2025-12-29 / 2025/12/29 / 2025.12.29
  return /^\d{4}[-/.]\d{2}[-/.]\d{2}$/.test(t);
}

export default function CoverPage({ slide, pageNo, isIntelMode, hasPrefetched }) {
  const a = String(slide?.title || "").trim();
  const b = String(slide?.subtitle || "").trim();

  // 自動判定: dateっぽい方を日付へ
  let titleText = a;
  let dateText = b;

  const aIsDate = isDateLike(a);
  const bIsDate = isDateLike(b);

  if (aIsDate && !bIsDate) {
    dateText = a;
    titleText = b;
  } else if (bIsDate && !aIsDate) {
    dateText = b;
    titleText = a;
  } else {
    // どちらも日付判定できない場合は「タイトル=title / 日付=subtitle」を優先
    titleText = a;
    dateText = b;
  }

  const rootRef = useRef(null);
  const titleRef = useRef(null);

  const [titleHeight, setTitleHeight] = useState(0);
  const [titleFontPx, setTitleFontPx] = useState(96);

  // タイトルの見た目を「大きすぎない」「改行が早すぎない」方向へ自動フィット
  useLayoutEffect(() => {
    const LINE_H = 1.05;
    const MAX_FONT = 110; // ← 以前の約1/2（190→110）
    const MIN_FONT = 56;
    const MAX_LINES = 3; // 基本2行狙い、長文は最大3行まで許容
    const MAX_HEIGHT_RATIO = 0.38; // 画面高さに対してこの割合以内に収める

    const fit = () => {
      const root = rootRef.current;
      const el = titleRef.current;
      if (!root || !el) return;

      const rootRect = root.getBoundingClientRect();
      const rootH = Math.max(1, rootRect.height);
      const rootW = Math.max(1, rootRect.width);

      // 横幅が広いほど少し大きく開始（ただし上限はMAX_FONT）
      let size = Math.min(MAX_FONT, Math.max(MIN_FONT, Math.round(rootW * 0.052))); // 1920px → 約100px
      // まず当てる
      el.style.fontSize = `${size}px`;
      el.style.lineHeight = `${LINE_H}`;

      // 高さ/行数が落ち着くまで少しずつ縮める
      for (let i = 0; i < 40; i += 1) {
        const r = el.getBoundingClientRect();
        const approxLines = Math.max(1, Math.round(r.height / (size * LINE_H)));
        const tooTall = r.height > rootH * MAX_HEIGHT_RATIO;
        const tooManyLines = approxLines > MAX_LINES;

        if (!tooTall && !tooManyLines) break;

        size -= 2;
        if (size < MIN_FONT) {
          size = MIN_FONT;
          break;
        }
        el.style.fontSize = `${size}px`;
      }

      const finalRect = el.getBoundingClientRect();
      setTitleFontPx(size);
      setTitleHeight(Math.max(0, Math.round(finalRect.height)));
    };

    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [titleText]);

  const GAP_PX = 18;

  return (
    <SlidePageFrame pageNo={pageNo} isIntelMode={isIntelMode} hasPrefetched={hasPrefetched} footerRight="">
      <div ref={rootRef} className="coverHeroRoot">
        <div
          ref={titleRef}
          className="coverHeroTitle"
          style={{
            fontSize: `${titleFontPx}px`,
          }}
        >
          {titleText}
        </div>

        {dateText ? (
          <div
            className="coverHeroDate"
            style={{
              top: `calc(50% + ${Math.max(0, Math.round(titleHeight / 2)) + GAP_PX}px)`,
            }}
          >
            {dateText}
          </div>
        ) : null}
      </div>

      <style jsx>{`
        .coverHeroRoot {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        /* タイトル：ど真ん中 / 改行が早すぎないよう横幅を拡大 */
        .coverHeroTitle {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);

          width: min(1760px, calc(100% - 160px));
          text-align: center;

          font-family: ${FONT_FAMILY};
          font-weight: 900;

          line-height: 1.05;
          letter-spacing: -0.035em;
          color: #0b0b0b;

          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: geometricPrecision;

          /* 改行挙動：strict を捨てて「不自然な早割れ」を抑える */
          line-break: normal;
          word-break: normal;
          overflow-wrap: anywhere;

          hyphens: auto;
          text-wrap: balance;
        }

        /* 日付：タイトル直下、小さく、絶対に改行しない */
        .coverHeroDate {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          text-align: center;

          font-family: ${FONT_FAMILY};
          font-weight: 800;
          font-size: 34px;
          line-height: 1.1;
          letter-spacing: -0.02em;
          color: rgba(11, 11, 11, 0.78);

          white-space: nowrap;
          font-variant-numeric: tabular-nums;

          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: geometricPrecision;
        }

        :global(.pageDark) .coverHeroTitle {
          color: #f5f7fb;
        }
        :global(.pageDark) .coverHeroDate {
          color: rgba(245, 247, 251, 0.78);
        }
      `}</style>
    </SlidePageFrame>
  );
}
