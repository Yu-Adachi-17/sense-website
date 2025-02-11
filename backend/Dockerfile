# Node.js の軽量版を使用
FROM node:16-alpine

# ffmpeg をインストール
RUN apk add --no-cache ffmpeg

# 作業ディレクトリを設定
WORKDIR /app

# package.json をコピーして依存関係をインストール
COPY package*.json ./
RUN npm install

# アプリケーションのコードをすべてコピー
COPY . .

# サーバーを実行
CMD ["node", "server.js"]
