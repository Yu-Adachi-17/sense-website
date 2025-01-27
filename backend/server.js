// server.js

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

app.use(cors({
    origin: 'http://localhost:3000', // 必要なら '*' に変更してすべてのオリジンを許可
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    credentials: true,
}));

// プリフライトリクエストの明示的な応答
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
    res.sendStatus(204); // 成功ステータス
});

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`); // HTTPメソッドとURLを出力
    console.log('Headers:', req.headers);   // リクエストヘッダーを出力
    next(); // 次のミドルウェアやルートハンドラーに進む
});

// Multerの設定
const upload = multer({ storage: multer.memoryStorage() });

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
        console.log('ChatGPT API に送信するデータ:', data);
        const response = await axios.post(OPENAI_API_ENDPOINT_CHATGPT, data, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            timeout: 600000, // 10分
        });
        console.log('ChatGPT API のレスポンス:', response.data);
        const minutes = response.data.choices[0].message.content.trim();
        return minutes;
    } catch (error) {
        console.error('ChatGPT API エラー:', error.response ? error.response.data : error.message);
        throw new Error('ChatGPT API による議事録生成に失敗しました');
    }
};

// OpenAI Whisper APIを使用して文字起こしを行う関数
const transcribeWithOpenAI = async (filePath) => {
    try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));
        formData.append('model', 'whisper-1');

        console.log(`Whisper API に送信するファイル: ${filePath}`);

        const response = await axios.post(OPENAI_API_ENDPOINT_TRANSCRIPTION, formData, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                ...formData.getHeaders(),
            },
            timeout: 600000, // 10分
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        });

        console.log('Whisper API のレスポンス:', response.data);
        return response.data.text;
    } catch (error) {
        console.error('Whisper API エラー:', error.response ? error.response.data : error.message);
        throw new Error('Whisper API による文字起こしに失敗しました');
    }
};

// 音声ファイルをチャンクに分割する関数（使用している場合）
const splitAudio = (filePath, maxFileSize) => {
    return new Promise((resolve, reject) => {
        const chunkDir = path.join(__dirname, 'chunks', path.basename(filePath, path.extname(filePath)));
        if (!fs.existsSync(chunkDir)) {
            fs.mkdirSync(chunkDir, { recursive: true });
            console.log(`'chunks' ディレクトリを作成しました: ${chunkDir}`);
        }

        ffmpeg(filePath)
            .outputOptions(['-f segment', '-segment_time 60', '-c copy'])
            .output(path.join(chunkDir, 'chunk%03d.m4a'))
            .on('end', () => {
                fs.readdir(chunkDir, (err, files) => {
                    if (err) return reject(err);
                    const chunkPaths = files
                        .filter(file => file.startsWith('chunk') && file.endsWith('.m4a'))
                        .map(file => path.join(chunkDir, file))
                        .sort();
                    resolve(chunkPaths);
                });
            })
            .on('error', (err) => reject(err))
            .run();
    });
};

// エンドポイント: 音声ファイルの受け取りと文字起こしおよび議事録生成
app.post('/transcribe', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'ファイルがアップロードされていません' });
        }

        // 'temp' ディレクトリの存在を確認し、存在しない場合は作成
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
            console.log(`'temp' ディレクトリを作成しました: ${tempDir}`);
        }

        const tempFilePath = path.join(tempDir, `${Date.now()}_${file.originalname}`);
        fs.writeFileSync(tempFilePath, file.buffer);
        console.log(`ファイルを一時保存しました: ${tempFilePath}`);

        const transcription = await transcribeWithOpenAI(tempFilePath);
        console.log('文字起こし完了:', transcription);
        fs.unlinkSync(tempFilePath);
        console.log(`一時ファイルを削除しました: ${tempFilePath}`);

        const minutes = await generateMinutes(transcription.trim());
        console.log('議事録生成完了:', minutes);
        res.json({ transcription: transcription.trim(), minutes });

    } catch (error) {
        console.error('文字起こしおよび議事録生成中にエラーが発生しました:', error);
        res.status(500).json({ error: '文字起こしおよび議事録生成に失敗しました' });
    }
});

// サーバーの起動を最後に移動
const PORT = process.env.PORT || 5002; // ポートを5002に変更
app.listen(PORT, () => {
    console.log(`サーバーがポート ${PORT} で起動しました`);
});

