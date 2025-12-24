// server.js

require('dotenv').config();
console.log("✅ STRIPE_SECRET_KEY:", process.env.STRIPE_SECRET_KEY ? "Loaded" : "Not found");
console.log("✅ STRIPE_PRICE_UNLIMITED:", process.env.STRIPE_PRICE_UNLIMITED ? "Loaded" : "Not found");
console.log("✅ OPENAI_API_KEY (for Whisper):", process.env.OPENAI_API_KEY ? "Loaded" : "Not found");
console.log("✅ GEMINI_API_KEY (for NLP):", process.env.GEMINI_API_KEY ? "Loaded" : "Not found");
console.log("✅ process.env.MAILGUN_API_KEY:", process.env.MAILGUN_API_KEY ? "Loaded" : "Not found");
console.log("✅ process.env.MAILGUN_DOMAIN:", process.env.MAILGUN_DOMAIN ? "Loaded" : "Not found");
console.log("✅ process.env.MAILGUN_FROM:", process.env.MAILGUN_FROM ? process.env.MAILGUN_FROM : "Not set (use default)");

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

const { compressTranscriptForGemini, MAX_ONESHOT_TRANSCRIPT_CHARS } = require('./src/services/minutes/transcriptCompression');


const livekitRoomsRouter = require('./routes/livekitRooms');
const formatsPromptRouter = require('./routes/formatsPrompt');

const crypto = require('crypto');
const https = require('https');


// ==== ★ NEW: Gemini (Google AI) Setup ====
const { callGemini } = require('./src/services/gemini/geminiClient');
const { transcribeWithOpenAI } = require('./src/services/openai/whisperClient');

const { splitAudioFile, convertToM4A, cleanupFiles } = require('./src/services/audio/ffmpegUtil');

const { sendMinutesEmail, isMailgunConfigured } = require('./src/clients/mailgunClient');


// ==== ★ NEW: Email Templates (Minutes / Transcript) ====
const {
  buildMinutesEmailBodies,
  buildMinutesOnlyEmailBodies,
} = require('./services/emailTemplates');

// =======================================================================

const app = express();

// ---- Helpers ------------------------------------------------------------
const { logLong } = require('./src/utils/logLong');
const { resolveLocale } = require('./src/utils/locale');
const { splitText } = require('./src/utils/text');

const requestTimeout = require('./src/middlewares/requestTimeout');
const requestLogger = require('./src/middlewares/requestLogger');
app.use(requestTimeout());

const {
  updateEmailJobStatus,
  saveMeetingRecordFromEmailJob,
  createEmailJobLogger,
} = require('./src/services/emailJobs/emailJobStore');


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

app.use(requestLogger());

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
app.use(requestTimeout());

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


/*==============================================
=            Upload / Transcription            =
==============================================*/
const upload = require('./src/middlewares/upload');


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



// Constant for chunk splitting (process in one batch if file is below this size)
const TRANSCRIPTION_CHUNK_THRESHOLD = 1 * 1024 * 1024; // 1MB in bytes


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
    if (emailTo && process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
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
//  iOS から送られてきた音声を STT → minutes 生成 →
//  ・ログインユーザーなら Firestore(meetingRecords) 保存
//  ・Mailgun でメール送信
//  ・進捗は Firestore(emailJobs/{jobId}) に書き出し
//  ・★修正: ファイルURL(Firebase)経由でのダウンロードに対応しタイムアウトを回避
// ==============================================
app.post(
  "/api/minutes-email-from-audio",
  upload.single("file"),
  async (req, res) => {
    console.log("[/api/minutes-email-from-audio] called");

    // ★ body から仮 jobId を拾ってロガー作成
    const jobIdFromBody = (req.body && req.body.jobId) || "(no-jobId-yet)";
    const jobLog = createEmailJobLogger(jobIdFromBody);

    // ★ HTTPコネクション切断タイミング監視
    const httpStartedAt = Date.now();
    res.on("close", () => {
      const sec = ((Date.now() - httpStartedAt) / 1000).toFixed(1);
      console.log(
        `[EMAIL_JOB][${jobIdFromBody}] HTTP connection closed at +${sec}s (status=${res.statusCode})`
      );
    });

    try {
      // ---------------------------------------------------------
      // ★ 1. ファイルの取得ロジック (URL経由 or 直接アップロード)
      // ---------------------------------------------------------
      let tempFilePath = "";
      
      // Case A: iOSからURLが送られてきた場合 (Firebase経由・推奨)
      if (req.body.fileUrl) {
        const fileUrl = req.body.fileUrl;
        console.log(`[EMAIL_JOB] URL provided. Downloading from: ${fileUrl}`);
        
        // 一時保存先の確保
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        
        const fileName = `download_${Date.now()}_${crypto.randomUUID()}.m4a`;
        tempFilePath = path.join(tempDir, fileName);

        // サーバー側で高速ダウンロード
        try {
            await new Promise((resolve, reject) => {
                const fileStream = fs.createWriteStream(tempFilePath);
                https.get(fileUrl, (response) => {
                    if (response.statusCode !== 200) {
                        reject(new Error(`Failed to download file: status ${response.statusCode}`));
                        return;
                    }
                    response.pipe(fileStream);
                    fileStream.on('finish', () => {
                        fileStream.close(resolve);
                    });
                }).on('error', (err) => {
                    fs.unlink(tempFilePath, () => {});
                    reject(err);
                });
            });
            
            // req.file を擬似的に作成して以降の処理を共通化
            const stats = fs.statSync(tempFilePath);
            req.file = {
                path: tempFilePath,
                size: stats.size,
                originalname: "downloaded_audio.m4a",
                mimetype: "audio/mp4" // 仮
            };
            console.log(`[EMAIL_JOB] Download complete. Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
            
        } catch (downloadErr) {
            console.error("[EMAIL_JOB] Download error:", downloadErr);
            return res.status(400).json({
                error: "Failed to download file from URL",
                errorCode: "DOWNLOAD_FAILED",
                details: downloadErr.message
            });
        }
      }
      // Case B: 直接アップロードされた場合 (後方互換性)
      else if (req.file) {
        console.log("[EMAIL_JOB] File uploaded directly via multipart/form-data");
      }

      // ファイル有無チェック
      const file = req.file;
      if (!file) {
        jobLog.mark("no_file_uploaded");
        console.error("[EMAIL_JOB] No file uploaded or provided via URL");
        jobLog.end("no_file");
        return res.status(400).json({
          error: "No file uploaded",
          errorCode: "NO_FILE",
          stage: "upload",
          retryable: false,
          canEmailResend: false,
        });
      }

      // ---------------------------------------------------------
      // ★ 2. パラメータの取得 (JSONボディに対応)
      // ---------------------------------------------------------
      const {
        jobId,
        locale: localeFromBody,
        lang,
        outputType = "flexible",
        formatId,
        userId,
        emailSubject,
        meetingStartLabel,
      } = req.body || {};

      // recipientsのパース
      let recipients = [];
      try {
        if (req.body.recipients) {
          // JSONリクエストの場合は既に配列の可能性もある
          if (typeof req.body.recipients === 'string') {
             recipients = JSON.parse(req.body.recipients);
          } else if (Array.isArray(req.body.recipients)) {
             recipients = req.body.recipients;
          }
        }
      } catch (e) {
        console.warn("[EMAIL_JOB] Failed to parse recipients:", e.message);
      }

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        jobLog.mark("recipients_empty");
        // 失敗ステータス更新
        await updateEmailJobStatus({
          jobId,
          userId,
          stage: "failed",
          error: "No recipients specified",
          errorCode: "NO_RECIPIENTS",
        });
        jobLog.end("no_recipients");
        
        // ファイル掃除
        try { fs.unlinkSync(file.path); } catch (_) {}
        
        return res.status(400).json({
          error: "No recipients specified",
          errorCode: "NO_RECIPIENTS",
          stage: "input",
          retryable: false,
          canEmailResend: false,
        });
      }

      console.log("[EMAIL_JOB] jobId      =", jobId || "(none)");
      console.log("[EMAIL_JOB] outputType =", outputType);
      
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      console.log(`[EMAIL_JOB] File size to process: ${fileSizeMB} MB`);

      jobLog.mark("file_and_recipients_ok");

      // ステータス更新: uploading (完了済み扱い)
      await updateEmailJobStatus({
        jobId,
        userId,
        stage: "uploading",
        progress: 100 // URL受信時点でアップロードは終わっている
      });

      // ---- locale / lang を決定 ----
      const localeResolved = resolveLocale(req, localeFromBody);
      const langHint = lang || localeResolved || null;

      // ---------------------------------------------------------
      // ★ 3. STT (Whisper)
      // ---------------------------------------------------------
      let transcription = "";
      const cleanupExtra = [];
      const chunkPathsForCleanup = [];

      await updateEmailJobStatus({
        jobId,
        userId,
        stage: "transcribing",
      });
      jobLog.mark("stt_start");

      try {
        if (file.size <= TRANSCRIPTION_CHUNK_THRESHOLD) {
          console.log("[EMAIL_JOB] <= threshold: send original file to Whisper");
          try {
            transcription = (await transcribeWithOpenAI(file.path)).trim();
          } catch (e) {
            console.warn("[EMAIL_JOB] direct transcription failed, retry with m4a:", e.message);
            const m4aPath = await convertToM4A(file.path);
            cleanupExtra.push(m4aPath);
            transcription = (await transcribeWithOpenAI(m4aPath)).trim();
          }
        } else {
          console.log("[EMAIL_JOB] > threshold: split and transcribe chunks");
          jobLog.mark("stt_split_start");

          const chunkPaths = await splitAudioFile(
            file.path,
            TRANSCRIPTION_CHUNK_THRESHOLD
          );
          chunkPathsForCleanup.push(...chunkPaths);
          
          // 並列処理だとAPI制限にかかる場合があるので直列推奨だが、現状はPromise.all
          try {
            const transcriptionChunks = await Promise.all(
              chunkPaths.map((p) => transcribeWithOpenAI(p))
            );
            transcription = transcriptionChunks.join(" ").trim();
          } catch (e) {
            // エラー時のフォールバック (m4a変換)
            console.warn("[EMAIL_JOB] chunk transcription failed, retrying with m4a conversion...");
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
            transcription = transcriptionChunks.join(" ").trim();
          }
        }
      } catch (e) {
        jobLog.mark("stt_error");
        console.error("[EMAIL_JOB] Whisper transcription error:", e.message);

        await updateEmailJobStatus({
          jobId,
          userId,
          stage: "failed",
          error: "Transcription failed",
          errorCode: "STT_FAILED",
          failedRecipients: recipients,
        });

        // 掃除
        cleanupFiles([file.path, ...chunkPathsForCleanup, ...cleanupExtra]);

        jobLog.end("stt_failed");
        return res.status(500).json({
          error: "Transcription failed",
          errorCode: "STT_FAILED",
          stage: "transcription",
          retryable: true,
          details: e.message,
        });
      }

      jobLog.mark(`stt_done length=${transcription.length}`);

      // ---------------------------------------------------------
      // ★ 4. Minutes生成 (Gemini)
      // ---------------------------------------------------------
      let effectiveTranscript = transcription;
      if (transcription.length > MAX_ONESHOT_TRANSCRIPT_CHARS) {
        console.log(`[EMAIL_JOB] Compressing transcript (len=${transcription.length})...`);
        effectiveTranscript = await compressTranscriptForGemini(transcription, langHint);
        jobLog.mark("transcript_compressed");
      }

      let minutes = null;
      let meta = null;

      await updateEmailJobStatus({
        jobId,
        userId,
        stage: "generating",
      });
      jobLog.mark("minutes_generation_start");

      try {
        if (formatId && localeResolved) {
          const fmt = loadFormatJSON(formatId, localeResolved);
          if (!fmt) {
            throw new Error(`Format not found: ${formatId} / ${localeResolved}`);
          }
          fmt.formatId = formatId;
          fmt.locale = localeResolved;
          minutes = await generateWithFormatJSON(effectiveTranscript, fmt);
          meta = { formatId, locale: localeResolved, title: fmt.title };
        } else {
          // 旧互換
          if ((outputType || "flexible").toLowerCase() === "flexible") {
            minutes = await generateFlexibleMinutes(effectiveTranscript, langHint);
          } else {
            minutes = await generateMinutes(effectiveTranscript, "");
          }
          meta = { legacy: true, outputType, lang: langHint };
        }
      } catch (e) {
        jobLog.mark("minutes_generation_error");
        console.error("[EMAIL_JOB] minutes generation error:", e);

        await updateEmailJobStatus({
          jobId,
          userId,
          stage: "failed",
          error: "Minutes generation failed",
          errorCode: "MINUTES_GENERATION_FAILED",
          failedRecipients: recipients,
        });

        cleanupFiles([file.path, ...chunkPathsForCleanup, ...cleanupExtra]);
        return res.status(500).json({
          error: "Minutes generation failed",
          errorCode: "MINUTES_GENERATION_FAILED",
          stage: "minutesGeneration",
          retryable: true,
          details: e.message,
        });
      }

      jobLog.mark("minutes_generation_done");

      // ---------------------------------------------------------
      // ★ 5. 保存 & メール送信
      // ---------------------------------------------------------
      const rawMinutesString = typeof minutes === "string" ? minutes : JSON.stringify(minutes);
      let minutesStringForEmail = rawMinutesString;

      // 日付の上書き (optional)
      if (meetingStartLabel && typeof meetingStartLabel === "string") {
        try {
          const parsed = JSON.parse(rawMinutesString);
          if (parsed && typeof parsed === "object") {
            parsed.date = meetingStartLabel.trim();
            minutesStringForEmail = JSON.stringify(parsed);
          }
        } catch (_) {}
      }

      // meetingRecordsへ保存
      let savedRecordInfo = null;
      if (userId) {
        try {
          savedRecordInfo = await saveMeetingRecordFromEmailJob({
            uid: userId,
            transcription,
            minutes: minutesStringForEmail,
            jobId,
          });
        } catch (e) {
          console.error("[EMAIL_JOB] saveMeetingRecord error:", e);
        }
      }

      // Mailgunチェック
      if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
        await updateEmailJobStatus({
          jobId,
          userId,
          stage: "failed",
          error: "Mailgun not configured",
          errorCode: "MAIL_CONFIG_MISSING",
        });
        cleanupFiles([file.path, ...chunkPathsForCleanup, ...cleanupExtra]);
        return res.status(500).json({ error: "Mailgun config missing", errorCode: "MAIL_CONFIG_MISSING" });
      }

      // 件名抽出
      let subject = emailSubject || "Your meeting minutes (Minutes.AI)";
      try {
        const parsed = JSON.parse(minutesStringForEmail);
        if (parsed?.meetingTitle?.trim()) {
            subject = parsed.meetingTitle.trim();
        }
      } catch (_) {}

      // メール本文作成
      const { textBody, htmlBody } = buildMinutesOnlyEmailBodies({
        minutes: minutesStringForEmail,
        locale: localeResolved,
      });

      await updateEmailJobStatus({
        jobId,
        userId,
        stage: "sendingMail",
      });
      jobLog.mark("mail_send_start");

      let mailgunResult = null;
      try {
        mailgunResult = await sendMinutesEmail({
          to: recipients.join(","),
          subject,
          text: textBody,
          html: htmlBody,
          locale: localeResolved,
        });
        console.log("[EMAIL_JOB] Mailgun send OK:", mailgunResult?.id);
      } catch (e) {
        jobLog.mark("mail_send_error");
        console.error("[EMAIL_JOB] Mailgun send FAILED:", e);
        
        await updateEmailJobStatus({
          jobId,
          userId,
          stage: "failed",
          error: "Failed to send email",
          errorCode: "MAIL_SEND_FAILED",
          failedRecipients: recipients,
        });
        
        cleanupFiles([file.path, ...chunkPathsForCleanup, ...cleanupExtra]);
        return res.status(500).json({
            error: "Failed to send email",
            errorCode: "MAIL_SEND_FAILED",
            canEmailResend: !!savedRecordInfo,
            savedRecord: savedRecordInfo
        });
      }

      // 完了!
      await updateEmailJobStatus({
        jobId,
        userId,
        stage: "completed",
        failedRecipients: [],
      });

      // 最後にファイルを削除
      cleanupFiles([file.path, ...chunkPathsForCleanup, ...cleanupExtra]);
      jobLog.end("ok");

      return res.json({
        ok: true,
        jobId,
        userId,
        recipients,
        locale: localeResolved,
        transcriptionLength: transcription.length,
        minutesLength: minutesStringForEmail.length,
        meta,
        mailgunId: mailgunResult?.id,
        savedRecord: savedRecordInfo,
        minutes: minutesStringForEmail,
        transcription,
      });

    } catch (err) {
      console.error("[EMAIL_JOB] Internal error:", err);
      // 念のためステータス更新
      if (req.body.jobId) {
          await updateEmailJobStatus({
            jobId: req.body.jobId,
            stage: "failed",
            error: "Internal server error",
            errorCode: "INTERNAL_ERROR",
          });
      }
      return res.status(500).json({
        error: "Internal server error",
        errorCode: "INTERNAL_ERROR",
        details: err.message,
      });
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
    if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
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
app.use('/api', formatsPromptRouter);



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

// サーバーインスタンスを取得
const server = app.listen(PORT, () => {
  console.log(`[DEBUG] Server started on port ${PORT}`);
});

// ★修正: デバッグ・低速回線救済のため「30分」まで延長
// これでダメならRailway（インフラ側）の強制切断です
const TIMEOUT_MS = 30 * 60 * 1000; // 30分 (1800000ms)

server.keepAliveTimeout = TIMEOUT_MS;
server.headersTimeout = TIMEOUT_MS + 5000; // keepAliveより少し長くするお作法
server.requestTimeout = TIMEOUT_MS;        // リクエスト全体の待機時間
server.timeout = TIMEOUT_MS;               // ソケットの待機時間

// 念押しでメソッド経由でも設定
server.setTimeout(TIMEOUT_MS);

module.exports = app;
