// src/components/slideaipro/slidePages/CoverPage.js
import React, { useLayoutEffect, useRef, useState } from "react";
import SlidePageFrame from "./SlidePageFrame";

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Segoe UI", system-ui, sans-serif';

function isDateLike(s) {
  const t = String(s || "").trim();
  if (!t) return false;
  return /^\d{4}[-/.]\d{2}[-/.]\d{2}$/.test(t);
}

export default function CoverPage({ slide, pageNo, isIntelMode, hasPrefetched }) {
  const a = String(slide?.title || "").trim();
  const b = String(slide?.subtitle || "").trim();

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
    titleText = a;
    dateText = b;
  }

  const rootRef = useRef(null);
  const titleRef = useRef(null);

  const [titleHeight, setTitleHeight] = useState(0);
  const [titleFontPx, setTitleFontPx] = useState(96);
  const [oneLine, setOneLine] = useState(true);

  useLayoutEffect(() => {
    const LINE_H = 1.05;
    const MAX_FONT = 110;
    const MIN_FONT = 56;

    // まず「1行で収める」試行を優先（入るなら必ず1行）
    const ONE_LINE_MIN_FONT = 62; // ここまで落としても入らなければ折り返しへ
    const MAX_HEIGHT_RATIO = 0.38;
    const MAX_LINES = 3;

    const fit = () => {
      const root = rootRef.current;
      const el = titleRef.current;
      if (!root || !el) return;

      const rootRect = root.getBoundingClientRect();
      const rootH = Math.max(1, rootRect.height);
      const rootW = Math.max(1, rootRect.width);

      let size = Math.min(MAX_FONT, Math.max(MIN_FONT, Math.round(rootW * 0.052)));
      el.style.lineHeight = `${LINE_H}`;

      const canOneLineAt = (sz) => {
        el.style.fontSize = `${sz}px`;
        el.style.whiteSpace = "nowrap";
        el.style.overflowWrap = "normal";
        el.style.wordBreak = "normal";
        el.style.lineBreak = "normal";

        // レイアウト確定のために一度計測
        const tooTall = el.getBoundingClientRect().height > rootH * MAX_HEIGHT_RATIO;
        const tooWide = el.scrollWidth > el.clientWidth + 1; // 1px 余裕
        return !tooTall && !tooWide;
      };

      let decidedOneLine = false;
      let decidedSize = size;

      // 1行で入るなら、サイズを落としてでも 1行を採用
      for (let sz = size; sz >= Math.max(MIN_FONT, ONE_LINE_MIN_FONT); sz -= 2) {
        if (canOneLineAt(sz)) {
          decidedOneLine = true;
          decidedSize = sz;
          break;
        }
      }

      if (decidedOneLine) {
        el.style.fontSize = `${decidedSize}px`;
        el.style.whiteSpace = "nowrap";

        const r = el.getBoundingClientRect();
        setOneLine(true);
        setTitleFontPx(decidedSize);
        setTitleHeight(Math.max(0, Math.round(r.height)));
        return;
      }

      // 1行が無理なら、通常の折り返しでフィット（最大3行まで）
      el.style.whiteSpace = "normal";
      el.style.overflowWrap = "break-word"; // anywhere だと「不要な早割れ」を誘発しやすい
      el.style.wordBreak = "normal";
      el.style.lineBreak = "normal";

      let multiSize = size;
      el.style.fontSize = `${multiSize}px`;

      for (let i = 0; i < 44; i += 1) {
        const r = el.getBoundingClientRect();
        const approxLines = Math.max(1, Math.ceil(r.height / (multiSize * LINE_H) - 0.02));
        const tooTall = r.height > rootH * MAX_HEIGHT_RATIO;
        const tooManyLines = approxLines > MAX_LINES;

        if (!tooTall && !tooManyLines) break;

        multiSize -= 2;
        if (multiSize < MIN_FONT) {
          multiSize = MIN_FONT;
          break;
        }
        el.style.fontSize = `${multiSize}px`;
      }

      const finalRect = el.getBoundingClientRect();
      setOneLine(false);
      setTitleFontPx(multiSize);
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
            whiteSpace: oneLine ? "nowrap" : "normal",
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

        .coverHeroTitle {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);

          width: min(1840px, calc(100% - 140px));
          text-align: center;

          font-family: ${FONT_FAMILY};
          font-weight: 900;

          line-height: 1.05;
          letter-spacing: -0.035em;
          color: #0b0b0b;

          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: geometricPrecision;

          /* 「入るなら1行」をJSで決める。CSS側は余計な早割れ要因を置かない */
          line-break: normal;
          word-break: normal;
          overflow-wrap: break-word;

          hyphens: auto;
        }

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
