// backend/services/formatLoader.js
const fs = require('fs');
const path = require('path');

const FORMATS_DIR = process.env.FORMATS_DIR || path.join(__dirname, '..', 'formats');

// locale を段階的に落としていく: "ja-JP" → ["ja-JP", "ja", ...言語別の優先ロケール...]
function collapseLocale(locale) {
  if (!locale) return [];

  const safe = String(locale).replace('_', '-'); // "es_MX" みたいなのも一応吸収
  const parts = safe.split('-');
  const lang = parts[0].toLowerCase();

  const seq = [];

  // 1. まずはそのまま（es-ES など）
  if (safe) {
    seq.push(safe);
  }

  // 2. 次に言語コードだけ（es, pt, zh など）
  if (lang && lang !== safe) {
    seq.push(lang);
  }

  // 3. 言語コードごとの「代表ロケール」を追加
  //    → backend の formats ディレクトリ構成に合わせる
  if (lang === 'es') {
    // スペイン語: es-ES / es-MX の順で試す
    seq.push('es-ES', 'es-MX');
  } else if (lang === 'pt') {
    // ポルトガル語: pt-PT / pt-BR
    seq.push('pt-PT', 'pt-BR');
  } else if (lang === 'zh') {
    // 中国語: zh-CN / zh-TW
    seq.push('zh-CN', 'zh-TW');
  }

  // 重複削除して返す
  return [...new Set(seq)];
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

// locale優先でJSONを探す（exact → collapsed(lang,代表ロケール) → en）
function loadFormatJSON(formatId, locale) {
  const dir = path.join(FORMATS_DIR, formatId);
  if (!fs.existsSync(dir)) return null;

  const localesToTry = [
    ...collapseLocale(locale),
    'en', // 最後の砦として英語
  ];

  for (const loc of localesToTry) {
    const p = path.join(dir, `${loc}.json`);
    if (fs.existsSync(p)) {
      const json = readJSONSafe(p);
      if (json) {
        return json;
      }
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
