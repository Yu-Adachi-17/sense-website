require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const cors = require('cors');
const FormData = require('form-data');

const app = express();

// CORS設定（環境変数で制御）
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    credentials: true,
}));

// プリフライトリクエストに対応
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
    res.sendStatus(204);
});

// HTTPリクエストログ（デバッグ用）
app.use((req, res, next) => {
    console.log(`[DEBUG] Received request: ${req.method} ${req.url}`);
    console.log('[DEBUG] Headers:', req.headers);
    console.log('[DEBUG] Body:', req.body);
    next();
});

// Multerの設定
const upload = multer({ storage: multer.memoryStorage() });

// 静的ファイルの提供設定
const staticPath = path.join(__dirname, 'frontend/build');
app.use(express.static(staticPath));

// 未定義ルートをフロントエンドにリダイレクト
app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});

// OpenAIのAPIエンドポイント
const OPENAI_API_ENDPOINT_TRANSCRIPTION = 'https://api.openai.com/v1/audio/transcriptions';
const OPENAI_API_ENDPOINT_CHATGPT = 'https://api.openai.com/v1/chat/completions';

// ChatGPTを使用して議事録を生成する関数
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
        console.error('[DEBUG] ChatGPT API error:', error.response?.data || error.message);
        throw new Error('ChatGPT API による議事録生成に失敗しました');
    }
};

// OpenAI Whisper APIを使用して文字起こしを行う関数
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
        console.error('[DEBUG] Whisper API error:', error.response?.data || error.message);
        throw new Error('Whisper API による文字起こしに失敗しました');
    }
};

// エンドポイント: 音声ファイルの受け取りと文字起こしおよび議事録生成
app.post('/transcribe', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'ファイルがアップロードされていません' });
        }

        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempFilePath = path.join(tempDir, `${Date.now()}_${file.originalname}`);
        fs.writeFileSync(tempFilePath, file.buffer);

        console.log('[DEBUG] File saved temporarily at:', tempFilePath);

        const transcription = await transcribeWithOpenAI(tempFilePath);
        fs.unlinkSync(tempFilePath);

        const minutes = await generateMinutes(transcription.trim());
        res.json({ transcription: transcription.trim(), minutes });

    } catch (error) {
        console.error('[DEBUG] Error in /transcribe:', error);
        res.status(500).json({ error: '文字起こしおよび議事録生成に失敗しました' });
    }
});

// サーバーの起動
const PORT = process.env.PORT || 8080;
console.log(`[DEBUG] API Key loaded: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
app.listen(PORT, () => {
    console.log(`[DEBUG] サーバーがポート ${PORT} で起動しました`);
});
