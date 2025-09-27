// server.js

require('dotenv').config();
console.log("✅ STRIPE_SECRET_KEY:", process.env.STRIPE_SECRET_KEY ? "Loaded" : "Not found");
console.log("✅ STRIPE_PRICE_UNLIMITED:", process.env.STRIPE_PRICE_UNLIMITED ? "Loaded" : "Not found");

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');


const multer = require('multer');
const axios = require('axios');

const fs = require('fs');
const path = require('path');


console.log("[DEBUG] ffmpeg path set to 'ffmpeg'");
console.log("[DEBUG] ffprobe path set to 'ffprobe'");

const FormData = require('form-data');
const Stripe = require('stripe');

const zoomOAuthExchangeRoute = require('./routes/zoomOAuthExchangeRoute');
const zoomAuthRoute = require('./routes/zoomAuthRoute');
const zoomJoinTokenRoute = require('./routes/zoomJoinTokenRoute');
// ※ webhookRouter の登録パスを /api/stripe に変更
const webhookRouter = require('./routes/webhook');
const appleRouter = require('./routes/apple'); // Apple route added

const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath('ffmpeg');
ffmpeg.setFfprobePath('ffprobe');

const app = express();

// --- Security headers (Helmet) ---
// Zoom の Surface/埋め込みに備え、X-Frame-Options は無効化し、CSP の frame-ancestors で許可先を制御
app.use(helmet({
  frameguard: false, // X-Frame-Options を出さない（CSPの frame-ancestors を優先） :contentReference[oaicite:1]{index=1}
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      // Zoom クライアントからの埋め込みを許可
      "frame-ancestors": ["'self'", "*.zoom.us", "*.zoom.com"],  // CSPで親フレームを制御 :contentReference[oaicite:2]{index=2}
    },
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));

// ── CORS を “全ルートより前” に適用（preflight も自動対応） ──
const allowedOrigins = [
  'https://sense-ai.world',
  'https://www.sense-ai.world',
  'https://sense-website-production.up.railway.app', // ← オフライン(静的+API)の Origin
  'http://localhost:3000' // ← ローカル開発時
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','Accept','X-Requested-With'],
}));
// 追加で全体の OPTIONS を明示的に 204 返し（なくても OK）
app.options('*', cors());



// ★ Flexible Minutes 用プロンプト（外部ファイル）
const { buildFlexibleMessages } = require('./prompts/flexibleprompt');

const qs = require('querystring');

let cachedZoomToken = null;
let cachedZoomTokenExp = 0; // epoch sec


const router = express.Router();


router.post('/exchange', async (req, res) => {
  try {
    const { code, redirectUri /*, state*/ } = req.body || {};
    if (!code || !redirectUri) {
      return res.status(400).json({ error: 'missing code/redirectUri' });
    }

    // （任意）state 検証：authorize 開始時にセッションへ保存しておき、ここで照合する
    // if (state !== req.session?.zoom_oauth_state) {
    //   return res.status(400).json({ error: 'invalid state' });
    // }

    const cid = process.env.ZOOM_CLIENT_ID;
    const secret = process.env.ZOOM_CLIENT_SECRET;
    if (!cid || !secret) {
      return res.status(500).json({ error: 'missing env ZOOM_CLIENT_ID/ZOOM_CLIENT_SECRET' });
    }
    const basic = Buffer.from(`${cid}:${secret}`).toString('base64');

    // Zoom のトークンエンドポイントに Authorization Code を交換（Basic 認証）
    // 要件：grant_type=authorization_code, redirect_uri は “登録値と完全一致”
    const resp = await axios.post(
      'https://zoom.us/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      }),
      {
        headers: {
          'Authorization': `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 15000
      }
    );

    // 返り値例: { access_token, refresh_token, expires_in, token_type, scope ... }
    return res.status(200).json({ ok: true, tokens: resp.data });
  } catch (e) {
    const msg = e.response?.data || e.message;
    return res.status(500).json({ error: 'token_exchange_failed', detail: msg });
  }
});

module.exports = router;

app.use('/api/zoom/oauth', zoomOAuthExchangeRoute); // ← 追加



// 念のため（旧ブラウザ向け/明示）
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
// --- /Security headers ---


/*==============================================
=            Middleware Order                  =
==============================================*/

// ① For Stripe Webhook: Use raw body for /api/stripe (applied before JSON parsing)
app.use('/api/stripe', express.raw({ type: 'application/json' }));

// ② For Apple Webhook: Use raw body for /api/apple/notifications
// Apple Webhook: Now parse JSON
app.use('/api/apple/notifications', express.json());

// ③ For all other endpoints: Parse JSON body
// 🔒 JSONボディを確実に解析しつつ、生データを req._rawBody に保存
app.use(express.json({
  verify: (req, res, buf) => {
    req._rawBody = buf ? buf.toString('utf8') : '';
  },
  limit: '2mb', // 安全に上限明示
}));


app.use('/api/zoom/oauth', zoomOAuthExchangeRoute);

/* Log detailed request information */
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

// Webhook routes (register under /api/stripe to avoid衝突)
app.use('/api/stripe', webhookRouter);
// Apple Webhook route
app.use('/api/apple', appleRouter);

// Zoom Auth route (短命JWT発行：将来 Web Meeting SDK でのJoin用／いまは開発用)
// - エンドポイント: POST /api/zoom/sdk-jwt
// - 注意: 本番では認証＆レート制限を付けること（無制限公開はNG）
app.use('/api', zoomAuthRoute);
app.use('/api/zoom', zoomJoinTokenRoute);

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

// Extend request timeout (e.g., 10 minutes)
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


// Debug endpoint
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

// Detailed request debug logging
app.use((req, res, next) => {
  console.log(`[DEBUG] Request received:
  - Method: ${req.method}
  - Origin: ${req.headers.origin || 'Not set'}
  - Path: ${req.path}
  - Headers: ${JSON.stringify(req.headers, null, 2)}
`);
  next();
});

// ★ multer configuration: Save files to temp directory
const storage = multer.diskStorage({
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
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }
});

// OpenAI API endpoints
const OPENAI_API_ENDPOINT_TRANSCRIPTION = 'https://api.openai.com/v1/audio/transcriptions';
const OPENAI_API_ENDPOINT_CHATGPT = 'https://api.openai.com/v1/chat/completions';

// Stripe initialization
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

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
 * combineMinutes: Calls the ChatGPT API to combine partial meeting minutes.
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

  const data = {
    model: 'gpt-4o-mini',
    temperature: 0,
    max_tokens: 15000,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: combinedText },
    ],
  };

  try {
    const response = await axios.post(OPENAI_API_ENDPOINT_CHATGPT, data, {
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 600000,
    });
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('[ERROR] Failed to call ChatGPT API for combining minutes:', error.response?.data || error.message);
    throw new Error('Failed to combine meeting minutes');
  }
}


/**
 * generateMinutes: Uses ChatGPT API to generate meeting minutes.
 */
// ===== 強制フォーマット検証 =====
function isValidMinutes(out) {
  if (!out) return false;
  // 必須見出しの存在チェック（必要に応じて増やす）
  const must = ["【Meeting Name】", "【Date】", "【Location】", "【Attendees】", "【Agenda(1)】", "【Agenda(2)】", "【Agenda(3)】"];
  return must.every(k => out.includes(k));
}

// ===== 失敗時の整形（ワンリトライ用） =====
async function repairToTemplate(badOutput, template) {
  const systemMessage =
`You are a minutes formatter. Please strictly convert according to the template below.
Be sure to keep each heading in the template (e.g., “【Meeting Name】”) exactly as they are, and only fill in the content.
Unknown items should be written as “—”. Preface, appendix, or explanatory text are prohibited. Output only the template body.

<MINUTES_TEMPLATE>
${template.trim()}
</MINUTES_TEMPLATE>`;

  const data = {
    model: 'gpt-4o-mini',
    temperature: 0,
    max_tokens: 15000,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content:
`Please format this into the template (output only the body).:

<MODEL_OUTPUT>
${badOutput}
</MODEL_OUTPUT>` }
    ]
  };

  const resp = await axios.post(OPENAI_API_ENDPOINT_CHATGPT, data, {
    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    timeout: 600000,
  });
  return resp.data.choices[0].message.content.trim();
}

// ===== 本体：テンプレ厳守で生成 =====
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

  const data = {
    model: 'gpt-4o-mini',
    temperature: 0,
    max_tokens: 15000,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
  };

  try {
    const response = await axios.post(OPENAI_API_ENDPOINT_CHATGPT, data, {
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 600000,
    });
    let out = response.data.choices[0].message.content.trim();

    // バリデーション→NGならワンリトライ（整形）
    if (!isValidMinutes(out)) {
      out = await repairToTemplate(out, template);
    }
    return out;
  } catch (error) {
    console.error('[ERROR] Failed to call ChatGPT API:', error.response?.data || error.message);
    throw new Error('Failed to generate meeting minutes using ChatGPT API');
  }
};


/* ================================
   Flexible Minutes(JSON) 生成系
   ================================ */

// Flexible JSON の簡易検証
function isValidFlexibleJSON(str) {
  try {
    const obj = JSON.parse(str);
    if (!obj) return false;
    const must = ["meetingTitle","date","summary","sections"];
    return must.every(k => Object.prototype.hasOwnProperty.call(obj, k));
  } catch {
    return false;
  }
}

// JSON 修復（ワンリトライ）
async function repairFlexibleJSON(badOutput, langHint) {
  const data = {
    model: 'gpt-4o-mini',
    response_format: { type: "json_object" },
    temperature: 0,
    max_tokens: 15000,
    messages: [
      {
        role: 'system',
        content:
`You repair malformed JSON that should match the schema:
{
  "meetingTitle": "",
  "date": "",
  "summary": "",
  "sections": [
    { "title": "", "topics": [ { "subTitle": "", "details": [] } ] }
  ]
}
Rules: Return JSON only. Do not add comments. Keep keys and order. No trailing commas.`
      },
      {
        role: 'user',
        content:
`Language hint: ${langHint || 'auto'}

Fix this into valid JSON per schema, preserving semantic content:

<MODEL_OUTPUT>
${badOutput}
</MODEL_OUTPUT>`
      }
    ]
  };

  const resp = await axios.post(OPENAI_API_ENDPOINT_CHATGPT, data, {
    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    timeout: 600000,
  });
  return resp.data.choices[0].message.content.trim();
}

// Flexible 本体
async function generateFlexibleMinutes(transcription, langHint) {
  const messages = buildFlexibleMessages({
    transcript: transcription,
    lang: langHint,
    currentDateISO: new Date().toISOString(),
  });

  const data = {
    model: 'gpt-4o-mini',
    response_format: { type: "json_object" },
    temperature: 0,
    max_tokens: 15000,
    messages,
  };

  try {
    const resp = await axios.post(OPENAI_API_ENDPOINT_CHATGPT, data, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 600000,
    });
    let out = resp.data.choices[0].message.content.trim();
    if (!isValidFlexibleJSON(out)) {
      out = await repairFlexibleJSON(out, langHint);
    }
    return out;
  } catch (err) {
    console.error('[ERROR] generateFlexibleMinutes:', err.response?.data || err.message);
    throw new Error('Failed to generate flexible minutes');
  }
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
      
      let chunkPaths = [];
      let tasks = [];
      
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
 * ★ convertToM4A: Converts the input file to m4a (ipod format) if it isn't already.
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

// Health check API for debugging
app.get('/api/health', (req, res) => {
  console.log('[DEBUG] /api/health was accessed');
  res.status(200).json({ status: 'OK', message: 'Health check passed!' });
});

// Simple test endpoints
app.get('/api/hello', (req, res) => {
  res.json({ message: "Hello from backend!" });
});

/* =========================================================================
 * NEW: Zoom 録音Bot起動 API（Joinトークン取得→minutesai-raw に docker exec）
 *      POST /api/recordings/zoom/start
 *      body: { meeting_link: "https://zoom.us/j/xxxx?pwd=....", bypass_waiting_room?: true }
 *      env : ZOOM_OAUTH_TOKEN, SDK_KEY, SDK_SECRET, BOT_CONTAINER_NAME(optional)
 * ========================================================================= */
// ---- SAFE: spawn + stdin 版 ----

async function getZoomAccessToken() {
  const now = Math.floor(Date.now()/1000);
  if (cachedZoomToken && now < cachedZoomTokenExp - 60) {
    return cachedZoomToken;
  }
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId  = process.env.ZOOM_S2S_CLIENT_ID;
  const clientSecret = process.env.ZOOM_S2S_CLIENT_SECRET;
  if (!accountId || !clientId || !clientSecret) {
    throw new Error('Zoom S2S credentials are not set (ZOOM_ACCOUNT_ID/ZOOM_CLIENT_ID/ZOOM_CLIENT_SECRET)');
  }
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const resp = await axios.post(
    'https://zoom.us/oauth/token',
    qs.stringify({ grant_type: 'account_credentials', account_id: accountId }),
    { headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
  );
  // resp.data: { access_token, token_type, expires_in, ... }
  cachedZoomToken = resp.data.access_token;
  cachedZoomTokenExp = now + (resp.data.expires_in || 3600);
  return cachedZoomToken;
}

app.post('/api/recordings/zoom/start', async (req, res) => {
  try {
    const { meeting_link, bypass_waiting_room = true } = req.body || {};
    if (!meeting_link) return res.status(400).json({ error: 'meeting_link is required' });

    const m = /\/j\/(\d+)/.exec(meeting_link);
    if (!m) return res.status(400).json({ error: 'invalid Zoom meeting_link (missing /j/{id})' });
    const meetingId = m[1];

    const accessToken = await getZoomAccessToken();

    // 1) Zoom Join Token
    const apiUrl = `https://api.zoom.us/v2/meetings/${meetingId}/jointoken/local_recording${bypass_waiting_room ? '?bypass_waiting_room=true' : ''}`;
    const z = await axios.get(apiUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    const joinToken = z.data && z.data.token;
    if (!joinToken) return res.status(502).json({ error: 'Failed to fetch join token', details: z.data });

    // 2) minutesai-raw で Bot を起動（spawn + stdin）
    const SDK_KEY  = process.env.ZOOM_SDK_KEY;
    const SDK_SECRET = process.env.ZOOM_SDK_SECRET;
    if (!SDK_KEY || !SDK_SECRET) return res.status(500).json({ error: 'SDK_KEY/SDK_SECRET are not set' });

    const container = process.env.BOT_CONTAINER_NAME || 'minutesai-raw';
    const outWav    = process.env.BOT_OUT_WAV  || '/tmp/mixed.wav';
    const runSecs   = process.env.BOT_RUN_SECS || '180';
    const botName   = process.env.BOT_NAME     || 'MinutesAI Bot';

    // --- スクリプト本文（${} は使わない） ---
    const script = [
      'set -Ee -o pipefail',
      'SDK_KEY="$SDK_KEY"; SDK_SECRET="$SDK_SECRET"',
      'MEETING_NUMBER="$MEETING_NUMBER"; MEETING_PSW="$MEETING_PSW"',
      'JOIN_TOKEN="$JOIN_TOKEN"; BOT_NAME="$BOT_NAME"',
      'OUT_WAV="$OUT_WAV"; RUN_SECS="$RUN_SECS"',
      'if [ -z "$BOT_NAME" ]; then BOT_NAME="MinutesAI Bot"; fi',
      'if [ -z "$OUT_WAV" ]; then OUT_WAV="/tmp/mixed.wav"; fi',
      'if [ -z "$RUN_SECS" ]; then RUN_SECS="180"; fi',
      'if [ -z "$MEETING_PSW" ]; then MEETING_PSW=""; fi',
      '',
      'export DEBIAN_FRONTEND=noninteractive',
      'apt-get update -y',
      'apt-get install -y --no-install-recommends pulseaudio g++ pkg-config libglib2.0-dev python3',
      'pulseaudio --check || pulseaudio -D --exit-idle-time=-1 || true',
      '',
      "cat >/tmp/zoom_join_audio.cpp <<'CPP'",
      '#include <glib.h>',
      '#include <unistd.h>',
      '#include <cstdio>',
      '#include <cstdint>',
      '#include <cstdlib>',
      '#include <string>',
      '#include "zoom_sdk.h"',
      '#include "auth_service_interface.h"',
      '#include "meeting_service_interface.h"',
      '#include "meeting_service_components/meeting_audio_interface.h"',
      '#include "meeting_service_components/meeting_recording_interface.h"',
      '#include "rawdata/rawdata_audio_helper_interface.h"',
      '#include "rawdata/zoom_rawdata_api.h"',
      '#include "zoom_sdk_raw_data_def.h"',
      'using namespace ZOOM_SDK_NAMESPACE;',
      '',
      'static FILE* g_fp=nullptr; static uint64_t g_bytes=0; static int g_rate=0, g_ch=0;',
      'static bool g_sub_ok=false; static bool g_sub_retry_scheduled=false;',
      'static IMeetingService* g_ms=nullptr;',
      '',
      'static void wav_start(const char* path, int rate, int ch){',
      '  g_fp=fopen(path,"wb");',
      '  uint8_t h[44]={\'R\',\'I\',\'F\',\'F\',0,0,0,0,\'W\',\'A\',\'V\',\'E\',\'f\',\'m\',\'t\',\' \',16,0,0,0,1,0,(uint8_t)ch,0,(uint8_t)(rate&0xFF),(uint8_t)((rate>>8)&0xFF),(uint8_t)((rate>>16)&0xFF),(uint8_t)((rate>>24)&0xFF),0,0,0,0,(uint8_t)(ch*2),0,16,0,\'d\',\'a\',\'t\',\'a\',0,0,0,0};',
      '  uint32_t br=rate*ch*2; h[28]=br&0xFF; h[29]=(br>>8)&0xFF; h[30]=(br>>16)&0xFF; h[31]=(br>>24)&0xFF;',
      '  fwrite(h,1,44,g_fp); g_rate=rate; g_ch=ch;',
      '}',
      'static void wav_append(const void* b, unsigned len){ if(g_fp){ fwrite(b,1,len,g_fp); g_bytes+=len; } }',
      'static void wav_close(){ if(!g_fp) return; fseek(g_fp,4,SEEK_SET); uint32_t riff=(uint32_t)(36+g_bytes); fwrite(&riff,4,1,g_fp); fseek(g_fp,40,SEEK_SET); uint32_t dsz=(uint32_t)g_bytes; fwrite(&dsz,4,1,g_fp); fclose(g_fp); g_fp=nullptr; }',
      '',
      'struct AudioDelegate: public IZoomSDKAudioRawDataDelegate{',
      '  void onMixedAudioRawDataReceived(AudioRawData* d) override{',
      '    static bool init=false;',
      '    if(!init){ const char* p=getenv("OUT_WAV"); wav_start(p?p:"/tmp/mixed.wav",(int)d->GetSampleRate(),(int)d->GetChannelNum()); g_printerr("AUDIO_MIXED: start rate=%d ch=%d\\n",(int)d->GetSampleRate(),(int)d->GetChannelNum()); init=true; }',
      '    wav_append(d->GetBuffer(), d->GetBufferLen());',
      '    if(g_rate>0){ double sec=(double)g_bytes/(g_rate*g_ch*2); if(((uint64_t)sec)%3==0 && d->GetBufferLen()>0) g_printerr("AUDIO_MIXED: bytes=%llu (~%.1fs)\\n",(unsigned long long)g_bytes,sec); }',
      '  }',
      '  void onOneWayAudioRawDataReceived(AudioRawData*, uint32_t) override{}',
      '  void onShareAudioRawDataReceived(AudioRawData*, uint32_t) override{}',
      '  void onOneWayInterpreterAudioRawDataReceived(AudioRawData*, const zchar_t*) override{}',
      '} g_audio;',
      '',
      'static gboolean try_subscribe(gpointer){',
      '  if(g_sub_ok) return FALSE;',
      '  if(auto ah=GetAudioRawdataHelper()){ int r=ah->subscribe(&g_audio,true); g_printerr("AUDIO_SUB:%d\\n",r); if(r==0){ g_sub_ok=true; g_printerr("AUDIO_SUB_OK\\n"); return FALSE; } }',
      '  else{ g_printerr("AUDIO_SUB:helper=null\\n"); }',
      '  return TRUE;',
      '}',
      '',
      'struct RecEvents: public IMeetingRecordingCtrlEvent{',
      '  void onRecordingStatus(RecordingStatus s) override{ g_printerr("REC_STATUS:%d\\n",(int)s); }',
      '  void onCloudRecordingStatus(RecordingStatus s) override{ g_printerr("REC_STATUS_CLOUD:%d\\n",(int)s); }',
      '  void onRecordPrivilegeChanged(bool b) override{',
      '    g_printerr("REC_PRIV:%d\\n",(int)b);',
      '    if(b && g_ms){ if(auto rc=g_ms->GetMeetingRecordingController()){ auto er=rc->StartRawRecording(); g_printerr("RAWREC:START_AFTER_PRIV:%d\\n",(int)er); } if(!g_sub_retry_scheduled){ g_sub_retry_scheduled=true; g_timeout_add(500, try_subscribe, nullptr); } }',
      '  }',
      '} g_rec;',
      '',
      'struct MEvent: public IMeetingServiceEvent{',
      '  void onMeetingStatusChanged(MeetingStatus s, int e) override{',
      '    g_printerr("STATUS:%d ERR:%d\\n",(int)s,e);',
      '    if(s==MEETING_STATUS_INMEETING){',
      '      if(auto ac=g_ms->GetMeetingAudioController()){ ac->EnablePlayMeetingAudio(true); ac->JoinVoip(); }',
      '      if(auto rc=g_ms->GetMeetingRecordingController()){ rc->SetEvent(&g_rec); if(rc->CanStartRawRecording()==SDKERR_SUCCESS){ auto er=rc->StartRawRecording(); g_printerr("RAWREC:START:%d\\n",(int)er); } else if(rc->IsSupportRequestLocalRecordingPrivilege()==SDKERR_SUCCESS){ auto er=rc->RequestLocalRecordingPrivilege(); g_printerr("RAWREC:REQ_PRIV:%d\\n",(int)er); } }',
      '      if(!g_sub_retry_scheduled){ g_sub_retry_scheduled=true; g_timeout_add(500, try_subscribe, nullptr); }',
      '    }',
      '    if(s==MEETING_STATUS_ENDED||s==MEETING_STATUS_FAILED){ if(auto ah=GetAudioRawdataHelper()){ ah->unSubscribe(); } wav_close(); _exit(0); }',
      '  }',
      '} g_mevt;',
      '',
      'struct AudioEvents: public IMeetingAudioCtrlEvent{',
      '  void onUserAudioStatusChange(IList<IUserAudioStatus*>*, const zchar_t*) override{ g_printerr("AUDIO_STATUS_CHANGED\\n"); }',
      '} g_ae;',
      '',
      'struct AuthEv: public IAuthServiceEvent{',
      '  GMainLoop* loop=nullptr; int rc=-1;',
      '  void onAuthenticationReturn(AuthResult r) override{ rc=(int)r; if(loop) g_main_loop_quit(loop); }',
      '} g_auth;',
      '',
      'int main(){',
      '  const char* jwt=getenv("SDK_JWT"); if(!jwt||!*jwt){ g_printerr("NO_JWT\\n"); return 2; }',
      '  InitParam p; p.strWebDomain="https://zoom.us"; p.strSupportUrl="https://zoom.us";',
      '  if(InitSDK(p)!=SDKERR_SUCCESS){ g_printerr("INIT_FAIL\\n"); return 3; }',
      '  IAuthService* as=nullptr; if(CreateAuthService(&as)!=SDKERR_SUCCESS||!as){ g_printerr("CREATE_AUTH_FAIL\\n"); return 4; }',
      '  as->SetEvent(&g_auth); g_auth.loop=g_main_loop_new(nullptr,false);',
      '  AuthContext c; c.jwt_token=jwt; as->SDKAuth(c); g_main_loop_run(g_auth.loop);',
      '  if(g_auth.rc!=AUTHRET_SUCCESS){ g_printerr("AUTH_FAIL:%d\\n",g_auth.rc); return 7; }',
      '  if(CreateMeetingService(&g_ms)!=SDKERR_SUCCESS||!g_ms){ g_printerr("CREATE_MS_FAIL\\n"); return 5; }',
      '  g_ms->SetEvent(&g_mevt); if(auto ac=g_ms->GetMeetingAudioController()) ac->SetEvent(&g_ae);',
      '  JoinParam jp; jp.userType=SDK_UT_WITHOUT_LOGIN; JoinParam4WithoutLogin j4={0};',
      '  const char* mnum=getenv("MEETING_NUMBER"); j4.meetingNumber=(UINT64)strtoull(mnum?mnum:"0",nullptr,10);',
      '  std::string uname=getenv("BOT_NAME")?getenv("BOT_NAME"):"bot"; j4.userName=uname.c_str();',
      '  std::string psw=getenv("MEETING_PSW")?getenv("MEETING_PSW"):""; if(!psw.empty()) j4.psw=psw.c_str();',
      '  std::string jtok=getenv("JOIN_TOKEN")?getenv("JOIN_TOKEN"):""; if(!jtok.empty()) j4.join_token=jtok.c_str();',
      '  j4.isVideoOff=true; j4.isAudioOff=false; j4.isMyVoiceInMix=false; j4.eAudioRawdataSamplingRate=AudioRawdataSamplingRate_32K;',
      '  jp.param.withoutloginuserJoin=j4;',
      '  SDKError je=g_ms->Join(jp); g_printerr("JOIN_RC:%d\\n",(int)je);',
      '  GMainLoop* loop=g_main_loop_new(nullptr,false);',
      '  int runsecs=300; const char* rs=getenv("RUN_SECS"); if(rs) runsecs=atoi(rs);',
      '  if(runsecs>0) g_timeout_add_seconds(runsecs,[](gpointer)->gboolean{ if(auto ah=GetAudioRawdataHelper()){ ah->unSubscribe(); } wav_close(); _exit(0); },nullptr);',
      '  g_main_loop_run(loop); return 0;',
      '}',
      'CPP',
      '',
      'g++ -std=c++17 -fPIC -fno-PIE /tmp/zoom_join_audio.cpp -o /tmp/zoom-join \\',
      '  -I/opt/zoom-sdk/h $(pkg-config --cflags --libs glib-2.0) /opt/zoom-sdk/libmeetingsdk.so -Wl,-rpath,/opt/zoom-sdk -Wl,-no-pie',
      '',
      '# SDK_JWT を生成（未指定なら）',
      'if [ -z "$SDK_JWT" ]; then',
      "  SDK_JWT=$(python3 - <<'PY'",
      'import base64,hmac,hashlib,json,time,os',
      'b=lambda x: base64.urlsafe_b64encode(x).rstrip(b"=")',
      'h=b(b\'{"alg":"HS256","typ":"JWT"}\');now=int(time.time());exp=now+3600',
      'p=b(json.dumps({"appKey":os.environ.get("SDK_KEY",""),"iat":now,"exp":exp,"tokenExp":exp},separators=(",",":")).encode())',
      's=b(hmac.new(os.environ.get("SDK_SECRET","").encode(),h+b"."+p,hashlib.sha256).digest())',
      'print((h+b"."+p+b"."+s).decode())',
      'PY',
      '  )',
      'fi',
      '',
      'export SDK_JWT MEETING_NUMBER MEETING_PSW BOT_NAME JOIN_TOKEN OUT_WAV RUN_SECS',
      '/tmp/zoom-join 2>&1 | tee /tmp/zoom-join.log || true',
      'tail -n 150 /tmp/zoom-join.log',
      '[ -f "$OUT_WAV" ] && ls -lh "$OUT_WAV" && head -c 64 "$OUT_WAV" | hexdump -C || true'
    ].join('\n');

    // docker exec 引数。テンプレ文字列を使わない
    const { spawn } = require('child_process'); // 既に宣言済みなら削除OK
    const args = [
      'exec', '-i',
      '--env', `SDK_KEY=${SDK_KEY}`,
      '--env', `SDK_SECRET=${SDK_SECRET}`,
      '--env', `MEETING_NUMBER=${meetingId}`,
      '--env', `JOIN_TOKEN=${joinToken}`,
      '--env', `BOT_NAME=${botName}`,
      '--env', `OUT_WAV=${outWav}`,
      '--env', `RUN_SECS=${runSecs}`,
      container,
      'bash', '-lc', 'bash -s'
    ];

    const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    // スクリプトを stdin へ流し込む
    child.stdin.end(script);

    let out = '', err = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { err += d.toString(); });

    child.on('close', (code) => {
      if (code !== 0) {
        console.error('[ZOOM] bot exit code:', code, err);
        return res.status(500).json({ error: 'Bot exited with error', code, stderr: err, tail: out.slice(-4000) });
      }
      return res.json({
        bot_session_id: `${Date.now()}`,
        meeting_id: meetingId,
        out: out.slice(-4000)
      });
    });

  } catch (err) {
    console.error('[ERROR] /api/recordings/zoom/start:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Internal error', details: err.response?.data || err.message });
  }
});
// ---- /SAFE ----

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
    let cleanupExtra = []; // 変換で作った一時ファイルの削除用

    // ① Whisper への送信方針：
    //    まずはオリジナルのまま送る。失敗した場合のみ m4a へ変換して再送。
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

      // 分割は拡張子に依存せず ffmpeg で行う（既存の splitAudioFile を使用）
      const chunkPaths = await splitAudioFile(tempFilePath, TRANSCRIPTION_CHUNK_THRESHOLD);
      console.log(`[DEBUG] Number of generated chunks: ${chunkPaths.length}`);

      // 可能ならまずは“そのまま”で並列文字起こし
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

      // チャンクの後片付け
      for (const chunkPath of chunkPaths) {
        try {
          fs.unlinkSync(chunkPath);
          console.log(`[DEBUG] Deleted chunk file: ${chunkPath}`);
        } catch (err) {
          console.error(`[ERROR] Failed to delete chunk file: ${chunkPath}`, err);
        }
      }
    }

    // ② 議事録生成（Flexible が既定。Classic はテンプレ使用）
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


// Debug GET/POST endpoints
app.get('/api/transcribe', (req, res) => {
  res.status(200).json({ message: 'GET /api/transcribe is working!' });
});
app.post('/api/transcribe', (req, res) => {
  res.status(200).json({ message: 'POST /api/transcribe is working!' });
});


// Stripe Checkout Session creation endpoint
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { productId, userId } = req.body;
    console.log("✅ Received productId:", productId);
    console.log("✅ Received userId:", userId);

    const PRICE_MAP = {
      [process.env.STRIPE_PRODUCT_UNLIMITED]: process.env.STRIPE_PRICE_UNLIMITED,
      [process.env.STRIPE_PRODUCT_120MIN]: process.env.STRIPE_PRICE_120MIN,
      [process.env.STRIPE_PRODUCT_1200MIN]: process.env.STRIPE_PRICE_1200MIN,
      [process.env.REACT_APP_STRIPE_PRODUCT_YEARLY_UNLIMITED]: process.env.REACT_APP_STRIPE_PRICE_YEARLY_UNLIMITED
    };

    const priceId = PRICE_MAP[productId];
    if (!priceId) {
      console.error("❌ Invalid productId:", productId);
      return res.status(400).json({ error: "Invalid productId" });
    }

    // サブスクリプションか一回払いかでモードを決定
    const mode = (productId === process.env.STRIPE_PRODUCT_UNLIMITED ||
                  productId === process.env.REACT_APP_STRIPE_PRODUCT_YEARLY_UNLIMITED)
                  ? 'subscription'
                  : 'payment';

    // payment モードの場合は、あらかじめ顧客を作成しておく
    let customer;
    if (mode === 'payment') {
      customer = await stripe.customers.create({
        metadata: { userId }
      });
    }

    // Checkout Session のパラメータ作成
    const sessionParams = {
      payment_method_types: ['card'],
      mode: mode,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      metadata: {
        product_id: productId,
        userId: userId
      },
      success_url: 'https://sense-ai.world/success',
      cancel_url: 'https://sense-ai.world/cancel',
    };

    // 顧客情報があればセッションに渡す
    if (customer) {
      sessionParams.customer = customer.id;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log("✅ Checkout URL:", session.url);
    res.json({ url: session.url });
  } catch (error) {
    console.error('[ERROR] /api/create-checkout-session:', error);
    res.status(500).json({ error: 'Failed to create checkout session', details: error.message });
  }
});

// Stripe サブスクリプションID取得用エンドポイント
app.post('/api/get-subscription-id', async (req, res) => {
  console.log("✅ hit /api/get-subscription-id");
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const customers = await stripe.customers.list({ limit: 100 });
    const customer = customers.data.find(c => c.metadata.userId === userId);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found for this userId' });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
    });

    if (!subscriptions.data.length) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const subscriptionId = subscriptions.data[0].id;
    console.log(`✅ Subscription ID found for userId=${userId}: ${subscriptionId}`);
    return res.status(200).json({ subscriptionId });
  } catch (error) {
    console.error('[ERROR] /api/get-subscription-id:', error);
    return res.status(500).json({ error: 'Failed to fetch subscription ID', details: error.message });
  }
});

// Stripe サブスクリプション解約用エンドポイント
app.post('/api/cancel-subscription', async (req, res) => {
  const { subscriptionId } = req.body;

  if (!subscriptionId) {
    return res.status(400).json({ error: 'Missing subscriptionId' });
  }

  try {
    const canceled = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    console.log(`✅ 解約予約完了: subscriptionId=${subscriptionId}`);
    return res.status(200).json({
      message: 'Subscription cancellation scheduled at period end',
      current_period_end: new Date(canceled.current_period_end * 1000),
    });
  } catch (error) {
    console.error('[ERROR] 解約API:', error);
    return res.status(500).json({ error: 'Failed to cancel subscription', details: error.message });
  }
});

// --- Zoom OAuth callback: return HTTP 200 "Connected" (NO app-login here) ---
app.get('/zoom/oauth/callback', async (req, res) => {
  const { code, state } = req.query || {};
  if (!code) return res.status(400).send('Missing code');

  try {
    const cid = process.env.ZOOM_CLIENT_ID;
    const secret = process.env.ZOOM_CLIENT_SECRET;
    if (!cid || !secret) return res.status(500).send('Missing Zoom client credentials');

    // Zoomコンソールの「Redirect URL for OAuth（Production）」と 完全一致 させる
    // 例：Homeが www 側なら www に寄せる（wwwを使わない運用なら下行を非wwwに変えてください）
    const redirectUri = 'https://www.sense-ai.world/zoom/oauth/callback';

    const basic = Buffer.from(`${cid}:${secret}`).toString('base64');
    const tokenResp = await axios.post(
      'https://zoom.us/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      }),
      {
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 15000
      }
    );

    // （審査用はここで十分：成功を“その場で”見せる。保存/ログイン誘導はしない）
    res.status(200).send(`<!doctype html><meta charset="utf-8">
<title>Connected to Zoom</title>
<body style="font-family: system-ui; margin: 40px;">
  <h1>Connected to Zoom ✓</h1>
  <p>Authorization completed successfully.</p>
  <p><a href="/zoom/app">Continue</a></p>
</body>`);
  } catch (e) {
    console.error('[ZOOM] token exchange failed:', e.response?.data || e.message);
    res.status(500).send('Zoom authorization failed. Please try again.');
  }
});



// Serve static files for the frontend
const staticPath = path.join(__dirname, 'frontend/build');
console.log(`[DEBUG] Static files served from: ${staticPath}`);
app.use(express.static(staticPath));

// Undefined API routes return a 404 error
app.use('/api', (req, res, next) => {
  res.status(404).json({ error: 'API route not found' });
});

// Handle React routes (e.g., /success)
app.get(["/success", "/cancel"], (req, res) => {
  res.sendFile(path.join(staticPath, "index.html"));
});
app.get('*', (req, res) => {
  console.log(`[DEBUG] Redirecting ${req.url} to index.html`);
  res.sendFile(path.join(staticPath, "index.html"));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[GLOBAL ERROR HANDLER]', err);
  const origin = req.headers.origin && allowedOrigins.includes(req.headers.origin) ? req.headers.origin : '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(err.status || 500);
  res.json({ error: err.message || 'Internal Server Error' });
});

// Start the server
const PORT = process.env.PORT || 5001;
console.log(`[DEBUG] API Key loaded: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
app.listen(PORT, () => {
  console.log(`[DEBUG] Server started on port ${PORT}`);
});

module.exports = app;
