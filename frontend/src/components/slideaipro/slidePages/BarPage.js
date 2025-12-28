// src/components/slideaipro/slidePages/BarPage.js
import React from "react";
import SlidePageFrame from "./SlidePageFrame";

export default function BarPage({ slide, pageNo, isIntelMode, hasPrefetched }) {
  const groups = Array.isArray(slide.barGroups) ? slide.barGroups : [];
  const maxV = Math.max(1, ...groups.map((g) => Number(g?.value ?? 0)));

  return (
    <SlidePageFrame pageNo={pageNo} isIntelMode={isIntelMode} hasPrefetched={hasPrefetched} footerRight="">
      <div className="h1">{slide.title}</div>
      {slide.message ? <div className="msg">{slide.message}</div> : null}

      <div className="barMeta">
        <div className="barAxis">
          <span className="barAxisK">{slide.yAxisName || "Value"}</span>
          <span className="barAxisU">{slide.unit ? `（${slide.unit}）` : ""}</span>
        </div>
      </div>

      <div className="barList">
        {groups.map((g, i) => {
          const v = Number(g?.value ?? 0);
          const pct = Math.max(0, Math.min(1, v / maxV));
          return (
            <div key={`${slide.id}-g-${i}`} className="barRow">
              <div className="barLabel">{String(g?.category ?? "")}</div>
              <div className="barTrack">
                <div className="barFill" style={{ width: `${Math.floor(pct * 100)}%` }} />
              </div>
              <div className="barValue">
                {Number.isFinite(v) ? v : 0}
                {slide.unit || ""}
              </div>
            </div>
          );
        })}
      </div>
    </SlidePageFrame>
  );
}
