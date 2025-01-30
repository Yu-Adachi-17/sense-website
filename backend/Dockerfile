# 1. ベースイメージ
FROM node:18-alpine

# 2. 作業ディレクトリを設定
WORKDIR /app

# 3. バックエンドの `package.json` をコピー＆インストール
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install

# 4. フロントエンドの `package.json` をコピー＆インストール
WORKDIR /app/frontend
COPY frontend/ /app/frontend
RUN npm install

# 5. `frontend/` の中身を確認（デバッグ）
RUN ls -l /app/frontend

# 6. `npm run build` を実行し、成功したか確認
RUN npm run build || (echo "Frontend build failed" && exit 1)
RUN ls -l /app/frontend/build || (echo "Build folder missing!" && exit 1)

# 7. `frontend/build` を `backend/build` にコピー（バックエンドが静的ファイルを提供）
WORKDIR /app/backend
COPY --from=0 /app/frontend/build /app/backend/build

# 8. ポートを公開
EXPOSE 3000

# 9. サーバーを起動
CMD ["node", "server.js"]
