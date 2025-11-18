// server.js

require('dotenv').config();
console.log("✅ STRIPE_SECRET_KEY:", process.env.STRIPE_SECRET_KEY ? "Loaded" : "Not found");
console.log("✅ STRIPE_PRICE_UNLIMITED:", process.env.STRIPE_PRICE_UNLIMITED ? "Loaded" : "Not found");
console.log("✅ OPENAI_API_KEY (for Whisper):", process.env.OPENAI_API_KEY ? "Loaded" : "Not found");
console.log("✅ GEMINI_API_KEY (for NLP):", process.env.GEMINI_API_KEY ? "Loaded" : "Not found");


const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const multer = require('multer');
const axios = require('axios'); // (Whisper / Zoom等でまだ使用)

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
const GEMINI_MODEL_NAME = "gemini-2.5-flash"; // ユーザー指定のモデル

/**
 * ★ NEW: Helper function to call the Gemini API.
 */
async function callGemini(systemInstruction, userMessage, generationConfig) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL_NAME,
      systemInstruction: systemInstruction, // システムプロンプトを設定
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: generationConfig, // temperature, maxOutputTokens, responseMimeType
    });

    const response = result.response;

    // レスポンスのテキスト部分を安全に抽出
    if (response.candidates && 
        response.candidates.length > 0 &&
        response.candidates[0].content &&
        response.candidates[0].content.parts &&
        response.candidates[0].content.parts.length > 0) {
          
      return response.candidates[0].content.parts[0].text.trim();
    
    } else if (response.promptFeedback && response.promptFeedback.blockReason) {
        // 安全性などでブロックされた場合
        console.error(`[ERROR] Gemini call blocked: ${response.promptFeedback.blockReason}`);
        throw new Error(`Gemini API call blocked: ${response.promptFeedback.blockReason}`);
    } else {
        // その他の理由でテキストが返されなかった場合
        console.error('[ERROR] Gemini API returned no text content.', JSON.stringify(response, null, 2));
        throw new Error('Gemini API returned no text content.');
    }

  } catch (error) {
    console.error('[ERROR] Failed to call Gemini API:', error.response?.data || error.message);
    if (error.message.includes("GEMINI_API_KEY")) {
        throw error;
    }
    throw new Error(`Failed to generate content using Gemini API: ${error.message}`);
  }
}
// ==== End of Gemini Setup ====


const app = express();

// ---- Helpers ------------------------------------------------------------
function logLong(label, text, size = 8000) {
  // ... (変更なし) ...
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
  // ... (変更なし) ...
  const hxu = req.headers['x-user-locale'];
  const hal = req.headers['accept-language'];
  const bcp47 = bodyLocale || hxu || pickFirstTag(hal) || 'en';
  const short = toShort(bcp47);
  if (process.env.LOG_LOCALE === '1') {
    console.log(`[LOCALE] body=${bodyLocale || ''} x-user-locale=${hxu || ''} accept-language=${hal || ''} -> resolved=${short}`);
  }
  return short;
}

// --- Security headers (Helmet) ---
app.use(helmet({
  // ... (変更なし) ...
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
        "https://www.googletagmanager.com"
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
        "https://*.zoom.com"
      ],
      "frame-ancestors": ["'self'", "*.zoom.us", "*.zoom.com"],
    },
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));


// ── CORS を “全ルートより前” に適用（preflight も自動対応） ──
const allowedOrigins = [
  // ... (変更なし) ...
  'https://sense-ai.world',
  'https://www.sense-ai.world',
  'https://sense-website-production.up.railway.app', // 静的+API の Origin
  'http://localhost:3000' // ローカル開発時
];
app.use(cors({
  // ... (変更なし) ...
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','Accept','X-Requested-With','X-User-Locale','X-Debug-Log'],
}));
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

// ... (Middleware Order, Request Debug Logging, Router Registration) ...
// (このセクションは変更なし)

/*==============================================
=            Middleware Order                  =
==============================================*/
app.use('/api/stripe', express.raw({ type: 'application/json' }));
app.use('/api/livekit/webhook',
  express.raw({ type: 'application/webhook+json' }),
  livekitWebhookRouter
);
app.use('/api/apple/notifications', express.json());
app.use(express.json({
  verify: (req, res, buf) => {
    req._rawBody = buf ? buf.toString('utf8') : '';
  },
  limit: '2mb',
}));
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
      'Access-Control-Allow-Credentials': 'true'
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
  console.log(`[DEBUG] Request received:
  - Method: ${req.method}
  - Origin: ${req.headers.origin || 'Not set'}
  - Path: ${req.path}
  - Headers: ${JSON.stringify(req.headers, null, 2)}
`);
  next();
});

/*==============================================
=            Upload / Transcription            =
==============================================*/

// ... (multer configuration - 変更なし) ...
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
  }
});
const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});


// OpenAI API endpoints
const OPENAI_API_ENDPOINT_TRANSCRIPTION = 'https://api.openai.com/v1/audio/transcriptions';
// (削除) const OPENAI_API_ENDPOINT_CHATGPT = 'https://api.openai.com/v1/chat/completions';

/**
 * splitText: Splits text into chunks of specified size.
 * (変更なし)
 */
function splitText(text, chunkSize) {
  // ... (変更なし) ...
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
 * (★ 修正: Gemini API 呼び出しに変更)
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
    // ★ Gemini呼び出し
    const generationConfig = {
      temperature: 0,
      maxOutputTokens: 16000,
      // (responseMimeType: 'text/plain' (default))
    };
    return await callGemini(systemMessage, combinedText, generationConfig);

  } catch (error) {
    console.error('[ERROR] Failed to call Gemini API for combining minutes:', error.message);
    throw new Error('Failed to combine meeting minutes');
  }
}

/**
 * generateMinutes: Uses Gemini API to generate meeting minutes (classic template text).
 * (★ 修正: Gemini API 呼び出しに変更)
 */
function isValidMinutes(out) {
  // ... (変更なし) ...
  if (!out) return false;
  const must = ["【Meeting Name】", "【Date】", "【Location】", "【Attendees】", "【Agenda(1)】", "【Agenda(2)】", "【Agenda(3)】"];
  return must.every(k => out.includes(k));
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

  // ★ Gemini呼び出し
  const generationConfig = {
    temperature: 0,
    maxOutputTokens: 16000,
  };
  return await callGemini(systemMessage, userMessage, generationConfig);
}

const generateMinutes = async (transcription, formatTemplate) => {
  const template = (formatTemplate && formatTemplate.trim()) || 
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
    // ★ Gemini呼び出し
    const generationConfig = {
      temperature: 0,
      maxOutputTokens: 16000,
    };
    let out = await callGemini(systemMessage, userMessage, generationConfig);

    if (!isValidMinutes(out)) {
      // (repairToTemplate も Gemini 化済み)
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
  // ... (変更なし) ...
  try {
    const obj = JSON.parse(str);
    if (!obj) return false;
    const must = ["meetingTitle","date","summary","sections"];
    return must.every(k => Object.prototype.hasOwnProperty.call(obj, k));
  } catch {
    return false;
  }
}

async function repairFlexibleJSON(badOutput, langHint) {
  // ★ 修正: Gemini API (JSONモード) 呼び出しに変更
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

  // ★ Gemini呼び出し (JSONモード)
  const generationConfig = {
    temperature: 0,
    maxOutputTokens: 16000,
    responseMimeType: "application/json", // JSONモード
  };
  return await callGemini(systemMessage, userMessage, generationConfig);
}

async function generateFlexibleMinutes(transcription, langHint) {
  // ★ 修正: Gemini API (JSONモード) 呼び出しに変更
  
  // buildFlexibleMessages は OpenAI 形式の messages 配列を返す
  const openAIMessages = buildFlexibleMessages({
    transcript: transcription,
    lang: langHint,
    currentDateISO: new Date().toISOString(),
  });
  
  // OpenAI形式の 'messages' を Gemini 形式 (systemInstruction, userMessage) に変換
  // (system が最初、user が最後と仮定)
  const systemMessage = openAIMessages.find(m => m.role === 'system')?.content || '';
  const userMessage = openAIMessages.find(m => m.role === 'user')?.content || '';

  if (!userMessage) {
    console.error("[ERROR] generateFlexibleMinutes: Could not find user message in buildFlexibleMessages output.");
    throw new Error("Failed to parse messages for Gemini.");
  }

  try {
    // ★ Gemini呼び出し (JSONモード)
    const generationConfig = {
      temperature: 0,
      maxOutputTokens: 16000,
      responseMimeType: "application/json", // JSONモード
    };
    
    let out = await callGemini(systemMessage, userMessage, generationConfig);

    if (!isValidFlexibleJSON(out)) {
      // (repairFlexibleJSON も Gemini 化済み)
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
  // ★ 修正: Gemini API (JSONモード) 呼び出しに変更
  // fmt = { formatId, locale, schemaId, title, prompt, notes }

  const systemMessage = fmt.prompt || '';
  const userMessage =
`currentDate: ${new Date().toISOString()}

<TRANSCRIPT>
${transcript}
</TRANSCRIPT>`;

  // ★ Gemini呼び出し (JSONモード)
  const generationConfig = {
    temperature: 0,
    maxOutputTokens: 16000,
    responseMimeType: "application/json", // JSONモード
  };
  return await callGemini(systemMessage, userMessage, generationConfig);
}

/**
 * transcribeWithOpenAI: Uses the Whisper API for transcription.
 * (★ 変更なし: これはSTT（音声認識）であり、NLP（テキスト生成）ではないため)
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

// ... (TRANSCRIPTION_CHUNK_THRESHOLD, splitAudioFile, convertToM4A - 変更なし) ...

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
        
        tasks.push(new Promise((resolveTask, rejectTask) => {
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
        }));
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
      .toFormat('ipod') // ipod format is equivalent to m4a
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


// ... (Health check, /api/transcribe - 変更なし) ...
// (Note: /api/transcribe 内の generateFlexibleMinutes や generateMinutes は
// すでにGemini化されているため、このエンドポイントも自動的にGeminiを使うようになります)

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
    const langHint = req.body.lang || null;
    console.log(`[DEBUG] Received meetingFormat: ${meetingFormat}`);
    console.log(`[DEBUG] outputType=${outputType}, lang=${langHint}`);

    // multer が保存した一時ファイルパス
    let tempFilePath = file.path;

    let transcription = '';
    let minutes = '';
    const cleanupExtra = []; // 変換で作った一時ファイルの削除用

    // ① Whisper への送信方針（変更なし）
    if (file.size <= TRANSCRIPTION_CHUNK_THRESHOLD) {
      console.log('[DEBUG] <= threshold: send original file to Whisper');
      try {
        transcription = (await transcribeWithOpenAI(tempFilePath)).trim();
      } catch (e) {
        console.warn('[WARN] direct transcription failed, retry with m4a:', e.message);
        const m4aPath = await convertToM4A(tempFilePath);
        cleanupExtra.push(m4aPath);
        transcription = (await transcribeWithOpenAI(m4aPath)).trim();
      }
    } else {
      console.log('[DEBUG] > threshold: split by duration/size and transcribe chunks');

      const chunkPaths = await splitAudioFile(tempFilePath, TRANSCRIPTION_CHUNK_THRESHOLD);
      console.log(`[DEBUG] Number of generated chunks: ${chunkPaths.length}`);

      try {
        const transcriptionChunks = await Promise.all(
          chunkPaths.map((p) => transcribeWithOpenAI(p))
        );
        transcription = transcriptionChunks.join(' ').trim();
      } catch (e) {
        console.warn('[WARN] chunk transcription failed somewhere, retry each with m4a:', e.message);
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
          console.error(`[ERROR] Failed to delete chunk file: ${chunkPath}`, err);
        }
      }
    }

    // ② 議事録生成（★ ここで呼ばれる関数はGemini化されている）
    if (transcription.length <= 10000) {
      if (outputType === 'flexible') {
        minutes = await generateFlexibleMinutes(transcription, langHint);
      } else {
        minutes = await generateMinutes(transcription, meetingFormat);
      }
    } else {
      console.log('[DEBUG] Transcription exceeds 10,000 characters; processing for output type');
      if (outputType === 'flexible') {
        minutes = await generateFlexibleMinutes(transcription, langHint);
      } else {
        const textChunks = splitText(transcription, 10000);
        const partialMinutes = await Promise.all(
          textChunks.map((chunk) => generateMinutes(chunk.trim(), meetingFormat))
        );
        const combinedPartialMinutes = partialMinutes.join('\n\n');
        minutes = await combineMinutes(combinedPartialMinutes, meetingFormat);
      }
    }

    // オリジナル一時ファイル削除
    try {
      fs.unlinkSync(file.path);
      console.log('[DEBUG] Deleted original temporary file:', file.path);
    } catch (err) {
      console.error('[ERROR] Failed to delete temporary file:', file.path, err);
    }

    // 変換で作った一時ファイルの削除
    for (const p of cleanupExtra) {
      try { fs.unlinkSync(p); } catch {}
    }

    console.log('[DEBUG] Final transcription result length:', transcription.length);
    console.log('[DEBUG] Final minutes length:', minutes.length);

    return res.json({ transcription: transcription.trim(), minutes });
  } catch (err) {
    console.error('[ERROR] Internal error in /api/transcribe:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

/*==============================================
=        フォーマット関連 API（新規追加）       =
==============================================*/
// (変更なし)
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
// (★ 内部の呼び出しがGemini化されている)
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
      outputType = 'flexible',    // 旧互換
      meetingFormat,
      lang
    } = req.body || {};

    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return res.status(400).json({ error: 'Missing transcript' });
    }

    const localeResolved = resolveLocale(req, localeFromBody);

    let minutes;
    let meta = null;

    if (formatId && localeResolved) {
      // ★ 新：generateWithFormatJSON (Gemini化済み)
      const fmt = loadFormatJSON(formatId, localeResolved);
      if (!fmt) return res.status(404).json({ error: 'format/locale not found' });
      minutes = await generateWithFormatJSON(transcript, fmt);
      meta = { formatId, locale: localeResolved, schemaId: fmt.schemaId || null, title: fmt.title || null };
    } else {
      // ★ 旧：generateFlexibleMinutes / generateMinutes (Gemini化済み)
      const langHint = lang || localeResolved || null;
      if ((outputType || 'flexible').toLowerCase() === 'flexible') {
        minutes = await generateFlexibleMinutes(transcript, langHint);
      } else {
        minutes = await generateMinutes(transcript, meetingFormat || '');
      }
      meta = { legacy: true, outputType, lang: langHint };
    }

    // ===== ログ出力（変更なし）=====
    const shouldLog =
      process.env.LOG_GENERATED_MINUTES === '1' ||
      req.headers['x-debug-log'] === '1' ||
      req.query.debug === '1';
    if (shouldLog) {
      logLong('[GENERATED_MINUTES raw]', minutes);
      try {
        const pretty = JSON.stringify(JSON.parse(minutes), null, 2);
        logLong('[GENERATED_MINUTES pretty]', pretty);
      } catch { /* JSONでなければ無視 */ }
      if (process.env.LOG_TRANSCRIPT === '1') {
        logLong('[TRANSCRIPT]', transcript);
      }
      if (process.env.LOG_LOCALE === '1') {
        console.log(`[GENERATE] localeResolved=${localeResolved}`);
      }
    }
    // ===

    return res.json({
      transcription: transcript.trim(),
      minutes,
      meta
    });
  } catch (err) {
    console.error('[ERROR] /api/generate-minutes:', err);
    return res.status(500).json({ error: 'Internal error', details: err.message });
  }
});


app.get('/api/transcribe', (req, res) => {
  res.status(200).json({ message: 'GET /api/transcribe is working!' });
});

/*==============================================
=               Static Frontend                =
==============================================*/
// (変更なし)
const candidates = [
  path.join(__dirname, 'frontend', 'build'),
  path.join(__dirname, 'public'),
];
const staticPath = candidates.find(p => fs.existsSync(p)) || path.join(__dirname, 'public');

console.log(`[DEBUG] Static files served from: ${staticPath}`);
app.use(express.static(staticPath));

app.use('/api', (req, res, next) => {
  res.status(404).json({ error: 'API route not found' });
});

app.get(["/success", "/cancel"], (req, res) => {
  res.sendFile(path.join(staticPath, "index.html"));
});
app.get('*', (req, res) => {
  console.log(`[DEBUG] Redirecting ${req.url} to index.html`);
  res.sendFile(path.join(staticPath, "index.html"));
});

/*==============================================
=              Global Error Handler            =
==============================================*/
// (変更なし)
app.use((err, req, res, next) => {
  console.error('[GLOBAL ERROR HANDLER]', err);
  const origin = req.headers.origin && allowedOrigins.includes(req.headers.origin) ? req.headers.origin : '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(err.status || 500);
  res.json({ error: err.message || 'Internal Server Error' });
});

/*==============================================
=                 Start Server                 =
==============================================*/
// (変更なし)
const PORT = process.env.PORT || 5001;
console.log(`[DEBUG] API Key loaded: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
app.listen(PORT, () => {
  console.log(`[DEBUG] Server started on port ${PORT}`);
});

module.exports = app;