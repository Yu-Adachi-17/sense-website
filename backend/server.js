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
const app = express();

// ★ リクエストタイムアウトを延長（例：10分）
app.use((req, res, next) => {
  req.setTimeout(600000, () => {
    console.error('リクエストがタイムアウトしました。');
    // タイムアウト時も CORS ヘッダーを付与
    res.set({
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true'
    });
    res.status(503).send('Service Unavailable: request timed out.');
  });
  next();
});

// ✅ Webhook 用ルートの登録
app.use('/api', webhookRouter);

// ✅ JSON リクエストのパース
app.use(express.json());

// ✅ 許可するオリジンの定義
const allowedOrigins = ['https://sense-ai.world', 'https://www.sense-ai.world'];

// ✅ CORS 設定（エラーレスポンスでもヘッダーが付くように注意）
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

// ✅ OPTIONS メソッド（プリフライトリクエスト）への対応
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

// ------------- ここからデバッグ用エンドポイントの追加 -------------
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
// ------------- ここまでデバッグ用エンドポイントの追加 -------------

// ✅ リクエスト詳細のデバッグログ
app.use((req, res, next) => {
  console.log(`[DEBUG] リクエスト受信:
  - メソッド: ${req.method}
  - オリジン: ${req.headers.origin || '未設定'}
  - パス: ${req.path}
  - ヘッダー: ${JSON.stringify(req.headers, null, 2)}
`);
  next();
});

// ★ multer の設定：diskStorage を利用して temp ディレクトリに保存
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
    // タイムスタンプ付きで保存
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

// ✅ ChatGPT を使用して議事録を生成する関数
const generateMinutes = async (transcription, formatTemplate) => {
    const systemMessage = formatTemplate || 'あなたは優秀な議事録作成アシスタントです。以下のテキストを基に議事録を作成してください。';
    
    const data = {
      // モデル名を GPT-4o mini に変更
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: transcription },
      ],
      // GPT-4o mini の最大出力トークン数（16,384）に修正
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
        timeout: 600000, // 10分
      });
      console.log('[DEBUG] ChatGPT API の応答:', response.data);
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('[ERROR] ChatGPT API の呼び出しに失敗:', error.response?.data || error.message);
      throw new Error('ChatGPT API による議事録生成に失敗しました');
    }
  };
  

// ✅ Whisper API を使用して文字起こしを行う関数
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

// ✅ チャンク分割用の定数（4.5MB）
const TRANSCRIPTION_CHUNK_THRESHOLD = 1 * 1024 * 1024; // 4.5MB in bytes

/**
 * ffmpeg を使用して音声ファイルをチャンクに分割する関数  
 * ffprobe の結果や各チャンクのパラメータをログ出力します。
 * @param {string} filePath - 分割対象のファイルパス
 * @param {number} maxFileSize - チャンクあたりの最大バイト数
 * @returns {Promise<string[]>} - 分割後のチャンクファイルパスの配列
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
      
      // duration を数値として取得。もし metadata.format.duration が無効な場合は
      // streams から取得、またはフォールバック値を設定する
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
      
      // ファイルサイズが閾値以下なら分割不要
      if (fileSize <= maxFileSize) {
        console.log('[DEBUG] ファイルサイズが閾値以下のため、分割せずそのまま返します');
        return resolve([filePath]);
      }
      
      // 全体の duration とファイルサイズから 1チャンクあたりの再生時間を推定
      let chunkDuration = duration * (maxFileSize / fileSize);
      if (chunkDuration < 5) chunkDuration = 5; // 最低5秒は確保
      const numChunks = Math.ceil(duration / chunkDuration);
      
      console.log(`[DEBUG] チャンク分割開始: chunkDuration=${chunkDuration}秒, numChunks=${numChunks}`);
      
      let chunkPaths = [];
      let tasks = [];
      
      for (let i = 0; i < numChunks; i++) {
        const startTime = i * chunkDuration;
        // 同一ループ内で Date.now() が同じ値にならないよう、i を含める
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

// ✅ デバッグ用ヘルスチェック API
app.get('/api/health', (req, res) => {
  console.log('[DEBUG] /api/health がアクセスされました');
  res.status(200).json({ status: 'OK', message: 'Health check passed!' });
});

// ✅ シンプルなテストエンドポイント
app.get('/api/hello', (req, res) => {
  res.json({ message: "Hello from backend!" });
});

// ✅ 文字起こしおよび議事録生成のエンドポイント（チャンク処理あり）
// ※ diskStorage によりアップロードファイルは req.file.path に保存済み
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
  
    // アップロードされたファイルは diskStorage により既に temp/ 内に保存されている
    const tempFilePath = file.path;
  
    let transcription = "";
    let minutes = "";
    if (file.size < TRANSCRIPTION_CHUNK_THRESHOLD) {
      console.log('[DEBUG] ファイルサイズが4.5MB未満のため、一括処理します');
      transcription = await transcribeWithOpenAI(tempFilePath);
      console.log('[DEBUG] 一括文字起こし結果:', transcription);
      minutes = await generateMinutes(transcription.trim(), meetingFormat);
      console.log('[DEBUG] 一括議事録生成結果:', minutes);
    } else {
      console.log('[DEBUG] ファイルサイズが4.5MB以上のため、チャンク分割して処理します');
      const chunkPaths = await splitAudioFile(tempFilePath, TRANSCRIPTION_CHUNK_THRESHOLD);
      console.log(`[DEBUG] 生成されたチャンク数: ${chunkPaths.length}`);
      
      let transcriptionChunks = [];
      let minutesChunks = [];
      for (let i = 0; i < chunkPaths.length; i++) {
        try {
          console.log(`[DEBUG] チャンク ${i + 1} の文字起こし開始 (ファイル: ${chunkPaths[i]})`);
          const chunkTranscription = await transcribeWithOpenAI(chunkPaths[i]);
          console.log(`[DEBUG] チャンク ${i + 1} の文字起こし結果:`, chunkTranscription);
          transcriptionChunks.push(chunkTranscription);
          
          // 各チャンクごとに議事録生成を実施
          const chunkMinutes = await generateMinutes(chunkTranscription.trim(), meetingFormat);
          console.log(`[DEBUG] チャンク ${i + 1} の議事録生成結果:`, chunkMinutes);
          minutesChunks.push(chunkMinutes);
        } catch (error) {
          console.error(`[ERROR] チャンク ${i + 1} の処理中にエラー発生:`, error.response?.data || error.message);
          throw new Error(`チャンク ${i + 1} の処理に失敗: ${error.message}`);
        }
      }
      transcription = transcriptionChunks.join(" ");
      minutes = minutesChunks.join("\n\n");
      
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
  
    // 一時ファイル（アップロードされた元ファイル）の削除
    try {
      fs.unlinkSync(tempFilePath);
      console.log('[DEBUG] 一時ファイル削除:', tempFilePath);
    } catch (err) {
      console.error('[ERROR] 一時ファイル削除失敗:', tempFilePath, err);
    }
  
    console.log('[DEBUG] 最終的な文字起こし結果:', transcription);
    console.log('[DEBUG] 最終的な議事録生成結果:', minutes);
  
    return res.json({ transcription: transcription.trim(), minutes });
  } catch (err) {
    console.error('[ERROR] /api/transcribe 内部エラー:', err);
    return res.status(500).json({ error: 'サーバー内部エラー', details: err.message });
  }
});

// ✅ デバッグ用の GET/POST エンドポイント（API 動作確認用）
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

// ✅ グローバルエラーハンドラー（すべてのエラーに CORS ヘッダーを追加）
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
