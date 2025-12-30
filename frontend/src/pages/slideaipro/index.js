// src/pages/slideaipro/index.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import { toPng } from "html-to-image";
import { GiAtom, GiHamburgerMenu } from "react-icons/gi";
import SlideDeck from "../../components/slideaipro/SlideDeck";
import SideMenu from "../../components/slideaipro/SideMenu";

function ProgressOverlay({ progress }) {
  const pct = Math.max(0, Math.min(100, Math.floor(progress)));
  const RING_SIZE = 150;
  const STROKE = 10;
  const r = (RING_SIZE - STROKE) / 2;
  const C = 2 * Math.PI * r;
  const dashoffset = C * (1 - pct / 100);

  return (
    <div className="overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="ringWrap">
        <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
          <g style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}>
            <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={r} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={STROKE} />
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.92)"
              strokeWidth={STROKE}
              strokeDasharray={C}
              strokeDashoffset={dashoffset}
              style={{ transition: "stroke-dashoffset 280ms ease-in-out" }}
            />
          </g>
        </svg>
        <div className="pct">{pct}%</div>
      </div>

      <style jsx>{`
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          display: grid;
          place-items: center;
          z-index: 9999;
        }
        .ringWrap {
          width: ${RING_SIZE}px;
          height: ${RING_SIZE}px;
          position: relative;
          display: grid;
          place-items: center;
        }
        .pct {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          color: #fff;
          font-family: Impact, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
          font-size: 35px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          user-select: none;
        }
      `}</style>
    </div>
  );
}

function extractPrefetchPairs(root) {
  const pairs = [];

  const visit = (node) => {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node)) {
      for (const x of node) visit(x);
      return;
    }

    for (const k of Object.keys(node)) {
      const v = node[k];
      if (typeof v === "string" && k.endsWith("ImageCacheKey")) {
        const cacheKey = v;
        const promptKey = k.replace("CacheKey", "Prompt");
        const prompt = node[promptKey];
        if (typeof prompt === "string" && cacheKey && prompt) {
          pairs.push({ cacheKey, prompt });
        }
      }
    }

    for (const v of Object.values(node)) visit(v);
  };

  visit(root);

  const dedup = new Map();
  for (const p of pairs) {
    if (!dedup.has(p.cacheKey)) dedup.set(p.cacheKey, p.prompt);
  }
  return Array.from(dedup, ([cacheKey, prompt]) => ({ cacheKey, prompt }));
}

async function runPool(items, limit, worker) {
  const results = new Array(items.length);
  let i = 0;

  const n = Math.max(1, Math.min(limit, items.length));
  const workers = Array.from({ length: n }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx);
    }
  });

  await Promise.all(workers);
  return results;
}

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function waitImagesIn(node) {
  const imgs = Array.from(node.querySelectorAll("img"));
  if (!imgs.length) return Promise.resolve();

  return Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise((resolve) => {
        const done = () => resolve();
        img.onload = done;
        img.onerror = done;
      });
    })
  );
}

function buildSlidesFromAgenda({ brief, agenda, subtitleDate }) {
  const a = Array.isArray(agenda) ? agenda : [];

  const firstProblem = a.find((it) => Number(it?.patternType) === 1001) || a[0] || {};
  const coverTitle = String(firstProblem?.data?.coverTitle || "").trim() || "SlideAI Pro";
  const coverSubtitle = String(subtitleDate || "").trim() || "Generated slides preview";

  const cover = {
    id: "cover",
    kind: "cover",
    title: coverTitle,
    subtitle: coverSubtitle,
  };

  const out = [cover];

  for (let i = 0; i < a.length; i++) {
    const item = a[i] || {};
    const pt = Number(item.patternType);
    const d = item.data || {};
    const title = String(d.title || item.title || "");

    if (pt === 1001) {
      out.push({
        id: `pt-1001-${i}`,
        kind: "problem",
        title,
        bullets: Array.isArray(d.VSproblemsToSolve) ? d.VSproblemsToSolve.map(String) : [],
        message: String(d.importantMessage || ""),
        image: {
          cacheKey: String(d.VSproblemImageCacheKey || ""),
          originalSrc: "",
        },
      });
      continue;
    }

    if (pt === 1002) {
      out.push({
        id: `pt-1002-${i}`,
        kind: "proposal",
        title,
        bullets: Array.isArray(d.VSproposalForBetter) ? d.VSproposalForBetter.map(String) : [],
        message: String(d.importantMessage || ""),
        image: {
          cacheKey: String(d.VSproposalImageCacheKey || ""),
          originalSrc: "",
        },
      });
      continue;
    }

    if (pt === 1003) {
      out.push({
        id: `pt-1003-${i}`,
        kind: "effects",
        title,
        before: Array.isArray(d.VSexpectedEffectsBefore) ? d.VSexpectedEffectsBefore.map(String) : [],
        after: Array.isArray(d.VSexpectedEffectsAfter) ? d.VSexpectedEffectsAfter.map(String) : [],
        message: String(d.importantMessage || ""),
      });
      continue;
    }

    if (pt === 1005) {
      const barGroups = Array.isArray(d.barGroups) ? d.barGroups : [];
      out.push({
        id: `pt-1005-${i}`,
        kind: "bar",
        title,
        yAxisName: String(d.yAxisName || ""),
        unit: String(d.unit || ""),
        barGroups: barGroups.map((g) => {
          const category = String(g?.category ?? "");
          const bars = Array.isArray(g?.bars) ? g.bars : [];
          const actual = bars.find((b) => b?.label === "actual") || bars[0] || {};
          const v = Number(actual?.value ?? 0);
          return { category, value: Number.isFinite(v) ? v : 0 };
        }),
        message: String(d.importantMessage || ""),
      });
      continue;
    }

    if (pt === 1004) {
      const taskTitles = Array.isArray(d.taskTitles) ? d.taskTitles.map(String) : [];
      const assignees = Array.isArray(d.assignees) ? d.assignees.map(String) : [];
      const deadlines = Array.isArray(d.deadlines) ? d.deadlines.map(String) : [];

      const n = Math.min(taskTitles.length, assignees.length, deadlines.length);
      const rows = [];
      for (let k = 0; k < n; k++) {
        rows.push({
          title: taskTitles[k],
          assignee: assignees[k],
          deadline: deadlines[k],
        });
      }

      out.push({
        id: `pt-1004-${i}`,
        kind: "tasks",
        title,
        rows,
      });
      continue;
    }
  }

  return out;
}

export default function SlideAIProHome() {
  const [prompt, setPrompt] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isIntelMode, setIsIntelMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [agendaJson, setAgendaJson] = useState(null);
  const [subtitleDate, setSubtitleDate] = useState("");
  const [imageUrlByKey, setImageUrlByKey] = useState({});

  const [isExporting, setIsExporting] = useState(false);

  const taRef = useRef(null);
  const trimmed = useMemo(() => prompt.trim(), [prompt]);

  const questionText = "どんな資料が欲しいですか？";
  const placeholderText = "例：新規事業の提案資料（課題→提案→効果）を作りたい";
  const pageTitle = "SlideAI Pro — Web";

  const background = useMemo(() => {
    if (!isIntelMode) return { from: "#ffffff", to: "#ffffff" };
    return { from: "#000000", to: "rgb(28, 46, 62)" };
  }, [isIntelMode]);

  const textColor = isIntelMode ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.92)";

  const focusIdea = () => {
    try {
      taRef.current?.focus();
    } catch {}
  };

  const autosize = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    const h = Math.min(140, Math.max(70, el.scrollHeight));
    el.style.height = `${h}px`;
  };

  useEffect(() => {
    autosize();
  }, [prompt]);

  const startProgressTicker = () => {
    setProgress(3);
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const cap = 24;
      const step = 3 + Math.min(cap - 3, Math.floor(elapsed / 220));
      setProgress((p) => Math.min(cap, Math.max(p, step)));
    }, 120);
    return () => window.clearInterval(id);
  };

  const prefetchImages = async (API_BASE, pairs) => {
    if (!pairs.length) return;

    const fetchOne = async ({ cacheKey, prompt }) => {
      const resp = await fetch(`${API_BASE}/api/slideaipro/image-low`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cacheKey,
          prompt,
          output_format: "png",
          quality: "low",
          size: "1024x1024",
        }),
      });
      if (!resp.ok) throw new Error(`image-low HTTP ${resp.status}`);
      const j = await resp.json();
      const dataUrl = j?.results?.[0]?.dataUrl || "";
      if (!dataUrl.startsWith("data:image/")) throw new Error("image-low returned invalid dataUrl");
      return dataUrl;
    };

    const total = pairs.length;
    let done = 0;

    await runPool(pairs, 3, async (pair) => {
      const dataUrl = await fetchOne(pair);
      setImageUrlByKey((prev) => ({ ...prev, [pair.cacheKey]: dataUrl }));
      done += 1;
      const pct = 35 + Math.floor((done / total) * 60);
      setProgress((p) => Math.max(p, Math.min(95, pct)));
      return true;
    });
  };

  const handleGenerate = async () => {
    const brief = trimmed;
    if (!brief) return;
    if (isSending) return;

    setIsSending(true);
    setAgendaJson(null);
    setImageUrlByKey({});

    const stop = startProgressTicker();
    let stopped = false;
    const safeStop = () => {
      if (stopped) return;
      stopped = true;
      stop();
    };

    try {
      const API_BASE = "https://sense-website-production.up.railway.app";

      const baseDateLocal =
        typeof Intl !== "undefined"
          ? new Date().toLocaleDateString("sv-SE")
          : new Date().toISOString().slice(0, 10);

      setSubtitleDate(baseDateLocal);

      const resp = await fetch(`${API_BASE}/api/slideaipro/agenda-json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief,
          baseDate: baseDateLocal,
          renderMode: "vibeSlidingIdea",
          locale: typeof navigator !== "undefined" ? navigator.language : "ja",
          theme: isIntelMode ? "dark" : "light",
        }),
      });

      if (!resp.ok) throw new Error(`agenda-json HTTP ${resp.status}`);

      const json = await resp.json();

      setProgress(32);
      setAgendaJson(json);

      const pairs = extractPrefetchPairs(json);
      setProgress(pairs.length ? 35 : 92);

      if (pairs.length) {
        await prefetchImages(API_BASE, pairs);
      }

      setProgress(100);
    } catch (e) {
      console.error(e);
      alert("生成に失敗しました。サーバー側ログを確認してください。");
    } finally {
      safeStop();
      setTimeout(() => setIsSending(false), 180);
      setTimeout(() => setProgress(0), 260);
    }
  };

  const hasPrefetched = Object.keys(imageUrlByKey || {}).length > 0;

  const slides = useMemo(() => {
    if (agendaJson && Array.isArray(agendaJson) && agendaJson.length) {
      return buildSlidesFromAgenda({
        brief: trimmed || "SlideAI Pro",
        agenda: agendaJson,
        subtitleDate,
      });
    }
    return [];
  }, [trimmed, agendaJson, subtitleDate]);

  const canExport = slides.length > 0 && !isSending && !isExporting;

  const handleExportPNG = async () => {
    if (!canExport) return;
    setIsExporting(true);

    try {
      const root = document.getElementById("slidesRoot");
      if (!root) throw new Error("slidesRoot が見つかりません");

      if (document?.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch {}
      }
      await waitImagesIn(root);
      await new Promise((r) => requestAnimationFrame(r));

      const pages = Array.from(root.querySelectorAll('[data-slide-page="true"]'));
      if (!pages.length) throw new Error("キャプチャ対象スライドが0枚です");

      const bg = isIntelMode ? "#0b1220" : "#ffffff";

      for (let i = 0; i < pages.length; i++) {
        const node = pages[i];
        const dataUrl = await toPng(node, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: bg,
        });
        downloadDataUrl(dataUrl, `slide-${String(i + 1).padStart(2, "0")}.png`);
      }
    } catch (e) {
      console.error(e);
      const msg = String(e?.message || e);
      alert(`PNG書き出しに失敗しました: ${msg}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!canExport) return;
    setIsExporting(true);

    try {
      const root = document.getElementById("slidesRoot");
      if (!root) throw new Error("slidesRoot が見つかりません");

      if (document?.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch {}
      }
      await waitImagesIn(root);
      await new Promise((r) => requestAnimationFrame(r));

      const pages = Array.from(root.querySelectorAll('[data-slide-page="true"]'));
      if (!pages.length) throw new Error("キャプチャ対象スライドが0枚です");

      const bg = isIntelMode ? "#0b1220" : "#ffffff";

      const pngPages = [];
      for (let i = 0; i < pages.length; i++) {
        const node = pages[i];
        const dataUrl = await toPng(node, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: bg,
        });
        pngPages.push(dataUrl);
      }

      const API_BASE = "https://sense-website-production.up.railway.app";
      const resp = await fetch(`${API_BASE}/api/slideaipro/png-to-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages: pngPages }),
      });

      if (!resp.ok) throw new Error(`png-to-pdf HTTP ${resp.status}`);

      const ct = resp.headers.get("content-type") || "";
      if (ct.includes("application/pdf")) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "slides.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return;
      }

      const j = await resp.json();
      const pdfDataUrl = j?.pdfDataUrl || "";
      if (!pdfDataUrl.startsWith("data:application/pdf")) throw new Error("pdfDataUrl が不正です");
      downloadDataUrl(pdfDataUrl, "slides.pdf");
    } catch (e) {
      console.error(e);
      const msg = String(e?.message || e);
      alert(`PDF書き出しに失敗しました: ${msg}`);
    } finally {
      setIsExporting(false);
    }
  };

  const requestExportPNGFromMenu = () => {
    if (!canExport) return;
    setIsMenuOpen(false);
    setTimeout(() => handleExportPNG(), 160);
  };

  const requestExportPDFFromMenu = () => {
    if (!canExport) return;
    setIsMenuOpen(false);
    setTimeout(() => handleExportPDF(), 160);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setTimeout(() => focusIdea(), 120);
  };

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div
        className="page"
        onClick={() => {
          if (isMenuOpen) return;
          try {
            document.activeElement?.blur?.();
          } catch {}
        }}
      >
        <div className="bg" />

        <header className="header">
          <div className="leftSpacer" aria-hidden="true" />
          <div className="title"></div>

          <button
            className="iconBtn"
            aria-label="Menu"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(true);
              try {
                document.activeElement?.blur?.();
              } catch {}
            }}
          >
            <GiHamburgerMenu size={20} />
          </button>
        </header>

        <div className="divider" />

        <main className="main">
          <div className="q">{questionText}</div>

          <div
            className={`card ${isIntelMode ? "cardDark" : "cardLight"}`}
            onClick={(e) => {
              e.stopPropagation();
              focusIdea();
            }}
            role="group"
            aria-label="Idea input card"
          >
            <div className="taWrap">
              {!trimmed && <div className="ph">{placeholderText}</div>}
              <textarea
                ref={taRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onInput={autosize}
                className="ta"
                rows={3}
                spellCheck={false}
                placeholder=""
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
              />
            </div>

            <div className="actions" onClick={(e) => e.stopPropagation()}>
              <button
                className={`send ${isIntelMode ? "sendDark" : "sendLight"}`}
                aria-label="Generate"
                disabled={!trimmed || isSending || isExporting}
                onClick={handleGenerate}
              >
                <GiAtom size={18} />
              </button>
            </div>
          </div>

          {slides.length > 0 && (
            <SlideDeck
              slides={slides}
              isIntelMode={isIntelMode}
              hasPrefetched={hasPrefetched}
              imageUrlByKey={imageUrlByKey}
            />
          )}
        </main>

        <SideMenu
          isOpen={isMenuOpen}
          isIntelMode={isIntelMode}
          canExport={canExport}
          onClose={closeMenu}
          onToggleTheme={() => setIsIntelMode((v) => !v)}
          onExportPNG={requestExportPNGFromMenu}
          onExportPDF={requestExportPDFFromMenu}
        />

        {(isSending || isExporting) && <ProgressOverlay progress={isExporting ? 88 : progress} />}

        <style jsx>{`
          .page {
            min-height: 100vh;
            position: relative;
            overflow: hidden;
            color: ${isIntelMode ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.92)"};
          }
          .bg {
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg, ${background.from}, ${background.to});
          }

          .header {
            position: relative;
            z-index: 2;
            height: 62px;
            display: grid;
            grid-template-columns: 52px 1fr 52px;
            align-items: center;
            padding: 0 14px;
          }
          .leftSpacer {
            width: 52px;
            height: 1px;
          }
          .title {
            text-align: center;
            font-weight: 700;
            letter-spacing: 0.3px;
            font-size: 16px;
            user-select: none;
          }

          .iconBtn {
            width: 40px;
            height: 40px;
            border: none;
            background: transparent;
            color: inherit;
            border-radius: 10px;
            display: grid;
            place-items: center;
            cursor: pointer;
          }
          .iconBtn:active {
            transform: scale(0.98);
          }

          .divider {
            position: relative;
            z-index: 2;
            height: 1px;
            background: ${isIntelMode ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.10)"};
            margin: 0 14px;
          }

          .main {
            position: relative;
            z-index: 2;
            min-height: calc(100vh - 62px);
            display: grid;
            align-content: center;
            justify-items: center;
            padding: 28px 18px 40px;
            gap: 18px;
          }

          .q {
            font-size: 30px;
            font-weight: 600;
            text-align: center;
            line-height: 1.28;
            opacity: 0.98;
            padding: 0 10px;
            max-width: 860px;
          }

          .card {
            width: min(860px, calc(100vw - 36px));
            border-radius: 18px;
            position: relative;
            padding: 12px 12px 12px 12px;
            cursor: text;
          }

          .cardDark {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.13);
            backdrop-filter: blur(12px);
            box-shadow: 0 12px 28px rgba(64, 110, 255, 0.1);
          }

          .cardLight {
            background: rgb(250, 250, 250);
            border: 1px solid rgba(255, 255, 255, 0.7);
            box-shadow: -4px -4px 10px rgba(255, 255, 255, 0.9), 6px 10px 20px rgba(0, 0, 0, 0.12);
          }

          .taWrap {
            position: relative;
            padding-right: 72px;
          }

          .ph {
            position: absolute;
            left: 10px;
            top: 10px;
            right: 10px;
            color: ${isIntelMode ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)"};
            font-size: 17px;
            pointer-events: none;
            user-select: none;
          }

          .ta {
            width: 100%;
            resize: none;
            border: none;
            outline: none;
            background: transparent;
            color: ${isIntelMode ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.92)"};
            font-size: 17px;
            line-height: 1.35;
            padding: 10px 10px 10px 10px;
            min-height: 70px;
            max-height: 140px;
          }

          .actions {
            position: absolute;
            right: 12px;
            bottom: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .send {
            width: 40px;
            height: 40px;
            border-radius: 999px;
            border: none;
            display: grid;
            place-items: center;
            cursor: pointer;
            user-select: none;
            transition: transform 120ms ease, opacity 120ms ease;
          }
          .send:disabled {
            opacity: 0.35;
            cursor: default;
          }
          .send:active:not(:disabled) {
            transform: scale(0.99);
          }

          .sendLight {
            color: rgba(0, 0, 0, 0.86);
            background: rgb(250, 250, 250);
            box-shadow: -4px -4px 10px rgba(255, 255, 255, 0.9), 6px 10px 20px rgba(0, 0, 0, 0.12);
          }

          .sendDark {
            color: rgba(255, 255, 255, 0.92);
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.13);
            backdrop-filter: blur(12px);
            box-shadow: 0 12px 28px rgba(64, 110, 255, 0.12);
          }
        `}</style>

        <style jsx global>{`
          html,
          body,
          #__next {
            height: 100%;
          }
          body {
            margin: 0;
            overflow-x: hidden;
            font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
          }
        `}</style>
      </div>
    </>
  );
}
