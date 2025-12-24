// services/minutesLegacy.js

function isValidMinutes(out) {
  if (!out) return false;
  const must = [
    "【Meeting Name】",
    "【Date】",
    "【Location】",
    "【Attendees】",
    "【Agenda(1)】",
    "【Agenda(2)】",
    "【Agenda(3)】",
  ];
  return must.every((k) => out.includes(k));
}

function createRepairToTemplate(callGemini) {
  return async function repairToTemplate(badOutput, template) {
    const systemMessage =
`You are a minutes formatter. Please strictly convert according to the template below.
Be sure to keep each heading in the template (e.g., “【Meeting Name】”) exactly as they are, and only fill in the content.
Unknown items should be written as “—”. Preface, appendix, or explanatory text are prohibited. Output only the template body.

<MINUTES_TEMPLATE>
${template.trim()}
</MINUTES_TEMPLATE>`;

    const userMessage =
`Please format this into the template (output only the body).:

<MODEL_OUTPUT>
${badOutput}
</MODEL_OUTPUT>`;

    const generationConfig = {
      temperature: 0,
      maxOutputTokens: 16000,
    };
    return await callGemini(systemMessage, userMessage, generationConfig);
  };
}

function createGenerateMinutes(callGemini) {
  const repairToTemplate = createRepairToTemplate(callGemini);

  return async function generateMinutes(transcription, formatTemplate) {
    const template =
      (formatTemplate && formatTemplate.trim()) ||
      `【Meeting Name】
【Date】
【Location】
【Attendees】
【Agenda(1)】⚫︎Discussion⚫︎Decision items⚫︎Pending problem
【Agenda(2)】⚫︎Discussion⚫︎Decision items⚫︎Pending problem
【Agenda(3)】⚫︎Discussion⚫︎Decision items⚫︎Pending problem`;

    const systemMessage =
`You are a professional minutes-taking assistant. Please follow the strict rules below and output in English.
・Output must be only the following template body. Absolutely no preface, appendix, greetings, or explanations.
・Keep headings (such as “【…】”, “⚫︎”, “(1)(2)(3)”) exactly unchanged.
・Write “—” for unknown items (e.g., if the date is unknown → “【Date】—”).
・Fill in at least three agenda items (as required in the template). Even if content is thin, use “—” if necessary.
・Preserve quantitative information (numbers, etc.) as much as possible.
・Body text must be in English (but English labels in the template must remain as they are).
・The template is as follows. Use it as the complete output frame, and fill in each item.

<MINUTES_TEMPLATE>
${template}
</MINUTES_TEMPLATE>`;

    const userMessage =
`Below is the meeting transcript. Please summarize and format it according to the template.
<TRANSCRIPT>
${transcription}
</TRANSCRIPT>`;

    try {
      const generationConfig = {
        temperature: 0,
        maxOutputTokens: 16000,
      };
      let out = await callGemini(systemMessage, userMessage, generationConfig);

      if (!isValidMinutes(out)) {
        out = await repairToTemplate(out, template);
      }
      return out;
    } catch (error) {
      console.error("[ERROR] Failed to call Gemini API:", error.message);
      throw new Error("Failed to generate meeting minutes using Gemini API");
    }
  };
}

function isValidFlexibleJSON(str) {
  try {
    const obj = JSON.parse(str);
    if (!obj) return false;
    const must = ["meetingTitle", "date", "summary", "sections"];
    return must.every((k) => Object.prototype.hasOwnProperty.call(obj, k));
  } catch {
    return false;
  }
}

function createRepairFlexibleJSON(callGemini) {
  return async function repairFlexibleJSON(badOutput, langHint) {
    const systemMessage =
`You repair malformed JSON that should match the schema:
{
  "meetingTitle": "",
  "date": "",
  "summary": "",
  "sections": [
    { "title": "", "topics": [ { "subTitle": "", "details": [] } ] }
  ]
}
Rules: Return JSON only. Do not add comments. Keep keys and order. No trailing commas.`;

    const userMessage =
`Language hint: ${langHint || 'auto'}

Fix this into valid JSON per schema, preserving semantic content:

<MODEL_OUTPUT>
${badOutput}
</MODEL_OUTPUT>`;

    const generationConfig = {
      temperature: 0,
      maxOutputTokens: 16000,
      responseMimeType: "application/json",
    };
    return await callGemini(systemMessage, userMessage, generationConfig);
  };
}

module.exports = {
  isValidMinutes,
  createRepairToTemplate,
  createGenerateMinutes,
  isValidFlexibleJSON,
  createRepairFlexibleJSON,
};
