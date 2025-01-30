# 1. ベースイメージ
FROM node:18-alpine

# 2. 作業ディレクトリを設定
WORKDIR /app

# 3. バックエンドの `package.json` をコピー＆インストール
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install

# 4. フロントエンドの `package.json` をコピー＆インストール＆ビルド
WORKDIR /app/frontend
COPY frontend/ /app/frontend
RUN npm install && npm run build

# 5. `frontend/build` を `backend` にコピー（バックエンドが静的ファイルを提供できるように）
WORKDIR /app/backend
COPY --from=0 /app/frontend/build /app/backend/build

# 6. ポートを公開
EXPOSE 3000

# 7. サーバーを起動
CMD ["node", "server.js"]
