// src/components/slideaipro/slidePages/BarPage.js
import React, { useMemo } from "react";
import SlidePageFrame from "./SlidePageFrame";

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Segoe UI", system-ui, sans-serif';

// Swift: ExpectedEffectsPalette.lastBar 相当
const LAST_BAR_GRADIENT =
  "linear-gradient(135deg, rgba(13,46,122,1.00) 0%, rgba(26,86,199,0.98) 55%, rgba(0,122,255,0.92) 100%)";

// Swift: ExpectedEffectsPalette.otherBars 相当
const OTHER_BAR_GRADIENT =
  "linear-gradient(135deg, rgba(224,230,235,0.70) 0%, rgba(212,220,230,0.62) 55%, rgba(199,209,219,0.56) 100%)";

// Swift: accentGradient 相当（BottomMessage）
const ACCENT_GRADIENT =
  "linear-gradient(90deg, rgba(5,71,199,1.00) 0%, rgba(15,123,245,0.98) 55%, rgba(26,199,235,0.96) 100%)";

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function hasNonAscii(s) {
  return /[^\x00-\x7F]/.test(String(s || ""));
}

function formatValue(v) {
  const n = toNumber(v);
  const isInt = Math.floor(n) === n;
  if (isInt) return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
}

function buildTitle(pageNo, rawTitle) {
  const t = String(rawTitle ?? "").trim();
  if (!t) return `${pageNo}.`;
  // 既に "N." で始まっているなら重複させない
  if (/^\d+\s*\./.test(t)) return t;
  return `${pageNo}. ${t}`;
}

/**
 * Swift makePoints(from:) の挙動をJS側で吸収
 * - g.value があるならそれを採用
 * - g.bars[] があるなら label="actual" 優先（なければ先頭）
 */
function normalizePoints(groups) {
  const actualKeyJa = "actual"; // JS側はローカライズ前提が薄いので最低限
  const actualKeyEn = "Actual";
  const actualKeyLower = "actual";

  return (Array.isArray(groups) ? groups : [])
    .map((g) => {
      const category = String(g?.category ?? "");
      let value = null;

      if (g && Object.prototype.hasOwnProperty.call(g, "value")) {
        value = toNumber(g?.value);
      } else if (Array.isArray(g?.bars) && g.bars.length) {
        const bars = g.bars;
        const actual =
          bars.find((b) => String(b?.label ?? "").toLowerCase() === actualKeyLower) ||
          bars.find((b) => String(b?.label ?? "") === actualKeyEn) ||
          bars.find((b) => String(b?.label ?? "") === actualKeyJa) ||
          bars[0];
        value = toNumber(actual?.value);
      } else {
        value = 0;
      }

      return { category, value };
    })
    .filter((p) => p.category.length > 0);
}

export default function BarPage({ slide, pageNo, isIntelMode, hasPrefetched }) {
  const groups = Array.isArray(slide?.barGroups) ? slide.barGroups : [];

  const points = useMemo(() => normalizePoints(groups), [groups]);
  const allZero = points.length > 0 && points.every((p) => toNumber(p.value) === 0);

  const n = Math.max(points.length, 1);
  const maxY = Math.max(1, ...points.map((p) => toNumber(p.value)));
  const scaledMaxY = maxY / 0.75;

  // Swift: value/x font sizing
  const valueFontSize = n <= 4 ? 30 : n <= 8 ? 26 : 22;
  const xAxisFontSize = n <= 4 ? 24 : n <= 8 ? 22 : 20;

  // Swift: Bar width ratio
  const barRatio = n <= 4 ? 0.55 : n <= 8 ? 0.42 : 0.32;

  // 見た目の “余白感” をSwiftに寄せる（少数ならバー間隔を大きく）
  const colGap = n <= 2 ? 240 : n <= 4 ? 160 : n <= 8 ? 92 : 56;

  const textColor = isIntelMode ? "rgba(255,255,255,0.96)" : "#0B0B0B";
  const baseLineColor = isIntelMode ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.12)";

  const unit = String(slide?.unit ?? "").trim();
  const unitLabel = unit ? (hasNonAscii(unit) ? "単位" : "Unit") : "";

  const bottomText = String(slide?.importantMessage ?? slide?.message ?? "").trim();
  const headerText = buildTitle(slide?.pageNumber ?? pageNo, slide?.title);

  return (
    <SlidePageFrame
      pageNo={pageNo}
      isIntelMode={isIntelMode}
      hasPrefetched={hasPrefetched}
      footerRight=""
    >
      <div
        className="eefRoot"
        style={{
          ["--eefText" as any]: textColor,
          ["--eefBaseline" as any]: baseLineColor,
          ["--eefValueSize" as any]: `${valueFontSize}px`,
          ["--eefXAxisSize" as any]: `${xAxisFontSize}px`,
          ["--eefBarRatio" as any]: barRatio,
          ["--eefColGap" as any]: `${colGap}px`,
        }}
      >
        {/* Header */}
        <div className="eefHeader" style={{ color: textColor }}>
          {headerText}
        </div>

        {/* Unit (top-right) */}
        <div className="eefUnitRow">
          <div className="eefUnit" style={{ color: textColor }}>
            {unitLabel && unit ? `${unitLabel}: ${unit}` : ""}
          </div>
        </div>

        {/* Chart */}
        {!points.length || allZero ? (
          <div className="eefSpacer" />
        ) : (
          <div className="eefChartWrap">
            <div className="eefPlotArea">
              <div className="eefCols" style={{ gridTemplateColumns: `repeat(${points.length}, 1fr)` }}>
                {points.map((p, idx) => {
                  const isLast = idx === points.length - 1;
                  const v = toNumber(p.value);
                  const hPct = Math.max(0, Math.min(1, v / scaledMaxY));
                  const barH = `${Math.round(hPct * 1000) / 10}%`;

                  return (
                    <div className="eefCol" key={`${slide?.id || "slide"}-p-${idx}`}>
                      <div className="eefValue" style={{ color: textColor }}>
                        {formatValue(v)}
                      </div>

                      <div className="eefBarSlot">
                        <div
                          className="eefBar"
                          style={{
                            height: barH,
                            background: isLast ? LAST_BAR_GRADIENT : OTHER_BAR_GRADIENT,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Baseline */}
              <div className="eefBaseline" />
            </div>

            {/* X Axis labels */}
            <div className="eefXAxis" style={{ gridTemplateColumns: `repeat(${points.length}, 1fr)` }}>
              {points.map((p, idx) => (
                <div className="eefXLabel" key={`${slide?.id || "slide"}-x-${idx}`} style={{ color: textColor }}>
                  {p.category}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom message (accent gradient text) */}
        {bottomText ? (
          <div className="eefBottom">
            <span className="eefBottomText">{bottomText}</span>
          </div>
        ) : null}

        <style jsx>{`
          .eefRoot {
            height: 100%;
            width: 100%;
            padding: 0 24px;
            box-sizing: border-box;
            font-family: ${FONT_FAMILY};
            display: flex;
            flex-direction: column;
          }

          .eefHeader {
            margin-top: 26px;
            margin-bottom: 14px;
            font-size: 64px;
            font-weight: 900;
            letter-spacing: -0.7px;
            line-height: 1.05;
            white-space: normal;
            overflow: visible;
            text-overflow: clip;
          }

          .eefUnitRow {
            display: flex;
            justify-content: flex-end;
            align-items: flex-end;
            min-height: 34px;
          }

          .eefUnit {
            font-size: 22px;
            font-weight: 800;
            letter-spacing: -0.15px;
            padding-bottom: 8px;
            padding-right: 8px;
            white-space: nowrap;
          }

          .eefSpacer {
            flex: 1 1 auto;
            min-height: 0;
          }

          .eefChartWrap {
            flex: 1 1 auto;
            min-height: 0;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
          }

          .eefPlotArea {
            position: relative;
            flex: 1 1 auto;
            min-height: 0;
            padding: 10px 80px 0 80px; /* Swift: top 10 相当 / 横の余白を大きく */
            box-sizing: border-box;
            display: flex;
            align-items: flex-end;
          }

          .eefCols {
            width: 100%;
            height: 100%;
            display: grid;
            column-gap: var(--eefColGap);
            align-items: end;
            justify-items: center;
          }

          .eefCol {
            width: 100%;
            height: 100%;
            min-width: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
          }

          .eefValue {
            font-size: var(--eefValueSize);
            font-weight: 900;
            letter-spacing: -0.25px;
            line-height: 1.0;
            margin-bottom: 14px;
            white-space: nowrap;
          }

          .eefBarSlot {
            width: 100%;
            height: 62%;
            display: flex;
            align-items: flex-end;
            justify-content: center;
          }

          .eefBar {
            width: calc(100% * var(--eefBarRatio));
            border-radius: 18px;
            box-shadow: 0 18px 40px rgba(0, 0, 0, 0.06);
          }

          .eefBaseline {
            position: absolute;
            left: 80px;
            right: 80px;
            bottom: 0;
            height: 1px;
            background: var(--eefBaseline);
          }

          .eefXAxis {
            display: grid;
            column-gap: var(--eefColGap);
            padding: 12px 80px 0 80px;
            box-sizing: border-box;
            align-items: start;
            justify-items: center;
          }

          .eefXLabel {
            font-size: var(--eefXAxisSize);
            font-weight: 900;
            letter-spacing: -0.25px;
            line-height: 1.05;
            text-align: center;

            /* ✅ 省略（…）禁止 */
            white-space: normal;
            overflow: visible;
            text-overflow: clip;

            /* 2行目まで想定（Swift lineLimit(2) + fixedSize(vertical: true) 寄せ） */
            display: block;
            max-width: 520px;
            word-break: break-word;
          }

          .eefBottom {
            padding-top: 10px;
            padding-bottom: 24px;
            display: flex;
            justify-content: center;
            align-items: flex-end;
          }

          .eefBottomText {
            font-size: 66px;
            font-weight: 900;
            letter-spacing: -0.6px;
            line-height: 1.05;
            text-align: center;

            /* ✅ 省略（…）禁止 */
            white-space: normal;
            overflow: visible;
            text-overflow: clip;

            /* Swift: accentGradient */
            background: ${ACCENT_GRADIENT};
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }
        `}</style>
      </div>
    </SlidePageFrame>
  );
}
