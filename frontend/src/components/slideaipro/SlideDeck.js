// src/components/slideaipro/SlideDeck.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { slidePageRenderers } from "./slidePages";
import UnknownPage from "./slidePages/UnknownPage";

/**
 * SlideDeck
 * - #slidesRoot 配下は「Exportのキャプチャ対象DOM」
 * - Editボタンは #slidesRoot の外（兄弟要素）に置き、見た目だけ重ねることで export に写らないようにする
 *
 * props:
 * - slides, isIntelMode, hasPrefetched, imageUrlByKey (既存)
 * - onEditSlide?: (slide, index) => void （任意）
 */
export default function SlideDeck({ slides, isIntelMode, hasPrefetched, imageUrlByKey, onEditSlide }) {
  const safeSlides = Array.isArray(slides) ? slides : [];

  const stageRef = useRef(null);
  const rootRef = useRef(null);

  const [pageRects, setPageRects] = useState([]);

  const theme = isIntelMode ? "dark" : "light";

  const recomputeRects = () => {
    const stageEl = stageRef.current;
    const rootEl = rootRef.current;
    if (!stageEl || !rootEl) return;

    const stageRect = stageEl.getBoundingClientRect();

    // SlidePageFrame 側で data-slide-page="true" を付けている前提（index.js の export 側も同条件で拾っている）
    const pages = Array.from(rootEl.querySelectorAll('[data-slide-page="true"]'));

    const next = pages.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        top: r.top - stageRect.top,
        left: r.left - stageRect.left,
        width: r.width,
        height: r.height,
      };
    });

    // 変化が小さい場合はsetStateしない（無限ループ/微振動防止）
    const same =
      next.length === pageRects.length &&
      next.every((a, i) => {
        const b = pageRects[i];
        if (!b) return false;
        return (
          Math.abs(a.top - b.top) < 0.5 &&
          Math.abs(a.left - b.left) < 0.5 &&
          Math.abs(a.width - b.width) < 0.5 &&
          Math.abs(a.height - b.height) < 0.5
        );
      });

    if (!same) setPageRects(next);
  };

  // slidesが変わったら計測（初回/生成後）
  useEffect(() => {
    // 1フレーム待ってから計測（画像やフォント適用後のレイアウト反映を拾いやすくする）
    const id = requestAnimationFrame(() => recomputeRects());
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeSlides.length, theme]);

  // リサイズ/レイアウト変化を追従
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onResize = () => recomputeRects();
    window.addEventListener("resize", onResize);

    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        requestAnimationFrame(() => recomputeRects());
      });
      if (stageRef.current) ro.observe(stageRef.current);
      if (rootRef.current) ro.observe(rootRef.current);
    }

    // 画像ロードで高さが変わるケースへの保険
    const onLoadCapture = () => recomputeRects();
    window.addEventListener("load", onLoadCapture);

    // 初回
    recomputeRects();

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", onLoadCapture);
      if (ro) ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEdit = (idx) => {
    const s = safeSlides[idx];
    if (!s) return;
    if (typeof onEditSlide === "function") {
      onEditSlide(s, idx);
      return;
    }
    // noop（未接続でも落とさない）
  };

  // ボタン配置（スライド右上に固定）
  const editButtons = useMemo(() => {
    const pad = 12;
    return pageRects.map((r, idx) => {
      const top = Math.max(0, r.top + pad);
      const left = Math.max(0, r.left + r.width - pad);

      return (
        <button
          key={`edit-${idx}`}
          type="button"
          className="editBtn"
          style={{ top, left }}
          onClick={() => handleEdit(idx)}
          aria-label={`Edit slide ${idx + 1}`}
        >
          Edit
        </button>
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageRects, safeSlides.length, theme]);

  return (
    <section className="slidesWrap" aria-label="Slides Preview">
      {/* stage: relative。ここに「兄弟要素のoverlay」をabsoluteで重ねる */}
      <div ref={stageRef} className="slidesStage">
        {/* Export対象DOMはこの #slidesRoot 配下のみ */}
        <div
          ref={rootRef}
          id="slidesRoot"
          className="slidesRoot"
          data-theme={theme}
        >
          {safeSlides.map((s, idx) => {
            const kind = String(s?.kind || "");
            const Renderer = slidePageRenderers[kind] || UnknownPage;

            return (
              <Renderer
                key={s?.id || `slide-${idx}`}
                slide={s}
                pageNo={idx + 1}
                isIntelMode={isIntelMode}
                hasPrefetched={hasPrefetched}
                imageUrlByKey={imageUrlByKey}
              />
            );
          })}
        </div>

        {/* Edit overlay: slidesRoot の“外（兄弟）”。これが(B)の肝で、exportに写らない */}
        <div className="editOverlay" aria-hidden="false">
          {editButtons}
        </div>
      </div>

      <style jsx global>{`
        /* Slide-only styles (global; scoped by .slidesRoot subtree) */
        .slidesWrap {
          width: min(860px, calc(100vw - 36px));
        }

        .slidesStage {
          position: relative;
        }

        .slidesRoot {
          display: grid;
          gap: 18px;
        }

        /* ===== Edit overlay (sibling of slidesRoot) ===== */
        .editOverlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 50;
        }

        .editBtn {
          position: absolute;
          transform: translateX(-100%);
          pointer-events: auto;

          border: 1px solid rgba(0, 0, 0, 0.12);
          background: rgba(255, 255, 255, 0.92);
          color: rgba(10, 15, 27, 0.92);
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          user-select: none;
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.14);
          backdrop-filter: blur(10px);
        }

        .slidesRoot[data-theme="dark"] ~ .editOverlay .editBtn {
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(0, 0, 0, 0.55);
          color: rgba(255, 255, 255, 0.92);
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.35);
        }

        .editBtn:active {
          transform: translateX(-100%) scale(0.99);
        }

        /* ===== Existing slide styles ===== */
        .slidesRoot .slidePage {
          width: 100%;
          aspect-ratio: 16 / 9;
          border-radius: 18px;
          overflow: hidden;
          position: relative;
        }

        .slidesRoot .pageLight {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.08);
          color: rgba(0, 0, 0, 0.92);
        }
        .slidesRoot .pageDark {
          background: #0b1220;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.22);
          color: rgba(255, 255, 255, 0.92);
        }

        .slidesRoot .pageChrome {
          position: absolute;
          inset: 0;
          padding: 22px;
          display: grid;
          grid-template-rows: auto 1fr auto;
          gap: 14px;
        }

        .slidesRoot .pageTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.2px;
          opacity: 0.9;
        }
        .slidesRoot .brand {
          opacity: 0.85;
        }

        .slidesRoot .content {
          min-height: 0;
          display: grid;
          grid-template-rows: auto auto 1fr;
          gap: 10px;
        }

        .slidesRoot .h1 {
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 0.2px;
        }

        .slidesRoot .pageBottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          opacity: 0.72;
        }
        .slidesRoot .muted {
          opacity: 0.78;
        }

        .slidesRoot .coverCenter {
          display: grid;
          place-items: center;
          text-align: center;
          padding: 0 24px;
          gap: 10px;
        }
        .slidesRoot .coverTitle {
          font-size: 34px;
          font-weight: 900;
          letter-spacing: 0.2px;
          line-height: 1.15;
        }
        .slidesRoot .coverSub {
          font-size: 14px;
          font-weight: 800;
          opacity: 0.72;
        }

        .slidesRoot .msg {
          margin-top: 6px;
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.45;
        }
        .slidesRoot[data-theme="dark"] .msg {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .slidesRoot[data-theme="light"] .msg {
          background: rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.06);
        }

        .slidesRoot .twocol {
          display: grid;
          grid-template-columns: 1.12fr 0.88fr;
          gap: 14px;
          align-items: stretch;
          min-height: 0;
        }
        .slidesRoot .colText {
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .slidesRoot .bullets {
          margin: 0;
          padding-left: 18px;
          display: grid;
          gap: 8px;
          font-size: 14px;
          line-height: 1.42;
          font-weight: 700;
          opacity: 0.92;
        }

        .slidesRoot .colImg {
          min-height: 0;
          display: grid;
          grid-template-rows: 1fr auto;
          gap: 8px;
        }

        .slidesRoot .imgFrame {
          border-radius: 14px;
          overflow: hidden;
          position: relative;
        }
        .slidesRoot[data-theme="dark"] .imgFrame {
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
        }
        .slidesRoot[data-theme="light"] .imgFrame {
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: rgba(0, 0, 0, 0.02);
        }

        .slidesRoot .imgFrame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .slidesRoot .imgPh {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          font-size: 12px;
          opacity: 0.6;
        }

        .slidesRoot .imgKeySmall {
          font-size: 11px;
          opacity: 0.72;
          word-break: break-all;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
            monospace;
        }

        .slidesRoot .twoBox {
          margin-top: 10px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          min-height: 0;
        }

        .slidesRoot .box {
          border-radius: 14px;
          padding: 12px 12px;
          min-height: 0;
        }
        .slidesRoot[data-theme="dark"] .box {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
        }
        .slidesRoot[data-theme="light"] .box {
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: rgba(0, 0, 0, 0.02);
        }

        .slidesRoot .boxTitle {
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.2px;
          opacity: 0.85;
          margin-bottom: 10px;
        }

        .slidesRoot .barMeta {
          margin-top: 10px;
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }

        .slidesRoot .barAxis {
          font-size: 13px;
          font-weight: 900;
          opacity: 0.9;
        }
        .slidesRoot .barAxisU {
          margin-left: 6px;
          font-size: 12px;
          opacity: 0.7;
          font-weight: 800;
        }

        .slidesRoot .barList {
          margin-top: 12px;
          display: grid;
          gap: 10px;
        }

        .slidesRoot .barRow {
          display: grid;
          grid-template-columns: 1fr 2.2fr auto;
          gap: 10px;
          align-items: center;
        }

        .slidesRoot .barLabel {
          font-size: 13px;
          font-weight: 800;
          opacity: 0.9;
        }

        .slidesRoot .barTrack {
          height: 12px;
          border-radius: 999px;
          overflow: hidden;
        }
        .slidesRoot[data-theme="dark"] .barTrack {
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
        }
        .slidesRoot[data-theme="light"] .barTrack {
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: rgba(0, 0, 0, 0.04);
        }

        .slidesRoot .barFill {
          height: 100%;
          border-radius: 999px;
        }
        .slidesRoot[data-theme="dark"] .barFill {
          background: rgba(255, 255, 255, 0.86);
        }
        .slidesRoot[data-theme="light"] .barFill {
          background: rgba(0, 0, 0, 0.78);
        }

        .slidesRoot .barValue {
          font-size: 12px;
          font-weight: 900;
          opacity: 0.9;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }

        .slidesRoot .tableWrap {
          margin-top: 12px;
          border-radius: 14px;
          overflow: hidden;
        }
        .slidesRoot[data-theme="dark"] .tableWrap {
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
        .slidesRoot[data-theme="light"] .tableWrap {
          border: 1px solid rgba(0, 0, 0, 0.08);
        }

        .slidesRoot .taskTable {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .slidesRoot .taskTable thead th {
          text-align: left;
          padding: 10px 12px;
          font-weight: 900;
          letter-spacing: 0.2px;
        }
        .slidesRoot[data-theme="dark"] .taskTable thead th {
          background: rgba(255, 255, 255, 0.06);
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        }
        .slidesRoot[data-theme="light"] .taskTable thead th {
          background: rgba(0, 0, 0, 0.03);
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        }

        .slidesRoot .taskTable tbody td {
          padding: 10px 12px;
          font-weight: 700;
          opacity: 0.92;
        }
        .slidesRoot[data-theme="dark"] .taskTable tbody td {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .slidesRoot[data-theme="light"] .taskTable tbody td {
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }

        .slidesRoot .taskTable tbody tr:last-child td {
          border-bottom: none;
        }
      `}</style>
    </section>
  );
}
