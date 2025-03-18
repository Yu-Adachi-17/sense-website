# ✅ フロントエンドのビルド用
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend

# フロントエンドの依存関係をインストール
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps


# 確認: `next` がインストールされているか
RUN ls -la node_modules/.bin/

# フロントエンドのソースコードをコピー
COPY frontend /app/frontend

# ✅ フロントエンドをビルド
RUN npm run build

# 確認: `.next/` が作成されているか
RUN ls -la /app/frontend/.next || (echo "ERROR: frontend build folder missing!" && exit 1)


# ✅ バックエンドの設定
FROM node:18-alpine

WORKDIR /app/backend

# バックエンドの依存をインストール
COPY backend/package*.json ./
RUN npm install

# バックエンドのソースコードをコピー
COPY backend /app/backend

# ✅ フロントエンドのビルド成果物をバックエンドの `public/` にコピー
COPY --from=frontend-build /app/frontend/.next /app/backend/public

# 確認: フロントエンドビルドがバックエンドに正しくコピーされたか
RUN ls -la /app/backend/public || (echo "ERROR: frontend build not copied to backend/public!" && exit 1)

# ポートを公開
EXPOSE 5001

# 最後にアプリを起動
CMD ["node", "server.js"]
