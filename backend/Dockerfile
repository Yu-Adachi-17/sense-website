# 1. ベースイメージ
FROM node:18-alpine

# 2. 作業ディレクトリを設定
WORKDIR /app

# 3. バックエンドの `package.json` をコピー＆インストール
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install

# 4. フロントエンドの全ファイルをコピー＆ビルド
WORKDIR /app/frontend
COPY frontend/ /app/frontend
RUN npm install && npm run build

# 5. `frontend/build` と `backend` を `/app/` にコピー
WORKDIR /app
COPY backend /app/backend

# 6. ポートを公開
EXPOSE 3000

# 7. サーバーを起動
CMD ["node", "backend/server.js"]
