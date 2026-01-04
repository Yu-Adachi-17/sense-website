// src/components/slideaipro/slidePages/SlidePageFrame.js
import React, { useEffect, useMemo, useRef, useState } from "react";

const BASE_W = 1920;
const BASE_H = 1080;

export default function SlidePageFrame({
  pageNo,
  isIntelMode,
  hasPrefetched,
  footerRight = "",
  children,
}) {
  const outerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    const compute = () => {
      const w = el.clientWidth || 0;
      if (!w) return;
      const s = w / BASE_W;
      setScale(Number.isFinite(s) && s > 0 ? s : 1);
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

  const theme = isIntelMode ? "dark" : "light";

  const topRight = useMemo(() => {
    // 既存のUIを壊したくないので “何も出さない” をデフォに
    // 何か出したいならここを調整
    return "";
  }, [hasPrefetched]);

  return (
    <div ref={outerRef} className={`slidePage ${isIntelMode ? "pageDark" : "pageLight"}`} data-slide-page="true">
      {/* プレビュー用：スケールして表示 */}
      <div
        className="scaleWrap"
        style={{
          width: BASE_W,
          height: BASE_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {/* 書き出し用：実寸(1920x1080)のベース（親のtransformの影響を受けないよう、このノードをexportで直接掴む） */}
        <div className={`base ${theme}`} data-slide-base="true" style={{ width: BASE_W, height: BASE_H }}>
          <div className="pageChrome">
            <div className="pageTop">
              <div className="brand">SlideAI Pro</div>
              <div className="muted">{topRight}</div>
            </div>

            <div className="content">{children}</div>

            <div className="pageBottom">
              <div className="muted">{pageNo ? `p.${pageNo}` : ""}</div>
              <div className="muted">{footerRight || ""}</div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .scaleWrap {
          position: absolute;
          top: 0;
          left: 0;
          will-change: transform;
        }

        .base {
          position: relative; /* .pageChrome の absolute/inset をここに効かせる */
          overflow: hidden;
          border-radius: 18px;
          box-sizing: border-box;
        }

        .base.light {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          color: rgba(0, 0, 0, 0.92);
        }

        .base.dark {
          background: #0b1220;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.92);
        }
      `}</style>
    </div>
  );
}

export { BASE_W, BASE_H };
