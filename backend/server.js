require('dotenv').config();
console.log("✅ STRIPE_SECRET_KEY:", process.env.STRIPE_SECRET_KEY ? "Loaded" : "Not found");
console.log("✅ STRIPE_PRICE_UNLIMITED:", process.env.STRIPE_PRICE_UNLIMITED ? "Loaded" : "Not found");

const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const cors = require('cors');
const FormData = require('form-data');
const Stripe = require('stripe'); // Stripeライブラリのインポート
const app = express();

app.use(express.json()); // ✅ JSONリクエストをパース

// ✅ 許可するオリジンを定義
const allowedOrigins = ['https://sense-ai.world', 'https://www.sense-ai.world'];

// ✅ すべてのリクエストに CORS を適用
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.error(`[CORS ERROR] 許可されていないオリジン: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'], // 許可するHTTPメソッド
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'], // 許可するヘッダー
    credentials: true // Cookieや認証情報を許可
};
app.use(cors(corsOptions));

// ✅ すべてのレスポンスに CORS ヘッダーを強制適用
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204); // プリフライトリクエストにはステータス204を返す
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
    res.sendStatus(204); // プリフライトリクエストを処理
});


// ✅ デバッグ用ログを追加
app.use((req, res, next) => {
    console.log(`[DEBUG] リクエスト詳細:
  - メソッド: ${req.method}
  - オリジン: ${req.headers.origin || '未設定'}
  - パス: ${req.path}
  - ヘッダー: ${JSON.stringify(req.headers, null, 2)}
`);
    next();
});



// ✅ Multerの設定（100MBまでのファイルを受け付ける）
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 } // 100MBまでOK
});

// ✅ OpenAI APIエンドポイント
const OPENAI_API_ENDPOINT_TRANSCRIPTION = 'https://api.openai.com/v1/audio/transcriptions';
const OPENAI_API_ENDPOINT_CHATGPT = 'https://api.openai.com/v1/chat/completions';

// ✅ Stripeの初期化
const stripe = Stripe(process.env.STRIPE_SECRET_KEY); // Railwayにセットしたキーを使用

// ✅ ChatGPTを使用して議事録を生成する関数
const generateMinutes = async (transcription) => {
    const data = {
        model: 'gpt-4',
        messages: [
            { role: 'system', content: 'あなたは優秀な議事録作成アシスタントです。以下のテキストを基に議事録を作成してください。' },
            { role: 'user', content: transcription },
        ],
        max_tokens: 2000,
        temperature: 0.5,
    };

    try {
        console.log('[DEBUG] Sending data to ChatGPT API:', data);
        const response = await axios.post(OPENAI_API_ENDPOINT_CHATGPT, data, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            timeout: 600000, // 10分
        });
        console.log('[DEBUG] ChatGPT API response:', response.data);
        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error('[ERROR] ChatGPT API failed:', error.response?.data || error.message);
        throw new Error('ChatGPT API による議事録生成に失敗しました');
    }
};

// ✅ Whisper APIを使用して文字起こしを行う関数
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
        console.error('[ERROR] Whisper API error:', error.response?.data || error.message);
        throw new Error('Whisper API による文字起こしに失敗しました');
    }
};

// ✅ `/api/transcribe` が登録されていることを明示的に確認
console.log('[DEBUG] Registering /api/transcribe route');

// ✅ デバッグ用ヘルスチェックAPI
app.get('/api/health', (req, res) => {
    console.log('[DEBUG] /api/health was accessed');
    res.status(200).json({ status: 'OK', message: 'Health check passed!' });
});



// ✅ すべてのリクエストをログ出力
app.use((req, res, next) => {
    console.log(`[DEBUG] リクエスト受信: ${req.method} ${req.path}`);
    next();
});


// ✅ APIエンドポイント定義
app.get('/api/hello', (req, res) => {
    res.json({ message: "Hello from backend!" });
});

app.post('/api/transcribe', upload.single('file'), async (req, res) => {
    console.log('[DEBUG] /api/transcribe called');

    try {
        const file = req.file;
        if (!file) {
            console.error('[ERROR] ファイルがアップロードされていません');
            return res.status(400).json({ error: 'ファイルがアップロードされていません' });
        }

        console.log(`[DEBUG] File received: ${file.originalname}`);
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempFilePath = path.join(tempDir, `${Date.now()}_${file.originalname}`);
        fs.writeFileSync(tempFilePath, file.buffer);
        console.log('[DEBUG] File saved temporarily at:', tempFilePath);

        let transcription;
        try {
            transcription = await transcribeWithOpenAI(tempFilePath);
            console.log('[DEBUG] Transcription result:', transcription);
        } catch (error) {
            console.error('[ERROR] Whisper API failed:', error);
            return res.status(500).json({ error: 'Whisper API による文字起こしに失敗しました' });
        }

        fs.unlinkSync(tempFilePath);

        let minutes;
        try {
            minutes = await generateMinutes(transcription.trim());
            console.log('[DEBUG] ChatGPT result:', minutes);
        } catch (error) {
            console.error('[ERROR] ChatGPT API failed:', error);
            return res.status(500).json({ error: 'ChatGPT API による議事録生成に失敗しました' });
        }

        res.json({ transcription: transcription.trim(), minutes });

    } catch (error) {
        console.error('[ERROR] /api/transcribe internal error:', error);
        res.status(500).json({ error: 'サーバー内部エラー' });
    }
});
// ✅ デバッグ用に GET /api/transcribe を追加
app.get('/api/transcribe', (req, res) => {
    res.json({ message: "API is working!" });
});
app.get('/api/transcribe', (req, res) => {
    res.status(200).json({ message: 'GET /api/transcribe is working!' });
});
app.post('/api/transcribe', (req, res) => {
    res.status(200).json({ message: 'API is working!' });
});

// ✅ Stripe Checkout Session作成エンドポイントの追加
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const { productId } = req.body;
        console.log("✅ 受信した productId:", productId); // デバッグログ

        // 🔥 環境変数マッピング
        const PRICE_MAP = {
            [process.env.STRIPE_PRODUCT_UNLIMITED]: process.env.STRIPE_PRICE_UNLIMITED,
            [process.env.STRIPE_PRODUCT_120MIN]: process.env.STRIPE_PRICE_120MIN,
            [process.env.STRIPE_PRODUCT_1200MIN]: process.env.STRIPE_PRICE_1200MIN
        };

        const priceId = PRICE_MAP[productId];

        if (!priceId) {
            console.error("❌ productId が無効:", productId);
            return res.status(400).json({ error: "Invalid productId" });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: productId === process.env.STRIPE_PRODUCT_UNLIMITED ? 'subscription' : 'payment',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: 'https://sense-ai.world/success',
            cancel_url: 'https://sense-ai.world/cancel',
        });

        console.log("✅ Checkout URL:", session.url);
        res.json({ url: session.url });
    } catch (error) {
        console.error('[ERROR] /create-checkout-session:', error);
        res.status(500).json({ error: 'Checkoutセッションの作成に失敗しました' });
    }
});


// ✅ フロントエンドの静的ファイルを提供
const staticPath = path.join(__dirname, 'frontend/build');
console.log(`[DEBUG] Static files served from: ${staticPath}`);
app.use(express.static(staticPath));

// ✅ 最後のフォールバックとしてReactを返す（APIリクエストでは適用しない）
app.use('/api', (req, res, next) => {
    res.status(404).json({ error: 'API route not found' });
});

// ✅ React のルート (`/success` など) を正しくハンドリング
app.get(["/success", "/cancel"], (req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
});

// ✅ その他の未定義ルートも `index.html` にリダイレクト
app.get('*', (req, res) => {
    console.log(`[DEBUG] Redirecting ${req.url} to index.html`);
    res.sendFile(path.join(staticPath, "index.html"));
});


// ✅ サーバーの起動
const PORT = process.env.PORT || 5001; 
console.log(`[DEBUG] API Key loaded: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
app.listen(PORT, () => {
    console.log(`[DEBUG] サーバーがポート ${PORT} で起動しました`);
});

module.exports = app;
