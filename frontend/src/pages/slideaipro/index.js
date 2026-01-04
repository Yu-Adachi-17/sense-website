// src/pages/slideaipro/index.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { toPng, getFontEmbedCSS } from "html-to-image";
import { GiAtom, GiHamburgerMenu } from "react-icons/gi";
import SlideDeck from "../../components/slideaipro/SlideDeck";
import SlideEditModal from "../../components/slideaipro/SlideEditModal";
import { getClientAuth } from "../../firebaseConfig";

function buildLoginUrl(nextPath) {
  const safe =
    typeof nextPath === "string" && nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/";
  return `/login?next=${encodeURIComponent(safe)}`;
}

async function getSignedInUserOnce() {
  if (typeof window === "undefined") return null;

  const auth = await getClientAuth();
  const { onAuthStateChanged } = await import("firebase/auth");

  return await new Promise((resolve) => {
    let unsub = () => {};
    unsub = onAuthStateChanged(
      auth,
      (user) => {
        try {
          unsub();
        } catch {}
        resolve(user || null);
      },
      () => {
        try {
          unsub();
        } catch {}
        resolve(null);
      }
    );
  });
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

function getStableNodeSize(node) {
  const sw = Math.round(node?.scrollWidth || 0);   // transform の影響を受けにくい
  const sh = Math.round(node?.scrollHeight || 0);
  const ow = Math.round(node?.offsetWidth || 0);
  const oh = Math.round(node?.offsetHeight || 0);
  const rect = node?.getBoundingClientRect?.() || { width: 0, height: 0 };
  const bw = Math.round(rect.width || 0);
  const bh = Math.round(rect.height || 0);

  const w = sw || ow || bw || 1;
  const h = sh || oh || bh || 1;
  return { w: Math.max(1, w), h: Math.max(1, h) };
}

async function withExportingDOM(fn) {
  const html = document.documentElement;
  const prev = html.getAttribute("data-exporting");
  html.setAttribute("data-exporting", "1");

  // CSS適用を1フレーム待つ（これがないと“書き出し中CSS”が間に合わない）
  await new Promise((r) => requestAnimationFrame(r));

  try {
    return await fn();
  } finally {
    if (prev == null) html.removeAttribute("data-exporting");
    else html.setAttribute("data-exporting", prev);
    await new Promise((r) => requestAnimationFrame(r));
  }
}

async function captureSlidePng(node, { bg, pixelRatio = 2 }) {
  const { w, h } = getStableNodeSize(node);

  // WebFontを埋め込んでフォールバックを防ぐ（太さ/改行ズレの主要因を潰す）
  let fontEmbedCSS = "";
  try {
    fontEmbedCSS = await getFontEmbedCSS(node);
  } catch {}

  const style = { width: `${w}px`, height: `${h}px` };

  // もし node 自身に transform が載っていた場合だけ無効化（親のtransformは元々ここに出ない）
  try {
    const t = window.getComputedStyle(node).transform;
    if (t && t !== "none") style.transform = "none";
  } catch {}

  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio,
    backgroundColor: bg,
    width: w,
    height: h,
    style,
    fontEmbedCSS: fontEmbedCSS || undefined,
  });

  return { dataUrl, w, h };
}


export default function SlideAIProHome() {
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isIntelMode, setIsIntelMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [agendaJson, setAgendaJson] = useState(null);
  const [subtitleDate, setSubtitleDate] = useState("");
  const [imageUrlByKey, setImageUrlByKey] = useState({});

  const [isExporting, setIsExporting] = useState(false);

  // slides state
  const [slidesState, setSlidesState] = useState([]);

  // Edit Modal state（ここが“配線”）
  const [editOpen, setEditOpen] = useState(false);
  const [editIdx, setEditIdx] = useState(-1);
  const [editSlide, setEditSlide] = useState(null);

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
      if (editOpen && e.key === "Escape") {
        e.preventDefault();
        setEditOpen(false);
        setEditIdx(-1);
        setEditSlide(null);
        return;
      }
      if (!isMenuOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        setIsMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMenuOpen, editOpen]);

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

  // SlideDeck からの edit 要求 → “モーダルを開く”
  const onRequestEditSlide = (slide, idx) => {
    let i = typeof idx === "number" ? idx : -1;

    if (i < 0 || i >= (slidesState?.length || 0)) {
      const sid = String(slide?.id || "");
      if (sid) {
        const found = (slidesState || []).findIndex((s) => String(s?.id || "") === sid);
        if (found >= 0) i = found;
      }
    }

    const base = (i >= 0 ? slidesState?.[i] : null) || slide || null;
    if (!base || i < 0) return;

    setEditIdx(i);
    setEditSlide(base);
    setEditOpen(true);
  };

  // SlideEditModal からの save → slidesState に反映
  const onSaveEditedSlide = (index, nextSlide) => {
    const i = Number(index);
    if (!Number.isFinite(i) || i < 0 || i >= (slidesState?.length || 0)) return;

    setSlidesState((arr) => {
      const copy = Array.isArray(arr) ? [...arr] : [];
      copy[i] = nextSlide;
      return copy;
    });

    setEditOpen(false);
    setEditIdx(-1);
    setEditSlide(null);
  };

  const onCancelEdit = () => {
    setEditOpen(false);
    setEditIdx(-1);
    setEditSlide(null);
  };

  const handleGenerate = async () => {
    const brief = trimmed;
    if (!brief) return;
    if (isSending) return;

    setIsSending(true);
    setAgendaJson(null);
    setImageUrlByKey({});
    setSlidesState([]);

    // 生成中は編集も閉じる
    setEditOpen(false);
    setEditIdx(-1);
    setEditSlide(null);

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

      try {
        const built = buildSlidesFromAgenda({
          brief: brief || "SlideAI Pro",
          agenda: json,
          subtitleDate: baseDateLocal,
        });
        setSlidesState(Array.isArray(built) ? built : []);
      } catch (ee) {
        console.error(ee);
        setSlidesState([]);
      }

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
  const canExport = (slidesState?.length || 0) > 0 && !isSending && !isExporting;

const handleExportPNG = async () => {
  if (!canExport) return;
  setIsExporting(true);

  try {
    const root = document.getElementById("slidesRoot");
    if (!root) throw new Error("slidesRoot が見つかりません");

    const pages = Array.from(root.querySelectorAll('[data-slide-page="true"]'));
    if (!pages.length) throw new Error("キャプチャ対象スライドが0枚です");

    const bg = isIntelMode ? "#0b1220" : "#ffffff";

    // 1枚ずつ offscreen で “scale無し” キャプチャ → そのまま保存
    for (let i = 0; i < pages.length; i++) {
      const { dataUrl } = await captureSlideAsPngDataUrl(pages[i], {
        bg,
        pixelRatio: 2,
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


function getUnscaledSize(el) {
  if (!el) return { w: 1, h: 1 };

  // offsetWidth/Height は transform の影響を受けない（重要）
  const ow = Number(el.offsetWidth || 0);
  const oh = Number(el.offsetHeight || 0);

  if (ow > 0 && oh > 0) {
    return { w: Math.max(1, Math.round(ow)), h: Math.max(1, Math.round(oh)) };
  }

  // 念のため fallback（最終手段）
  const rect = el.getBoundingClientRect();
  return { w: Math.max(1, Math.round(rect.width)), h: Math.max(1, Math.round(rect.height)) };
}

function createExportStage(originalNode, bg) {
  const { w, h } = getUnscaledSize(originalNode);

  const stage = document.createElement("div");
  stage.setAttribute("data-export-stage", "true");
  Object.assign(stage.style, {
    position: "fixed",
    left: "-100000px",
    top: "0",
    width: `${w}px`,
    height: `${h}px`,
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: "-1",
    background: bg,
  });

  // 画面表示と切り離すために clone を使う（レイアウトを固定）
  const cloned = originalNode.cloneNode(true);

  // ここが肝：export 時は transform/scale を殺して “元の幅” で描画させる
  Object.assign(cloned.style, {
    width: `${w}px`,
    height: `${h}px`,
    transform: "none",
    transformOrigin: "top left",
    margin: "0",
  });

  stage.appendChild(cloned);
  document.body.appendChild(stage);

  return {
    stage,
    cloned,
    w,
    h,
    cleanup: () => {
      try {
        stage.remove();
      } catch {}
    },
  };
}

async function waitForStableLayout(rootEl) {
  if (document?.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {}
  }

  await waitImagesIn(rootEl);

  // レイアウト確定を 2フレーム待つ（これがないと微妙に折返しが揺れることがある）
  await new Promise((r) => requestAnimationFrame(r));
  await new Promise((r) => requestAnimationFrame(r));
}

async function captureSlideAsPngDataUrl(slideNode, { bg, pixelRatio }) {
  const { stage, cloned, w, h, cleanup } = createExportStage(slideNode, bg);

  try {
    await waitForStableLayout(stage);

    const dataUrl = await toPng(cloned, {
      cacheBust: true,
      pixelRatio: pixelRatio || 2,
      backgroundColor: bg,
      width: w,
      height: h,

      // clone後の “最終描画幅” をさらに固定（html-to-image 側のズレ抑止）
      style: {
        width: `${w}px`,
        height: `${h}px`,
        transform: "none",
        transformOrigin: "top left",
        margin: "0",
      },
    });

    return { dataUrl, w, h };
  } finally {
    cleanup();
  }
}


// 追加：dataUrl -> Uint8Array
function dataUrlToU8(dataUrl) {
  const s = String(dataUrl || "");
  const i = s.indexOf(",");
  const b64 = i >= 0 ? s.slice(i + 1) : s;
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) u8[k] = bin.charCodeAt(k);
  return u8;
}

// 追加：Blob download
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// そのまま見えているスライドDOMを、Chromeの印刷エンジンでPDF化する（最も崩れにくい）
async function handleExportPDF() {
  const root = slidesRootRef.current;
  if (!root) return;

  const pages = Array.from(root.querySelectorAll('[data-slide-page="true"]'));
  if (!pages.length) {
    alert("スライドが見つかりませんでした。");
    return;
  }

  // 画像・フォントが未ロードだと「image loading...」等が混ざるので、ここで待つ
  await waitFontsReady();
  await waitImagesIn(root);

  // 新規ウィンドウ（同一オリジンなのでDOMコピー可能）
  const w = window.open("", "_blank", "noopener,noreferrer,width=1200,height=800");
  if (!w) {
    alert("ポップアップがブロックされました。ブラウザ設定をご確認ください。");
    return;
  }

  // 現在ページのスタイル（styleタグとCSSリンク）を可能な範囲で引き継ぐ
  const headStyles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
    .map((el) => el.outerHTML)
    .join("\n");

  // 印刷用の最低限CSS：余白0 / 背景色含む / ページ区切り
  const printCSS = `
    <style>
      @page { size: 13.333in 7.5in; margin: 0; } /* 16:9 */
      html, body { margin: 0; padding: 0; background: #000; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .__printWrap { width: 100%; }
      [data-slide-page="true"] { break-after: page; page-break-after: always; }
      /* export時に transform/zoom が絡むと崩れるので無効化 */
      [data-slide-page="true"], [data-slide-page="true"] * {
        transform: none !important;
        zoom: 1 !important;
      }
    </style>
  `;

  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8" />${headStyles}${printCSS}</head><body><div class="__printWrap"></div></body></html>`);
  w.document.close();

  const wrap = w.document.querySelector(".__printWrap");

  // ページDOMを複製して印刷窓に貼り付け
  pages.forEach((p) => {
    const clone = p.cloneNode(true);
    wrap.appendChild(clone);
  });

  // 印刷窓側でもフォント・画像のロードを待ってから印刷
  await new Promise((resolve) => {
    const tick = () => {
      try {
        const doc = w.document;
        if (!doc || doc.readyState !== "complete") return setTimeout(tick, 50);

        const fontsReady = doc.fonts ? doc.fonts.ready : Promise.resolve();

        const imgs = Array.from(doc.images || []);
        const imgPromises = imgs.map((img) => {
          // lazy が残っていると印刷時に未ロードが出るので強制eager
          try { img.loading = "eager"; } catch {}
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise((res) => {
            const done = () => res();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
          });
        });

        Promise.all([fontsReady, ...imgPromises]).then(() => {
          // 2フレーム待ってレイアウト確定
          w.requestAnimationFrame(() => w.requestAnimationFrame(resolve));
        });
      } catch {
        resolve();
      }
    };
    tick();
  });

  // 印刷ダイアログ -> 保存先で「PDFに保存」
  w.focus();
  w.print();
}

// 既存のやつがある前提。無いならこれも入れてください。
async function waitFontsReady() {
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  } catch {}
}


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

  const requestUpgradeFromMenu = () => {
    if (isMenuOpen) setIsMenuOpen(false);

    const nextPath = "/slideaipro/slideaiupgrade?src=slideaipro";

    window.setTimeout(async () => {
      try {
        const user = await getSignedInUserOnce();
        if (user) {
          await router.push(nextPath);
          return;
        }
        await router.push(buildLoginUrl(nextPath));
      } catch (e) {
        console.error(e);
        try {
          await router.push(buildLoginUrl(nextPath));
        } catch (ee) {
          console.error(ee);
        }
      }
    }, 160);
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
          // menu / edit open 中は blur を走らせない
          if (isMenuOpen || editOpen) return;
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

          {(slidesState?.length || 0) > 0 && (
            <SlideDeck
              slides={slidesState}
              isIntelMode={isIntelMode}
              hasPrefetched={hasPrefetched}
              imageUrlByKey={imageUrlByKey}
              onRequestEditSlide={onRequestEditSlide}
              onEditSlide={onRequestEditSlide}
            />
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
                <button className="iconBtn iconBtnInMenu" aria-label="Close" onClick={() => setIsMenuOpen(false)}>
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

              <div className="menuItem">
                <div className="miLeft">
                  <div className="miTitle">Export</div>
                  <div className="miSub">PNG / PDF</div>
                </div>
                <div className="miActions">
                  <button className="menuActionBtn" disabled={!canExport} onClick={requestExportPNGFromMenu} aria-label="Export PNG">
                    PNG
                  </button>
                  <button className="menuActionBtn" disabled={!canExport} onClick={requestExportPDFFromMenu} aria-label="Export PDF">
                    PDF
                  </button>
                </div>
              </div>

              <div
                className="menuItem menuItemClickable"
                role="button"
                tabIndex={0}
                onClick={requestUpgradeFromMenu}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    requestUpgradeFromMenu();
                  }
                }}
                aria-label="Open Upgrade page"
              >
                <div className="miLeft">
                  <div className="miTitle">Upgrade</div>
                  <div className="miSub">Plans / Billing / Pro features</div>
                </div>
                <div className="miActions">
                  <button className="menuActionBtn" onClick={requestUpgradeFromMenu} aria-label="Upgrade">
                    Open
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {(isSending || isExporting) && <ProgressOverlay progress={isExporting ? 88 : progress} />}

        {/* ★ここが本題：編集UIを“実際に使う” */}
        <SlideEditModal
          open={editOpen}
          slide={editSlide}
          slideIndex={editIdx >= 0 ? editIdx : 0}
          isIntelMode={isIntelMode}
          onCancel={onCancelEdit}
          onSave={onSaveEditedSlide}
        />

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

          .iconBtnInMenu {
            border-radius: 12px;
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
            border: 1px solid ${isIntelMode ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.08)"};
            background: ${isIntelMode ? "rgba(255,255,255,0.08)" : "#ffffff"};
            color: ${textColor};
            padding: 10px 14px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 800;
            cursor: pointer;
            user-select: none;
            box-shadow: ${isIntelMode ? "0 10px 22px rgba(0,0,0,0.25)" : "0 2px 10px rgba(0,0,0,0.06)"};
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

          /* ===== Side Menu ===== */
          .menuOverlay {
            position: fixed;
            inset: 0;
            background: ${isIntelMode ? "rgba(0,0,0,0.26)" : "rgba(0,0,0,0.10)"};
            z-index: 9000;
            display: flex;
            justify-content: flex-end;
          }

          .menuPanel {
            width: min(560px, 72vw);
            min-width: 320px;
            height: 100%;
            padding: 22px 18px;
            box-sizing: border-box;
          }

          .menuLight {
            background: #ffffff;
            color: rgba(10, 15, 27, 0.96);
            border-left: 1px solid rgba(0, 0, 0, 0.08);
            box-shadow: 0 18px 42px rgba(0, 0, 0, 0.1), 0 10px 20px rgba(0, 0, 0, 0.06);
          }

          .menuDark {
            background: rgba(0, 0, 0, 0.84);
            color: rgba(255, 255, 255, 0.92);
            border-left: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(14px);
            box-shadow: 0 18px 42px rgba(0, 0, 0, 0.42), 0 10px 20px rgba(0, 0, 0, 0.28);
          }

          .menuHeader {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 4px 4px 10px;
            margin-bottom: 6px;
          }
          .menuTitle {
            font-weight: 900;
            letter-spacing: 0.2px;
            font-size: 20px;
          }

          .menuItem {
            margin: 10px 6px 12px;
            padding: 14px 14px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            cursor: default;
            transform: translateZ(0);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            background: ${isIntelMode ? "rgba(255,255,255,0.08)" : "#ffffff"};
            border: 1px solid ${isIntelMode ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.04)"};
            box-shadow: ${isIntelMode ? "0 10px 26px rgba(0,0,0,0.32)" : "0 6px 16px rgba(0,0,0,0.05)"};
          }

          .menuItemClickable {
            cursor: pointer;
          }

          .menuItem:hover {
            transform: translateY(-2px);
            box-shadow: ${isIntelMode ? "0 14px 34px rgba(0,0,0,0.40)" : "0 10px 24px rgba(0,0,0,0.08)"};
          }

          .miLeft {
            display: flex;
            flex-direction: column;
            gap: 3px;
            min-width: 0;
          }
          .miTitle {
            font-weight: 900;
            font-size: 14px;
            letter-spacing: 0.15px;
          }
          .miSub {
            font-size: 12px;
            opacity: 0.72;
          }
          .miActions {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-shrink: 0;
          }

          .menuActionBtn {
            border: 1px solid ${isIntelMode ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.08)"};
            background: ${isIntelMode ? "rgba(255,255,255,0.10)" : "#ffffff"};
            color: ${isIntelMode ? "rgba(255,255,255,0.92)" : "rgba(10,15,27,0.96)"};
            padding: 10px 14px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 900;
            cursor: pointer;
            user-select: none;
            white-space: nowrap;
            box-shadow: ${isIntelMode ? "0 10px 22px rgba(0,0,0,0.25)" : "0 2px 10px rgba(0,0,0,0.06)"};
          }
          .menuActionBtn:disabled {
            opacity: 0.35;
            cursor: default;
            box-shadow: none;
          }
          .menuActionBtn:active:not(:disabled) {
            transform: scale(0.99);
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

  /* 文字の“太り”差を抑える（フォントが無い時の擬似ボールド等を抑制） */
  [data-slide-page="true"] {
    font-synthesis: none;
    -webkit-font-smoothing: antialiased;
    text-rendering: geometricPrecision;
  }

  /* 書き出し中：余計なUI（Editボタン等）を消す＆動く要素を止める */
  html[data-exporting="1"] [data-slide-page="true"] button {
    visibility: hidden !important;
  }
  html[data-exporting="1"] * {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }
`}</style>

      </div>
    </>
  );
}
