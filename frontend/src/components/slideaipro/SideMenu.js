// src/components/slideaipro/SideMenu.js
import React, { useEffect } from "react";

export default function SideMenu({
  isOpen,
  isIntelMode,
  canExport,
  onClose,
  onToggleTheme,
  onExportPNG,
  onExportPDF,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const fg = isIntelMode ? "rgba(255,255,255,0.92)" : "rgba(10,15,27,0.96)";
  const closeXColor = isIntelMode ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.75)";

  return (
    <div
      className={`smOverlay ${isIntelMode ? "smOverlayDark" : "smOverlayLight"}`}
      onClick={() => onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
    >
      <div
        className={`smPanel ${isIntelMode ? "smDark" : "smLight"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="smHeader">
          <div className="smTitle">Menu</div>
          <button className="smIconBtn" aria-label="Close" onClick={() => onClose?.()}>
            <span className="smCloseX" />
          </button>
        </div>

        <div className="smItem">
          <div className="smLeft">
            <div className="smItemTitle">Theme</div>
            <div className="smItemSub">Light / Dark</div>
          </div>
          <button className="smPillBtn" onClick={() => onToggleTheme?.()}>
            {isIntelMode ? "Dark" : "Light"}
          </button>
        </div>

        <div className="smItem">
          <div className="smLeft">
            <div className="smItemTitle">Export</div>
            <div className="smItemSub">PNG / PDF</div>
          </div>
          <div className="smActions">
            <button
              className="smActionBtn"
              disabled={!canExport}
              onClick={() => onExportPNG?.()}
              aria-label="Export PNG"
            >
              PNG
            </button>
            <button
              className="smActionBtn"
              disabled={!canExport}
              onClick={() => onExportPDF?.()}
              aria-label="Export PDF"
            >
              PDF
            </button>
          </div>
        </div>

        <style jsx>{`
          .smOverlay {
            position: fixed;
            inset: 0;
            z-index: 9000;
            display: flex;
            justify-content: flex-end;
          }
          .smOverlayLight {
            background: rgba(0, 0, 0, 0.10);
          }
          .smOverlayDark {
            background: rgba(0, 0, 0, 0.26);
          }

          .smPanel {
            width: min(560px, 72vw);
            min-width: 320px;
            height: 100%;
            padding: 22px 18px;
            box-sizing: border-box;
          }

          .smLight {
            background: #ffffff;
            color: ${fg};
            border-left: 1px solid rgba(0, 0, 0, 0.08);
            box-shadow: 0 18px 42px rgba(0, 0, 0, 0.10), 0 10px 20px rgba(0, 0, 0, 0.06);
          }

          .smDark {
            background: rgba(0, 0, 0, 0.84);
            color: ${fg};
            border-left: 1px solid rgba(255, 255, 255, 0.10);
            backdrop-filter: blur(14px);
            box-shadow: 0 18px 42px rgba(0, 0, 0, 0.42), 0 10px 20px rgba(0, 0, 0, 0.28);
          }

          .smHeader {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 4px 4px 10px;
            margin-bottom: 6px;
          }

          .smTitle {
            font-weight: 900;
            letter-spacing: 0.2px;
            font-size: 20px;
          }

          .smIconBtn {
            width: 40px;
            height: 40px;
            border: none;
            background: transparent;
            color: inherit;
            border-radius: 12px;
            display: grid;
            place-items: center;
            cursor: pointer;
          }
          .smIconBtn:active {
            transform: scale(0.98);
          }

          .smCloseX {
            width: 18px;
            height: 18px;
            position: relative;
            display: inline-block;
          }
          .smCloseX::before,
          .smCloseX::after {
            content: "";
            position: absolute;
            left: 8px;
            top: 1px;
            width: 2px;
            height: 16px;
            border-radius: 2px;
            background: ${closeXColor};
          }
          .smCloseX::before {
            transform: rotate(45deg);
          }
          .smCloseX::after {
            transform: rotate(-45deg);
          }

          .smItem {
            margin: 10px 6px 12px;
            padding: 14px 14px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            cursor: default;
            transform: translateZ(0);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            background: ${isIntelMode ? "rgba(255,255,255,0.08)" : "#ffffff"};
            border: 1px solid ${isIntelMode ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.04)"};
            box-shadow: ${isIntelMode ? "0 10px 26px rgba(0,0,0,0.32)" : "0 6px 16px rgba(0,0,0,0.05)"};
          }
          .smItem:hover {
            transform: translateY(-2px);
            box-shadow: ${isIntelMode ? "0 14px 34px rgba(0,0,0,0.40)" : "0 10px 24px rgba(0,0,0,0.08)"};
          }

          .smLeft {
            display: flex;
            flex-direction: column;
            gap: 3px;
            min-width: 0;
          }
          .smItemTitle {
            font-weight: 900;
            font-size: 14px;
            letter-spacing: 0.15px;
          }
          .smItemSub {
            font-size: 12px;
            opacity: 0.72;
          }

          .smPillBtn {
            border: 1px solid ${isIntelMode ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.08)"};
            background: ${isIntelMode ? "rgba(255,255,255,0.08)" : "#ffffff"};
            color: ${fg};
            padding: 10px 14px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 800;
            cursor: pointer;
            user-select: none;
            box-shadow: ${isIntelMode ? "0 10px 22px rgba(0,0,0,0.25)" : "0 2px 10px rgba(0,0,0,0.06)"};
            white-space: nowrap;
          }
          .smPillBtn:active {
            transform: scale(0.99);
          }

          .smActions {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-shrink: 0;
          }

          .smActionBtn {
            border: 1px solid ${isIntelMode ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.08)"};
            background: ${isIntelMode ? "rgba(255,255,255,0.10)" : "#ffffff"};
            color: ${fg};
            padding: 10px 14px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 900;
            cursor: pointer;
            user-select: none;
            white-space: nowrap;
            box-shadow: ${isIntelMode ? "0 10px 22px rgba(0,0,0,0.25)" : "0 2px 10px rgba(0,0,0,0.06)"};
          }
          .smActionBtn:disabled {
            opacity: 0.35;
            cursor: default;
            box-shadow: none;
          }
          .smActionBtn:active:not(:disabled) {
            transform: scale(0.99);
          }
        `}</style>
      </div>
    </div>
  );
}
