# 1. ベースイメージ
FROM node:18-alpine

# 2. 作業ディレクトリを設定
WORKDIR /app

# 3. バックエンドの `package.json` をコピー＆インストール
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install

# 4. フロントエンドをコピー＆ビルド
WORKDIR /app/frontend
COPY frontend/ /app/frontend
RUN npm install
RUN npm run build

# 5. `frontend/build` を `backend/public/` にコピー（バックエンドが静的ファイルを提供）
WORKDIR /app/backend
COPY --from=0 /app/frontend/build /app/backend/public

# 6. ポートを公開
EXPOSE 3000

# 7. サーバーを起動
CMD ["node", "server.js"]
