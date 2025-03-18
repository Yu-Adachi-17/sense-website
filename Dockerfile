# ---------------------------------------
# (1) フロントエンドをビルドするステージ
# ---------------------------------------
    FROM node:18-alpine AS frontend-build

    WORKDIR /app/frontend
    
    # デバッグ: /app/ 内のディレクトリを確認
    RUN ls -la /app/
    
    # フロントエンドの依存関係をインストール
    COPY ./frontend/package*.json ./frontend/package-lock.json ./
    
    # メモリ制限回避のための環境変数
    ENV NODE_OPTIONS="--max_old_space_size=1024"
    
    # `npm install` 実行（依存関係の競合を回避）
    RUN npm install --legacy-peer-deps
    
    # フロントエンドのソースコードをコピー（./frontend の中身を正しくコピー）
    COPY ./frontend/ /app/frontend/
    
    # デバッグ: /app/frontend に `pages/` または `app/` が存在するか確認
    RUN ls -la /app/frontend
    
    # ✅ フロントエンドをビルド（next build）
    RUN npm run build
    
    # デバッグ: `.next/` フォルダが生成されているか確認
    RUN ls -la /app/frontend/.next || (echo "ERROR: frontend build folder missing!" && exit 1)
    
    
    # ---------------------------------------
    # (2) バックエンド用ステージ
    # ---------------------------------------
    FROM node:18-alpine
    
    WORKDIR /app/backend
    
    # バックエンドの依存をインストール
    COPY ./backend/package*.json ./backend/package-lock.json ./
    RUN npm install --legacy-peer-deps
    
    # バックエンドのソースコードをコピー
    COPY ./backend/ /app/backend/
    
    # デバッグ: バックエンドが正しくコピーされているか確認
    RUN ls -la /app/backend
    
    # 先ほどのフロントエンドビルドステージの成果物を `backend/public/` にコピー
    COPY --from=frontend-build /app/frontend/.next /app/backend/public
    
    # デバッグ: フロントエンドの `.next/` が `public/` にコピーされているか確認
    RUN ls -la /app/backend/public || (echo "ERROR: frontend build not copied to backend/public!" && exit 1)
    
    # ポートを公開
    EXPOSE 5001
    
    # 最後にアプリを起動
    CMD ["node", "server.js"]
    