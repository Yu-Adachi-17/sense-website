// src/pages/slideaipro/index.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import { toPng } from "html-to-image";

function AtomIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
        <path d="M12 12c3.6-3.6 7.9-5.7 9.6-4 1.7 1.7-.4 6-4 9.6-3.6 3.6-7.9 5.7-9.6 4-1.7-1.7.4-6 4-9.6Z" />
        <path d="M12 12c-3.6-3.6-7.9-5.7-9.6-4-1.7 1.7.4 6 4 9.6 3.6 3.6 7.9 5.7 9.6 4 1.7-1.7-.4-6-4-9.6Z" />
        <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}

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
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth={STROKE}
            />
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

// ★ ここが「差し替え本体」：cacheKeyがprefetch済みなら dataUrl を使う
function resolveImageSrc(imageUrlByKey, cacheKey, originalSrc) {
  return (cacheKey && imageUrlByKey?.[cacheKey]) || originalSrc || "";
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

function buildSlidesModel({ title, prefetchPairs }) {
  const cover = {
    id: "cover",
    kind: "cover",
    title: title || "SlideAI Pro",
    subtitle: "Generated slides preview",
    images: [],
  };

  const imageSlides = [];
  const chunkSize = 2;
  for (let i = 0; i < prefetchPairs.length; i += chunkSize) {
    const chunk = prefetchPairs.slice(i, i + chunkSize);
    imageSlides.push({
      id: `imgs-${i}`,
      kind: "images",
      title: "Key Visuals",
      subtitle: `Slide ${imageSlides.length + 2}`,
      images: chunk.map((p) => ({
        cacheKey: p.cacheKey,
        label: p.cacheKey,
        originalSrc: "",
      })),
    });
  }

  return [cover, ...imageSlides];
}

export default function SlideAIProHome() {
  const [prompt, setPrompt] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isIntelMode, setIsIntelMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [agendaJson, setAgendaJson] = useState(null);
  const [imageUrlByKey, setImageUrlByKey] = useState({});
  const [prefetchPairs, setPrefetchPairs] = useState([]);
  const [prefetchError, setPrefetchError] = useState("");

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");

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

  useEffect(() => {
    const onKey = (e) => {
      if (!isMenuOpen) return;
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMenuOpen]);

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
    setPrefetchError("");
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
    setPrefetchPairs([]);
    setPrefetchError("");
    setExportError("");

    const stop = startProgressTicker();
    let stopped = false;
    const safeStop = () => {
      if (stopped) return;
      stopped = true;
      stop();
    };

    try {
      const API_BASE = "https://sense-website-production.up.railway.app";

      const resp = await fetch(`${API_BASE}/api/slideaipro/agenda-json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief,
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
      setPrefetchPairs(pairs);

      setProgress(pairs.length ? 35 : 92);

      if (pairs.length) {
        await prefetchImages(API_BASE, pairs);
      }

      setProgress(100);
    } catch (e) {
      console.error(e);
      setPrefetchError(String(e?.message || e));
      alert("生成に失敗しました。サーバー側ログを確認してください。");
    } finally {
      safeStop();
      setTimeout(() => setIsSending(false), 180);
      setTimeout(() => setProgress(0), 260);
    }
  };

  const hasPrefetched = Object.keys(imageUrlByKey || {}).length > 0;

  // ★ Step 1: slidesRoot を「本番のスライド構造（複数枚）」として配列レンダリング
  const slides = useMemo(() => {
    if (!trimmed && !prefetchPairs.length) return [];
    return buildSlidesModel({ title: trimmed || "SlideAI Pro", prefetchPairs });
  }, [trimmed, prefetchPairs]);

  const canExport = slides.length > 0 && !isSending && !isExporting;

  // ★ Step 2: html-to-image で slidesRoot (内の各スライド) を PNG化
  const handleExportPNG = async () => {
    if (!canExport) return;
    setExportError("");
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
      setExportError(msg);
      alert(`PNG書き出しに失敗しました: ${msg}`);
    } finally {
      setIsExporting(false);
    }
  };

  // ★ Step 3（フロント側だけ先に用意）: PNG→PDF（BE完結）呼び出し口
  // 期待するBE: POST /api/slideaipro/png-to-pdf { pages: [dataUrl...] } -> { pdfDataUrl } or application/pdf
  const handleExportPDF = async () => {
    if (!canExport) return;
    setExportError("");
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
      setExportError(msg);
      alert(`PDF書き出しに失敗しました: ${msg}`);
    } finally {
      setIsExporting(false);
    }
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
            <span className="hamburger" />
          </button>

          <div className="title"></div>

          <button
            className="pillBtn"
            aria-label="Toggle theme"
            onClick={(e) => {
              e.stopPropagation();
              setIsIntelMode((v) => !v);
            }}
          >
            {isIntelMode ? "Dark" : "Light"}
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
                className="send"
                aria-label="Generate"
                disabled={!trimmed || isSending || isExporting}
                onClick={handleGenerate}
              >
                <AtomIcon size={16} />
              </button>

              <button className="exportBtn" disabled={!canExport} onClick={handleExportPNG} aria-label="Export PNG">
                Export (PNG)
              </button>

              <button className="exportBtn" disabled={!canExport} onClick={handleExportPDF} aria-label="Export PDF">
                Export (PDF)
              </button>
            </div>
          </div>

          {/* ★ slidesRoot: “PDFにしたい見た目の最終形” を複数枚の配列レンダリング */}
          {slides.length > 0 && (
            <section className="slidesWrap" aria-label="Slides Preview">
              <div id="slidesRoot" className="slidesRoot" data-theme={isIntelMode ? "dark" : "light"}>
                {slides.map((s, idx) => {
                  const pageNo = idx + 1;

                  if (s.kind === "cover") {
                    return (
                      <div
                        key={s.id}
                        className={`slidePage ${isIntelMode ? "pageDark" : "pageLight"}`}
                        data-slide-page="true"
                      >
                        <div className="pageChrome">
                          <div className="pageTop">
                            <div className="pageNo">Slide {pageNo}</div>
                            <div className="brand">SlideAI Pro</div>
                          </div>

                          <div className="coverCenter">
                            <div className="coverTitle">{s.title}</div>
                            <div className="coverSub">{s.subtitle}</div>
                          </div>

                          <div className="pageBottom">
                            <div className="muted">
                              Images are pre-fetched as dataUrl and replaced by cacheKey to reduce CORS capture issues.
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const imgs = Array.isArray(s.images) ? s.images : [];

                  return (
                    <div
                      key={s.id}
                      className={`slidePage ${isIntelMode ? "pageDark" : "pageLight"}`}
                      data-slide-page="true"
                    >
                      <div className="pageChrome">
                        <div className="pageTop">
                          <div className="pageNo">Slide {pageNo}</div>
                          <div className="brand">{s.title || "Key Visuals"}</div>
                        </div>

                        <div className="content">
                          <div className="h1">{s.title || "Key Visuals"}</div>
                          <div className="sub">{s.subtitle || ""}</div>

                          <div className={`imgGrid ${imgs.length === 1 ? "one" : "two"}`}>
                            {imgs.map((im) => {
                              const cacheKey = im.cacheKey;
                              const originalSrc = im.originalSrc || "";
                              const resolvedSrc = resolveImageSrc(imageUrlByKey, cacheKey, originalSrc);

                              return (
                                <div key={cacheKey} className="imgBox">
                                  <div className="imgInner">
                                    {resolvedSrc ? (
                                      <img src={resolvedSrc} crossOrigin="anonymous" alt={cacheKey} />
                                    ) : (
                                      <div className="imgPh">image loading...</div>
                                    )}
                                  </div>
                                  <div className="imgMeta">
                                    <div className="imgLabel">{im.label || cacheKey}</div>
                                    <div className="imgKey">{cacheKey}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="pageBottom">
                          <div className="muted">{hasPrefetched ? "Prefetched images ready" : "Prefetching images..."}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Debug は残してOK */}
          {(agendaJson || prefetchPairs.length || hasPrefetched || prefetchError || exportError) && (
            <section className={`debug ${isIntelMode ? "debugDark" : "debugLight"}`} aria-label="Debug">
              <div className="debugRow">
                <div className="debugK">prefetch pairs</div>
                <div className="debugV">{prefetchPairs.length}</div>
              </div>
              <div className="debugRow">
                <div className="debugK">prefetched images</div>
                <div className="debugV">{Object.keys(imageUrlByKey || {}).length}</div>
              </div>

              {prefetchError && <div className="err">{prefetchError}</div>}
              {exportError && <div className="err">{exportError}</div>}

              {hasPrefetched && (
                <div className="thumbs">
                  {prefetchPairs.map((p) => {
                    const src = imageUrlByKey[p.cacheKey];
                    if (!src) return null;
                    return (
                      <div key={p.cacheKey} className="thumb">
                        <img src={src} crossOrigin="anonymous" alt={p.cacheKey} />
                        <div className="ck">{p.cacheKey}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {agendaJson && (
                <details className="json">
                  <summary>agenda-json</summary>
                  <pre>{JSON.stringify(agendaJson, null, 2)}</pre>
                </details>
              )}
            </section>
          )}
        </main>

        {isMenuOpen && (
          <div
            className="menuOverlay"
            onClick={() => {
              setIsMenuOpen(false);
              setTimeout(() => focusIdea(), 120);
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className={`menuPanel ${isIntelMode ? "menuDark" : "menuLight"}`} onClick={(e) => e.stopPropagation()}>
              <div className="menuHeader">
                <div className="menuTitle">Menu</div>
                <button className="iconBtn" aria-label="Close" onClick={() => setIsMenuOpen(false)}>
                  <span className="closeX" />
                </button>
              </div>

              <div className="menuItem">
                <div className="miLeft">
                  <div className="miTitle">Theme</div>
                  <div className="miSub">Light / Dark</div>
                </div>
                <button className="pillBtn" onClick={() => setIsIntelMode((v) => !v)}>
                  {isIntelMode ? "Dark" : "Light"}
                </button>
              </div>

              <div className="menuHint">
                画像は <code>/api/slideaipro/image-low</code>（dataUrl返却）でプリフェッチし、cacheKeyで差し替えます。
              </div>
              <div className="menuHint">
                Export(PNG/PDF) は <code>slidesRoot</code> 内の <code>data-slide-page</code> を1枚ずつキャプチャします。
              </div>
            </div>
          </div>
        )}

        {(isSending || isExporting) && <ProgressOverlay progress={isExporting ? 88 : progress} />}

        <style jsx>{`
          .page {
            min-height: 100vh;
            position: relative;
            overflow: hidden;
            color: ${textColor};
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
            grid-template-columns: 52px 1fr auto;
            align-items: center;
            padding: 0 14px;
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
          .hamburger {
            width: 18px;
            height: 12px;
            position: relative;
            display: inline-block;
          }
          .hamburger::before,
          .hamburger::after,
          .hamburger {
            background: transparent;
          }
          .hamburger::before,
          .hamburger::after {
            content: "";
            position: absolute;
            left: 0;
            width: 18px;
            height: 2px;
            border-radius: 2px;
            background: ${textColor};
            opacity: 0.9;
          }
          .hamburger::before {
            top: 1px;
          }
          .hamburger::after {
            bottom: 1px;
          }

          .closeX {
            width: 18px;
            height: 18px;
            position: relative;
            display: inline-block;
          }
          .closeX::before,
          .closeX::after {
            content: "";
            position: absolute;
            left: 8px;
            top: 1px;
            width: 2px;
            height: 16px;
            border-radius: 2px;
            background: ${isIntelMode ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.75)"};
          }
          .closeX::before {
            transform: rotate(45deg);
          }
          .closeX::after {
            transform: rotate(-45deg);
          }

          .pillBtn {
            border: 1px solid ${isIntelMode ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.14)"};
            background: ${isIntelMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"};
            color: ${textColor};
            padding: 8px 12px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            user-select: none;
          }
          .pillBtn:active {
            transform: scale(0.99);
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
            padding-right: 270px;
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
            color: ${textColor};
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
            border: 1px solid rgba(0, 0, 0, 0.08);
            background: rgba(255, 255, 255, 0.95);
            color: rgba(0, 0, 0, 0.85);
            display: grid;
            place-items: center;
            cursor: pointer;
            user-select: none;
          }
          .send:disabled {
            opacity: 0.35;
            cursor: default;
          }
          .send:active:not(:disabled) {
            transform: scale(0.99);
          }

          .exportBtn {
            border: 1px solid ${isIntelMode ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)"};
            background: ${isIntelMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)"};
            color: ${textColor};
            padding: 10px 12px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 800;
            cursor: pointer;
            user-select: none;
            white-space: nowrap;
          }
          .exportBtn:disabled {
            opacity: 0.35;
            cursor: default;
          }
          .exportBtn:active:not(:disabled) {
            transform: scale(0.99);
          }

          /* ★ Slides (capture-stable) */
          .slidesWrap {
            width: min(860px, calc(100vw - 36px));
          }
          .slidesRoot {
            display: grid;
            gap: 18px;
          }

          .slidePage {
            width: 100%;
            aspect-ratio: 16 / 9;
            border-radius: 18px;
            overflow: hidden;
            position: relative;
          }

          .pageLight {
            background: #ffffff;
            border: 1px solid rgba(0, 0, 0, 0.08);
            box-shadow: 0 10px 22px rgba(0, 0, 0, 0.08);
            color: rgba(0, 0, 0, 0.92);
          }
          .pageDark {
            background: #0b1220;
            border: 1px solid rgba(255, 255, 255, 0.10);
            box-shadow: 0 10px 22px rgba(0, 0, 0, 0.22);
            color: rgba(255, 255, 255, 0.92);
          }

          .pageChrome {
            position: absolute;
            inset: 0;
            padding: 22px;
            display: grid;
            grid-template-rows: auto 1fr auto;
            gap: 14px;
          }

          .pageTop {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.2px;
            opacity: 0.9;
          }
          .brand {
            opacity: 0.85;
          }

          .content {
            min-height: 0;
            display: grid;
            grid-template-rows: auto auto 1fr;
            gap: 10px;
          }

          .h1 {
            font-size: 22px;
            font-weight: 900;
            letter-spacing: 0.2px;
          }
          .sub {
            font-size: 13px;
            font-weight: 700;
            opacity: 0.72;
          }

          .imgGrid {
            display: grid;
            gap: 14px;
            min-height: 0;
          }
          .imgGrid.two {
            grid-template-columns: 1fr 1fr;
          }
          .imgGrid.one {
            grid-template-columns: 1fr;
          }

          .imgBox {
            border-radius: 14px;
            overflow: hidden;
            border: 1px solid ${isIntelMode ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.10)"};
            background: ${isIntelMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.02)"};
            display: grid;
            grid-template-rows: 1fr auto;
            min-height: 0;
          }

          .imgInner {
            min-height: 0;
            position: relative;
          }
          .imgBox img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
          .imgPh {
            position: absolute;
            inset: 0;
            display: grid;
            place-items: center;
            font-size: 12px;
            opacity: 0.6;
          }

          .imgMeta {
            padding: 10px 12px;
            display: grid;
            gap: 4px;
          }
          .imgLabel {
            font-size: 12px;
            font-weight: 800;
            opacity: 0.92;
          }
          .imgKey {
            font-size: 11px;
            opacity: 0.7;
            word-break: break-all;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          }

          .pageBottom {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 11px;
            opacity: 0.72;
          }
          .muted {
            opacity: 0.78;
          }

          .coverCenter {
            display: grid;
            place-items: center;
            text-align: center;
            padding: 0 24px;
            gap: 10px;
          }
          .coverTitle {
            font-size: 34px;
            font-weight: 900;
            letter-spacing: 0.2px;
            line-height: 1.15;
          }
          .coverSub {
            font-size: 14px;
            font-weight: 800;
            opacity: 0.72;
          }

          /* Debug */
          .debug {
            width: min(860px, calc(100vw - 36px));
            border-radius: 16px;
            padding: 14px 14px;
            margin-top: 6px;
          }
          .debugDark {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            backdrop-filter: blur(10px);
          }
          .debugLight {
            background: rgba(255, 255, 255, 0.85);
            border: 1px solid rgba(0, 0, 0, 0.06);
            box-shadow: 0 10px 22px rgba(0, 0, 0, 0.08);
          }
          .debugRow {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 10px;
            padding: 2px 2px;
            font-size: 12px;
            opacity: 0.9;
          }
          .debugK {
            font-weight: 800;
            letter-spacing: 0.2px;
          }
          .debugV {
            font-variant-numeric: tabular-nums;
          }
          .err {
            margin-top: 10px;
            font-size: 12px;
            opacity: 0.95;
            color: ${isIntelMode ? "rgba(255,180,180,0.95)" : "rgba(180,0,0,0.85)"};
            word-break: break-word;
          }
          .thumbs {
            margin-top: 12px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 10px;
          }
          .thumb {
            border-radius: 14px;
            overflow: hidden;
            border: 1px solid ${isIntelMode ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)"};
            background: ${isIntelMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)"};
          }
          .thumb img {
            width: 100%;
            height: 120px;
            object-fit: cover;
            display: block;
          }
          .ck {
            padding: 8px 10px;
            font-size: 11px;
            opacity: 0.85;
            word-break: break-all;
          }
          .json {
            margin-top: 12px;
          }
          .json summary {
            cursor: pointer;
            font-size: 12px;
            font-weight: 800;
            opacity: 0.9;
          }
          .json pre {
            margin: 10px 0 0;
            max-height: 320px;
            overflow: auto;
            padding: 12px;
            border-radius: 12px;
            background: ${isIntelMode ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.05)"};
            font-size: 11px;
            line-height: 1.45;
          }

          .menuOverlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.22);
            z-index: 9000;
            display: flex;
            justify-content: flex-end;
          }
          .menuPanel {
            width: min(420px, 70vw);
            height: 100%;
            padding: 16px;
          }
          .menuDark {
            background: rgba(0, 0, 0, 0.78);
            backdrop-filter: blur(14px);
            border-left: 1px solid rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.92);
          }
          .menuLight {
            background: rgba(255, 255, 255, 0.82);
            backdrop-filter: blur(14px);
            border-left: 1px solid rgba(0, 0, 0, 0.08);
            color: rgba(0, 0, 0, 0.86);
          }

          .menuHeader {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 6px 4px 12px;
          }
          .menuTitle {
            font-weight: 800;
            letter-spacing: 0.2px;
          }

          .menuItem {
            margin-top: 10px;
            padding: 14px 12px;
            border-radius: 14px;
            border: 1px solid ${isIntelMode ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"};
            background: ${isIntelMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)"};
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
          }
          .miLeft {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .miTitle {
            font-weight: 800;
            font-size: 13px;
          }
          .miSub {
            font-size: 12px;
            opacity: 0.75;
          }

          .menuHint {
            margin-top: 14px;
            font-size: 12px;
            opacity: 0.8;
            line-height: 1.5;
          }
          .menuHint code {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            font-size: 12px;
            padding: 2px 6px;
            border-radius: 8px;
            background: ${isIntelMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"};
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
