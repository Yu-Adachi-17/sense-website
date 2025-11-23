// services/geminiLongMinutes.js
// iOS の Gemini2.0FlashModel と同等の「長時間議事録生成ロジック」を
// Node.js（@google/generative-ai）に移植した版

require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY is not set. Gemini minutes generation will fail.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ====== 定数（iOS と同じ思想） ======
const MAX_TEXT_LENGTH = 1_000_000;        // 一応の理論上限（保険）
const MAX_ONE_SHOT_LENGTH = 30_000;       // 一撃 minutes 生成の実務上限
const MAX_SEGMENT_SOURCE_LENGTH = 3_000;  // 圧縮前の 1 セグメント上限

// Gemini モデル設定（iOS 側の GenerationConfig に合わせる）
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    maxOutputTokens: 30000, // maxTokens に対して Swift 側と同等
  },
});

/**
 * エントリーポイント：
 * - allText が 30,000 文字以下 → そのまま 1 回投げる
 * - allText が 30,000 超え → 3,000 文字単位で分割→要約→再結合（約 30,000）→それを minutes 生成に使う
 * - maxTokens で切れたら「続きを書かせる」プロンプトでループ（最大 maxRounds 回）
 *
 * @param {Object} params
 * @param {string} params.prompt  minutes 用スキーマプロンプト（iOS の prompt と同じ）
 * @param {string} params.currentTime "2025-11-23 18:04" のような現在時刻文字列
 * @param {string} params.allText STT 後の全文テキスト
 * @param {number} [params.maxRounds=10] 続きを書かせる最大ラウンド数
 * @returns {Promise<string>} 単一 JSON 文字列（normalize 済み）
 */
async function generateMinutesWithLongLogic({
  prompt,
  currentTime,
  allText,
  maxRounds = 10,
}) {
  if (typeof allText !== "string") {
    throw new Error("allText must be a string.");
  }
  if (allText.length > MAX_TEXT_LENGTH) {
    // iOS 側と同様、一応の保険（異常な長さを拒否）
    throw new Error(`allText is too long (> ${MAX_TEXT_LENGTH} characters).`);
  }
  if (allText.length <= 40) {
    throw new Error("Transcript is too short to summarize.");
  }

  let baseText;
  if (allText.length <= MAX_ONE_SHOT_LENGTH) {
    // 通常ケース：全文一撃
    console.log(
      `Gemini(BE).generateMinutes: one-shot minutes (length=${allText.length})`
    );
    baseText = allText;
  } else {
    // 超長時間会議：iOS の STEP3 に相当（分割→要約→再結合）
    console.log(
      `Gemini(BE).generateMinutes: long transcript, start compression (length=${allText.length})`
    );
    baseText = await compressLongTranscriptToMaxLength(allText, MAX_ONE_SHOT_LENGTH);
    console.log(
      `Gemini(BE).generateMinutes: compressed length=${baseText.length}`
    );
  }

  const fullPrompt = `${prompt}

Current Time: ${currentTime}
Input Text:
${baseText}
`;

  // Swift の generateWithContinuation と同じ思想で、maxTokens で切れたら続きを書かせる
  const rawAll = await generateWithContinuation({
    initialPrompt: fullPrompt,
    schemaPrompt: prompt,
    maxRounds,
  });

  // Node 側では「decode できる最初の JSON」を採用（型チェックはしない）
  const unified = normalizeToSingleJSON(rawAll);
  return unified;
}

/**
 * maxTokens 対応：「途中まで出たテキスト」を渡して続きを書かせるループ。
 * Swift の generateWithContinuation を Node 用に移植。
 *
 * @param {Object} params
 * @param {string} params.initialPrompt 1 ラウンド目のプロンプト（schema + time + baseText）
 * @param {string} params.schemaPrompt JSON スキーマ部のプロンプト
 * @param {number} params.maxRounds 最大ラウンド数
 * @returns {Promise<string>} 連結済みの生テキスト
 */
async function generateWithContinuation({ initialPrompt, schemaPrompt, maxRounds }) {
  let accumulatedText = "";
  let currentPrompt = initialPrompt;

  for (let round = 0; round < maxRounds; round++) {
    let response;
    try {
      const result = await model.generateContent(currentPrompt);
      response = result.response;
    } catch (err) {
      console.error(`Gemini(BE) round ${round + 1} generateContent error:`, err);
      // Swift 版と同様、maxTokens 以外は基本的にリカバリせず終了
      throw err;
    }

    const chunk = (response && response.text && response.text()) || "";
    if (chunk) {
      accumulatedText += chunk;
    }

    const candidate = response?.candidates?.[0];
    const finishReason = candidate?.finishReason || candidate?.finish_reason;
    const usage = response?.usageMetadata || response?.usage_metadata;

    console.log(
      "Gemini(BE) round",
      round + 1,
      "finishReason=",
      finishReason,
      "usage=",
      usage
    );

    // MAX_TOKENS 以外、または chunk が空ならそこで終了
    if (finishReason !== "MAX_TOKENS" || !chunk) {
      break;
    }

    // ここから「続きを書かせる」プロンプトを再構築
    const continuationPrompt = `${schemaPrompt}

You were generating a meeting minutes JSON, but the output was truncated due to max_tokens.
Below is EVERYTHING you have generated so far. It may be partial and invalid JSON:

${accumulatedText}

Your task now:
- Continue and COMPLETE the JSON output.
- At the end of THIS response, output ONE SINGLE COMPLETE JSON document from the beginning to the end.
- Fix any broken or duplicated parts so that the final JSON is syntactically valid.
- Do NOT output any explanation, comments, or text outside of the JSON.

Continue the output now.
`;
    currentPrompt = continuationPrompt;
  }

  return accumulatedText;
}

/**
 * テキストを chunkSize 文字ごとに分割（iOS splitTextIntoChunks 相当）
 */
function splitTextIntoChunks(text, chunkSize) {
  if (chunkSize <= 0) return [text];
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * STEP3: 超長時間会議用の圧縮ロジック
 * - allText が maxLength を超えるときのみ呼び出し
 * - 3,000 文字上限で分割し、各チャンクを targetLength まで「重要情報を落とさず圧縮」
 * - 再結合して maxLength を超えていたら末尾カット
 */
async function compressLongTranscriptToMaxLength(allText, maxLength) {
  const totalLength = allText.length;
  if (totalLength <= maxLength) return allText;

  const perSegmentLimit = MAX_SEGMENT_SOURCE_LENGTH;
  const segmentCount = Math.max(1, Math.ceil(totalLength / perSegmentLimit));
  const segmentSize = Math.ceil(totalLength / segmentCount);

  console.log(
    `compressLongTranscriptToMaxLength: totalLength=${totalLength}, segmentCount=${segmentCount}, segmentSize=${segmentSize}`
  );

  const segments = splitTextIntoChunks(allText, segmentSize);
  const safetyTotal = Math.floor(maxLength * 0.95); // 95% を目標値にして余裕

  const compressedSegments = [];
  const totalLenDouble = totalLength;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const li = segment.length;

    let targetLength = Math.floor((li / totalLenDouble) * safetyTotal);

    const minPerSegment = Math.max(
      200,
      Math.floor(safetyTotal / (segments.length * 4))
    );
    targetLength = Math.max(minPerSegment, targetLength);

    const summary = await summarizeSegment({
      segmentText: segment,
      partIndex: i + 1,
      totalParts: segments.length,
      targetLength,
    });

    compressedSegments.push(summary);
  }

  let joined = compressedSegments.join("\n\n");

  if (joined.length > maxLength) {
    joined = joined.slice(0, maxLength);
  }

  return joined;
}

/**
 * 1 セグメント分の要約ロジック
 * - 決定事項 / TODO / 数字 / 固有名詞は残す
 * - 雑談・あいづち・重複は削る
 * - プレーンテキストのみ（JSON禁止）
 */
async function summarizeSegment({ segmentText, partIndex, totalParts, targetLength }) {
  const instruction = `
You are summarizing a long meeting transcript (part ${partIndex} of ${totalParts}).
Summarize this part into at most approximately ${targetLength} characters.

Rules:
- Preserve all key decisions, conclusions, and agreements.
- Preserve all action items with assignees and due dates if they appear.
- Preserve important numbers (prices, quantities, percentages, dates, times) and proper nouns (people, companies, products, projects).
- Remove small talk, greetings, filler phrases, and repetitions.
- Keep the tone neutral and concise.
- Output PLAIN TEXT only. Do NOT output JSON. Do NOT wrap the result in backticks. Do NOT add any explanation before or after the summary.

Here is the transcript for this part:
${segmentText}
`;

  try {
    const result = await model.generateContent(instruction);
    const response = result.response;
    let text = (response && response.text && response.text()) || "";

    if (text.length > targetLength) {
      return text.slice(0, targetLength);
    }
    return text;
  } catch (err) {
    console.error(`summarizeSegment failed for part ${partIndex}:`, err);
    // 失敗時は素の切り詰めで返す（Swift と同じ思想）
    if (segmentText.length > targetLength) {
      return segmentText.slice(0, targetLength);
    }
    return segmentText;
  }
}

/**
 * 正規化：生テキストから「単一 JSON 文字列」を抽出
 * - ```json ... ``` フェンス対応
 * - 最初に JSON.parse できた候補を返す
 * - ダメなら先頭候補をそのまま返し、それも無理なら "{}"
 */
function normalizeToSingleJSON(raw) {
  const candidates = extractAllJsonStrings(raw);
  if (!candidates.length) return "{}";

  for (const cand of candidates) {
    try {
      JSON.parse(cand);
      return cand.trim();
    } catch {
      // decode できない候補はスキップ（Swift だと FlexibleNote/MeetingMinutes で decode していた部分）
    }
  }
  return candidates[0].trim();
}

/**
 * 生テキストから JSON 断片を全部抜き出す
 * - ```json ... ``` があればその中身を優先
 * - なければ全文から { / [ 〜 } / ] をクランプ
 */
function extractAllJsonStrings(source) {
  const results = [];
  const text = String(source || "").trim();

  // A) ```json ... ``` を全部拾う
  const fencedPattern = /```json\s*([\s\S]*?)\s*```/g;
  let m;
  while ((m = fencedPattern.exec(text)) !== null) {
    const inner = m[1];
    const clamped = clampToJsonEnvelope(inner);
    if (clamped) results.push(clamped);
  }

  // B) フェンスが 0 件なら全文からクランプ
  if (!results.length) {
    const clamped = clampToJsonEnvelope(text);
    if (clamped) results.push(clamped);
  }

  // C) trim + 重複除去 + 空除外
  const seen = new Set();
  const deduped = [];
  for (const s of results
    .map((s) => s.trim())
    .filter((s) => s.length > 0)) {
    if (!seen.has(s)) {
      seen.add(s);
      deduped.push(s);
    }
  }
  return deduped;
}

/**
 * 文字列中の「最初の { or [」〜「最後の } or ]」でクランプ
 */
function clampToJsonEnvelope(s) {
  if (!s) return null;
  const str = String(s);
  const start = str.search(/[\[{]/);
  const lastBrace = str.lastIndexOf("}");
  const lastBracket = str.lastIndexOf("]");
  const end = Math.max(lastBrace, lastBracket);
  if (start === -1 || end === -1 || start > end) return null;
  return str.slice(start, end + 1).trim();
}

module.exports = {
  generateMinutesWithLongLogic,
};
