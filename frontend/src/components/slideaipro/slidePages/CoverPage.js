// src/components/slideaipro/slidePages/CoverPage.js
import React, { useLayoutEffect, useRef, useState } from "react";
import SlidePageFrame from "./SlidePageFrame";

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Segoe UI", system-ui, sans-serif';

export default function CoverPage({ slide, pageNo, isIntelMode, hasPrefetched }) {
  // 仕様固定: slide.title = 日付 / slide.subtitle = タイトル
  const dateText = String(slide?.title || "").trim();
  const titleText = String(slide?.subtitle || "").trim();

  // 互換（古いデータ用）: subtitle が無い場合は title をタイトル扱い（この場合、日付は表示しない）
  const finalTitle = titleText || dateText;
  const finalDate = titleText ? dateText : "";

  // タイトルを「厳密に」ど真ん中に置き、日付はタイトルの直下へ（タイトル高さに追従）
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
  }, [finalTitle]);

  const GAP_PX = 28; // タイトルと日付の間隔（参考画像のニュアンス）

  return (
    <SlidePageFrame pageNo={pageNo} isIntelMode={isIntelMode} hasPrefetched={hasPrefetched} footerRight="">
      <div className="coverHeroRoot">
        <div ref={titleRef} className="coverHeroTitle">
          {finalTitle}
        </div>

        {finalDate ? (
          <div
            className="coverHeroDate"
            style={{
              top: `calc(50% + ${Math.max(0, Math.round(titleHeight / 2)) + GAP_PX}px)`,
            }}
          >
            {finalDate}
          </div>
        ) : null}
      </div>

      <style jsx>{`
        .coverHeroRoot {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: transparent;
        }

        /* タイトルは「厳密に」ど真ん中 */
        .coverHeroTitle {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: min(1680px, calc(100% - 360px));
          text-align: center;

          font-family: ${FONT_FAMILY};
          font-weight: 900;
          font-size: clamp(120px, 9.2vw, 190px);
          line-height: 1.02;
          letter-spacing: -0.045em;
          color: #0b0b0b;

          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: geometricPrecision;

          word-break: break-word;
          line-break: strict;
        }

        /* 日付はタイトルの直下（タイトル高さに追従） */
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
          color: #0b0b0b;

          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: geometricPrecision;
        }

        :global(.pageDark) .coverHeroTitle {
          color: #f5f7fb;
        }
        :global(.pageDark) .coverHeroDate {
          color: #f5f7fb;
        }
      `}</style>
    </SlidePageFrame>
  );
}
