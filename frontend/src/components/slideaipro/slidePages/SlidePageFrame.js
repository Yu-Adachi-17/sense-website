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
  const left = footerLeft ?? (hasPrefetched ? "Prefetched images ready" : "Prefetching images...");

  return (
    <div className={`slidePage ${isIntelMode ? "pageDark" : "pageLight"}`} data-slide-page="true">
      <div className="pageChrome">
        <div className="pageTop">
          <div className="pageNo">Slide {pageNo}</div>
          <div className="brand">SlideAI Pro</div>
        </div>

        <div className="content">{children}</div>

        <div className="pageBottom">
          <div className="muted">{left}</div>
          <div className="muted">{footerRight || ""}</div>
        </div>
      </div>
    </div>
  );
}
