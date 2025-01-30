# 1. ベースイメージ
FROM node:18-alpine

# 2. 作業ディレクトリを `/app` に設定
WORKDIR /app

# 3. 必要なファイルをコピー
COPY package*.json ./
RUN npm install

# 4. `backend` ディレクトリをコピーして中身を `/app` に展開
COPY backend/server.js ./server.js

# 5. ポートを公開
EXPOSE 3000

# 6. サーバーを起動
CMD ["node", "server.js"]
