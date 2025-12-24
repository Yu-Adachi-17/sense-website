const { callGemini } = require('../gemini/geminiClient');
const { splitText } = require('../../utils/text');

const MAX_TOTAL_TRANSCRIPT_CHARS = 1_000_000;
const MAX_ONESHOT_TRANSCRIPT_CHARS = 30_000;
const MAX_SEGMENT_SOURCE_CHARS = 3_000;

async function summarizeSegment({
  segmentText,
  partIndex,
  totalParts,
  targetLength,
  langHint,
}) {
  const systemMessage = `
You are summarizing a long meeting transcript (part ${partIndex} of ${totalParts}).
Summarize this part into at most approximately ${targetLength} characters.

Rules:
- Preserve all key decisions, conclusions, and agreements.
- Preserve all action items with assignees and due dates if they appear.
- Preserve important numbers (prices, quantities, percentages, dates, times) and proper nouns (people, companies, products, projects).
- Remove small talk, greetings, filler phrases, and repetitions.
- Keep the tone neutral and concise.
- Output PLAIN TEXT only. Do NOT output JSON. Do NOT wrap the result in backticks. Do NOT add any explanation before or after the summary.
`.trim();

  const userMessage = `
Language hint: ${langHint || 'auto'}

Here is the transcript for this part:
${segmentText}
`.trim();

  const generationConfig = {
    temperature: 0,
    maxOutputTokens: 8000,
  };

  try {
    const summary = await callGemini(systemMessage, userMessage, generationConfig);
    const text = (summary || '').trim();
    if (text.length > targetLength) return text.slice(0, targetLength);
    return text;
  } catch (err) {
    console.error(`[DEBUG] summarizeSegment failed for part ${partIndex}:`, err.message || err);
    if (!segmentText) return '';
    if (segmentText.length > targetLength) return segmentText.slice(0, targetLength);
    return segmentText;
  }
}

async function compressLongTranscriptToMaxLength(allText, maxLength, langHint) {
  if (!allText || typeof allText !== 'string') return '';

  let text = allText.trim();
  const totalLength = text.length;

  if (totalLength <= maxLength) return text;

  if (totalLength > MAX_TOTAL_TRANSCRIPT_CHARS) {
    console.log(
      `[DEBUG] compressLongTranscriptToMaxLength: totalLength=${totalLength} > MAX_TOTAL_TRANSCRIPT_CHARS=${MAX_TOTAL_TRANSCRIPT_CHARS}. Truncating head.`
    );
    text = text.slice(0, MAX_TOTAL_TRANSCRIPT_CHARS);
  }

  const actualTotalLength = text.length;

  const perSegmentLimit = MAX_SEGMENT_SOURCE_CHARS;
  const segmentCount = Math.max(1, Math.ceil(actualTotalLength / perSegmentLimit));
  const segmentSize = Math.ceil(actualTotalLength / segmentCount);

  console.log(
    `[DEBUG] compressLongTranscriptToMaxLength: totalLength=${actualTotalLength}, segmentCount=${segmentCount}, segmentSize=${segmentSize}`
  );

  const segments = splitText(text, segmentSize);

  const safetyTotal = Math.floor(maxLength * 0.95);
  const compressedSegments = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const li = segment.length;

    let targetLength = Math.floor((li / actualTotalLength) * safetyTotal);

    const minPerSegment = Math.max(200, Math.floor(safetyTotal / (segments.length * 4)));
    targetLength = Math.max(minPerSegment, targetLength);

    const summary = await summarizeSegment({
      segmentText: segment,
      partIndex: i + 1,
      totalParts: segments.length,
      targetLength,
      langHint,
    });

    compressedSegments.push(summary);
  }

  let joined = compressedSegments.join('\n\n');

  if (joined.length > maxLength) {
    console.log(
      `[DEBUG] compressLongTranscriptToMaxLength: joined length=${joined.length} > maxLength=${maxLength}. Cutting tail.`
    );
    joined = joined.slice(0, maxLength);
  }

  return joined;
}

async function compressTranscriptForGemini(rawTranscript, langHint) {
  if (!rawTranscript || typeof rawTranscript !== 'string') return '';

  let transcript = rawTranscript.trim();

  if (transcript.length <= MAX_ONESHOT_TRANSCRIPT_CHARS) {
    return transcript;
  }

  if (transcript.length > MAX_TOTAL_TRANSCRIPT_CHARS) {
    console.log(
      `[DEBUG] compressTranscriptForGemini: transcript length=${transcript.length} > MAX_TOTAL_TRANSCRIPT_CHARS=${MAX_TOTAL_TRANSCRIPT_CHARS}. Truncating head.`
    );
    transcript = transcript.slice(0, MAX_TOTAL_TRANSCRIPT_CHARS);
  }

  console.log(
    `[DEBUG] compressTranscriptForGemini: length=${transcript.length} > ${MAX_ONESHOT_TRANSCRIPT_CHARS}, start compressLongTranscriptToMaxLength...`
  );

  const compressed = await compressLongTranscriptToMaxLength(
    transcript,
    MAX_ONESHOT_TRANSCRIPT_CHARS,
    langHint
  );

  console.log(`[DEBUG] compressTranscriptForGemini: compressed length=${compressed.length}`);

  return compressed;
}

module.exports = {
  compressTranscriptForGemini,
  MAX_ONESHOT_TRANSCRIPT_CHARS,
  MAX_TOTAL_TRANSCRIPT_CHARS,
  MAX_SEGMENT_SOURCE_CHARS,
};
