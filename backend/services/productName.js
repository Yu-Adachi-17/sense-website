// backend/services/productName.js

const fs = require("fs");
const path = require("path");

const EMAIL_LOCALES_DIR = path.join(__dirname, "..", "locales", "email");
const DEFAULT_PRODUCT_NAME = "Minutes.AI";

// locale → 短縮コード (ja-JP, ja_jp → ja)
function getShortLocale(locale) {
  if (!locale) return "en";
  return String(locale).toLowerCase().split(/[-_]/)[0] || "en";
}

const cache = {}; // shortLocale → productName

function loadProductName(locale) {
  const short = getShortLocale(locale);

  // 優先順: 完全ロケール → 短縮ロケール → en
  const candidates = [];
  if (locale) {
    candidates.push(`${locale}.json`);
  }
  if (!candidates.includes(`${short}.json`)) {
    candidates.push(`${short}.json`);
  }
  candidates.push("en.json");

  for (const file of candidates) {
    const fullPath = path.join(EMAIL_LOCALES_DIR, file);
    if (!fs.existsSync(fullPath)) continue;

    try {
      const raw = fs.readFileSync(fullPath, "utf8");
      const json = JSON.parse(raw);

      // トップレベル "Minutes.AI" を見る
      if (json && typeof json["Minutes.AI"] === "string") {
        const name = json["Minutes.AI"];
        console.log(
          `[EMAIL_PRODUCT] Using productName="${name}" for locale=${locale} (file=${file})`
        );
        return name;
      }
    } catch (e) {
      console.error(
        "[EMAIL_PRODUCT] Failed to load productName from",
        fullPath,
        e.message
      );
    }
  }

  console.warn(
    `[EMAIL_PRODUCT] No productName found for locale=${locale}. Fallback to "${DEFAULT_PRODUCT_NAME}".`
  );
  return DEFAULT_PRODUCT_NAME;
}

function getProductName(locale) {
  const short = getShortLocale(locale);
  if (!cache[short]) {
    cache[short] = loadProductName(locale);
  }
  return cache[short];
}

module.exports = {
  getProductName,
};
