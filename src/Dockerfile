# ✅ フロントエンドのビルド用
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend

# 依存関係をインストール
COPY ./package*.json ./
RUN npm install --legacy-peer-deps

# フロントエンドのソースコードをコピー
COPY ./src/ /app/frontend/src/

# フロントエンドをビルド
RUN npm run build

# ✅ バックエンドの設定
FROM node:18-alpine

WORKDIR /app/backend

# バックエンドの依存をインストール
COPY ./package*.json ./
RUN npm install --legacy-peer-deps

# バックエンドのソースコードをコピー
COPY ./ /app/backend/

# フロントエンドのビルド成果物を `backend/public/` にコピー
COPY --from=frontend-build /app/frontend/.next /app/backend/public

# ✅ 静的ファイルを提供するための設定
RUN npm install -g serve
CMD ["npx", "serve", "-s", "/app/backend/public", "-l", "3000"]  # ✅ `-s /app/backend/public` に変更
