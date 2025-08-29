require('dotenv').config();
console.log("✅ STRIPE_SECRET_KEY:", process.env.STRIPE_SECRET_KEY ? "Loaded" : "Not found");
console.log("✅ STRIPE_PRICE_UNLIMITED:", process.env.STRIPE_PRICE_UNLIMITED ? "Loaded" : "Not found");

const zoomAuthRoute = require('./routes/zoomAuthRoute');
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath('ffmpeg');
ffmpeg.setFfprobePath('ffprobe');
console.log("[DEBUG] ffmpeg path set to 'ffmpeg'");
console.log("[DEBUG] ffprobe path set to 'ffprobe'");

const cors = require('cors');
const FormData = require('form-data');
const Stripe = require('stripe');
// ※ webhookRouter の登録パスを /api/stripe に変更
const webhookRouter = require('./routes/webhook');
const appleRouter = require('./routes/apple'); // Apple route added
const app = express();

// ★ Flexible Minutes 用プロンプト（外部ファイル）
const { buildFlexibleMessages } = require('./prompts/flexibleprompt');

/*==============================================
=            Middleware Order                  =
==============================================*/

// ① For Stripe Webhook: Use raw body for /api/stripe (applied before JSON parsing)
app.use('/api/stripe', express.raw({ type: 'application/json' }));

// ② For Apple Webhook: Use raw body for /api/apple/notifications
// Apple Webhook: Now parse JSON
app.use('/api/apple/notifications', express.json());

// ③ For all other endpoints: Parse JSON body
app.use(express.json());

/* Log detailed request information */
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.url}`);
  console.log(`[DEBUG] Headers: ${JSON.stringify(req.headers)}`);
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

// Define allowed origins
const allowedOrigins = ['https://sense-ai.world', 'https://www.sense-ai.world'];

// CORS settings
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`[CORS ERROR] Disallowed origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: true
};
app.use(cors(corsOptions));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Handle OPTIONS method
app.options('*', (req, res) => {
  console.log('[DEBUG] Received preflight request:', req.headers);
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204);
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
`以下は同一会議の分割議事録です。重複や矛盾を統合し、**次のテンプレート**に正規化してください。
・テンプレの見出しはそのまま。未知は『—』
・前置き・後置きなし。本文のみ

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
`あなたは議事録のフォーマッタです。以下のテンプレートに厳密に従って変換してください。
必ずテンプレートの各見出し（例：『【Meeting Name】』）をそのまま残し、内容だけを埋めます。
未知の項目は『—』と記入。前置き・後置き・説明文は出力禁止。出力はテンプレート本文だけ。

<MINUTES_TEMPLATE>
${template.trim()}
</MINUTES_TEMPLATE>`;

  const data = {
    model: 'gpt-4o-mini',
    temperature: 0,
    max_tokens: 3000,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content:
`これをテンプレートに整形してください（本文のみを出力）:

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
`あなたはプロの議事録作成アシスタントです。以下の厳格なルールに従い、日本語で出力してください。
・出力は **次のテンプレート本文のみ**。前置き・後置き・挨拶・説明文は一切禁止
・見出し（『【…】』、『⚫︎』記号、(1)(2)(3) 等）を **一字一句** 変えずに残す
・不明点は『—』と記入（例：日時が不明→『【Date】—』）
・議題は最低3つ（テンプレにある分）を必ず埋める。内容が薄くても『—』で可
・数値等の定量情報は可能な限り保持
・本文は日本語（テンプレ中の英語ラベルはそのまま）

テンプレートは以下です。これを**丸ごと**出力枠として使い、各項目を埋めて返してください。

<MINUTES_TEMPLATE>
${template}
</MINUTES_TEMPLATE>`;

  const userMessage =
`以下は会議の文字起こしです。テンプレートに従って要約・整形してください。
<TRANSCRIPT>
${transcription}
</TRANSCRIPT>`;

  const data = {
    model: 'gpt-4o-mini',
    temperature: 0,
    max_tokens: 3000,
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
    max_tokens: 3500,
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
    max_tokens: 6000,
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

/**
 * /api/transcribe endpoint
 * [Processing Flow]
 * ① Check the format of the received file. If the extension is not .m4a or the mimetype is "audio/mp4", convert it using convertToM4A.
 * ② Depending on the file size, perform transcription in one batch or via chunk processing.
 * ③ If the resulting transcription is 10,000 characters or less, generate meeting minutes directly;
 *     if it exceeds 10,000 characters, split the text using splitText(), generate minutes for each part, and then combine them using combineMinutes().
 */
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
    console.log(`[DEBUG] Received meetingFormat: ${meetingFormat}`);

    // ★ Flexible / Classic 切替（追加）
    // これに変更（既定を flexible に）
const outputType = (req.body.outputType || 'flexible').toLowerCase();
    const langHint   = req.body.lang || null;
    console.log(`[DEBUG] outputType=${outputType}, lang=${langHint}`);
  
    // The uploaded file is already saved in temp/
    let tempFilePath = file.path;
    
    // ★ File format check: If the extension is not .m4a or mimetype is "audio/mp4", perform conversion.
    if (path.extname(tempFilePath).toLowerCase() !== '.m4a' || file.mimetype === 'audio/mp4') {
      console.log('[DEBUG] Input file is not m4a or mimetype is audio/mp4. Starting conversion.');
      tempFilePath = await convertToM4A(tempFilePath);
      console.log('[DEBUG] File path after conversion:', tempFilePath);
    }
  
    let transcription = "";
    let minutes = "";
  
    // ① Transcription process based on file size
    if (file.size <= TRANSCRIPTION_CHUNK_THRESHOLD) {
      console.log('[DEBUG] File size is below threshold; processing in one batch');
      transcription = await transcribeWithOpenAI(tempFilePath);
      transcription = transcription.trim();
    } else {
      console.log('[DEBUG] File size exceeds threshold; processing by splitting into chunks');
      const chunkPaths = await splitAudioFile(tempFilePath, TRANSCRIPTION_CHUNK_THRESHOLD);
      console.log(`[DEBUG] Number of generated chunks: ${chunkPaths.length}`);
      
      // Process transcription for each chunk in parallel
      const transcriptionChunks = await Promise.all(
        chunkPaths.map(chunkPath => transcribeWithOpenAI(chunkPath))
      );
      transcription = transcriptionChunks.join(" ").trim();
      
      // Delete chunk files
      for (const chunkPath of chunkPaths) {
        try {
          fs.unlinkSync(chunkPath);
          console.log(`[DEBUG] Deleted chunk file: ${chunkPath}`);
        } catch (err) {
          console.error(`[ERROR] Failed to delete chunk file: ${chunkPath}`, err);
        }
      }
    }
  
    // ② If the transcription is 10,000 characters or less, generate minutes directly.
    //     If it exceeds 10,000 characters, split the text and combine the generated minutes.
    if (transcription.length <= 10000) {
      if (outputType === 'flexible') {
        minutes = await generateFlexibleMinutes(transcription, langHint);
      } else {
        minutes = await generateMinutes(transcription, meetingFormat);
      }
    } else {
      console.log('[DEBUG] Transcription exceeds 10,000 characters; processing for output type');
      if (outputType === 'flexible') {
        // Flexible は単発生成（まずはシンプル運用）
        minutes = await generateFlexibleMinutes(transcription, langHint);
      } else {
        const textChunks = splitText(transcription, 10000);
        const partialMinutes = await Promise.all(
          textChunks.map(chunk => generateMinutes(chunk.trim(), meetingFormat))
        );
        const combinedPartialMinutes = partialMinutes.join("\n\n");
        minutes = await combineMinutes(combinedPartialMinutes, meetingFormat);
      }
    }
  
    // Delete the original temporary file
    try {
      fs.unlinkSync(file.path);
      console.log('[DEBUG] Deleted original temporary file:', file.path);
    } catch (err) {
      console.error('[ERROR] Failed to delete temporary file:', file.path, err);
    }
  
    console.log('[DEBUG] Final transcription result:', transcription);
    console.log('[DEBUG] Final meeting minutes result:', minutes);
  
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
