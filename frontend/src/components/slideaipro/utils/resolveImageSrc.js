// src/components/slideaipro/utils/resolveImageSrc.js
export function resolveImageSrc(imageUrlByKey, cacheKey, originalSrc) {
  return (cacheKey && imageUrlByKey?.[cacheKey]) || originalSrc || "";
}
