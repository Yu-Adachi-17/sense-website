// src/components/slideaipro/slidePages/TasksPage.js
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import SlidePageFrame from "./SlidePageFrame";

const BASE_W = 1920;
const BASE_H = 1080;

const MIN_DURATION_MS = 24 * 60 * 60 * 1000; // 24h
const FIXED_BAR_RATIO = 0.2;
const MAX_ROWS = 10;

// ✅ 5だと「6タスク中1つ落ちる」ケースが出る（今回のバグ）ので、少数時は全表示できる上限に
const MAX_TICKS = 7;

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Segoe UI", system-ui, sans-serif';

// パース強め（"YYYY-MM-DD HH:mm" / "YYYY-MM-DD" / ISO を許容）
function parseDeadline(v) {
  if (!v) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;

  const s = String(v).trim();
  if (!s) return null;

  // ISO系は Date に任せる
  const isoTry = new Date(s);
  if (!Number.isNaN(isoTry.getTime())) return isoTry;

  // "YYYY-MM-DD HH:mm" / "YYYY-MM-DD HH:mm:ss"
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const yy = Number(m[1]);
    const mo = Number(m[2]);
    const dd = Number(m[3]);
    const hh = m[4] != null ? Number(m[4]) : 0;
    const mi = m[5] != null ? Number(m[5]) : 0;
    const ss = m[6] != null ? Number(m[6]) : 0;
    const d = new Date(yy, mo - 1, dd, hh, mi, ss);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

function pad2(n) {
  const x = Math.floor(Math.abs(Number(n) || 0));
  return x < 10 ? `0${x}` : `${x}`;
}
function fmtDateMMDD(d) {
  return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function fmtTimeHM(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function uniqByTimeSorted(dates) {
  const map = new Map();
  for (const d of dates) map.set(d.getTime(), d);
  return Array.from(map.values()).sort((a, b) => a.getTime() - b.getTime());
}

function pickEvenly(list, k) {
  if (list.length <= k) return list;
  if (k <= 1) return [list[0]];

  const out = [];
  for (let i = 0; i < k; i++) {
    const idx = Math.floor((i * (list.length - 1)) / (k - 1));
    out.push(list[idx]);
  }
  return uniqByTimeSorted(out);
}

function buildTitle(pageNo, rawTitle) {
  const t = String(rawTitle ?? "").trim();
  if (!t) return `${pageNo}.`;
  if (/^\d+\s*\./.test(t)) return t;
  return `${pageNo}. ${t}`;
}

// margin を含めた高さ（Axis分スペーサを作るため）
function outerHeightWithMargins(el) {
  if (!el) return 0;
  const r = el.getBoundingClientRect();
  const cs = window.getComputedStyle(el);
  const mt = Number.parseFloat(cs.marginTop || "0") || 0;
  const mb = Number.parseFloat(cs.marginBottom || "0") || 0;
  return r.height + mt + mb;
}

const BAR_GRADIENTS = [
  "linear-gradient(90deg, #5AC8FA 0%, #D6A6FF 55%, #FFB3D5 100%)",
  "linear-gradient(90deg, #7DFFB2 0%, #DFFF65 55%, #FFE56B 100%)",
  "linear-gradient(90deg, #FFD76A 0%, #FFB25B 55%, #FF7D7D 100%)",
  "linear-gradient(90deg, #FF79B0 0%, #FFB56B 55%, #FFE36A 100%)",
  "linear-gradient(90deg, #9BE7FF 0%, #6BCBFF 55%, #4FB6FF 100%)",
  "linear-gradient(90deg, #B6E3FF 0%, #B7B9FF 55%, #FFB9E6 100%)",
  "linear-gradient(90deg, #9DFFEA 0%, #7CFF9C 55%, #E9FF6A 100%)",
  "linear-gradient(90deg, #FFC37A 0%, #FF8A7A 55%, #FF6FAF 100%)",
  "linear-gradient(90deg, #A9FF7A 0%, #7AE2FF 55%, #A07AFF 100%)",
  "linear-gradient(90deg, #FFB3B3 0%, #FFD6A6 55%, #C7F3FF 100%)",
];

export default function TasksPage({ slide, pageNo, isIntelMode, hasPrefetched }) {
  const rootRef = useRef(null);
  const axisRef = useRef(null);
  const plotRef = useRef(null);

  // Proposal/Bar と同じ：16:9スケール追従（ヘッダー/余白/小要素の統一）
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const recompute = () => {
      const rect = root.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      const rawScale = Math.min(W / BASE_W, H / BASE_H);
      setScale(clamp(rawScale, 0.72, 1.35));
    };

    const ro = new ResizeObserver(() => requestAnimationFrame(recompute));
    ro.observe(root);

    requestAnimationFrame(recompute);
    if (typeof document !== "undefined" && document?.fonts?.ready) {
      document.fonts.ready.then(() => requestAnimationFrame(recompute));
    }

    return () => ro.disconnect();
  }, []);

  const prepared = useMemo(() => {
    const rows = Array.isArray(slide?.rows) ? slide.rows : [];

    const raw = rows
      .map((r) => {
        const title = String(r?.title ?? "").trim();
        const assignee = String(r?.assignee ?? "").trim();
        const deadline = parseDeadline(r?.deadline);
        return { title, assignee, deadline };
      })
      .filter((x) => x.title && x.assignee && x.deadline && !Number.isNaN(x.deadline.getTime()));

    if (!raw.length) {
      return { jobs: [], axisStartMs: 0, axisEndMs: 0, ticks: [] };
    }

    const capped = raw.slice(0, MAX_ROWS);

    // deadline(min/max)から期間→固定バー長(=期間×0.20)
    const ends = capped.map((x) => x.deadline);
    const minEnd = ends.reduce((a, b) => (a.getTime() < b.getTime() ? a : b));
    const maxEnd = ends.reduce((a, b) => (a.getTime() > b.getTime() ? a : b));

    let total = maxEnd.getTime() - minEnd.getTime();
    if (total < MIN_DURATION_MS) total = MIN_DURATION_MS;

    const fixedDuration = total * FIXED_BAR_RATIO;

    let jobs = capped.map((x, i) => {
      const endMs = x.deadline.getTime();
      const startMs = endMs - fixedDuration;
      return {
        taskTitle: x.title,
        assignee: x.assignee,
        startMs,
        endMs,
        colorIndex: i,
      };
    });

    jobs = jobs.sort((a, b) => a.startMs - b.startMs);

    const minStartMs = jobs.reduce((m, j) => Math.min(m, j.startMs), jobs[0].startMs);
    const maxEndMs = jobs.reduce((m, j) => Math.max(m, j.endMs), jobs[0].endMs);

    let axisRange = maxEndMs - minStartMs;
    if (axisRange < MIN_DURATION_MS) axisRange = MIN_DURATION_MS;

    // ✅ 左側の“無駄な空白”を減らして、実表示を広く使う
    const pad = axisRange * 0.04;

    const axisStartMs = minStartMs - pad;
    const axisEndMs = maxEndMs + pad;

    // ✅ 期限表示（Axisの文字）が落ちないように：少数は全表示、増えたら間引き
    const uniqueEnds = uniqByTimeSorted(jobs.map((j) => new Date(j.endMs)));
    const tickMax = Math.min(MAX_TICKS, uniqueEnds.length);
    const ticks = uniqueEnds.length <= tickMax ? uniqueEnds : pickEvenly(uniqueEnds, tickMax);

    return { jobs, axisStartMs, axisEndMs, ticks };
  }, [slide]);

  const { jobs, axisStartMs, axisEndMs, ticks } = prepared;

  const axisRangeMs = useMemo(() => {
    if (!jobs.length) return 1;
    let r = axisEndMs - axisStartMs;
    if (r < MIN_DURATION_MS) r = MIN_DURATION_MS;
    return r;
  }, [jobs.length, axisStartMs, axisEndMs]);

  const themeVars = useMemo(() => {
    if (isIntelMode) {
      return {
        "--tp-fg": "rgba(255,255,255,0.95)",
        "--tp-muted": "rgba(255,255,255,0.55)",
        "--tp-line": "rgba(255,255,255,0.10)",
        "--tp-dash": "rgba(255,255,255,0.22)",
      };
    }
    return {
      "--tp-fg": "rgba(0,0,0,0.92)",
      "--tp-muted": "rgba(0,0,0,0.42)",
      "--tp-line": "rgba(0,0,0,0.06)",
      "--tp-dash": "rgba(0,0,0,0.18)",
    };
  }, [isIntelMode]);

  // === 「必ず収まる」レイアウト算出 ===
  const [layoutVars, setLayoutVars] = useState({
    axisOuterPx: 0,

    plotPadT: 24,
    plotPadB: 66,

    rowH: 80,
    barH: 54,
    barTop: 12,

    labelPadTop: 10,
    assigneeMt: 6,

    titleFs: 20,
    assigneeFs: 16,
  });

  useLayoutEffect(() => {
    if (!jobs.length) return;

    const root = rootRef.current;
    if (!root) return;

    const measure = () => {
      const axisOuterPx = outerHeightWithMargins(axisRef.current);

      const plotEl = plotRef.current;
      const plotH = plotEl ? plotEl.clientHeight : 0;

      const plotPadT = plotH > 0 ? Math.round(clamp(plotH * 0.042, 16, 30)) : 22;
      const plotPadB = plotH > 0 ? Math.round(clamp(plotH * 0.10, 46, 86)) : 66;

      const n = Math.max(1, jobs.length);

      const innerPlotH = Math.max(0, plotH - plotPadT - plotPadB);
      const rowH0 = innerPlotH > 0 ? Math.floor(innerPlotH / n) : 1;

      let rowH = Math.min(150, Math.max(1, rowH0));
      if (innerPlotH > 0 && rowH * n > innerPlotH) rowH = rowH0;

      const minInner = Math.max(1, rowH - 10);
      let barH = Math.round(rowH * 0.62);
      barH = clamp(barH, 16, minInner);

      let barTop = Math.floor((rowH - barH) / 2);
      barTop = clamp(barTop, 2, Math.max(2, rowH - barH));

      const titleFs = clamp(Math.round(rowH * 0.20), 12, 22);
      const assigneeFs = clamp(Math.round(rowH * 0.16), 11, 18);
      const labelPadTop = clamp(Math.round(rowH * 0.12), 2, 14);
      const assigneeMt = clamp(Math.round(rowH * 0.06), 1, 8);

      setLayoutVars({
        axisOuterPx,
        plotPadT,
        plotPadB,
        rowH,
        barH,
        barTop,
        labelPadTop,
        assigneeMt,
        titleFs,
        assigneeFs,
      });
    };

    measure();

    const ro = new ResizeObserver(() => measure());
    ro.observe(root);
    if (axisRef.current) ro.observe(axisRef.current);
    if (plotRef.current) ro.observe(plotRef.current);
    return () => ro.disconnect();
  }, [jobs.length, isIntelMode, slide?.title]);

  function tickStyle(ms) {
    const xPct = Math.min(1, Math.max(0, (ms - axisStartMs) / axisRangeMs));
    if (xPct < 0.06) return { left: `${xPct * 100}%`, transform: "translateX(0%)", textAlign: "left" };
    if (xPct > 0.94) return { left: `${xPct * 100}%`, transform: "translateX(-100%)", textAlign: "right" };
    return { left: `${xPct * 100}%`, transform: "translateX(-50%)", textAlign: "center" };
  }

  const headerFont = Math.round(clamp(58 * scale, 46, 60));
  const tickFont = Math.round(clamp(16 * scale, 13, 18));
  const padX = Math.round(clamp(24 * scale, 18, 28));
  const headerTop = Math.round(clamp(26 * scale, 20, 30));
  const headerBottom = Math.round(clamp(14 * scale, 10, 16));
  const bodyGap = Math.round(clamp(18 * scale, 14, 22));
  const leftW = Math.round(clamp(340 * scale, 250, 420));

  const cssVars = useMemo(() => {
    return {
      ...themeVars,

      "--tpPadX": `${padX}px`,
      "--tpHeaderTop": `${headerTop}px`,
      "--tpHeaderBottom": `${headerBottom}px`,
      "--tpHeaderFont": `${headerFont}px`,
      "--tpHeaderLS": `${(-0.7 * scale).toFixed(2)}px`,

      "--tpTickFs": `${tickFont}px`,
      "--tpTickLS": `${(-0.12 * scale).toFixed(2)}px`,

      "--tpBodyGap": `${bodyGap}px`,
      "--tpLeftW": `${leftW}px`,

      "--tp-axisOuter": `${layoutVars.axisOuterPx}px`,
      "--tp-plotPadT": `${layoutVars.plotPadT}px`,
      "--tp-plotPadB": `${layoutVars.plotPadB}px`,
      "--tp-rowh": `${layoutVars.rowH}px`,
      "--tp-barh": `${layoutVars.barH}px`,
      "--tp-bartop": `${layoutVars.barTop}px`,
      "--tp-labelPadTop": `${layoutVars.labelPadTop}px`,
      "--tp-assigneeMt": `${layoutVars.assigneeMt}px`,
      "--tp-titleFs": `${layoutVars.titleFs}px`,
      "--tp-assigneeFs": `${layoutVars.assigneeFs}px`,
    };
  }, [themeVars, padX, headerTop, headerBottom, headerFont, tickFont, bodyGap, leftW, layoutVars, scale]);

  const headerText = buildTitle(slide?.pageNumber ?? pageNo, slide?.title);

  return (
    <SlidePageFrame pageNo={pageNo} isIntelMode={isIntelMode} hasPrefetched={hasPrefetched} footerRight="">
      <div className="tpRoot" style={cssVars} ref={rootRef}>
        {/* ✅ Bar と同じフォント/ポジション/サイズ設計 */}
        <div className="tpHeader">{headerText}</div>

        {jobs.length === 0 ? (
          <div className="tpEmpty" />
        ) : (
          <div className="tpBody">
            <div className="tpLeft">
              <div className="tpLeftAxisSpacer" />
              <div className="tpLeftList">
                {jobs.map((j, idx) => (
                  <div className="tpRowLabel" key={`${slide?.id || "slide"}-job-${idx}`}>
                    <div className="tpTaskTitle">{j.taskTitle}</div>
                    <div className="tpAssignee">▶ {j.assignee}</div>
                    <div className="tpRowDivider" />
                  </div>
                ))}
              </div>
            </div>

            <div className="tpRight">
              <div className="tpAxis" ref={axisRef}>
                {ticks.map((d, i) => (
                  <div className="tpTick" key={`tick-${i}`} style={tickStyle(d.getTime())}>
                    <div className="tpTickDate">{fmtDateMMDD(d)}</div>
                    <div className="tpTickTime">{fmtTimeHM(d)}</div>
                  </div>
                ))}
              </div>

              <div className="tpPlot" ref={plotRef}>
                {ticks.map((d, i) => {
                  const ms = d.getTime();
                  const xPct = Math.min(1, Math.max(0, (ms - axisStartMs) / axisRangeMs));
                  return <div className="tpVLine" key={`vline-${i}`} style={{ left: `${xPct * 100}%` }} />;
                })}

                {jobs.map((j, idx) => {
                  const leftPct = Math.min(1, Math.max(0, (j.startMs - axisStartMs) / axisRangeMs));
                  const widthPct = Math.min(1, Math.max(0, (j.endMs - j.startMs) / axisRangeMs));
                  const grad = BAR_GRADIENTS[j.colorIndex % BAR_GRADIENTS.length];

                  return (
                    <div className="tpBarRow" key={`bar-${idx}`}>
                      <div
                        className="tpBar"
                        style={{
                          left: `${leftPct * 100}%`,
                          width: `${Math.max(widthPct * 100, 2)}%`,
                          background: grad,
                        }}
                      />
                      <div className="tpRowDividerR" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .tpRoot {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          color: var(--tp-fg);

          padding: 0 var(--tpPadX);
          box-sizing: border-box;

          font-family: ${FONT_FAMILY};
          text-rendering: geometricPrecision;
          -webkit-font-smoothing: antialiased;
          font-synthesis: none;
          font-feature-settings: "palt";
        }

        /* ✅ Bar と揃えるヘッダー */
        .tpHeader {
          margin-top: var(--tpHeaderTop);
          margin-bottom: var(--tpHeaderBottom);
          font-size: var(--tpHeaderFont);
          font-weight: 900;
          letter-spacing: var(--tpHeaderLS);
          line-height: 1.05;

          white-space: normal;
          overflow: visible;
          text-overflow: clip;
        }

        .tpEmpty {
          flex: 1;
          min-height: 0;
        }

        .tpBody {
          flex: 1;
          min-height: 0;
          display: flex;

          /* ✅ 右（ガント）を広く使う */
          gap: var(--tpBodyGap);

          padding-bottom: 16px;
          box-sizing: border-box;
        }

        /* Left labels */
        .tpLeft {
          width: var(--tpLeftW);
          min-width: var(--tpLeftW);

          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .tpLeftAxisSpacer {
          height: var(--tp-axisOuter);
          flex: 0 0 auto;
        }

        .tpLeftList {
          flex: 1;
          min-height: 0;
          padding-top: var(--tp-plotPadT);
          padding-bottom: var(--tp-plotPadB);
          box-sizing: border-box;
        }

        .tpRowLabel {
          height: var(--tp-rowh);
          padding-top: var(--tp-labelPadTop);
          padding-right: 8px;
          position: relative;
          box-sizing: border-box;
          overflow: hidden;
        }

        /* ✅ 2行まで。…は出さない（切るだけ） */
        .tpTaskTitle {
          font-size: var(--tp-titleFs);
          font-weight: 850;
          letter-spacing: -0.3px;
          line-height: 1.14;
          word-break: break-word;
          white-space: normal;

          display: block;
          max-height: calc(2 * 1.14em);
          overflow: hidden;
          text-overflow: clip;
        }

        .tpAssignee {
          margin-top: var(--tp-assigneeMt);
          font-size: var(--tp-assigneeFs);
          font-weight: 750;
          color: var(--tp-muted);
          letter-spacing: -0.22px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: clip;
        }

        .tpRowDivider {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 1px;
          background: var(--tp-line);
        }

        /* Right timeline */
        .tpRight {
          flex: 1;
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }

        .tpAxis {
          position: relative;
          height: 66px;
          margin-top: 2px;
          margin-bottom: 8px;
          overflow: visible;
          flex: 0 0 auto;
        }

        .tpTick {
          position: absolute;
          top: 0;
          user-select: none;
          pointer-events: none;
          white-space: nowrap;
        }

        .tpTickDate,
        .tpTickTime {
          font-size: var(--tpTickFs);
          font-weight: 850;
          letter-spacing: var(--tpTickLS);
          line-height: 1.02;
        }

        .tpTickTime {
          margin-top: 2px;
        }

        .tpPlot {
          position: relative;
          flex: 1;
          min-height: 0;
          padding-top: var(--tp-plotPadT);
          padding-bottom: var(--tp-plotPadB);
          box-sizing: border-box;
          overflow: hidden;
        }

        .tpVLine {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 0;
          border-left: 2px dotted var(--tp-dash);
          transform: translateX(-50%);
          pointer-events: none;
        }

        .tpBarRow {
          height: var(--tp-rowh);
          position: relative;
        }

        .tpBar {
          position: absolute;
          top: var(--tp-bartop);
          height: var(--tp-barh);
          border-radius: 10px;
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.08);
          filter: saturate(1.05);
        }

        .tpRowDividerR {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 1px;
          background: var(--tp-line);
        }
      `}</style>
    </SlidePageFrame>
  );
}
