# ---------------------------------------
# (1) フロントエンドをビルドするステージ
# ---------------------------------------
    FROM node:18-alpine AS frontend-build

    WORKDIR /app/frontend
    
    # 🔁 Railwayの環境変数を受け取る（NEXT_PUBLIC_... 系）
    ARG NEXT_PUBLIC_FIREBASE_API_KEY
    ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
    ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    ARG NEXT_PUBLIC_FIREBASE_APP_ID
    ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
    
    ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
    ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
    ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
    ENV NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
    
    # デバッグ: /app/ 内のディレクトリを確認
    RUN ls -la /app/
    
    # フロントエンドの依存関係をインストール
    COPY ./frontend/package*.json ./frontend/package-lock.json ./
    
    # メモリ制限回避のための環境変数
    ENV NODE_OPTIONS="--max_old_space_size=1024"
    
    # 依存インストール（競合回避）
    RUN npm install --legacy-peer-deps
    
    # ソースコードをコピー
    COPY ./frontend /app/frontend
    
    # デバッグ: `pages/` または `app/` 確認
    RUN ls -la /app/frontend
    
    # ✅ ビルド（ここで環境変数が必要）
    RUN npm run build
    
    # デバッグ: `.next/` フォルダの確認
    RUN ls -la /app/frontend/.next || (echo "ERROR: frontend build folder missing!" && exit 1)
    
    
    # ---------------------------------------
    # (2) バックエンド用ステージ
    # ---------------------------------------
    FROM node:18-alpine
    
    WORKDIR /app/backend
    
    # 🔁 .env は dev用。本番は Railwayの Variables を使う
    # COPY ./backend/.env .env
    
    # 依存をインストール
    COPY ./backend/package*.json ./backend/package-lock.json ./
    RUN npm install --legacy-peer-deps
    
    # ソースコードをコピー
    COPY ./backend /app/backend
    
    # デバッグ: backend 確認
    RUN ls -la /app/backend
    
    # フロントビルドの成果物をコピー
    COPY --from=frontend-build /app/frontend/.next /app/backend/public
    
    # デバッグ: コピー確認
    RUN ls -la /app/backend/public || (echo "ERROR: frontend build not copied to backend/public!" && exit 1)
    
    # 公開ポート
    EXPOSE 5001
    
    # サーバー起動
    CMD ["node", "server.js"]
    