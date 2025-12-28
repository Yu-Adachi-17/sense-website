// src/components/slideaipro/slidePages/CoverPage.js
import React from "react";
import SlidePageFrame from "./SlidePageFrame";

export default function CoverPage({ slide, pageNo, isIntelMode, hasPrefetched }) {
  return (
    <SlidePageFrame pageNo={pageNo} isIntelMode={isIntelMode} hasPrefetched={hasPrefetched} footerRight="">
      <div className="coverCenter">
        <div className="coverTitle">{slide.title}</div>
        <div className="coverSub">{slide.subtitle}</div>
      </div>
    </SlidePageFrame>
  );
}
