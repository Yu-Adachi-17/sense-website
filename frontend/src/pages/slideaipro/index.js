// src/pages/slideaipro/index.js

import Head from "next/head";
import { useMemo } from "react";
import { useSlideAiproController } from "@/features/slideaipro/useSlideAiproController";
import { resolveImageSrc } from "@/features/slideaipro/resolveImageSrc";

export default function SlideAIProPage() {
  const c = useSlideAiproController();

  const imageKeys = useMemo(() => {
    if (!c.imageUrlByKey) return [];
    return Object.keys(c.imageUrlByKey);
  }, [c.imageUrlByKey]);

  return (
    <>
      <Head>
        <title>SlideAI Pro</title>
      </Head>

      <div style={{ minHeight: "100vh", background: "#000", color: "#fff", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ fontWeight: 700 }}>SlideAI Pro</div>
        </div>

        <div style={{ maxWidth: 980 }}>
          <input
            value={c.title}
            onChange={(e) => c.setTitle(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              outline: "none",
              marginBottom: 12,
            }}
          />

          <textarea
            value={c.text}
            onChange={(e) => c.setText(e.target.value)}
            placeholder="ここに資料化したい文章を貼り付け"
            rows={10}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              outline: "none",
              resize: "vertical",
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
            <button
              onClick={() => c.generate()}
              disabled={!c.canGenerate}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.22)",
                background: c.canGenerate ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.06)",
                color: "#fff",
                cursor: c.canGenerate ? "pointer" : "not-allowed",
              }}
            >
              Generate
            </button>

            {c.isGenerating ? (
              <button
                onClick={c.cancel}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            ) : null}

            <div style={{ flex: 1, height: 10, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <div style={{ width: `${c.progress}%`, height: "100%", background: "rgba(255,255,255,0.35)" }} />
            </div>
            <div style={{ width: 48, textAlign: "right", opacity: 0.8 }}>{c.progress}%</div>
          </div>

          {c.error ? (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid rgba(255,0,0,0.5)", background: "rgba(255,0,0,0.12)" }}>
              generate failed: {c.error}
            </div>
          ) : null}

          {c.pdfUrl ? (
            <div style={{ marginTop: 16 }}>
              <div style={{ opacity: 0.8, marginBottom: 8 }}>PDF</div>
              <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.14)" }}>
                <iframe
                  src={c.pdfUrl}
                  title="pdf"
                  style={{ width: "100%", height: 640, border: "none", background: "#111" }}
                />
              </div>
            </div>
          ) : null}

          {imageKeys.length ? (
            <div style={{ marginTop: 18 }}>
              <div style={{ opacity: 0.8, marginBottom: 8 }}>Images</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                {imageKeys.map((cacheKey) => {
                  const src = resolveImageSrc({
                    cacheKey,
                    imageUrlByKey: c.imageUrlByKey,
                    originalSrc: "",
                    useProxy: true,
                  });

                  return (
                    <div key={cacheKey} style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.14)", overflow: "hidden", background: "rgba(255,255,255,0.04)" }}>
                      <div style={{ padding: 10, fontSize: 12, opacity: 0.75, borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
                        {cacheKey}
                      </div>
                      <img
                        src={src}
                        alt={cacheKey}
                        crossOrigin="anonymous"
                        style={{ width: "100%", display: "block" }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
