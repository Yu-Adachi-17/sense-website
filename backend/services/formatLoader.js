// backend/services/formatLoader.js
const fs = require('fs');
const path = require('path');

const FORMATS_DIR = process.env.FORMATS_DIR || path.join(__dirname, '..', 'formats');

// regionを落としていく: ja-JP → ja
function collapseLocale(locale) {
  if (!locale) return [];
  const parts = locale.split('-');
  const seq = [locale];
  if (parts.length > 1) seq.push(parts[0]); // e.g. "ja"
  return seq;
}

function readJSONSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return null;
  }
}

function listFormats() {
  // formats/* のディレクトリ一覧（registry.jsonは除く）
  return fs.readdirSync(FORMATS_DIR)
    .filter(name => fs.statSync(path.join(FORMATS_DIR, name)).isDirectory());
}

function getRegistry() {
  const reg = path.join(FORMATS_DIR, 'registry.json');
  return readJSONSafe(reg) || { formats: {} };
}

// フォーマット一つのメタを registry から拾う（schemaIdなど）
function getFormatMeta(formatId) {
  const registry = getRegistry();
  return registry.formats?.[formatId] || null;
}

// locale優先でJSONを探す（exact → collapsed → en）
function loadFormatJSON(formatId, locale) {
  const dir = path.join(FORMATS_DIR, formatId);
  if (!fs.existsSync(dir)) return null;

  const tries = [
    ...collapseLocale(locale),
    'en'
  ].map(l => path.join(dir, `${l}.json`));

  for (const p of tries) {
    if (fs.existsSync(p)) {
      const json = readJSONSafe(p);
      if (json) return json;
    }
  }
  return null;
}

module.exports = {
  FORMATS_DIR,
  listFormats,
  getRegistry,
  getFormatMeta,
  loadFormatJSON,
};
