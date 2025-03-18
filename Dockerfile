# ---------------------------------------
# (1) フロントエンドをビルドするステージ
# ---------------------------------------
    FROM node:18-alpine AS frontend-build

    WORKDIR /app/frontend
    
    # デバッグ: /app/ 内のディレクトリを確認
    RUN ls -la /app/
    
    # フロントエンドの依存関係をインストール
    COPY frontend/package*.json ./
    RUN npm install
    
    # フロントエンドのソースコードをコピー
    COPY frontend /app/frontend
    
    # デバッグ: /app/frontend にファイルがコピーされているか確認
    RUN ls -la /app/frontend
    
    # フロントエンドをビルド
    RUN next build
    
    # デバッグ: ビルド後の `build/` フォルダが生成されているか確認
    RUN ls -la /app/frontend/build || (echo "ERROR: frontend build folder missing!" && exit 1)
    
    
    # ---------------------------------------
    # (2) バックエンド用ステージ
    # ---------------------------------------
    FROM node:18-alpine
    
    WORKDIR /app/backend
    
    # バックエンドの依存をインストール
    COPY backend/package*.json ./
    RUN npm install
    
    # バックエンドのソースコードをコピー
    COPY backend /app/backend
    
    # デバッグ: バックエンドが正しくコピーされているか確認
    RUN ls -la /app/backend
    
    # 先ほどのフロントエンドビルドステージの成果物を `backend/public/` にコピー
    COPY --from=frontend-build /app/frontend/build /app/backend/public
    
    # デバッグ: フロントエンドの `build/` が `public/` にコピーされているか確認
    RUN ls -la /app/backend/public || (echo "ERROR: frontend build not copied to backend/public!" && exit 1)
    
    # ポートを公開
    EXPOSE 5001
    
    # 最後にアプリを起動
    CMD ["node", "server.js"]
    