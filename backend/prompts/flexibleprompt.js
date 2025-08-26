"use strict";

/**
 * Flexible Minutes 用の言語別プロンプト＆messagesビルダー
 * - CommonJS (require/module.exports)
 * - 将来 .txt 外部化したい場合は、このファイル内で fs.readFileSync に差し替え可能
 */

const PROMPTS = {
  en: `Below is the complete meeting / audio transcript. Using this content, generate “Flexible Minutes” in the following JSON format.
——
{
  "meetingTitle": "(A concise title reflecting the meeting purpose and participants)",
  "date": "(The date/time obtained from currentDate: Date())",
  "summary": "(A 3-6 line summary covering purpose, conclusions, and key topics)",
  "sections": [
    {
      "title": "(Primary section, e.g., Current Issues)",
      "topics": [
        {
          "subTitle": "(Sub-section, e.g., Internal Communication)",
          "details": [
            "(Bullet points—1-3 lines—summarising the key points of the sub-section)"
          ]
        }
      ]
    }
  ]
}
——

Generation Rules

1. Maximum 3 levels:
   Primary section ("title") → Sub-section ("subTitle") → Body ("details" array).
   If 3 levels are insufficient, break further within "details" as additional bullet points.

2. Selecting primary sections:
   - Scan the dialogue and extract 3–7 meaningful clusters.
   - Examples: Current Issues / Proposed Ideas / Decisions / Next Actions.

3. Selecting sub-sections:
   - For each primary section, extract 1–5 sub-sections.
   - Examples: “Internal Communication”, “Cost Optimisation”, etc.

4. Body ("details"):
   - Summarise key statements per sub-section in bullet points, up to 80 characters each.
   - Clearly state who said what. No conjecture or fabrication.

5. Omit unnecessary items:
   - If a section or sub-section has no content, omit it entirely from the JSON.
   - "meetingTitle", "date", and "summary" are mandatory.

6. Language:
   - Output in the same language as the transcript.
   - Do not use emojis or emoticons.

7. Strict requirements:
   - Return only the JSON—no surrounding commentary.
   - Do not change key names or their order.
   - Use standard (half-width) double quotes (") throughout.
   - No trailing commas.
`,

  ja: `以下は会議／音声の全文文字起こしです。この内容を基に、次の JSON 形式で「Flexible 議事録」を生成してください。
——
{
  "meetingTitle": "（会議の主旨や参加者を踏まえた簡潔なタイトル）",
  "date": "（currentDate: Date() から得られる日時）",
  "summary": "（目的・結論・主要トピックを含む 3〜6 行の要約）",
  "sections": [
    {
      "title": "（大項目。例：現状の課題）",
      "topics": [
        {
          "subTitle": "（小項目。例：社内コミュニケーション）",
          "details": [
            "（小項目内の要点を 1〜3 行で箇条書き）"
          ]
        }
      ]
    }
  ]
}
——

生成ルール

1. 階層は最大 3 段：
   大項目（"title"）→ 小項目（"subTitle"）→ 本文（"details" 配列）。
   3 段で不足する場合は "details" 内で箇条を増やして分割。

2. 大項目の選定：
   - 対話全体を走査し、意味のあるクラスターを 3〜7 抽出。
   - 例：現状の課題／提案アイデア／決定事項／次のアクション。

3. 小項目の選定：
   - 各大項目につき 1〜5 の小項目。
   - 例：「社内コミュニケーション」「コスト最適化」など。

4. 本文（"details"）：
   - 小項目ごとの要点を 1 項目あたり 80 文字以内の箇条書きで簡潔に。
   - 「誰が・何を述べたか」を明確化。推測や創作は禁止。

5. 不要項目の省略：
   - 中身のない大項目／小項目は JSON から丸ごと省く。
   - "meetingTitle"・"date"・"summary" は必須。

6. 言語：
   - 出力は文字起こしと同じ言語。
   - 絵文字・顔文字は使用しない。

7. 厳格条件：
   - 返すのは JSON のみ。前後の説明・挨拶などは禁止。
   - キー名・順序を変更しない。
   - すべて半角の二重引用符（"）を用いる。
   - 末尾カンマは禁止。
`,
};

/** "ja-JP" → "ja" に丸める */
function normalize(lang) {
  if (!lang) return null;
  const l = String(lang).toLowerCase();
  const i = l.indexOf("-");
  return i > 0 ? l.slice(0, i) : l;
}

/** 言語優先順でプロンプトを取得（指定言語→短縮→英語） */
function getFlexiblePrompt(lang) {
  if (lang && PROMPTS[lang]) return PROMPTS[lang];
  const short = normalize(lang);
  if (short && PROMPTS[short]) return PROMPTS[short];
  return PROMPTS.en; // 最終フォールバック
}

/**
 * LLM に渡す messages を構築。
 * - system: 言語別プロンプト
 * - user:   currentDate と transcript を与える
 */
function buildFlexibleMessages({ transcript, lang, currentDateISO }) {
  const sys = getFlexiblePrompt(lang);
  const now = currentDateISO || new Date().toISOString();
  const user =
`currentDate: ${now}

<TRANSCRIPT>
${transcript}
</TRANSCRIPT>`;

  return [
    { role: "system", content: sys },
    { role: "user",   content: user }
  ];
}

module.exports = {
  getFlexiblePrompt,
  buildFlexibleMessages,
};
