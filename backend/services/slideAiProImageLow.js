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
  // 事故防止（極端に長いpromptはコストと遅延の温床）
  return s.length > 8000 ? s.slice(0, 8000) : s;
}

function normalizeCacheKey(k) {
  return String(k || "").trim();
}

function pruneCacheIfNeeded() {
  if (CACHE.size <= CACHE_MAX) return;

  // createdAt が古い順に落とす
  const entries = Array.from(CACHE.entries()).sort((a, b) => (a[1].createdAt || 0) - (b[1].createdAt || 0));
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

async function callOpenAIImageGeneration({
  prompt,
  model = "gpt-image-1-mini",
  quality = "low",
  size = "1024x1024",
  output_format = "png",
  output_compression = 100,
  user = undefined,
}) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing");
  }
  if (typeof fetch !== "function") {
    throw new Error("Global fetch is not available. Use Node 18+.");
  }

  const body = {
    model,
    prompt,
    n: 1,
    size,
    quality,
    output_format,
    output_compression,
  };

  // OpenAI側の濫用検知に役立つユーザー識別子（任意）
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

  return b64;
}

/**
 * items: [{ cacheKey, prompt }]
 * returns: [{ cacheKey, dataUrl, mime, cached }]
 */
async function generateLowImages(items, opts = {}) {
  const safeItems = Array.isArray(items) ? items : [];
  if (safeItems.length === 0) return [];

  const model = opts.model || "gpt-image-1-mini";
  const quality = opts.quality || "low";
  const size = opts.size || "1024x1024";
  const output_format = opts.output_format || "png";
  const output_compression =
    typeof opts.output_compression === "number" ? opts.output_compression : 100;

  const mime = mimeFromFormat(output_format);

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

    const b64 = await callOpenAIImageGeneration({
      prompt,
      model,
      quality,
      size,
      output_format,
      output_compression,
      user: cacheKey,
    });

    const dataUrl = toDataUrl(b64, mime);
    const payload = {
      promptHash,
      dataUrl,
      mime,
      createdAt: now(),
    };
    setCache(cacheKey, payload);

    results.push({
      cacheKey,
      dataUrl,
      mime,
      cached: false,
    });
  }

  return results;
}

module.exports = {
  generateLowImages,
};
