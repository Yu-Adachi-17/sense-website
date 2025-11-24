// server.js

require('dotenv').config();
console.log("✅ STRIPE_SECRET_KEY:", process.env.STRIPE_SECRET_KEY ? "Loaded" : "Not found");
console.log("✅ STRIPE_PRICE_UNLIMITED:", process.env.STRIPE_PRICE_UNLIMITED ? "Loaded" : "Not found");
console.log("✅ OPENAI_API_KEY (for Whisper):", process.env.OPENAI_API_KEY ? "Loaded" : "Not found");
console.log("✅ GEMINI_API_KEY (for NLP):", process.env.GEMINI_API_KEY ? "Loaded" : "Not found");
console.log("✅ MAILGUN_API_KEY:", process.env.MAILGUN_API_KEY ? "Loaded" : "Not found");
console.log("✅ MAILGUN_DOMAIN:", process.env.MAILGUN_DOMAIN ? "Loaded" : "Not found");
console.log("✅ MAILGUN_FROM:", process.env.MAILGUN_FROM ? process.env.MAILGUN_FROM : "Not set (use default)");

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const multer = require('multer');
const axios = require('axios'); // (Whisper / Zoom / Mailgun 等で使用)

const fs = require('fs');
const path = require('path');

console.log("[DEBUG] ffmpeg path set to 'ffmpeg'");
console.log("[DEBUG] ffprobe path set to 'ffprobe'");

const FormData = require('form-data');

// ==== Routes (split) ====
const webhookRouter = require('./routes/webhook');
const appleRouter = require('./routes/apple');
const zoomAuthRoute = require('./routes/zoomAuthRoute');
const zoomJoinTokenRoute = require('./routes/zoomJoinTokenRoute');
const zoomOAuthExchangeRoute = require('./routes/zoomOAuthExchangeRoute');
const zoomOAuthCallbackRoute = require('./routes/zoomOAuthCallbackRoute');
const zoomRecordingRoute = require('./routes/zoomRecordingRoute');

// Stripe (extracted)
const stripeCheckoutRoute = require('./routes/stripeCheckoutRoute');
const stripeSubscriptionRoute = require('./routes/stripeSubscriptionRoute');
const livekitRouter = require('./routes/livekit');
const meetingsRouter = require('./routes/meetings');
const egressRouter = require('./routes/egress');
const livekitWebhookRouter = require('./routes/livekitWebhook');
const recordingsRouter = require('./routes/recordings');

const livekitRoomsRouter = require('./routes/livekitRooms');

const { getProductName } = require('./services/productName');

// ==== ffmpeg (for transcription utilities) ====
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath('ffmpeg');
ffmpeg.setFfprobePath('ffprobe');

// ==== ★ NEW: Gemini (Google AI) Setup ====
const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn("[WARN] GEMINI_API_KEY is not set. Gemini NLP functions will fail.");
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const GEMINI_MODEL_NAME = "gemini-2.5-flash"; // 使用するモデル名
const DEFAULT_THINKING_BUDGET = 2048

/**
 * ★ NEW: Helper function to call the Gemini API.
 */
/**
 * ★ NEW: Helper function to call the Gemini API.
 */
async function callGemini(systemInstruction, userMessage, generationConfig = {}) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  // ここで generationConfig に thinkingConfig をマージする
  const mergedConfig = {
    ...generationConfig,
  };

  // 呼び出し側で thinkingConfig を明示していない場合だけ、デフォルトを挿す
  if (!mergedConfig.thinkingConfig) {
    mergedConfig.thinkingConfig = {
      thinkingBudget: DEFAULT_THINKING_BUDGET,
    };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL_NAME,
      systemInstruction: systemInstruction, // システムプロンプトを設定
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: mergedConfig, // temperature, maxOutputTokens, responseMimeType + thinkingConfig
    });

    const response = result.response;

    // レスポンスのテキスト部分を安全に抽出
    if (
      response.candidates &&
      response.candidates.length > 0 &&
      response.candidates[0].content &&
      response.candidates[0].content.parts &&
      response.candidates[0].content.parts.length > 0 &&
      typeof response.candidates[0].content.parts[0].text === "string"
    ) {
      return response.candidates[0].content.parts[0].text.trim();
    } else if (response.promptFeedback && response.promptFeedback.blockReason) {
      // 安全性などでブロックされた場合
      console.error(
        `[ERROR] Gemini call blocked: ${response.promptFeedback.blockReason}`
      );
      throw new Error(
        `Gemini API call blocked: ${response.promptFeedback.blockReason}`
      );
    } else {
      // その他の理由でテキストが返されなかった場合
      console.error(
        "[ERROR] Gemini API returned no text content.",
        JSON.stringify(response, null, 2)
      );
      throw new Error("Gemini API returned no text content.");
    }
  } catch (error) {
    console.error(
      "[ERROR] Failed to call Gemini API:",
      error.response?.data || error.message
    );
    if (error.message.includes("GEMINI_API_KEY")) {
      throw error;
    }
    throw new Error(
      `Failed to generate content using Gemini API: ${error.message}`
    );
  }
}

// ==== End of Gemini Setup ====

// ==== ★ NEW: Mailgun Setup (for minutes email) ====
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY || null;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || null;
// 「環境変数にフル表記が来ていた場合」は、アドレスだけ抜き取る
const RAW_MAILGUN_FROM =
  process.env.MAILGUN_FROM || 'Minutes.AI <no-reply@mg.sense-ai.world>';

function extractAddress(fromHeader) {
  const m = String(fromHeader).match(/<(.*)>/);
  return m ? m[1] : String(fromHeader); // "xxx <addr>" → "addr"
}

const MAILGUN_FROM_ADDRESS = extractAddress(RAW_MAILGUN_FROM);

// locale ごとに "議事録AI <no-reply@...>" のような from を作る
function buildLocalizedFrom(locale) {
  const productName = getProductName(locale); // ja → 議事録AI, da → Referat AI
  return `${productName} <${MAILGUN_FROM_ADDRESS}>`;
}

// Mailgun Basic 認証ヘッダー生成
function buildMailgunAuthHeader() {
  if (!MAILGUN_API_KEY) {
    throw new Error("MAILGUN_API_KEY is not set.");
  }
  const token = Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64');
  return `Basic ${token}`;
}

/**
 * sendMinutesEmail: Mailgun 経由で議事録メールを送信するヘルパー
 * params = { to, subject, text, html, locale }
 */
async function sendMinutesEmail(params) {
  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
    throw new Error("Mailgun is not configured (missing API key or domain).");
  }

  const { to, subject, text, html, locale } = params;

  // ★ここでローカライズ済みの From を作る
  const fromHeader = buildLocalizedFrom(locale || "en");

  const url = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;
  const body = new URLSearchParams();

  body.append("from", fromHeader);
  body.append("to", to);
  body.append("subject", subject || "Your minutes from Minutes.AI");
  body.append("text", text || "");
  if (html) {
    body.append("html", html);
  }

  const headers = {
    Authorization: buildMailgunAuthHeader(),
    "Content-Type": "application/x-www-form-urlencoded",
  };

  console.log(
    `[MAILGUN] Sending minutes email from=${fromHeader} to=${to}`
  );
  try {
    const resp = await axios.post(url, body.toString(), { headers });
    console.log("[MAILGUN] Response status:", resp.status, resp.data);
    return resp.data;
  } catch (err) {
    console.error(
      "[MAILGUN] Failed to send email:",
      err.response?.data || err.message
    );
    throw new Error("Failed to send minutes email via Mailgun");
  }
}



// ==== ★ NEW: Email Templates (Minutes / Transcript) ====
const {
  buildMinutesEmailBodies,
  buildMinutesOnlyEmailBodies,
} = require('./services/emailTemplates');

// =======================================================================

const app = express();

// ---- Helpers ------------------------------------------------------------
function logLong(label, text, size = 8000) {
  const s = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
  console.log(`${label} len=${s?.length ?? 0} >>> BEGIN`);
  if (s) {
    for (let i = 0; i < s.length; i += size) {
      console.log(`${label} [${i}-${Math.min(i + size, s.length)}]\n${s.slice(i, i + size)}`);
    }
  }
  console.log(`${label} <<< END`);
}

const pickFirstTag = (s) => (s || '').split(',')[0].trim();
const toShort = (tag) => (tag || '').split('-')[0].toLowerCase();

function resolveLocale(req, bodyLocale) {
  const hxu = req.headers['x-user-locale'];
  const hal = req.headers['accept-language'];
  const bcp47 = bodyLocale || hxu || pickFirstTag(hal) || 'en';
  const short = toShort(bcp47);
  if (process.env.LOG_LOCALE === '1') {
    console.log(
      `[LOCALE] body=${bodyLocale || ''} x-user-locale=${hxu || ''} accept-language=${hal || ''} -> resolved=${short}`
    );
  }
  return short;
}

// --- Security headers (Helmet) ---
app.use(
  helmet({
    frameguard: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://www.gstatic.com",
          "https://www.google.com",
          "https://www.googletagmanager.com",
        ],
        "connect-src": [
          "'self'",
          "https://www.googleapis.com",
          "https://identitytoolkit.googleapis.com",
          "https://securetoken.googleapis.com",
          "https://firebaseinstallations.googleapis.com",
          "https://firestore.googleapis.com",
          "https://*.firebaseio.com",
          "https://www.google-analytics.com",
          "https://*.ingest.sentry.io",
          "https://generativelanguage.googleapis.com", // ★ Gemini APIのエンドポイントを追加
        ],
        "img-src": ["'self'", "data:", "https:", "blob:"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
        "frame-src": [
          "'self'",
          "https://*.firebaseapp.com",
          "https://*.google.com",
          "https://*.googleusercontent.com",
          "https://*.gstatic.com",
          "https://accounts.google.com",
          "https://*.zoom.us",
          "https://*.zoom.com",
        ],
        "frame-ancestors": ["'self'", "*.zoom.us", "*.zoom.com"],
      },
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

// ── CORS を “全ルートより前” に適用（preflight も自動対応） ──
const allowedOrigins = [
  'https://sense-ai.world',
  'https://www.sense-ai.world',
  'https://sense-website-production.up.railway.app', // 静的+API の Origin
  'http://localhost:3000', // ローカル開発時
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-User-Locale', 'X-Debug-Log'],
  })
);
app.options('*', cors());

// Flexible Minutes 用（旧）プロンプト
const { buildFlexibleMessages } = require('./prompts/flexibleprompt');

// === 新規：フォーマットJSONローダ ===
const {
  listFormats,
  getRegistry,
  getFormatMeta,
  loadFormatJSON,
} = require('./services/formatLoader');

/*==============================================
=            Middleware Order                  =
==============================================*/
app.use('/api/stripe', express.raw({ type: 'application/json' }));
app.use(
  '/api/livekit/webhook',
  express.raw({ type: 'application/webhook+json' }),
  livekitWebhookRouter
);
app.use('/api/apple/notifications', express.json());
app.use(
  express.json({
    verify: (req, res, buf) => {
      req._rawBody = buf ? buf.toString('utf8') : '';
    },
    limit: '2mb',
  })
);

/*==============================================
=            Request Debug Logging             =
==============================================*/
app.use((req, res, next) => {
  const safeHeaders = { ...req.headers };
  if (safeHeaders['x-internal-token']) safeHeaders['x-internal-token'] = '***';
  console.log(`[DEBUG] ${req.method} ${req.url}`);
  console.log(`[DEBUG] Headers: ${JSON.stringify(safeHeaders)}`);
  console.log(`[DEBUG] Body: ${JSON.stringify(req.body)}`);
  next();
});

/*==============================================
=            Router Registration               =
==============================================*/
app.use('/api/stripe', webhookRouter);
app.use('/api/apple', appleRouter);
app.use('/api', zoomAuthRoute);
app.use('/api/zoom', zoomJoinTokenRoute);
app.use('/api/zoom/oauth', zoomOAuthExchangeRoute);
app.use('/', zoomOAuthCallbackRoute);
app.use('/api', zoomRecordingRoute);
app.use('/api', stripeCheckoutRoute);
app.use('/api', stripeSubscriptionRoute);
app.use('/api/livekit', livekitRouter);
app.use('/api/meetings', meetingsRouter);
app.use('/api', egressRouter);
app.use('/api/rooms', livekitRoomsRouter);
app.use('/api', recordingsRouter);

app.post('/api/_debug/echo', (req, res) => {
  res.set('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.set('Access-Control-Allow-Credentials', 'true');
  console.log('[ECHO] content-type=', req.headers['content-type']);
  console.log('[ECHO] _rawBody=', req._rawBody);
  console.log('[ECHO] body=', req.body);
  return res.json({
    ok: true,
    headers: {
      'content-type': req.headers['content-type'] || null,
      origin: req.headers.origin || null,
    },
    raw: req._rawBody || null,
    parsed: req.body || null,
  });
});

/*==============================================
=            Other Middleware                  =
==============================================*/
app.use((req, res, next) => {
  req.setTimeout(600000, () => {
    console.error('Request timed out.');
    res.set({
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true',
    });
    res.status(503).send('Service Unavailable: request timed out.');
  });
  next();
});

const { exec } = require('child_process');

app.get('/api/debug/ffprobe', (req, res) => {
  exec('which ffprobe', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error finding ffprobe: ${stderr}`);
      return res.status(500).json({ error: 'ffprobe not found', details: stderr });
    }
    const ffprobePathDetected = stdout.trim();
    console.log(`Detected ffprobe path: ${ffprobePathDetected}`);
    res.json({ ffprobePath: ffprobePathDetected });
  });
});

app.use((req, res, next) => {
  console.log(
    `[DEBUG] Request received:
  - Method: ${req.method}
  - Origin: ${req.headers.origin || 'Not set'}
  - Path: ${req.path}
  - Headers: ${JSON.stringify(req.headers, null, 2)}
`
  );
  next();
});

/*==============================================
=            Upload / Transcription            =
==============================================*/
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log('[DEBUG] Created temporary directory:', tempDir);
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

const OPENAI_API_ENDPOINT_TRANSCRIPTION = 'https://api.openai.com/v1/audio/transcriptions';

/**
 * splitText: Splits text into chunks of specified size.
 */
function splitText(text, chunkSize) {
  const chunks = [];
  let startIndex = 0;
  while (startIndex < text.length) {
    const chunk = text.slice(startIndex, startIndex + chunkSize);
    chunks.push(chunk);
    startIndex += chunkSize;
  }
  return chunks;
}

/**
 * combineMinutes: Calls the Gemini API to combine partial meeting minutes.
 */
async function combineMinutes(combinedText, meetingFormat) {
  const template = (meetingFormat && meetingFormat.trim()) || '';
  const systemMessage =
`Below are split meeting minutes from the same meeting. Please merge duplicates and contradictions, and normalize them according to the following template.
・Keep the template headings exactly as they are. Unknown items should be written as “—”.
・No preface or appendix. Only the body text.

<MINUTES_TEMPLATE>
${template}
</MINUTES_TEMPLATE>`;

  try {
    const generationConfig = {
      temperature: 0,
      maxOutputTokens: 16000,
    };
    return await callGemini(systemMessage, combinedText, generationConfig);
  } catch (error) {
    console.error('[ERROR] Failed to call Gemini API for combining minutes:', error.message);
    throw new Error('Failed to combine meeting minutes');
  }
}

/**
 * generateMinutes: Uses Gemini API to generate meeting minutes (classic template text).
 */
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

async function repairToTemplate(badOutput, template) {
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
}

const generateMinutes = async (transcription, formatTemplate) => {
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
    console.error('[ERROR] Failed to call Gemini API:', error.message);
    throw new Error('Failed to generate meeting minutes using Gemini API');
  }
};

/* ================================
   Flexible Minutes(JSON) 生成系（旧）
   ================================ */

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

async function repairFlexibleJSON(badOutput, langHint) {
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
}

// === Gemini transcript normalization (same logic as iOS GeminiFlashModel) ===

// 生テキストの絶対上限（保険）
const MAX_TOTAL_TRANSCRIPT_CHARS = 1_000_000;

// 「一撃で Gemini に投げるテキスト」の実務上限（iOS と同じ 30,000 文字）
const MAX_ONESHOT_TRANSCRIPT_CHARS = 30_000;

// 元テキストを 1 セグメントあたり最大何文字までにするか（iOS と同じ 3,000 文字）
const MAX_SEGMENT_SOURCE_CHARS = 3_000;

/**
 * 1 セグメント分を要約する（iOS の summarizeSegment 相当）
 * - targetLength は「このチャンクの要約を何文字くらいに収めたいか」
 */
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

    if (text.length > targetLength) {
      return text.slice(0, targetLength);
    }
    return text;
  } catch (err) {
    console.error(
      `[DEBUG] summarizeSegment failed for part ${partIndex}:`,
      err.message || err
    );

    // 失敗時は元テキストを「生で targetLength まで切って」返す（iOS と同じ思想）
    if (!segmentText) return '';
    if (segmentText.length > targetLength) {
      return segmentText.slice(0, targetLength);
    }
    return segmentText;
  }
}

/**
 * iOS の compressLongTranscriptToMaxLength と同じロジック
 * - allText が maxLength を超えるときだけ呼ばれる想定
 * - 3,000 文字ごとに分割 → 各チャンクに targetLength を割り当てて要約
 * - 全チャンクを結合して、最終的に maxLength で尻カット
 */
async function compressLongTranscriptToMaxLength(allText, maxLength, langHint) {
  if (!allText || typeof allText !== 'string') return '';

  let text = allText.trim();
  const totalLength = text.length;

  if (totalLength <= maxLength) {
    return text;
  }

  // 念のためのハード上限（iOS: maxTextLength 相当）
  if (totalLength > MAX_TOTAL_TRANSCRIPT_CHARS) {
    console.log(
      `[DEBUG] compressLongTranscriptToMaxLength: totalLength=${totalLength} > MAX_TOTAL_TRANSCRIPT_CHARS=${MAX_TOTAL_TRANSCRIPT_CHARS}. Truncating head.`
    );
    text = text.slice(0, MAX_TOTAL_TRANSCRIPT_CHARS);
  }

  const actualTotalLength = text.length;

  // 1 セグメントに渡す元テキストの上限（3,000）
  const perSegmentLimit = MAX_SEGMENT_SOURCE_CHARS;

  // 必要なセグメント数 = ceil(totalLength / perSegmentLimit)
  const segmentCount = Math.max(
    1,
    Math.ceil(actualTotalLength / perSegmentLimit)
  );

  // 実際に使うチャンクサイズ（perSegmentLimit 以下になる）
  const segmentSize = Math.ceil(actualTotalLength / segmentCount);

  console.log(
    `[DEBUG] compressLongTranscriptToMaxLength: totalLength=${actualTotalLength}, segmentCount=${segmentCount}, segmentSize=${segmentSize}`
  );

  // 既存の splitText(text, chunkSize) をそのまま再利用
  const segments = splitText(text, segmentSize);

  const totalLenDouble = actualTotalLength;
  // 全体で maxLength の 95% を目標にする（少し余白）
  const safetyTotal = Math.floor(maxLength * 0.95);

  const compressedSegments = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const li = segment.length;

    // このセグメントが全体に占める割合で safetyTotal を割り振る
    let targetLength = Math.floor((li / totalLenDouble) * safetyTotal);

    // 小さすぎるチャンクに対する下限（iOS と同じ思想）
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

  // 念のため、最終的には maxLength で尻カット
  if (joined.length > maxLength) {
    console.log(
      `[DEBUG] compressLongTranscriptToMaxLength: joined length=${joined.length} > maxLength=${maxLength}. Cutting tail.`
    );
    joined = joined.slice(0, maxLength);
  }

  return joined;
}

/**
 * iOS の「下準備編」と同じレイヤーの関数
 * - ポイント1: 一撃生成の上限は 30,000 文字
 * - ポイント2: 30,000 を超える場合は 3,000 字ごとに分割して要約し、全体を ~30,000 に圧縮
 * - ポイント3: その結合テキストを minutes 生成のベースとして使う
 */
async function compressTranscriptForGemini(rawTranscript, langHint) {
  if (!rawTranscript || typeof rawTranscript !== 'string') return '';

  let transcript = rawTranscript.trim();

  // 30,000 文字以内ならそのまま 1-shot
  if (transcript.length <= MAX_ONESHOT_TRANSCRIPT_CHARS) {
    return transcript;
  }

  // ハード上限を超えていた場合は先頭から 1,000,000 文字だけ使う
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

  console.log(
    `[DEBUG] compressTranscriptForGemini: compressed length=${compressed.length}`
  );

  return compressed;
}


async function generateFlexibleMinutes(transcription, langHint) {
  // buildFlexibleMessages は OpenAI 形式の messages 配列を返す
  const openAIMessages = buildFlexibleMessages({
    transcript: transcription,
    lang: langHint,
    currentDateISO: new Date().toISOString(),
  });
  
  // OpenAI形式の 'messages' を Gemini 形式 (systemInstruction, userMessage) に変換
  const systemMessage = openAIMessages.find(m => m.role === 'system')?.content || '';
  const userMessage = openAIMessages.find(m => m.role === 'user')?.content || '';

  if (!userMessage) {
    console.error("[ERROR] generateFlexibleMinutes: Could not find user message in buildFlexibleMessages output.");
    throw new Error("Failed to parse messages for Gemini.");
  }

  // プロンプトログ
  if (process.env.LOG_PROMPT === '1') {
    console.log(`[PROMPT flexible] langHint=${langHint || 'auto'}`);
    logLong('[PROMPT flexible system]', systemMessage);
    logLong('[PROMPT flexible user]', userMessage);
  }

  try {
    const generationConfig = {
      temperature: 0,
      maxOutputTokens: 16000,
      responseMimeType: "application/json", // JSONモード
    };
    
    let out = await callGemini(systemMessage, userMessage, generationConfig);

    if (!isValidFlexibleJSON(out)) {
      out = await repairFlexibleJSON(out, langHint);
    }
    return out;
  } catch (err) {
    console.error('[ERROR] generateFlexibleMinutes:', err.message);
    throw new Error('Failed to generate flexible minutes');
  }
}


/* ================================
   新：フォーマットJSONに基づく生成（formatId/locale）
   ================================ */

async function generateWithFormatJSON(transcript, fmt) {
  // fmt = { formatId, locale, schemaId, title, prompt, notes }

  const systemMessage = fmt.prompt || '';
  const userMessage =
`currentDate: ${new Date().toISOString()}

<TRANSCRIPT>
${transcript}
</TRANSCRIPT>`;

  // プロンプトログ
  if (process.env.LOG_PROMPT === '1') {
    const id = fmt.formatId || '(unknown formatId)';
    const loc = fmt.locale   || '(unknown locale)';
    console.log(`[PROMPT formatJSON] formatId=${id} locale=${loc}`);
    logLong('[PROMPT formatJSON system]', systemMessage);
  }

  const generationConfig = {
    temperature: 0,
    maxOutputTokens: 16000,
    responseMimeType: "application/json", // JSONモード
  };
  return await callGemini(systemMessage, userMessage, generationConfig);
}


/**
 * transcribeWithOpenAI: Uses the Whisper API for transcription.
 */
const transcribeWithOpenAI = async (filePath) => {
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('model', 'whisper-1');

    console.log(`[DEBUG] Sending file to Whisper API: ${filePath}`);

    const response = await axios.post(OPENAI_API_ENDPOINT_TRANSCRIPTION, formData, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
      timeout: 600000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    console.log('[DEBUG] Whisper API response:', response.data);
    return response.data.text;
  } catch (error) {
    console.error('[ERROR] Failed to call Whisper API:', error.response?.data || error.message);
    throw new Error('Transcription with Whisper API failed');
  }
};

// Constant for chunk splitting (process in one batch if file is below this size)
const TRANSCRIPTION_CHUNK_THRESHOLD = 5 * 1024 * 1024; // 5MB in bytes

/**
 * splitAudioFile: Uses ffmpeg to split an audio file into chunks.
 */
const splitAudioFile = (filePath, maxFileSize) => {
  return new Promise((resolve, reject) => {
    console.log('[DEBUG] Running ffprobe on:', filePath);
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('[ERROR] ffprobe error:', err);
        return reject(err);
      }
      if (!metadata || !metadata.format) {
        const errMsg = 'ffprobe did not return valid metadata';
        console.error('[ERROR]', errMsg);
        return reject(new Error(errMsg));
      }

      let duration = parseFloat(metadata.format.duration);
      if (isNaN(duration)) {
        if (metadata.streams && metadata.streams.length > 0 && metadata.streams[0].duration) {
          duration = parseFloat(metadata.streams[0].duration);
        }
      }
      if (isNaN(duration)) {
        console.warn('[WARN] No valid duration found. Using default of 60 seconds.');
        duration = 60;
      }

      const fileSize = fs.statSync(filePath).size;
      console.log('[DEBUG] ffprobe result - duration:', duration, 'seconds, fileSize:', fileSize, 'bytes');

      if (fileSize <= maxFileSize) {
        console.log('[DEBUG] File size is below threshold; returning file as is');
        return resolve([filePath]);
      }

      let chunkDuration = duration * (maxFileSize / fileSize);
      if (chunkDuration < 5) chunkDuration = 5;
      const numChunks = Math.ceil(duration / chunkDuration);

      console.log(`[DEBUG] Starting chunk split: chunkDuration=${chunkDuration} seconds, numChunks=${numChunks}`);

      const chunkPaths = [];
      const tasks = [];

      for (let i = 0; i < numChunks; i++) {
        const startTime = i * chunkDuration;
        const outputPath = path.join(path.dirname(filePath), `${Date.now()}_chunk_${i}.m4a`);
        chunkPaths.push(outputPath);
        console.log(`[DEBUG] Chunk ${i + 1}: startTime=${startTime} seconds, outputPath=${outputPath}`);

        tasks.push(
          new Promise((resolveTask, rejectTask) => {
            ffmpeg(filePath)
              .setStartTime(startTime)
              .setDuration(chunkDuration)
              .output(outputPath)
              .on('end', () => {
                console.log(`[DEBUG] Export of chunk ${i + 1}/${numChunks} completed: ${outputPath}`);
                resolveTask();
              })
              .on('error', (err) => {
                console.error(`[ERROR] Export of chunk ${i + 1} failed:`, err);
                rejectTask(err);
              })
              .run();
          })
        );
      }

      Promise.all(tasks)
        .then(() => {
          console.log('[DEBUG] All chunk exports completed');
          resolve(chunkPaths);
        })
        .catch((err) => {
          console.error('[ERROR] Error occurred during chunk generation:', err);
          reject(err);
        });
    });
  });
};

/**
 * convertToM4A: Converts the input file to m4a (ipod format) if it isn't already.
 */
const convertToM4A = async (inputFilePath) => {
  return new Promise((resolve, reject) => {
    const outputFilePath = path.join(path.dirname(inputFilePath), `${Date.now()}_converted.m4a`);
    console.log(`[DEBUG] convertToM4A: Converting input file ${inputFilePath} to ${outputFilePath}`);
    ffmpeg(inputFilePath)
      .toFormat('ipod')
      .on('end', () => {
        console.log(`[DEBUG] File conversion completed: ${outputFilePath}`);
        resolve(outputFilePath);
      })
      .on('error', (err) => {
        console.error('[ERROR] File conversion failed:', err);
        reject(err);
      })
      .save(outputFilePath);
  });
};

/*==============================================
=                  /api/transcribe             =
==============================================*/
app.get('/api/health', (req, res) => {
  console.log('[DEBUG] /api/health was accessed');
  res.status(200).json({ status: 'OK', message: 'Health check passed!' });
});

app.get('/api/hello', (req, res) => {
  res.json({ message: "Hello from backend!" });
});

app.post('/api/transcribe', upload.single('file'), async (req, res) => {
  console.log('[DEBUG] /api/transcribe endpoint called');

  try {
    const file = req.file;
    if (!file) {
      console.error('[ERROR] No file was uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('[DEBUG] File saved by multer:', file.path);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    console.log(`[DEBUG] Uploaded file size: ${fileSizeMB} MB`);

    const meetingFormat = req.body.meetingFormat;
    const outputType = (req.body.outputType || 'flexible').toLowerCase(); // 'flexible' | 'classic'

    // locale/lang 解決（Gemini のヒント + メール本文ラベル）
    const localeResolved = resolveLocale(req, req.body.locale || req.body.lang);
    const langHint = req.body.lang || localeResolved || null;

    console.log(`[DEBUG] Received meetingFormat: ${meetingFormat}`);
    console.log(
      `[DEBUG] outputType=${outputType}, lang=${langHint}, locale=${localeResolved}`
    );

    // ★ オプション: メール送信関連のパラメータ
    const emailTo = req.body.emailTo || req.body.to || null;
    const emailSubject = req.body.emailSubject || null;

    let tempFilePath = file.path;

    let transcription = '';
    let minutes = '';
    const cleanupExtra = [];

    // ① Whisper への送信方針
    if (file.size <= TRANSCRIPTION_CHUNK_THRESHOLD) {
      console.log('[DEBUG] <= threshold: send original file to Whisper');
      try {
        transcription = (await transcribeWithOpenAI(tempFilePath)).trim();
      } catch (e) {
        console.warn(
          '[WARN] direct transcription failed, retry with m4a:',
          e.message
        );
        const m4aPath = await convertToM4A(tempFilePath);
        cleanupExtra.push(m4aPath);
        transcription = (await transcribeWithOpenAI(m4aPath)).trim();
      }
    } else {
      console.log(
        '[DEBUG] > threshold: split by duration/size and transcribe chunks'
      );

      const chunkPaths = await splitAudioFile(
        tempFilePath,
        TRANSCRIPTION_CHUNK_THRESHOLD
      );
      console.log(
        `[DEBUG] Number of generated chunks: ${chunkPaths.length}`
      );

      try {
        const transcriptionChunks = await Promise.all(
          chunkPaths.map((p) => transcribeWithOpenAI(p))
        );
        transcription = transcriptionChunks.join(' ').trim();
      } catch (e) {
        console.warn(
          '[WARN] chunk transcription failed somewhere, retry each with m4a:',
          e.message
        );
        const transcriptionChunks = [];
        for (const p of chunkPaths) {
          try {
            transcriptionChunks.push(await transcribeWithOpenAI(p));
          } catch (_) {
            const m4a = await convertToM4A(p);
            cleanupExtra.push(m4a);
            transcriptionChunks.push(await transcribeWithOpenAI(m4a));
          }
        }
        transcription = transcriptionChunks.join(' ').trim();
      }

      for (const chunkPath of chunkPaths) {
        try {
          fs.unlinkSync(chunkPath);
          console.log(`[DEBUG] Deleted chunk file: ${chunkPath}`);
        } catch (err) {
          console.error(
            `[ERROR] Failed to delete chunk file: ${chunkPath}`,
            err
          );
        }
      }
    }

    // ② 議事録生成（Gemini）
    if (transcription.length <= 10000) {
      if (outputType === 'flexible') {
        minutes = await generateFlexibleMinutes(transcription, langHint);
      } else {
        minutes = await generateMinutes(transcription, meetingFormat);
      }
    } else {
      console.log(
        '[DEBUG] Transcription exceeds 10,000 characters; processing for output type'
      );
      if (outputType === 'flexible') {
        minutes = await generateFlexibleMinutes(transcription, langHint);
      } else {
        const textChunks = splitText(transcription, 10000);
        const partialMinutes = await Promise.all(
          textChunks.map((chunk) =>
            generateMinutes(chunk.trim(), meetingFormat)
          )
        );
        const combinedPartialMinutes = partialMinutes.join('\n\n');
        minutes = await combineMinutes(combinedPartialMinutes, meetingFormat);
      }
    }

    // 一時ファイル削除
    try {
      fs.unlinkSync(file.path);
      console.log('[DEBUG] Deleted original temporary file:', file.path);
    } catch (err) {
      console.error(
        '[ERROR] Failed to delete temporary file:',
        file.path,
        err
      );
    }

    for (const p of cleanupExtra) {
      try {
        fs.unlinkSync(p);
      } catch (_) {}
    }

    console.log(
      '[DEBUG] Final transcription result length:',
      transcription.length
    );
    console.log('[DEBUG] Final minutes length:', String(minutes).length);

    // ★★ Mailgun 経由のメール送信（任意） ★★
    let emailResult = null;
    if (emailTo && MAILGUN_API_KEY && MAILGUN_DOMAIN) {
      try {
        const { textBody, htmlBody } = buildMinutesEmailBodies({
          minutes,
          transcription,
          locale: localeResolved,
        });

        emailResult = await sendMinutesEmail({
          to: emailTo,
          subject: emailSubject || 'Your minutes from Minutes.AI',
          text: textBody,
          html: htmlBody,
          // ★ From 名ローカライズ用
          locale: localeResolved,
        });

        console.log(`[MAILGUN] Email sent successfully to ${emailTo}`);
      } catch (err) {
        console.error(
          '[MAILGUN] Error while sending minutes email:',
          err.message
        );
      }
    }

    return res.json({
      transcription: transcription.trim(),
      minutes,
      email: emailResult,
    });
  } catch (err) {
    console.error('[ERROR] Internal error in /api/transcribe:', err);
    return res
      .status(500)
      .json({ error: 'Internal server error', details: err.message });
  }
});


// ==============================================
//  /api/minutes-email-from-audio
//  iOS から送られてきた音声を STT → minutes 生成 → メール送信用ジョブとして受け取る
// ==============================================

// ==============================================
//  /api/minutes-email-from-audio
//  iOS から送られてきた音声を STT → minutes 生成 → メール送信用ジョブとして受け取る
// ==============================================

app.post(
  '/api/minutes-email-from-audio',
  upload.single('file'),
  async (req, res) => {
    console.log('[/api/minutes-email-from-audio] called');

    try {
      const file = req.file;
      if (!file) {
        console.error('[EMAIL_JOB] No file uploaded');
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // ---- フォームフィールド ----
      const {
        jobId,
        locale: localeFromBody,
        lang,
        outputType = 'flexible',
        formatId,
        userId,
        emailSubject, // 任意: iOS から件名を渡す場合（meetingTitle があればそちら優先）
      } = req.body || {};

      // recipients は JSON 文字列として送られてくる想定（iOS 側で JSON.stringify）
      let recipients = [];
      try {
        if (req.body.recipients) {
          recipients = JSON.parse(req.body.recipients);
        }
      } catch (e) {
        console.warn(
          '[EMAIL_JOB] Failed to parse recipients JSON:',
          e.message
        );
      }

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        console.error('[EMAIL_JOB] recipients is empty');
        return res.status(400).json({ error: 'No recipients specified' });
      }

      console.log('[EMAIL_JOB] jobId      =', jobId || '(none)');
      console.log('[EMAIL_JOB] userId     =', userId || '(guest)');
      console.log('[EMAIL_JOB] formatId   =', formatId || '(none)');
      console.log('[EMAIL_JOB] outputType =', outputType);
      console.log('[EMAIL_JOB] recipients =', recipients);
      console.log(
        '[EMAIL_JOB] file path  =',
        file.path,
        'size=',
        file.size,
        'bytes'
      );

      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      console.log(`[EMAIL_JOB] Uploaded file size: ${fileSizeMB} MB`);

      // ---- locale / lang を決定 ----
      const localeResolved = resolveLocale(req, localeFromBody);
      const langHint = lang || localeResolved || null;

      // ---- Whisper で STT（/api/transcribe と同じ分割ロジック）----
      let transcription = '';
      const cleanupExtra = [];
      const chunkPathsForCleanup = [];

      try {
        if (file.size <= TRANSCRIPTION_CHUNK_THRESHOLD) {
          console.log('[EMAIL_JOB] <= threshold: send original file to Whisper');
          try {
            transcription = (await transcribeWithOpenAI(file.path)).trim();
          } catch (e) {
            console.warn(
              '[EMAIL_JOB] direct transcription failed, retry with m4a:',
              e.message
            );
            const m4aPath = await convertToM4A(file.path);
            cleanupExtra.push(m4aPath);
            transcription = (await transcribeWithOpenAI(m4aPath)).trim();
          }
        } else {
          console.log(
            '[EMAIL_JOB] > threshold: split by duration/size and transcribe chunks'
          );

          const chunkPaths = await splitAudioFile(
            file.path,
            TRANSCRIPTION_CHUNK_THRESHOLD
          );
          chunkPathsForCleanup.push(...chunkPaths);
          console.log(
            `[EMAIL_JOB] Number of generated chunks: ${chunkPaths.length}`
          );

          try {
            const transcriptionChunks = await Promise.all(
              chunkPaths.map((p) => transcribeWithOpenAI(p))
            );
            transcription = transcriptionChunks.join(' ').trim();
          } catch (e) {
            console.warn(
              '[EMAIL_JOB] chunk transcription failed somewhere, retry each with m4a:',
              e.message
            );
            const transcriptionChunks = [];
            for (const p of chunkPaths) {
              try {
                transcriptionChunks.push(await transcribeWithOpenAI(p));
              } catch (_) {
                const m4a = await convertToM4A(p);
                cleanupExtra.push(m4a);
                transcriptionChunks.push(await transcribeWithOpenAI(m4a));
              }
            }
            transcription = transcriptionChunks.join(' ').trim();
          }
        }
      } catch (e) {
        console.error(
          '[EMAIL_JOB] Whisper transcription error:',
          e.message
        );

        // チャンク & 変換ファイルを掃除
        for (const p of chunkPathsForCleanup) {
          try {
            fs.unlinkSync(p);
            console.log('[EMAIL_JOB] Deleted chunk file:', p);
          } catch (_) {}
        }
        for (const p of cleanupExtra) {
          try {
            fs.unlinkSync(p);
            console.log('[EMAIL_JOB] Deleted extra temp file:', p);
          } catch (_) {}
        }
        try {
          fs.unlinkSync(file.path);
          console.log('[EMAIL_JOB] Deleted original file after STT error:', file.path);
        } catch (_) {}

        return res.status(500).json({
          error: 'Transcription failed',
          details: e.message,
        });
      }

      console.log(
        '[EMAIL_JOB] transcription length =',
        transcription.length
      );

      // ---- 長大な transcript は圧縮 ----
      let effectiveTranscript = transcription;
      if (transcription.length > MAX_ONESHOT_TRANSCRIPT_CHARS) {
        console.log(
          `[EMAIL_JOB] transcript length=${transcription.length} > ${MAX_ONESHOT_TRANSCRIPT_CHARS}, compressing...`
        );
        effectiveTranscript = await compressTranscriptForGemini(
          transcription,
          langHint
        );
      }

      // ---- minutes 生成 ----
      let minutes = null;
      let meta = null;

      if (formatId && localeResolved) {
        const fmt = loadFormatJSON(formatId, localeResolved);
        if (!fmt) {
          console.error(
            '[EMAIL_JOB] formatId / locale not found:',
            formatId,
            localeResolved
          );

          // 一時ファイル削除
          try {
            fs.unlinkSync(file.path);
          } catch (_) {}
          for (const p of chunkPathsForCleanup) {
            try {
              fs.unlinkSync(p);
            } catch (_) {}
          }
          for (const p of cleanupExtra) {
            try {
              fs.unlinkSync(p);
            } catch (_) {}
          }

          return res
            .status(404)
            .json({ error: 'Format or locale not found' });
        }

        fmt.formatId = formatId;
        fmt.locale = localeResolved;

        minutes = await generateWithFormatJSON(effectiveTranscript, fmt);
        meta = {
          formatId,
          locale: localeResolved,
          schemaId: fmt.schemaId || null,
          title: fmt.title || null,
        };
      } else {
        if ((outputType || 'flexible').toLowerCase() === 'flexible') {
          minutes = await generateFlexibleMinutes(effectiveTranscript, langHint);
        } else {
          minutes = await generateMinutes(effectiveTranscript, '');
        }
        meta = { legacy: true, outputType, lang: langHint };
      }

      console.log(
        '[EMAIL_JOB] minutes length =',
        minutes ? String(minutes).length : 0
      );

      // ========= ここからメール送信処理 =========

      if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
        console.error('[EMAIL_JOB] Mailgun is not configured');

        try {
          fs.unlinkSync(file.path);
        } catch (_) {}
        for (const p of chunkPathsForCleanup) {
          try {
            fs.unlinkSync(p);
          } catch (_) {}
        }
        for (const p of cleanupExtra) {
          try {
            fs.unlinkSync(p);
          } catch (_) {}
        }

        return res.status(500).json({
          error: 'Mailgun is not configured (missing API key or domain)',
        });
      }

      // 1. meetingTitle を JSON から抽出（あれば件名に使う）
      let meetingTitleForSubject = null;
      try {
        // minutes が JSON文字列のケース
        if (typeof minutes === 'string') {
          const parsed = JSON.parse(minutes);
          if (
            parsed &&
            typeof parsed === 'object' &&
            typeof parsed.meetingTitle === 'string' &&
            parsed.meetingTitle.trim()
          ) {
            meetingTitleForSubject = parsed.meetingTitle
              .replace(/\s+/g, ' ')
              .trim();
          }
        }
        // minutes がオブジェクトのケース（保険）
        else if (
          minutes &&
          typeof minutes === 'object' &&
          typeof minutes.meetingTitle === 'string' &&
          minutes.meetingTitle.trim()
        ) {
          meetingTitleForSubject = minutes.meetingTitle
            .replace(/\s+/g, ' ')
            .trim();
        }
      } catch (e) {
        console.warn(
          '[EMAIL_JOB] Failed to parse minutes JSON for subject:',
          e.message
        );
      }

      // 1. 件名：meetingTitle > emailSubject > デフォルト
      const subject =
        meetingTitleForSubject ||
        (emailSubject && emailSubject.trim()) ||
        'Your meeting minutes (Minutes.AI)';

      // 2. 本文生成（minutes のみ、ロケールでラベルを切り替え）
      const { textBody, htmlBody } = buildMinutesOnlyEmailBodies({
        minutes,
        locale: localeResolved,
      });

      console.log(
        '[EMAIL_JOB] textBody length =',
        textBody ? textBody.length : 0,
        'htmlBody length =',
        htmlBody ? htmlBody.length : 0
      );

      console.log(
        '[EMAIL_JOB] Ready to send email with minutes to:',
        recipients
      );

      let mailgunResult = null;
      try {
        // sendMinutesEmail は `to` に文字列を期待しているので join して渡す
        mailgunResult = await sendMinutesEmail({
          to: recipients.join(','),
          subject,
          text: textBody,
          html: htmlBody,
          // ★ From 名ローカライズ用
          locale: localeResolved,
        });

        console.log(
          '[EMAIL_JOB] Mailgun send OK:',
          mailgunResult.id || mailgunResult
        );
      } catch (e) {
        console.error('[EMAIL_JOB] Mailgun send FAILED:', e);

        try {
          fs.unlinkSync(file.path);
        } catch (_) {}
        for (const p of chunkPathsForCleanup) {
          try {
            fs.unlinkSync(p);
          } catch (_) {}
        }
        for (const p of cleanupExtra) {
          try {
            fs.unlinkSync(p);
          } catch (_) {}
        }

        return res.status(500).json({
          error: 'Failed to send email',
          details: e.message,
        });
      }

      // ---- 一時ファイル削除 ----
      try {
        fs.unlinkSync(file.path);
        console.log('[EMAIL_JOB] Deleted temporary file:', file.path);
      } catch (err) {
        console.error(
          '[EMAIL_JOB] Failed to delete temporary file:',
          file.path,
          err
        );
      }
      for (const p of chunkPathsForCleanup) {
        try {
          fs.unlinkSync(p);
          console.log('[EMAIL_JOB] Deleted chunk file:', p);
        } catch (_) {}
      }
      for (const p of cleanupExtra) {
        try {
          fs.unlinkSync(p);
          console.log('[EMAIL_JOB] Deleted extra temp file:', p);
        } catch (_) {}
      }

      // クライアント(iOS)に「ジョブ受け付け完了」を返す
      return res.json({
        ok: true,
        jobId: jobId || null,
        userId: userId || null,
        recipients,
        locale: localeResolved,
        lang: langHint,
        transcriptionLength: transcription.length,
        minutesLength: minutes ? String(minutes).length : 0,
        meta,
        mailgunId: mailgunResult && mailgunResult.id ? mailgunResult.id : null,
      });
    } catch (err) {
      console.error('[EMAIL_JOB] Internal error:', err);
      return res
        .status(500)
        .json({ error: 'Internal server error', details: err.message });
    }
  }
);


/*==============================================
=        フォーマット関連 API（新規追加）       =
==============================================*/
app.get('/api/formats', (_req, res) => {
  const registry = getRegistry();
  res.json(registry);
});

app.get('/api/formats/:formatId/:locale', (req, res) => {
  const { formatId, locale } = req.params;
  const payload = loadFormatJSON(formatId, locale);
  if (!payload) return res.status(404).json({ error: 'Format or locale not found' });
  res.json(payload);
});

/*==============================================
=     FORCE-REGISTER: /api/generate-minutes    =
==============================================*/
console.log('[BOOT] registering POST/GET /api/generate-minutes (early)');

app.get('/api/generate-minutes', (req, res) => {
  res.set('Allow', 'POST');
  return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
});

app.post('/api/generate-minutes', async (req, res) => {
  try {
    const {
      transcript,
      formatId,
      locale: localeFromBody,
      outputType = 'flexible', // 旧互換
      meetingFormat,
      lang,
    } = req.body || {};

    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return res.status(400).json({ error: 'Missing transcript' });
    }

    const rawTranscript = transcript.trim();
    const localeResolved = resolveLocale(req, localeFromBody);
    const langHint = lang || localeResolved || null;

    // 30万文字超えた場合は iOS と同様に圧縮
    let effectiveTranscript = rawTranscript;
    if (rawTranscript.length > MAX_ONESHOT_TRANSCRIPT_CHARS) {
      console.log(
        `[DEBUG] /api/generate-minutes: transcript length=${rawTranscript.length} exceeds MAX_ONESHOT_TRANSCRIPT_CHARS=${MAX_ONESHOT_TRANSCRIPT_CHARS}. Compressing before Gemini.`
      );
      effectiveTranscript = await compressTranscriptForGemini(rawTranscript, langHint);
    }

    let minutes;
    let meta = null;

    if (formatId && localeResolved) {
      const fmt = loadFormatJSON(formatId, localeResolved);
      if (!fmt) return res.status(404).json({ error: 'format/locale not found' });

      // ログ用
      fmt.formatId = formatId;
      fmt.locale = localeResolved;

      minutes = await generateWithFormatJSON(effectiveTranscript, fmt);
      meta = {
        formatId,
        locale: localeResolved,
        schemaId: fmt.schemaId || null,
        title: fmt.title || null,
      };
    } else {
      if ((outputType || 'flexible').toLowerCase() === 'flexible') {
        minutes = await generateFlexibleMinutes(effectiveTranscript, langHint);
      } else {
        minutes = await generateMinutes(effectiveTranscript, meetingFormat || '');
      }
      meta = { legacy: true, outputType, lang: langHint };
    }

    const shouldLog =
      process.env.LOG_GENERATED_MINUTES === '1' ||
      req.headers['x-debug-log'] === '1' ||
      req.query.debug === '1';

    if (shouldLog) {
      logLong('[GENERATED_MINUTES raw]', minutes);
      try {
        const pretty = JSON.stringify(JSON.parse(minutes), null, 2);
        logLong('[GENERATED_MINUTES pretty]', pretty);
      } catch {
        // JSONでなければ無視
      }
      if (process.env.LOG_TRANSCRIPT === '1') {
        logLong('[TRANSCRIPT]', rawTranscript);
      }
      if (process.env.LOG_LOCALE === '1') {
        console.log(`[GENERATE] localeResolved=${localeResolved}`);
      }
    }

    // transcription は元の全文を返す
    return res.json({
      transcription: rawTranscript,
      minutes,
      meta,
    });
  } catch (err) {
    console.error('[ERROR] /api/generate-minutes:', err);
    return res.status(500).json({ error: 'Internal error', details: err.message });
  }
});

/*==============================================
=        単純なメール送信 API（テスト用）      =
==============================================*/
// body: { to, subject?, minutes, transcript? }
app.post('/api/send-minutes-email', async (req, res) => {
  try {
    const { to, subject, minutes, transcript, locale, lang } = req.body || {};
    if (!to || !minutes) {
      return res
        .status(400)
        .json({ error: 'Missing "to" or "minutes" in body' });
    }
    if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
      return res.status(500).json({ error: 'Mailgun is not configured' });
    }

    const localeResolved = resolveLocale(req, locale || lang);

    const { textBody, htmlBody } = buildMinutesEmailBodies({
      minutes,
      transcription: transcript,
      locale: localeResolved,
    });

    const result = await sendMinutesEmail({
      to,
      subject: subject || 'Your minutes from Minutes.AI',
      text: textBody,
      html: htmlBody,
      // ★ From 名ローカライズ用
      locale: localeResolved,
    });

    return res.json({ ok: true, result });
  } catch (err) {
    console.error('[ERROR] /api/send-minutes-email:', err);
    return res
      .status(500)
      .json({ error: 'Internal error', details: err.message });
  }
});



/*==============================================
=               Static Frontend                =
==============================================*/
const candidates = [
  path.join(__dirname, 'frontend', 'build'),
  path.join(__dirname, 'public'),
];
const staticPath = candidates.find((p) => fs.existsSync(p)) || path.join(__dirname, 'public');

console.log(`[DEBUG] Static files served from: ${staticPath}`);
app.use(express.static(staticPath));

app.use('/api', (req, res, next) => {
  res.status(404).json({ error: 'API route not found' });
});

app.get(['/success', '/cancel'], (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

app.get('*', (req, res) => {
  console.log(`[DEBUG] Redirecting ${req.url} to index.html`);
  res.sendFile(path.join(staticPath, 'index.html'));
});

/*==============================================
=              Global Error Handler            =
==============================================*/
app.use((err, req, res, next) => {
  console.error('[GLOBAL ERROR HANDLER]', err);
  const origin =
    req.headers.origin && allowedOrigins.includes(req.headers.origin)
      ? req.headers.origin
      : '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(err.status || 500);
  res.json({ error: err.message || 'Internal Server Error' });
});

/*==============================================
=                 Start Server                 =
==============================================*/
const PORT = process.env.PORT || 5001;
console.log(`[DEBUG] API Key loaded: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
app.listen(PORT, () => {
  console.log(`[DEBUG] Server started on port ${PORT}`);
});

module.exports = app;
