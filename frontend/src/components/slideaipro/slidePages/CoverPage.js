// src/components/slideaipro/slidePages/CoverPage.js
import React from "react";
import SlidePageFrame from "./SlidePageFrame";

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Segoe UI", system-ui, sans-serif';

export default function CoverPage({ slide, pageNo, isIntelMode, hasPrefetched }) {
  // 仕様固定: slide.title = 日付 / slide.subtitle = タイトル
  const dateText = String(slide?.title || "").trim();
  const titleText = String(slide?.subtitle || "").trim();

  // 互換（古いデータ用）: subtitle が無い場合だけ title をタイトルとして扱う
  const finalTitle = titleText || dateText;
  const finalDate = titleText ? dateText : "";

  return (
    <SlidePageFrame pageNo={pageNo} isIntelMode={isIntelMode} hasPrefetched={hasPrefetched} footerRight="">
      <div className="coverCenter">
        <div className="coverTitle">{finalTitle}</div>
        {finalDate ? <div className="coverDate">{finalDate}</div> : null}
      </div>

      <style jsx>{`
        .coverCenter {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 0 180px;
        }

        .coverTitle {
          font-family: ${FONT_FAMILY};
          font-weight: 900;
          font-size: clamp(96px, 8.2vw, 168px);
          line-height: 1.04;
          letter-spacing: -0.04em;
          color: #0b0b0b;

          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: geometricPrecision;

          max-width: 1680px;
          word-break: break-word;
          line-break: strict;
        }

        .coverDate {
          margin-top: 34px;
          font-family: ${FONT_FAMILY};
          font-weight: 800;
          font-size: 36px;
          line-height: 1.1;
          letter-spacing: -0.02em;
          color: rgba(11, 11, 11, 0.72);

          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: geometricPrecision;
        }

        :global(.pageDark) .coverTitle {
          color: #f5f7fb;
        }
        :global(.pageDark) .coverDate {
          color: rgba(245, 247, 251, 0.72);
        }
      `}</style>
    </SlidePageFrame>
  );
}
