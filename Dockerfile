# 1. ベースイメージ
FROM node:18-alpine

# 2. 作業ディレクトリを設定
WORKDIR /app

# 3. 必要なファイルをコピー
COPY backend/package*.json ./
RUN npm install

# 4. `server.js` を正しい場所からコピー
COPY backend/server.js /app/server.js

# 5. ポートを公開
EXPOSE 3000

# 6. サーバーを起動
CMD ["node", "server.js"]
