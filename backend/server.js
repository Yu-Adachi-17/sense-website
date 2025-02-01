require('dotenv').config();
console.log("✅ STRIPE_TEST_KEY:", process.env.STRIPE_TEST_KEY ? "Loaded" : "Not found");
console.log("✅ STRIPE_PRICE_ID:", process.env.STRIPE_PRICE_ID ? "Loaded" : "Not found");

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

// ✅ CORS設定（環境変数で制御）
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ プリフライトリクエスト対応
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
    res.sendStatus(204);
});

// ✅ HTTPリクエストログ（デバッグ用）
app.use((req, res, next) => {
    console.log(`[DEBUG] Received request: ${req.method} ${req.url}`);
    console.log('[DEBUG] Headers:', req.headers);
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
const stripe = Stripe(process.env.STRIPE_TEST_KEY); // Railwayにセットしたキーを使用

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

// ✅ ヘルスチェック用エンドポイント
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'API is running smoothly' });
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

// ✅ Stripe Checkout Session作成エンドポイントの追加
app.post('/create-checkout-session', async (req, res) => {
    try {
        const priceId = process.env.STRIPE_PRICE_ID; // 環境変数からPrice IDを取得

        // ここでユーザー情報を取得する場合は、必要に応じて処理を追加
        // 例: const { userId } = req.body;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [
                {
                    price: priceId, // 環境変数から取得したPrice IDを使用
                    quantity: 1,
                },
            ],
            success_url: 'https://sense-ai.world/success',
            cancel_url: 'https://sense-ai.world/cancel',
        });
        console.log("Generated Checkout URL:", session.url);

        res.json({ url: session.url });
    } catch (error) {
        console.error('[ERROR] /create-checkout-session:', error);
        res.status(500).json({ error: 'Checkoutセッションの作成に失敗しました' });
    }
});

// ✅ フロントエンドのビルドファイルを提供する
const staticPath = path.resolve(__dirname, "../frontend/build");  // ✅ `../frontend/build` に変更
console.log(`[DEBUG] Static files served from: ${staticPath}`);
app.use(express.static(staticPath));

// ✅ すべての未定義ルートは React の `index.html` にリダイレクト
app.get("*", (req, res) => {
    if (!req.url.startsWith('/api')) {
        console.log(`[DEBUG] Redirecting ${req.url} to index.html`);
        res.sendFile(path.join(staticPath, "index.html"));
    }
});

// ✅ サーバーの起動
const PORT = process.env.PORT || 5000;
console.log(`[DEBUG] サーバーがポート ${PORT} で起動しました`);
app.listen(PORT, () => {
    console.log(`[DEBUG] サーバーがポート ${PORT} で起動しました`);
});