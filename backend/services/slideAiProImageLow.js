// services/slideAiProImageLow.js
"use strict";

const crypto = require("crypto");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 超軽量メモリキャッシュ（同一cacheKey+promptなら再生成しない）
// Railway等でインスタンスが増えると共有されないが、まずはこれで十分。
const CACHE = new Map(); // cacheKey -> { promptHash, dataUrl, mime, createdAt }
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12h
const CACHE_MAX = 200;

function now() {
  return Date.now();
}

function sha1(s) {
  return crypto.createHash("sha1").update(String(s || ""), "utf8").digest("hex");
}

function mimeFromFormat(fmt) {
  const f = String(fmt || "png").toLowerCase();
  if (f === "jpeg" || f === "jpg") return "image/jpeg";
  if (f === "webp") return "image/webp";
  return "image/png";
}

function toDataUrl(b64, mime) {
  return `data:${mime};base64,${b64}`;
}

function normalizePrompt(p) {
  const s = String(p || "").trim();
  // GPT Image の上限は 32000 だが、ここは “事故防止” のため少なめに制限（必要なら引き上げてOK）
  // API上限: 32000 chars for GPT image models :contentReference[oaicite:1]{index=1}
  return s.length > 8000 ? s.slice(0, 8000) : s;
}

function normalizeCacheKey(k) {
  return String(k || "").trim();
}

function pruneCacheIfNeeded() {
  if (CACHE.size <= CACHE_MAX) return;

  // createdAt が古い順に落とす
  const entries = Array.from(CACHE.entries()).sort(
    (a, b) => (a[1].createdAt || 0) - (b[1].createdAt || 0)
  );
  const removeCount = Math.max(1, CACHE.size - CACHE_MAX);
  for (let i = 0; i < removeCount; i++) {
    CACHE.delete(entries[i][0]);
  }
}

function getCache(cacheKey, promptHash) {
  const hit = CACHE.get(cacheKey);
  if (!hit) return null;

  const age = now() - (hit.createdAt || 0);
  if (age > CACHE_TTL_MS) {
    CACHE.delete(cacheKey);
    return null;
  }

  if (hit.promptHash !== promptHash) return null;
  return hit;
}

function setCache(cacheKey, payload) {
  CACHE.set(cacheKey, payload);
  pruneCacheIfNeeded();
}

function pickOne(v, allowedSet, fallback) {
  const s = String(v || "").trim();
  if (!s) return fallback;
  return allowedSet.has(s) ? s : fallback;
}

function normalizeOutputFormat(fmt) {
  const f = String(fmt || "").trim().toLowerCase();
  if (!f) return null; // 未指定なら送らない（APIデフォルト png）
  if (f === "png" || f === "jpeg" || f === "webp") return f;
  if (f === "jpg") return "jpeg";
  return null;
}

function normalizeSize(sz) {
  // GPT Image models: 1024x1024, 1536x1024, 1024x1536, auto :contentReference[oaicite:2]{index=2}
  const allowed = new Set(["1024x1024", "1536x1024", "1024x1536", "auto"]);
  const s = String(sz || "").trim();
  return allowed.has(s) ? s : "1024x1024";
}

function normalizeQuality(q) {
  // GPT Image models: low/medium/high/auto :contentReference[oaicite:3]{index=3}
  const allowed = new Set(["low", "medium", "high", "auto"]);
  return pickOne(q, allowed, "low");
}

function normalizeBackground(bg) {
  // GPT Image models: transparent/opaque/auto :contentReference[oaicite:4]{index=4}
  const allowed = new Set(["transparent", "opaque", "auto"]);
  const s = String(bg || "").trim();
  if (!s) return null;
  return allowed.has(s) ? s : null;
}

function normalizeModeration(m) {
  // GPT Image models: low/auto :contentReference[oaicite:5]{index=5}
  const allowed = new Set(["low", "auto"]);
  const s = String(m || "").trim();
  if (!s) return null;
  return allowed.has(s) ? s : null;
}

async function callOpenAIImageGeneration({
  prompt,
  model = "gpt-image-1.5",
  quality = "low",
  size = "1024x1024",
  output_format = null,
  output_compression = null,
  background = null,
  moderation = null,
  user = undefined,
}) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing");
  }
  if (typeof fetch !== "function") {
    throw new Error("Global fetch is not available. Use Node 18+.");
  }

  const safePrompt = normalizePrompt(prompt);
  const safeModel = String(model || "gpt-image-1.5").trim() || "gpt-image-1.5";
  const safeQuality = normalizeQuality(quality);
  const safeSize = normalizeSize(size);

  let fmt = normalizeOutputFormat(output_format); // nullなら送らない
  const bg = normalizeBackground(background);
  const mod = normalizeModeration(moderation);

  // 透明背景を指定する場合、出力形式は png or webp が必要 :contentReference[oaicite:6]{index=6}
  if (bg === "transparent") {
    if (fmt === "jpeg") fmt = "png";
    // fmt が未指定なら APIデフォルト png なので問題なし
  }

  const body = {
    model: safeModel,
    prompt: safePrompt,
    n: 1,
    size: safeSize,
    quality: safeQuality,
  };

  // GPT Image models only params（指定があるときだけ送る）
  if (fmt) body.output_format = fmt;

  // output_compression は jpeg/webp のときだけサポート :contentReference[oaicite:7]{index=7}
  if (fmt === "jpeg" || fmt === "webp") {
    const c =
      typeof output_compression === "number" ? output_compression : 100;
    const clamped = Math.max(0, Math.min(100, Math.floor(c)));
    body.output_compression = clamped;
  }

  if (bg) body.background = bg;
  if (mod) body.moderation = mod;

  // OpenAI側の濫用検知に役立つユーザー識別子（任意） :contentReference[oaicite:8]{index=8}
  if (user) body.user = String(user);

  const resp = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const txt = await resp.text();
  let json = null;
  try {
    json = JSON.parse(txt);
  } catch (_) {
    // noop
  }

  if (!resp.ok) {
    const msg =
      (json && (json.error?.message || json.message)) ||
      txt ||
      `OpenAI image generation failed: HTTP ${resp.status}`;
    throw new Error(msg);
  }

  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI response missing data[0].b64_json");
  }

  return {
    b64,
    // fmt未指定なら実質 png（APIデフォルト） :contentReference[oaicite:9]{index=9}
    output_format: fmt || "png",
  };
}

/**
 * items: [{ cacheKey, prompt }]
 * returns: [{ cacheKey, dataUrl, mime, cached }]
 */
async function generateLowImages(items, opts = {}) {
  const safeItems = Array.isArray(items) ? items : [];
  if (safeItems.length === 0) return [];

  // SwiftUI(1.5) と合わせるデフォルト
  const model = opts.model || "gpt-image-1.5";
  const quality = opts.quality || "low";
  const size = opts.size || "1024x1024";

  // これらは「指定がある場合のみ」送る（Swift側は未指定＝デフォルトpng）
  const output_format = opts.output_format || null;
  const output_compression =
    typeof opts.output_compression === "number" ? opts.output_compression : null;

  // GPT Image models の追加オプション（必要時のみ）
  const background = opts.background || null;   // "transparent" | "opaque" | "auto"
  const moderation = opts.moderation || null;   // "low" | "auto"

  const effectiveFmt = normalizeOutputFormat(output_format) || "png";
  const mime = mimeFromFormat(effectiveFmt);

  const results = [];
  for (const it of safeItems) {
    const cacheKey = normalizeCacheKey(it?.cacheKey);
    const prompt = normalizePrompt(it?.prompt);

    if (!cacheKey || !prompt) {
      results.push({
        cacheKey: cacheKey || null,
        dataUrl: null,
        mime,
        cached: false,
        error: "cacheKey and prompt are required",
      });
      continue;
    }

    const promptHash = sha1(prompt);
    const cached = getCache(cacheKey, promptHash);
    if (cached) {
      results.push({
        cacheKey,
        dataUrl: cached.dataUrl,
        mime: cached.mime,
        cached: true,
      });
      continue;
    }

    const { b64, output_format: usedFmt } = await callOpenAIImageGeneration({
      prompt,
      model,
      quality,
      size,
      output_format,
      output_compression,
      background,
      moderation,
      user: cacheKey,
    });

    const usedMime = mimeFromFormat(usedFmt);
    const dataUrl = toDataUrl(b64, usedMime);

    const payload = {
      promptHash,
      dataUrl,
      mime: usedMime,
      createdAt: now(),
    };
    setCache(cacheKey, payload);

    results.push({
      cacheKey,
      dataUrl,
      mime: usedMime,
      cached: false,
    });
  }

  return results;
}

module.exports = {
  generateLowImages,
};
