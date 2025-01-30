# 1. ベースイメージ
FROM node:18-alpine

# 2. 作業ディレクトリを設定
WORKDIR /app

# 3. **フロントエンドの全ファイルを確実にコピー**
COPY frontend /app/frontend

# 4. **デバッグ: `frontend/` に正しくファイルがあるか確認**
RUN ls -l /app/frontend || (echo "ERROR: frontend folder missing!" && exit 1)

# 5. フロントエンドの依存関係をインストール
WORKDIR /app/frontend
RUN npm install

# 6. **デバッグ: `node_modules/` が作成されたか確認**
RUN ls -l /app/frontend/node_modules || (echo "ERROR: npm install failed!" && exit 1)

# 7. フロントエンドをビルド
RUN npm run build || (echo "ERROR: Frontend build failed!" && exit 1)

# 8. **デバッグ: `frontend/build/` が作成されたか確認**
RUN ls -l /app/frontend/build || (echo "ERROR: frontend/build folder missing!" && exit 1)

# 9. バックエンドの `package.json` をコピー＆インストール
WORKDIR /app/backend
COPY backend/package*.json /app/backend/
RUN npm install

# 10. `frontend/build` を `backend/public/` にコピー（バックエンドで提供）
COPY --from=0 /app/frontend/build /app/backend/public

# 11. ポートを公開
EXPOSE 3000

# 12. サーバーを起動
CMD ["node", "server.js"]
