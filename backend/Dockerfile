# ---------------------------------------
# (1) フロントエンドをビルドするステージ
# ---------------------------------------
    FROM node:18-alpine AS frontend-build

    WORKDIR /app/frontend
    COPY frontend/package*.json ./
    RUN npm install
    
    COPY frontend/ .
    RUN npm run build
    
    # **デバッグ: ビルド後のファイル構成を確認**
    RUN ls -l /app/frontend/build || (echo "ERROR: frontend build folder missing!" && exit 1)
    
    
    # ---------------------------------------
    # (2) バックエンド用ステージ
    # ---------------------------------------
    FROM node:18-alpine
    
    WORKDIR /app/backend
    
    # バックエンドの依存をインストール
    COPY backend/package*.json ./
    RUN npm install
    
    # バックエンドのソースコードをコピー
    COPY backend/ .
    
    # 先ほどのフロントエンドビルドステージの成果物を public/ にコピー
    COPY --from=frontend-build /app/frontend/build ./public
    
    # ポートを公開
    EXPOSE 3000
    
    # 最後にアプリを起動
    CMD ["node", "server.js"]
    