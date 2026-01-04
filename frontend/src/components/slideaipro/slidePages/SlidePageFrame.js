// src/components/slideaipro/slidePages/SlidePageFrame.js
import React from "react";

export default function SlidePageFrame({
  pageNo,
  isIntelMode,
  hasPrefetched,
  footerLeft,
  footerRight,
  children,
}) {
  // 右下だけ最小限（将来 pageNo をここに出したい場合は footerRight 側で渡す）
  const cornerText = String(footerRight || "").trim();

  return (
    <div className={`slidePage ${isIntelMode ? "pageDark" : "pageLight"}`} data-slide-page="true">
      <div className="pageChromeNoUI">
        <div className="contentNoUI">{children}</div>

        {cornerText ? <div className="cornerFooter">{cornerText}</div> : null}

        <style jsx>{`
          /* ここで “四方のUI” を完全撤去し、コンテンツを100%占有させる */

          .pageChromeNoUI {
            position: relative;
            width: 100%;
            height: 100%;
          }

          .contentNoUI {
            width: 100%;
            height: 100%;
          }

          /* 右下だけ、最小限・邪魔しない・将来ページ番号を載せるための領域 */
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

          /* 既存CSSが .pageChrome / .content に padding/height を与えていても、
             この新クラスで “UI無しレイアウト” を強制する */
        `}</style>
      </div>
    </div>
  );
}
