// src/features/slideaipro/useSlideAiproController.js

import { useCallback, useMemo, useRef, useState } from "react";

function safeJsonParse(v) {
  if (typeof v !== "string") return null;
  try { return JSON.parse(v); } catch { return null; }
}

export function useSlideAiproController() {
  const [title, setTitle] = useState("カフェの新作メニュー提案資料");
  const [text, setText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  // 生成結果（最低限）
  const [pdfUrl, setPdfUrl] = useState("");
  const [imageUrlByKey, setImageUrlByKey] = useState(null);

  const abortRef = useRef(null);

  const canGenerate = useMemo(() => {
    return !isGenerating && (text || "").trim().length > 0;
  }, [isGenerating, text]);

  const generate = useCallback(async (options = {}) => {
    if (!canGenerate) return;

    setIsGenerating(true);
    setProgress(0);
    setError("");

    // 進捗は実処理と同期できないなら「見せかけ」でも良い（0→90→完了）
    let alive = true;
    let p = 0;
    const t = setInterval(() => {
      if (!alive) return;
      p = Math.min(0.9, p + 0.03);
      setProgress(Math.round(p * 100));
    }, 350);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const payload = {
        title,
        text,
        // 今後増えても “ここに集約”
        ...options,
      };

      const r = await fetch("/api/slideaipro/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: ac.signal,
      });

      const raw = await r.text();
      const data = safeJsonParse(raw) || { raw };

      if (!r.ok) {
        const msg =
          data?.error === "Missing env: SLIDEAIPRO_BACKEND_BASE_URL"
            ? data.error
            : (data?.message || data?.backendBody || raw || `HTTP ${r.status}`);

        throw new Error(msg);
      }

      // backendの返し方に寄せて吸収（pdfUrl / imageUrlByKey を期待）
      setPdfUrl(data.pdfUrl || data.url || "");
      setImageUrlByKey(data.imageUrlByKey || data.imagesByKey || null);

      alive = false;
      setProgress(100);
    } catch (e) {
      const msg =
        e?.name === "AbortError" ? "aborted" : (e?.message || String(e));
      setError(msg);
      setProgress(0);
    } finally {
      alive = false;
      clearInterval(t);
      abortRef.current = null;
      setIsGenerating(false);
    }
  }, [canGenerate, title, text]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    title, setTitle,
    text, setText,
    isGenerating,
    progress,
    error,
    pdfUrl,
    imageUrlByKey,
    canGenerate,
    generate,
    cancel,
  };
}
