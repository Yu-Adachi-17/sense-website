# 1. ベースイメージ
FROM node:18-alpine

# 2. 作業ディレクトリを設定
WORKDIR /app

# 3. バックエンドの `package.json` をコピー＆インストール
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install

# 4. フロントエンドをコピー
WORKDIR /app/frontend
COPY frontend/ /app/frontend

# 5. デバッグ用：`frontend/` に正しくファイルがコピーされたか確認
RUN ls -l /app/frontend || (echo "frontend folder not copied!" && exit 1)

# 6. フロントエンドの依存関係をインストール
RUN npm install

# 7. デバッグ用：`node_modules/` が作成されているか確認
RUN ls -l /app/frontend/node_modules || (echo "npm install failed!" && exit 1)

# 8. フロントエンドをビルド
RUN npm run build || (echo "Frontend build failed!" && exit 1)

# 9. デバッグ用：`frontend/build/` が作成されたか確認
RUN ls -l /app/frontend/build || (echo "Build folder missing!" && exit 1)

# 10. `frontend/build` を `backend/public/` にコピー（バックエンドで提供するため）
WORKDIR /app/backend
COPY --from=0 /app/frontend/build /app/backend/public

# 11. ポートを公開
EXPOSE 3000

# 12. サーバーを起動
CMD ["node", "server.js"]
