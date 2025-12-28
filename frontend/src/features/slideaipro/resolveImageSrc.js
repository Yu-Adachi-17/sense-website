// src/features/slideaipro/resolveImageSrc.js

export function resolveImageSrc({ cacheKey, imageUrlByKey, originalSrc, useProxy = true }) {
  const direct = (imageUrlByKey && cacheKey && imageUrlByKey[cacheKey]) || originalSrc || "";
  if (!direct) return "";

  // 画像がbackendドメインの場合だけ proxy する（安全＆無駄を減らす）
  if (!useProxy) return direct;

  // same-originで配る（Canvas/CORS問題を潰す）
  const enc = encodeURIComponent(direct);
  return `/api/slideaipro/image?u=${enc}`;
}
