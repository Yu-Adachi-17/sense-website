const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL_NAME || "gemini-2.5-flash";
const DEFAULT_THINKING_BUDGET = Number(process.env.GEMINI_THINKING_BUDGET || "2048");

if (!GEMINI_API_KEY) {
  console.warn("[WARN] GEMINI_API_KEY is not set. Gemini NLP functions will fail.");
}

function pickModel(systemInstruction) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set.");
  }
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  return genAI.getGenerativeModel({
    model: GEMINI_MODEL_NAME,
    systemInstruction: systemInstruction || "",
  });
}

async function callGemini(systemInstruction, userMessage, generationConfig = {}) {
  const mergedConfig = { ...generationConfig };

  if (!mergedConfig.thinkingConfig) {
    mergedConfig.thinkingConfig = { thinkingBudget: DEFAULT_THINKING_BUDGET };
  }

  try {
    const model = pickModel(systemInstruction);

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: String(userMessage || "") }] }],
      generationConfig: mergedConfig,
    });

    const response = result.response;

    if (
      response.candidates &&
      response.candidates.length > 0 &&
      response.candidates[0].content &&
      response.candidates[0].content.parts &&
      response.candidates[0].content.parts.length > 0 &&
      typeof response.candidates[0].content.parts[0].text === "string"
    ) {
      return response.candidates[0].content.parts[0].text.trim();
    }

    if (response.promptFeedback && response.promptFeedback.blockReason) {
      console.error(`[ERROR] Gemini call blocked: ${response.promptFeedback.blockReason}`);
      throw new Error(`Gemini API call blocked: ${response.promptFeedback.blockReason}`);
    }

    console.error("[ERROR] Gemini API returned no text content.", JSON.stringify(response, null, 2));
    throw new Error("Gemini API returned no text content.");
  } catch (error) {
    console.error("[ERROR] Failed to call Gemini API:", error.response?.data || error.message);
    if (String(error.message || "").includes("GEMINI_API_KEY")) {
      throw error;
    }
    throw new Error(`Failed to generate content using Gemini API: ${error.message}`);
  }
}

module.exports = {
  callGemini,
  GEMINI_MODEL_NAME,
  DEFAULT_THINKING_BUDGET,
};
