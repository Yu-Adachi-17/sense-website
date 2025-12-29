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

  // タイトルを厳密に中央、日付はタイトル直下（タイトル高さ追従）
  const titleRef = useRef(null);
  const [titleHeight, setTitleHeight] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      if (!titleRef.current) return;
      const r = titleRef.current.getBoundingClientRect();
      setTitleHeight(Math.max(0, Math.round(r.height)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [titleText]);

  const GAP_PX = 26;

  return (
    <SlidePageFrame pageNo={pageNo} isIntelMode={isIntelMode} hasPrefetched={hasPrefetched} footerRight="">
      <div className="coverHeroRoot">
        <div ref={titleRef} className="coverHeroTitle">
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

        /* タイトル：ど真ん中 */
        .coverHeroTitle {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: min(1700px, calc(100% - 320px));
          text-align: center;

          font-family: ${FONT_FAMILY};
          font-weight: 900;
          font-size: clamp(120px, 9.0vw, 190px);
          line-height: 1.02;
          letter-spacing: -0.045em;
          color: #0b0b0b;

          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: geometricPrecision;

          word-break: break-word;
          line-break: strict;
        }

        /* 日付：タイトル直下、小さく、絶対に改行しない */
        .coverHeroDate {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          text-align: center;

          font-family: ${FONT_FAMILY};
          font-weight: 800;
          font-size: 36px;
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
