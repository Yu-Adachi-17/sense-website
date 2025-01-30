# 1. ベースイメージ
FROM node:18-alpine

# 2. 作業ディレクトリを `/app` に設定
WORKDIR /app

# 3. `backend/` ディレクトリをコンテナにコピー
COPY backend /app/backend

# 4. `backend/package.json` をコピーして `npm install`（依存関係をインストール）
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install

# 5. ポートを公開
EXPOSE 3000

# 6. `server.js` を正しく実行
CMD ["node", "backend/server.js"]
