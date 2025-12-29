// src/components/slideaipro/slidePages/CoverPage.js
import React from "react";
import SlidePageFrame from "./SlidePageFrame";

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Segoe UI", system-ui, sans-serif';

export default function CoverPage({ slide, pageNo, isIntelMode, hasPrefetched }) {
  // 仕様: slide.title = 日付 / slide.subtitle = タイトル
  // 互換: subtitle が無いデータでは title を見出しとして扱う
  const hasSub = typeof slide?.subtitle === "string" && slide.subtitle.trim().length > 0;

  const headline = (hasSub ? slide.subtitle : slide?.title || "").trim();
  const dateText = (hasSub ? slide?.title : "").trim();

  return (
    <SlidePageFrame pageNo={pageNo} isIntelMode={isIntelMode} hasPrefetched={hasPrefetched} footerRight="">
      <div className="coverCenter">
        {headline ? <div className="coverHeadline">{headline}</div> : null}
        {dateText ? <div className="coverDate">{dateText}</div> : null}
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
          padding: 0 160px;
        }

        .coverHeadline {
          font-family: ${FONT_FAMILY};
          font-weight: 900;
          font-size: 132px;
          line-height: 1.03;
          letter-spacing: -0.04em;
          color: #0b0b0b;

          /* くっきり */
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: geometricPrecision;

          max-width: 1680px;
          word-break: break-word;
          line-break: strict;
        }

        .coverDate {
          margin-top: 28px;
          font-family: ${FONT_FAMILY};
          font-weight: 700;
          font-size: 34px;
          line-height: 1.1;
          letter-spacing: -0.02em;
          color: rgba(11, 11, 11, 0.72);

          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: geometricPrecision;
        }

        /* Dark page 対応 */
        :global(.pageDark) .coverHeadline {
          color: #f5f7fb;
        }
        :global(.pageDark) .coverDate {
          color: rgba(245, 247, 251, 0.72);
        }
      `}</style>
    </SlidePageFrame>
  );
}
