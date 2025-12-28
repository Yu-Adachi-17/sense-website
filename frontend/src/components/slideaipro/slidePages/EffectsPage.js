// src/components/slideaipro/slidePages/EffectsPage.js
import React from "react";
import SlidePageFrame from "./SlidePageFrame";

export default function EffectsPage({ slide, pageNo, isIntelMode, hasPrefetched }) {
  const before = Array.isArray(slide.before) ? slide.before : [];
  const after = Array.isArray(slide.after) ? slide.after : [];

  return (
    <SlidePageFrame pageNo={pageNo} isIntelMode={isIntelMode} hasPrefetched={hasPrefetched} footerRight="">
      <div className="h1">{slide.title}</div>
      {slide.message ? <div className="msg">{slide.message}</div> : null}

      <div className="twoBox">
        <div className="box">
          <div className="boxTitle">Before</div>
          <ul className="bullets">
            {before.map((x, i) => (
              <li key={`${slide.id}-bf-${i}`}>{x}</li>
            ))}
          </ul>
        </div>

        <div className="box">
          <div className="boxTitle">After</div>
          <ul className="bullets">
            {after.map((x, i) => (
              <li key={`${slide.id}-af-${i}`}>{x}</li>
            ))}
          </ul>
        </div>
      </div>
    </SlidePageFrame>
  );
}
