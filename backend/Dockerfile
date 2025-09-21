# Node.js の軽量版を使用
FROM node:16-alpine

# ffmpeg/ffprobe をインストール（Alpine）
RUN apk add --no-cache ffmpeg && \
    echo "ffprobe location:" && which ffprobe && \
    echo "ffprobe version:" && ffprobe -version

# 作業ディレクトリを設定
WORKDIR /app

# 依存関係インストール（本番安定のため npm ci 推奨）
COPY package*.json ./
RUN npm ci || npm install

# アプリケーションのコードをすべてコピー
COPY . .

# サーバーを実行
CMD ["node", "server.js"]
