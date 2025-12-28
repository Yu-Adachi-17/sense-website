// src/components/slideaipro/slidePages/ProblemPage.js
import React, { useMemo } from "react";
import SlidePageFrame from "./SlidePageFrame";
import { resolveImageSrc } from "../utils/resolveImageSrc";

function normalizeBulletString(raw) {
  let s = String(raw || "");
  // Swift側の weirdSeparators 相当
  s = s.replace(/\u2028|\u2029|\u0085/g, " ");
  s = s.trim();
  s = s.replace(/\s+/g, " ");
  return s;
}

export default function ProblemPage({ slide, pageNo, isIntelMode, hasPrefetched, imageUrlByKey }) {
  const bulletsRaw = Array.isArray(slide?.bullets) ? slide.bullets : [];

  const problems = useMemo(() => {
    return bulletsRaw
      .map(normalizeBulletString)
      .filter((v) => v.length > 0)
      .slice(0, 5);
  }, [bulletsRaw]);

  const cacheKey = String(slide?.image?.cacheKey || "");
  const originalSrc = String(slide?.image?.originalSrc || "");
  const resolvedSrc = resolveImageSrc(imageUrlByKey, cacheKey, originalSrc);

  const headerTitle = `${pageNo}. ${String(slide?.title || "").trim()}`.trim();
  const bottomMessage = String(slide?.message || "").trim();

  return (
    <SlidePageFrame
      pageNo={pageNo}
      isIntelMode={isIntelMode}
      hasPrefetched={hasPrefetched}
      footerRight={cacheKey ? `image: ${cacheKey}` : ""}
    >
      <div className="ppRoot ppProblemLikeSwift">
        <div className="ppMain">
          {/* Header (Swift: "\(pageNumber). \(title)") */}
          <div className="ppHeader">
            <div className="ppTitle">{headerTitle}</div>
          </div>

          {/* Body: Left Image (square) + Right Bullets */}
          <div className="ppBody">
            <div className="ppImageCol" aria-label="Problem image">
              <div className="ppImageSquare">
                {resolvedSrc ? (
                  <img
                    src={resolvedSrc}
                    crossOrigin="anonymous"
                    alt={cacheKey || slide?.title || "problem"}
                    className="ppImg"
                  />
                ) : (
                  <div className="ppImgPh">image loading...</div>
                )}
              </div>
            </div>

            <div className="ppBulletsCol" aria-label="Problem bullets">
              {problems.length ? (
                <ul className="ppBullets">
                  {problems.map((b, i) => (
                    <li key={`${slide?.id || "slide"}-problem-${i}`} className="ppBulletRow">
                      <span className="ppBulletDot" aria-hidden="true" />
                      <span className="ppBulletText">{b}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="ppBulletsEmpty" />
              )}
            </div>
          </div>

          {/* Bottom (Swift: BottomMessagePlainView + problemGradient) */}
          {bottomMessage ? (
            <div className="ppBottom">
              <div className="ppBottomText">{bottomMessage}</div>
            </div>
          ) : (
            <div className="ppBottomEmpty" />
          )}
        </div>
      </div>

      <style jsx>{`
        .ppRoot {
          width: 100%;
          height: 100%;
        }

        /* Swift: horizontalPadding = 24 */
        .ppMain {
          width: 100%;
          height: 100%;
          padding: 0 24px;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          justify-content: flex-start;
          box-sizing: border-box;
        }

        /* Swift: headerTopPadding=26, headerFontSize=64 */
        .ppHeader {
          padding-top: 26px;
          padding-bottom: 10px;
        }
        .ppTitle {
          font-size: 64px;
          font-weight: 900;
          line-height: 1.05;
          letter-spacing: -0.5px;
          color: #000;
          white-space: pre-wrap; /* 省略禁止 */
          overflow: visible;
        }

        /* Body layout (Swift: gap=56, leftW≈46%) */
        .ppBody {
          flex: 1;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 56px;
        }

        .ppImageCol {
          flex: 0 0 46%;
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: flex-start;
        }

        /* Square image: Swift imageSize = min(leftW, h*0.92) */
        .ppImageSquare {
          width: min(100%, 520px);
          aspect-ratio: 1 / 1;
          border-radius: 10px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ppImg {
          width: 100%;
          height: 100%;
          object-fit: cover; /* scaledToFill */
          display: block;
        }

        .ppImgPh {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 700;
          color: rgba(0, 0, 0, 0.55);
        }

        .ppBulletsCol {
          flex: 1 1 auto;
          min-width: 0;
          height: 100%;
          display: flex;
          align-items: center; /* Swift: bullets are vertically centered */
          justify-content: flex-start;
        }

        /* Big bold bullets like Swift */
        .ppBullets {
          list-style: none;
          padding: 0;
          margin: 0;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 22px; /* Swift rowSpacing */
        }

        .ppBulletRow {
          display: flex;
          align-items: center;
          gap: 18px; /* Swift bulletToTextSpacing */
          min-width: 0;
        }

        .ppBulletDot {
          width: 16px; /* Swift bulletSize */
          height: 16px;
          border-radius: 999px;
          background: #000;
          flex: 0 0 auto;
        }

        /* Swift: weight .black, large size (fit is Swift側) */
        .ppBulletText {
          font-weight: 900;
          color: #000;
          line-height: 1.08;
          white-space: pre-wrap; /* 省略禁止 */
          word-break: break-word;

          /* スライド比率に合わせて“見た目をSwift寄せ” */
          font-size: clamp(40px, 3.4vw, 56px);
        }

        .ppBulletsEmpty {
          width: 100%;
          height: 100%;
        }

        /* Bottom message (center + gradient) */
        .ppBottom {
          padding-top: 10px;
          padding-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ppBottomText {
          font-weight: 900;
          line-height: 1.05;
          text-align: center;
          white-space: pre-wrap; /* 省略禁止 */
          font-size: clamp(56px, 4.2vw, 74px);

          background: linear-gradient(
            135deg,
            rgba(199, 26, 46, 1) 0%,
            rgba(235, 66, 31, 0.98) 55%,
            rgba(255, 140, 41, 0.95) 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .ppBottomEmpty {
          padding-bottom: 24px;
        }

        /* 画面が狭い場合の最低限の破綻回避（基本はスライド固定サイズ前提） */
        @media (max-width: 900px) {
          .ppTitle {
            font-size: 52px;
          }
          .ppBody {
            gap: 36px;
          }
          .ppImageSquare {
            width: min(100%, 420px);
          }
        }
      `}</style>
    </SlidePageFrame>
  );
}
