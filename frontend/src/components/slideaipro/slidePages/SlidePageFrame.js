// src/components/slideaipro/slidePages/SlidePageFrame.js
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

export const SLIDE_BASE_W = 1920;
export const SLIDE_BASE_H = 1080;

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function SlidePageFrame({
  pageNo,
  isIntelMode,
  hasPrefetched,
  footerLeft,
  footerRight,
  children,
}) {
  const outerRef = useRef(null);
  const [scale, setScale] = useState(1);

  // 右下だけ最小限（将来 pageNo をここに出したい場合は footerRight 側で渡す）
  const cornerText = String(footerRight || "").trim();

  useIsoLayoutEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    const compute = () => {
      const rect = el.getBoundingClientRect();
      const w = rect.width || el.clientWidth || 0;
      const h = rect.height || el.clientHeight || 0;
      if (!w || !h) return;

      // 外側(レスポンシブ枠)に 1920x1080 をフィットさせる
      const sx = w / SLIDE_BASE_W;
      const sy = h / SLIDE_BASE_H;
      const next = clamp(Math.min(sx, sy), 0.05, 1);

      setScale((prev) => (Math.abs(prev - next) < 0.001 ? prev : next));
    };

    compute();

    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => compute());
      ro.observe(el);
    } else {
      window.addEventListener("resize", compute);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", compute);
    };
  }, []);

  return (
    <div
      ref={outerRef}
      className={`slidePage ${isIntelMode ? "pageDark" : "pageLight"}`}
      data-slide-page="true"
    >
      {/* 表示用：固定 1920x1080 を scale で縮小して見せる */}
      <div className="scaleOuter" style={{ transform: `scale(${scale})` }}>
        {/* これが “固定キャンバス(1920x1080)” ：export はここを掴む */}
        <div
          className="baseCanvas"
          data-slide-base="true"
          data-theme={isIntelMode ? "dark" : "light"}
        >
          <div className="pageChromeNoUI">
            <div className="contentNoUI">{children}</div>

            {cornerText ? <div className="cornerFooter">{cornerText}</div> : null}
          </div>
        </div>
      </div>

      <style jsx>{`
        /* slidePage 自体は “表示枠(レスポンシブ)” */
        .slidePage {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        /* 1920x1080 を top-left 起点で縮小 */
        .scaleOuter {
          position: absolute;
          top: 0;
          left: 0;
          width: ${SLIDE_BASE_W}px;
          height: ${SLIDE_BASE_H}px;
          transform-origin: top left;
          will-change: transform;
        }

        /* 固定キャンバス */
        .baseCanvas {
          width: ${SLIDE_BASE_W}px;
          height: ${SLIDE_BASE_H}px;
        }

        /* 修正前の “全面占有” を維持 */
        .pageChromeNoUI {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .contentNoUI {
          width: 100%;
          height: 100%;
        }

        /* 右下だけ最小限・邪魔しない・将来ページ番号を載せるための領域 */
        .cornerFooter {
          position: absolute;
          right: 14px;
          bottom: 12px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
            monospace;
          font-size: 12px;
          font-weight: 600;
          line-height: 1;
          opacity: 0.38;
          pointer-events: none;
          user-select: none;
          white-space: nowrap;
          color: ${isIntelMode ? "rgba(245,247,255,0.85)" : "rgba(0,0,0,0.55)"};
        }
      `}</style>
    </div>
  );
}
