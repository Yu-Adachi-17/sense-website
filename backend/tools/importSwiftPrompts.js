#!/usr/bin/env node
/**
 * Swift の GeminiByLanguage*.swift から言語別プロンプトを抽出し、
 * backend/formats/<format>/<locale>.json の prompt に書き込む。
 * Swift 言語キーと JSON ファイル名の不一致を吸収（複製出力含む）。
 *
 * 使い方:
 *   node tools/importSwiftPrompts.js \
 *     --swiftDir "/Users/あなた/Documents/MinutesAI/MinutesAI/Models" \
 *     --formatsDir "./formats"
 */

const fs = require('fs');
const path = require('path');
const argv = require('yargs')
  .option('swiftDir',   { type: 'string', demandOption: true })
  .option('formatsDir', { type: 'string', default: path.join(process.cwd(), 'formats') })
  .help().argv;

const SWIFT_DIR   = path.resolve(argv.swiftDir);
const FORMATS_DIR = path.resolve(argv.formatsDir);

// === Swift ファイル名 → formats/<id> ===
const FILE_TO_FORMAT_ID = {
  'GeminiByLanguage.swift':                 'general',
  'GeminiByLanguageBusinessNegotiation.swift': 'negotiation',
  'GeminiByLanguagePresentation.swift':     'presentation',
  'GeminiByLanguageLogical1on1.swift':      'logical1on1',
  'GeminiByLanguageBrainStorming.swift':    'brainStorming',
  'GeminiByLanguageJobInterview.swift':     'jobInterview',
  'GeminiByLanguageLecture.swift':          'lecture',
  'GeminiByLanguageFlexible.swift':         'flexible',
  // 'GeminiByLanguageOpinion.swift':       'opinion', // ←不要とのことなので除外
};

// === フォーマットごとの既定スキーマ（必要に応じて調整可）
const SCHEMA_BY_FORMAT = {
  general:       'general-json@1',
  negotiation:   'negotiation-json@1',
  presentation:  'presentation-json@1',
  logical1on1:   'logical1on1-json@1',
  brainStorming: 'brainstorming-json@1',
  jobInterview:  'interview-json@1',
  lecture:       'lecture-json@1',
  flexible:      'flexible-json@1',
};

// === あなたの「最終ターゲット」言語一覧（ファイル名）
const SUPPORTED = new Set([
  'ar','da','de','en','es-ES','es-MX','fr','id','ja','ko','ms','nl','no','pt-BR','pt-PT','sv','tr','zh-CN','zh-TW'
]);

/**
 * Swift 言語キー → 出力先ターゲット配列
 * ここでアンマッチを吸収（複製もここで定義）
 */
function mapSwiftLocaleToTargets(swiftLocale) {
  switch (swiftLocale) {
    case 'zh-Hans': return ['zh-CN'];
    case 'zh-Hant': return ['zh-TW'];
    case 'es':      return ['es-ES', 'es-MX'];
    case 'pt':      return ['pt-PT', 'pt-BR'];
    case 'nb':      return ['no'];
    default:
      // そのままのコードが SUPPORTED にあれば採用
      if (SUPPORTED.has(swiftLocale)) return [swiftLocale];
      // それ以外はマッピング無し（スキップ）
      return [];
  }
}

// 抽出: "xx" : """ ... """
const ENTRY_RE = /"([a-z]{2}(?:-[A-Z]{2})?)"\s*:\s*"""\s*([\s\S]*?)\s*"""/g;

function readFileSafe(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}

function writeJsonPretty(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8');
}

function mergeIntoFormatFile(formatId, locale, promptText) {
  const filePath = path.join(FORMATS_DIR, formatId, `${locale}.json`);
  const existed = readFileSafe(filePath);
  let json;
  if (existed) {
    try { json = JSON.parse(existed); } catch { json = {}; }
  } else {
    json = {
      formatId,
      locale,
      schemaId: SCHEMA_BY_FORMAT[formatId] || 'flexible-json@1',
      title: "",
      prompt: "",
      notes: ""
    };
  }
  json.prompt  = (promptText || '').replace(/\r\n/g, '\n').trim();
  json.schemaId = json.schemaId || (SCHEMA_BY_FORMAT[formatId] || 'flexible-json@1');
  json.formatId = json.formatId || formatId;
  json.locale   = json.locale   || locale;

  writeJsonPretty(filePath, json);
  return filePath;
}

function extractPromptsFromSwift(swiftText) {
  const result = {};
  let m;
  while ((m = ENTRY_RE.exec(swiftText)) !== null) {
    const locale  = m[1];
    const content = m[2];
    result[locale] = content;
  }
  return result;
}

function main() {
  const filenames = fs.readdirSync(SWIFT_DIR).filter(f => f.endsWith('.swift'));
  let writes = 0;

  for (const fname of filenames) {
    const formatId = FILE_TO_FORMAT_ID[fname];
    if (!formatId) continue; // 対象外の Swift はスキップ

    const full = path.join(SWIFT_DIR, fname);
    const text = readFileSafe(full);
    if (!text) continue;

    const prompts = extractPromptsFromSwift(text);
    const swiftLocales = Object.keys(prompts);
    if (swiftLocales.length === 0) {
      console.warn(`[WARN] No prompts found in ${fname}`);
      continue;
    }

    for (const sLoc of swiftLocales) {
      const targets = mapSwiftLocaleToTargets(sLoc);
      if (targets.length === 0) {
        console.warn(`[WARN] Skip unsupported locale "${sLoc}" in ${fname}`);
        continue;
      }
      for (const tLoc of targets) {
        const out = mergeIntoFormatFile(formatId, tLoc, prompts[sLoc]);
        console.log(`✔ ${fname} :: ${sLoc} → ${formatId}/${tLoc}.json`);
        writes++;
      }
    }
  }

  console.log(`\n✅ Done. Updated ${writes} files under ${FORMATS_DIR}\n`);
}

main();
