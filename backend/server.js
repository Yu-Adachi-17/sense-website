require('dotenv').config();
console.log("✅ STRIPE_SECRET_KEY:", process.env.STRIPE_SECRET_KEY ? "Loaded" : "Not found");
console.log("✅ STRIPE_PRICE_UNLIMITED:", process.env.STRIPE_PRICE_UNLIMITED ? "Loaded" : "Not found");

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
const webhookRouter = require('./routes/webhook');
const appleRouter = require('./routes/apple'); // ✅ Apple ルート追加
const app = express();

/*==============================================
=            ミドルウェアの適用順序            =
==============================================*/

// ① Stripe Webhook 用: /api/stripe は raw body を利用する（JSON パース前に適用）
app.use('/api/stripe', express.raw({ type: 'application/json' }));

// ② Apple Webhook 用: /api/apple/notifications は raw body を利用する
app.use('/api/apple/notifications', express.raw({ type: 'application/json' }));

// ③ その他のエンドポイント用: JSON ボディのパース
app.use(express.json());

/*==============================================
=            ルーターの登録                     =
==============================================*/

// Webhook ルート（Stripe 関連を含む）
app.use('/api', webhookRouter);
// Apple Webhook のルート
app.use('/api/apple', appleRouter);

/*==============================================
=            その他のミドルウェア              =
==============================================*/

// ★ リクエストタイムアウトを延長（例：10分）
app.use((req, res, next) => {
  req.setTimeout(600000, () => {
    console.error('リクエストがタイムアウトしました。');
    res.set({
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true'
    });
    res.status(503).send('Service Unavailable: request timed out.');
  });
  next();
});

// ✅ 許可するオリジンの定義
const allowedOrigins = ['https://sense-ai.world', 'https://www.sense-ai.world'];

// ✅ CORS 設定
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`[CORS ERROR] 許可されていないオリジン: ${origin}`);
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

// ✅ OPTIONS メソッドへの対応
app.options('*', (req, res) => {
  console.log('[DEBUG] プリフライトリクエストを受信:', req.headers);
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204);
});

// ------------- デバッグ用エンドポイント -------------
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

// リクエスト詳細のデバッグログ
app.use((req, res, next) => {
  console.log(`[DEBUG] リクエスト受信:
  - メソッド: ${req.method}
  - オリジン: ${req.headers.origin || '未設定'}
  - パス: ${req.path}
  - ヘッダー: ${JSON.stringify(req.headers, null, 2)}
`);
  next();
});

// ★ multer の設定：temp ディレクトリに保存
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log('[DEBUG] 一時保存ディレクトリを作成:', tempDir);
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

// ✅ OpenAI API エンドポイント
const OPENAI_API_ENDPOINT_TRANSCRIPTION = 'https://api.openai.com/v1/audio/transcriptions';
const OPENAI_API_ENDPOINT_CHATGPT = 'https://api.openai.com/v1/chat/completions';

// ✅ Stripe の初期化
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * splitText: テキストを指定文字数ごとに分割する
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
 * combineMinutes: 部分議事録を統合するため、ChatGPT API を呼び出す
 */
async function combineMinutes(combinedText, meetingFormat) {
  const systemMessage = meetingFormat
    ? `以下は部分議事録です。これらを統合し、最終的な議事録を生成してください。`
    : 'あなたは優秀な議事録作成アシスタントです。以下の部分議事録を統合してください。';

  const data = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: combinedText },
    ],
    max_tokens: 15000,
    temperature: 0.5,
  };

  try {
    console.log('[DEBUG] ChatGPT API (統合用) に送信するデータ:', data);
    const response = await axios.post(OPENAI_API_ENDPOINT_CHATGPT, data, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 600000,
    });
    console.log('[DEBUG] 統合用 ChatGPT API の応答:', response.data);
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('[ERROR] 議事録統合 API 呼び出しに失敗:', error.response?.data || error.message);
    throw new Error('議事録統合に失敗しました');
  }
}

/**
 * generateMinutes: ChatGPT API を使用して議事録生成
 */
const generateMinutes = async (transcription, formatTemplate) => {
  const systemMessage = formatTemplate ||
    'あなたは優秀な議事録作成アシスタントです。以下のテキストを基に議事録を作成してください。';
    
  const data = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: transcription },
    ],
    max_tokens: 15000,
    temperature: 0.5,
  };
    
  try {
    console.log('[DEBUG] ChatGPT API に送信するデータ:', data);
    const response = await axios.post(OPENAI_API_ENDPOINT_CHATGPT, data, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 600000,
    });
    console.log('[DEBUG] ChatGPT API の応答:', response.data);
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('[ERROR] ChatGPT API の呼び出しに失敗:', error.response?.data || error.message);
    throw new Error('ChatGPT API による議事録生成に失敗しました');
  }
};

/**
 * transcribeWithOpenAI: Whisper API を使用して文字起こし
 */
const transcribeWithOpenAI = async (filePath) => {
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('model', 'whisper-1');

    console.log(`[DEBUG] Whisper API に送信するファイル: ${filePath}`);

    const response = await axios.post(OPENAI_API_ENDPOINT_TRANSCRIPTION, formData, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
      timeout: 600000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    console.log('[DEBUG] Whisper API の応答:', response.data);
    return response.data.text;
  } catch (error) {
    console.error('[ERROR] Whisper API の呼び出しに失敗:', error.response?.data || error.message);
    throw new Error('Whisper API による文字起こしに失敗しました');
  }
};

// ✅ チャンク分割用の定数（1MB 以下なら一括処理）
const TRANSCRIPTION_CHUNK_THRESHOLD = 1 * 1024 * 1024; // 1MB in bytes

/**
 * splitAudioFile: ffmpeg を使用して音声ファイルをチャンク分割する
 */
const splitAudioFile = (filePath, maxFileSize) => {
  return new Promise((resolve, reject) => {
    console.log('[DEBUG] ffprobe を実行中:', filePath);
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('[ERROR] ffprobe エラー:', err);
        return reject(err);
      }
      if (!metadata || !metadata.format) {
        const errMsg = 'ffprobe が有効なメタデータを返しませんでした';
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
        console.warn('[WARN] 有効な duration が見つかりませんでした。デフォルト値 60秒 を使用します。');
        duration = 60;
      }
      
      const fileSize = fs.statSync(filePath).size;
      console.log('[DEBUG] ffprobe 結果 - duration:', duration, '秒, fileSize:', fileSize, 'bytes');
      
      if (fileSize <= maxFileSize) {
        console.log('[DEBUG] ファイルサイズが閾値以下のため、分割せずそのまま返します');
        return resolve([filePath]);
      }
      
      let chunkDuration = duration * (maxFileSize / fileSize);
      if (chunkDuration < 5) chunkDuration = 5;
      const numChunks = Math.ceil(duration / chunkDuration);
      
      console.log(`[DEBUG] チャンク分割開始: chunkDuration=${chunkDuration}秒, numChunks=${numChunks}`);
      
      let chunkPaths = [];
      let tasks = [];
      
      for (let i = 0; i < numChunks; i++) {
        const startTime = i * chunkDuration;
        const outputPath = path.join(path.dirname(filePath), `${Date.now()}_chunk_${i}.m4a`);
        chunkPaths.push(outputPath);
        console.log(`[DEBUG] チャンク ${i + 1}: startTime=${startTime}秒, outputPath=${outputPath}`);
        
        tasks.push(new Promise((resolveTask, rejectTask) => {
          ffmpeg(filePath)
            .setStartTime(startTime)
            .setDuration(chunkDuration)
            .output(outputPath)
            .on('end', () => {
              console.log(`[DEBUG] チャンク ${i + 1}/${numChunks} のエクスポート完了: ${outputPath}`);
              resolveTask();
            })
            .on('error', (err) => {
              console.error(`[ERROR] チャンク ${i + 1} のエクスポート失敗:`, err);
              rejectTask(err);
            })
            .run();
        }));
      }
      
      Promise.all(tasks)
        .then(() => {
          console.log('[DEBUG] 全チャンクのエクスポートが完了しました');
          resolve(chunkPaths);
        })
        .catch((err) => {
          console.error('[ERROR] チャンク生成中にエラーが発生:', err);
          reject(err);
        });
    });
  });
};

/**
 * ★ convertToM4A: 入力ファイルが m4a でない場合、ffmpeg を使用して m4a（ipod フォーマット）に変換する
 */
const convertToM4A = async (inputFilePath) => {
  return new Promise((resolve, reject) => {
    const outputFilePath = path.join(path.dirname(inputFilePath), `${Date.now()}_converted.m4a`);
    console.log(`[DEBUG] convertToM4A: 入力ファイル ${inputFilePath} を ${outputFilePath} に変換します`);
    ffmpeg(inputFilePath)
      .toFormat('ipod') // ipod フォーマットは m4a と同等
      .on('end', () => {
         console.log(`[DEBUG] ファイル変換完了: ${outputFilePath}`);
         resolve(outputFilePath);
      })
      .on('error', (err) => {
         console.error('[ERROR] ファイル変換失敗:', err);
         reject(err);
      })
      .save(outputFilePath);
  });
};

// ✅ デバッグ用ヘルスチェック API
app.get('/api/health', (req, res) => {
  console.log('[DEBUG] /api/health がアクセスされました');
  res.status(200).json({ status: 'OK', message: 'Health check passed!' });
});

// ✅ シンプルなテストエンドポイント
app.get('/api/hello', (req, res) => {
  res.json({ message: "Hello from backend!" });
});

/**
 * /api/transcribe エンドポイント
 * 【処理の流れ】
 * ① 受信ファイルの形式をチェックし、拡張子が .m4a でない、または mimetype が "audio/mp4" の場合は convertToM4A で変換
 * ② ファイルサイズに応じ、一括またはチャンク処理で文字起こし実施
 * ③ 得られた文字起こし結果が 10,000 文字以下ならそのまま議事録生成、
 *     10,000 文字超の場合は splitText() で分割後、各部分で生成し、combineMinutes() で統合
 */
app.post('/api/transcribe', upload.single('file'), async (req, res) => {
  console.log('[DEBUG] /api/transcribe が呼び出されました');
  
  try {
    const file = req.file;
    if (!file) {
      console.error('[ERROR] ファイルがアップロードされていません');
      return res.status(400).json({ error: 'ファイルがアップロードされていません' });
    }
    
    console.log('[DEBUG] multer により保存されたファイル:', file.path);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    console.log(`[DEBUG] アップロードされたファイルサイズ: ${fileSizeMB} MB`);
  
    const meetingFormat = req.body.meetingFormat;
    console.log(`[DEBUG] 受信した meetingFormat: ${meetingFormat}`);
  
    // アップロードされたファイルは既に temp/ に保存されている
    let tempFilePath = file.path;
    
    // ★ ファイル形式チェック：拡張子が .m4a でない、または mimetype が "audio/mp4" の場合は変換を実施
    if (path.extname(tempFilePath).toLowerCase() !== '.m4a' || file.mimetype === 'audio/mp4') {
      console.log('[DEBUG] 入力ファイルは m4a ではないか、mimetype が audio/mp4 です。変換を開始します。');
      tempFilePath = await convertToM4A(tempFilePath);
      console.log('[DEBUG] 変換後のファイルパス:', tempFilePath);
    }
  
    let transcription = "";
    let minutes = "";
  
    // ① 音声ファイルの文字起こし処理（ファイルサイズで分岐）
    if (file.size <= TRANSCRIPTION_CHUNK_THRESHOLD) {
      console.log('[DEBUG] ファイルサイズが閾値以下のため、一括処理します');
      transcription = await transcribeWithOpenAI(tempFilePath);
      transcription = transcription.trim();
    } else {
      console.log('[DEBUG] ファイルサイズが閾値を超えているため、チャンク分割して処理します');
      const chunkPaths = await splitAudioFile(tempFilePath, TRANSCRIPTION_CHUNK_THRESHOLD);
      console.log(`[DEBUG] 生成されたチャンク数: ${chunkPaths.length}`);
      
      // 各チャンクの文字起こしを並列処理
      const transcriptionChunks = await Promise.all(
        chunkPaths.map(chunkPath => transcribeWithOpenAI(chunkPath))
      );
      transcription = transcriptionChunks.join(" ").trim();
      
      // チャンクファイルの削除
      for (const chunkPath of chunkPaths) {
        try {
          fs.unlinkSync(chunkPath);
          console.log(`[DEBUG] チャンクファイル削除: ${chunkPath}`);
        } catch (err) {
          console.error(`[ERROR] チャンクファイル削除失敗: ${chunkPath}`, err);
        }
      }
    }
  
    // ② 文字起こし結果が 10,000 文字以下ならそのまま議事録生成、
    //     10,000 文字超の場合は splitText() で分割後、各部分で生成し、combineMinutes() で統合
    if (transcription.length <= 10000) {
      minutes = await generateMinutes(transcription, meetingFormat);
    } else {
      console.log('[DEBUG] 文字起こし結果が 10,000 文字超のため、テキスト分割して議事録生成します');
      const textChunks = splitText(transcription, 10000);
      const partialMinutes = await Promise.all(
        textChunks.map(chunk => generateMinutes(chunk.trim(), meetingFormat))
      );
      const combinedPartialMinutes = partialMinutes.join("\n\n");
      minutes = await combineMinutes(combinedPartialMinutes, meetingFormat);
    }
  
    // 一時ファイル（アップロードされた元ファイル）の削除
    try {
      fs.unlinkSync(file.path);
      console.log('[DEBUG] 元の一時ファイル削除:', file.path);
    } catch (err) {
      console.error('[ERROR] 一時ファイル削除失敗:', file.path, err);
    }
  
    console.log('[DEBUG] 最終的な文字起こし結果:', transcription);
    console.log('[DEBUG] 最終的な議事録生成結果:', minutes);
  
    return res.json({ transcription: transcription.trim(), minutes });
  } catch (err) {
    console.error('[ERROR] /api/transcribe 内部エラー:', err);
    return res.status(500).json({ error: 'サーバー内部エラー', details: err.message });
  }
});

// ✅ デバッグ用の GET/POST エンドポイント
app.get('/api/transcribe', (req, res) => {
  res.status(200).json({ message: 'GET /api/transcribe is working!' });
});
app.post('/api/transcribe', (req, res) => {
  res.status(200).json({ message: 'POST /api/transcribe is working!' });
});

// ✅ Stripe Checkout Session 作成エンドポイント
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { productId, userId } = req.body;
    console.log("✅ 受信した productId:", productId);
    console.log("✅ 受信した userId:", userId);

    const PRICE_MAP = {
      [process.env.STRIPE_PRODUCT_UNLIMITED]: process.env.STRIPE_PRICE_UNLIMITED,
      [process.env.STRIPE_PRODUCT_120MIN]: process.env.STRIPE_PRICE_120MIN,
      [process.env.STRIPE_PRODUCT_1200MIN]: process.env.STRIPE_PRICE_1200MIN,
      [process.env.REACT_APP_STRIPE_PRODUCT_YEARLY_UNLIMITED]: process.env.REACT_APP_STRIPE_PRICE_YEARLY_UNLIMITED
    };

    const priceId = PRICE_MAP[productId];
    if (!priceId) {
      console.error("❌ 無効な productId:", productId);
      return res.status(400).json({ error: "Invalid productId" });
    }
    const mode = (productId === process.env.STRIPE_PRODUCT_UNLIMITED ||
                  productId === process.env.REACT_APP_STRIPE_PRODUCT_YEARLY_UNLIMITED)
                  ? 'subscription'
                  : 'payment';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: mode,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      client_reference_id: userId,
      metadata: {
        product_id: productId
      },
      success_url: 'https://sense-ai.world/success',
      cancel_url: 'https://sense-ai.world/cancel',
    });
    console.log("✅ Checkout URL:", session.url);
    res.json({ url: session.url });
  } catch (error) {
    console.error('[ERROR] /api/create-checkout-session:', error);
    res.status(500).json({ error: 'Checkoutセッションの作成に失敗しました', details: error.message });
  }
});

// ✅ フロントエンドの静的ファイルの提供
const staticPath = path.join(__dirname, 'frontend/build');
console.log(`[DEBUG] Static files served from: ${staticPath}`);
app.use(express.static(staticPath));

// ✅ 未定義の API ルートは 404 エラーを返す
app.use('/api', (req, res, next) => {
  res.status(404).json({ error: 'API route not found' });
});

// ✅ React のルート (/success など) のハンドリング
app.get(["/success", "/cancel"], (req, res) => {
  res.sendFile(path.join(staticPath, "index.html"));
});
app.get('*', (req, res) => {
  console.log(`[DEBUG] Redirecting ${req.url} to index.html`);
  res.sendFile(path.join(staticPath, "index.html"));
});

// ✅ グローバルエラーハンドラー
app.use((err, req, res, next) => {
  console.error('[GLOBAL ERROR HANDLER]', err);
  const origin = req.headers.origin && allowedOrigins.includes(req.headers.origin) ? req.headers.origin : '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(err.status || 500);
  res.json({ error: err.message || 'Internal Server Error' });
});

// ✅ サーバーの起動
const PORT = process.env.PORT || 5001;
console.log(`[DEBUG] API Key loaded: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
app.listen(PORT, () => {
  console.log(`[DEBUG] サーバーがポート ${PORT} で起動しました`);
});

module.exports = app;
