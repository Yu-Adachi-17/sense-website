# 1. ベースイメージ
FROM node:18-alpine

# 2. 作業ディレクトリを設定
WORKDIR /app

# 3. バックエンドの `package.json` をコピー＆インストール
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# 4. フロントエンドをビルド（`frontend/` に `package.json` がある場合）
WORKDIR /app/frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install && npm run build

# 5. `frontend/build` と `backend` を `/app/` にコピー
WORKDIR /app
COPY backend /app/backend
COPY --from=frontend /app/frontend/build /app/frontend/build

# 6. ポートを公開
EXPOSE 3000

# 7. サーバーを起動
CMD ["node", "backend/server.js"]
