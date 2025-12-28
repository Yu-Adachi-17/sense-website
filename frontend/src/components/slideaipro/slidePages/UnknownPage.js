// src/components/slideaipro/slidePages/UnknownPage.js
import React from "react";
import SlidePageFrame from "./SlidePageFrame";

export default function UnknownPage({ slide, pageNo, isIntelMode, hasPrefetched }) {
  return (
    <SlidePageFrame pageNo={pageNo} isIntelMode={isIntelMode} hasPrefetched={hasPrefetched} footerRight="">
      <div className="h1">{slide.title || "Slide"}</div>
    </SlidePageFrame>
  );
}
