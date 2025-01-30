# nodeイメージをベースに
FROM node:18-alpine

# 作業ディレクトリを /app に
WORKDIR /app

# -----------------------------------
# 1. バックエンドをインストール
# -----------------------------------
# backend/package.json と package-lock.json をコピー
COPY backend/package*.json /app/
RUN npm install

# サーバーコードをコピー
COPY backend/ /app/

# -----------------------------------
# 2. フロントエンドをビルド
# -----------------------------------
# frontend/package.json と package-lock.json を先にコピーしてnpm install
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install

# フロントエンドのソースコードをコピー
COPY frontend/ ./

# npm run build 実行
RUN npm run build

# -----------------------------------
# 3. 最終的に server.js を起動
# -----------------------------------
# ポートを解放
EXPOSE 3000

# CMD 実行時に /app(=back) に戻して node server.js
WORKDIR /app
CMD ["node", "server.js"]
