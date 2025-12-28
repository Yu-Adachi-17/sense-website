// src/pages/slideaipro/index.js

import React, { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";

function AtomIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
        <path d="M12 12c3.6-3.6 7.9-5.7 9.6-4 1.7 1.7-.4 6-4 9.6-3.6 3.6-7.9 5.7-9.6 4-1.7-1.7.4-6 4-9.6z" />
        <path d="M12 12c-3.6-3.6-5.7-7.9-4-9.6 1.7-1.7 6 .4 9.6 4 3.6 3.6 5.7 7.9 4 9.6-1.7 1.7-6-.4-9.6-4z" />
        <path d="M12 12c-5.1 0-9.3-2.2-9.3-4.9S6.9 2.2 12 2.2s9.3 2.2 9.3 4.9S17.1 12 12 12z" />
        <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}

/**
 * あなたの既存JSON（VibeSliding / VisualizeModel）に合わせて
 * 「このオブジェクトは画像を持つか？」を雑に拾う抽出器。
 * - VSproblemImageCacheKey / VSproposalImageCacheKey など
 * - imageCacheKey / cacheKey など
 * - imageUrl / originalSrc など
 *
 * 将来スキーマが増えても、ここを増やすだけで index 側は崩れない。
 */
function collectImageCandidates(anyJson) {
  const out = [];
  const seen = new Set();

  const push = (cacheKey, originalSrc) => {
    const k = (cacheKey || "").trim();
    const s = (originalSrc || "").trim();
    if (!k && !s) return;
    const id = `${k}__${s}`;
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ cacheKey: k || null, originalSrc: s || null });
  };

  const walk = (v) => {
    if (!v) return;
    if (Array.isArray(v)) {
      for (const x of v) walk(x);
      return;
    }
    if (typeof v !== "object") return;

    // ありがちなフィールド名群
    const cacheKey =
      v.VSproblemImageCacheKey ||
      v.VSproposalImageCacheKey ||
      v.imageCacheKey ||
      v.cacheKey ||
      v.imageKey ||
      null;

    const originalSrc =
      v.imageUrl ||
      v.originalSrc ||
      v.src ||
      v.url ||
      null;

    if (cacheKey || originalSrc) push(cacheKey, originalSrc);

    for (const key of Object.keys(v)) {
      walk(v[key]);
    }
  };

  walk(anyJson);
  return out;
}

/**
 * 画像は「必ず同一オリジン」で読む。
 * - HTML→Canvas/PDF で CORS taint を踏まない
 * - 外部URLをそのまま <img> に刺さない
 *
 * ここで返すURLは、Vercel(Next)の API Route を経由する形に統一。
 */
function toSameOriginImageSrc({ cacheKey, originalSrc, imageUrlByKey }) {
  // 1) まず cacheKey→実URL が取れてるならそれを採用
  const mapped = cacheKey ? imageUrlByKey?.[cacheKey] : null;

  // 2) mapped が外部URLの場合もあるので、必ず image-proxy を噛ませる
  const base = mapped || originalSrc || "";
  if (!base) return "";

  // 3) cacheKey がある場合は key 経由でプロキシ（推奨）
  //    originalSrc しか無い場合は url 経由でプロキシ
  if (cacheKey) {
    return `/api/slideaipro/image-by-key?cacheKey=${encodeURIComponent(cacheKey)}`;
  }
  return `/api/slideaipro/image-proxy?url=${encodeURIComponent(base)}`;
}

export default function SlideAIProIndexPage() {
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorText, setErrorText] = useState("");

  // ここに生成結果（あなたの Visualize JSON / Slide JSON が入る想定）
  const [visualize, setVisualize] = useState(null);

  /**
   * cacheKey → 実URL のマップ
   * - 生成直後に resolve して埋める
   * - 画像レンダリングは常に「cacheKey前提」で安定化
   */
  const [imageUrlByKey, setImageUrlByKey] = useState({});

  // 生成結果から「画像候補」を拾う
  const imageCandidates = useMemo(() => {
    if (!visualize) return [];
    return collectImageCandidates(visualize);
  }, [visualize]);

  // visualize が変わったら cacheKey をまとめて解決（= 今後の生成で必須）
  useEffect(() => {
    let cancelled = false;

    async function resolveAll() {
      if (!imageCandidates.length) return;

      // cacheKey があるものだけまとめて解決
      const keys = imageCandidates
        .map((x) => x.cacheKey)
        .filter((k) => !!k);

      if (!keys.length) return;

      try {
        const res = await fetch("/api/slideaipro/resolve-image-urls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cacheKeys: Array.from(new Set(keys)) }),
        });

        if (!res.ok) {
          const t = await res.text();
          throw new Error(`resolve-image-urls failed: ${res.status} ${t}`);
        }

        const data = await res.json();
        const map = data?.imageUrlByKey || {};

        if (!cancelled) {
          setImageUrlByKey((prev) => ({ ...prev, ...map }));
        }
      } catch (e) {
        // 画像が出ない原因を潰すため、握りつぶさずに表示
        if (!cancelled) {
          setErrorText(String(e?.message || e));
        }
      }
    }

    resolveAll();
    return () => {
      cancelled = true;
    };
  }, [imageCandidates]);

  async function onGenerate() {
    setErrorText("");
    setIsGenerating(true);
    setVisualize(null);
    setImageUrlByKey({});

    try {
      const res = await fetch("/api/slideaipro/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`generate failed: ${res.status} ${t}`);
      }

      const data = await res.json();

      // data.visualize を優先。無い場合は data 自体を扱う（互換）
      const v = data?.visualize || data;
      setVisualize(v);

      // もし生成レスポンスに最初から map があれば先に取り込む（高速化）
      if (data?.imageUrlByKey && typeof data.imageUrlByKey === "object") {
        setImageUrlByKey((prev) => ({ ...prev, ...data.imageUrlByKey }));
      }
    } catch (e) {
      setErrorText(String(e?.message || e));
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <>
      <Head>
        <title>SlideAI Pro</title>
      </Head>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <AtomIcon size={18} />
            <span style={{ fontWeight: 700 }}>SlideAI Pro</span>
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="ここに文字起こし / 要約 / メモを貼る"
            style={{
              width: "100%",
              minHeight: 180,
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              outline: "none",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          />

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={onGenerate}
              disabled={isGenerating || !inputText.trim()}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                background: isGenerating || !inputText.trim() ? "rgba(0,0,0,0.06)" : "white",
                cursor: isGenerating || !inputText.trim() ? "not-allowed" : "pointer",
                fontWeight: 700,
              }}
            >
              {isGenerating ? "Generating..." : "Generate Slides"}
            </button>

            {isGenerating ? (
              <span style={{ opacity: 0.7, fontSize: 13 }}>
                画像キー解決（cacheKey→URL）も自動で走ります
              </span>
            ) : null}
          </div>

          {errorText ? (
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(255,0,0,0.25)",
                background: "rgba(255,0,0,0.06)",
                color: "rgba(0,0,0,0.85)",
                whiteSpace: "pre-wrap",
                fontSize: 13,
              }}
            >
              {errorText}
            </div>
          ) : null}

          {/* ======== Preview ======== */}
          {visualize ? (
            <div style={{ display: "grid", gap: 14, marginTop: 8 }}>
              <div style={{ fontWeight: 800 }}>Preview</div>

              {/* ここはあなたのスライドJSON構造に合わせて描画すればOK。
                  例として「画像候補」を全部出すデバッグ兼プレビューを載せる。
                  （今の論点= resolvedSrc をどこで作るか、が一目で分かる） */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: 14,
                }}
              >
                {imageCandidates.map((item, idx) => {
                  const cacheKey = item.cacheKey || "";
                  const originalSrc = item.originalSrc || "";

                  // ✅ あなたが貼ってた “resolvedSrc” は「index内でここ」で作る
                  const resolvedSrc = toSameOriginImageSrc({
                    cacheKey,
                    originalSrc,
                    imageUrlByKey,
                  });

                  return (
                    <div
                      key={`${cacheKey}-${idx}`}
                      style={{
                        border: "1px solid rgba(0,0,0,0.10)",
                        borderRadius: 14,
                        background: "white",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ padding: 10, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>cacheKey</div>
                        <div style={{ opacity: 0.75, fontSize: 12, wordBreak: "break-all" }}>
                          {cacheKey || "(none)"}
                        </div>
                        <div style={{ marginTop: 8, fontWeight: 700, fontSize: 13 }}>src</div>
                        <div style={{ opacity: 0.75, fontSize: 12, wordBreak: "break-all" }}>
                          {resolvedSrc || "(empty)"}
                        </div>
                      </div>

                      <div style={{ padding: 10 }}>
                        {resolvedSrc ? (
                          <img
                            src={resolvedSrc}
                            crossOrigin="anonymous"
                            alt=""
                            style={{
                              width: "100%",
                              height: 160,
                              objectFit: "cover",
                              borderRadius: 10,
                              background: "rgba(0,0,0,0.04)",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              height: 160,
                              borderRadius: 10,
                              background: "rgba(0,0,0,0.04)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                              opacity: 0.7,
                            }}
                          >
                            no image
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 生JSONも確認したい時用（必要なら消してOK） */}
              <details>
                <summary style={{ cursor: "pointer", fontWeight: 700 }}>Raw JSON</summary>
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    background: "rgba(0,0,0,0.04)",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.10)",
                    marginTop: 10,
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                >
                  {JSON.stringify(visualize, null, 2)}
                </pre>
              </details>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
