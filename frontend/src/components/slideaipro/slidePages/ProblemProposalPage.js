// src/components/slideaipro/slidePages/ProblemProposalPage.js
import React from "react";
import SlidePageFrame from "./SlidePageFrame";
import { resolveImageSrc } from "../utils/resolveImageSrc";

export default function ProblemProposalPage({
  slide,
  pageNo,
  isIntelMode,
  hasPrefetched,
  imageUrlByKey,
}) {
  const bullets = Array.isArray(slide.bullets) ? slide.bullets : [];
  const cacheKey = String(slide?.image?.cacheKey || "");
  const originalSrc = String(slide?.image?.originalSrc || "");
  const resolvedSrc = resolveImageSrc(imageUrlByKey, cacheKey, originalSrc);

  return (
    <SlidePageFrame
      pageNo={pageNo}
      isIntelMode={isIntelMode}
      hasPrefetched={hasPrefetched}
      footerRight={cacheKey ? `image: ${cacheKey}` : ""}
    >
      <div className="twocol">
        <div className="colText">
          <div className="h1">{slide.title}</div>
          {slide.message ? <div className="msg">{slide.message}</div> : null}

          {bullets.length ? (
            <ul className="bullets">
              {bullets.map((b, i) => (
                <li key={`${slide.id}-b-${i}`}>{b}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="colImg">
          <div className="imgFrame">
            {resolvedSrc ? (
              <img src={resolvedSrc} crossOrigin="anonymous" alt={cacheKey || slide.title} />
            ) : (
              <div className="imgPh">image loading...</div>
            )}
          </div>
          {cacheKey ? <div className="imgKeySmall">{cacheKey}</div> : null}
        </div>
      </div>
    </SlidePageFrame>
  );
}
