# Node.js の軽量版を使用
FROM node:16-alpine

# ffmpeg をインストールし、ffprobe の場所とバージョンを出力して確認する
RUN apk add --no-cache ffmpeg && \
    echo "ffprobe location:" && which ffprobe && \
    echo "ffprobe version:" && ffprobe -version

# 作業ディレクトリを設定
WORKDIR /app

# package.json をコピーして依存関係をインストール
COPY package*.json ./
RUN npm install

# アプリケーションのコードをすべてコピー
COPY . .

# サーバーを実行
CMD ["node", "server.js"]
