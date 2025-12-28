// src/components/slideaipro/slidePages/ProblemPage.js
import React from "react";
import SlidePageFrame from "./SlidePageFrame";
import { resolveImageSrc } from "../utils/resolveImageSrc";

export default function ProblemPage({ slide, pageNo, isIntelMode, hasPrefetched, imageUrlByKey }) {
  const bullets = Array.isArray(slide?.bullets) ? slide.bullets : [];

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
      <div className="ppRoot ppProblem">
        <div className="twocol">
          <div className="colText">
            <div className="h1">{slide?.title || ""}</div>
            {slide?.message ? <div className="msg">{slide.message}</div> : null}

            {bullets.length ? (
              <ul className="bullets">
                {bullets.map((b, i) => (
                  <li key={`${slide.id}-problem-b-${i}`}>{String(b)}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="colImg">
            <div className="imgFrame">
              {resolvedSrc ? (
                <img src={resolvedSrc} crossOrigin="anonymous" alt={cacheKey || slide?.title || "problem"} />
              ) : (
                <div className="imgPh">image loading...</div>
              )}
            </div>
            {cacheKey ? <div className="imgKeySmall">{cacheKey}</div> : null}
          </div>
        </div>
      </div>

      {/* 将来差分（配色・質感）をここに閉じ込められる */}
      <style jsx>{`
        .ppRoot {
          width: 100%;
          height: 100%;
        }
        .ppProblem :global(.imgFrame) {
          /* 現状は無変更。後で課題だけ別トーンにしたい場合ここを編集 */
        }
      `}</style>
    </SlidePageFrame>
  );
}
