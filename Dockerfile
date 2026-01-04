# ---------------------------------------
# (1) Frontend build stage
# ---------------------------------------
    FROM node:20-alpine AS frontend-build

    WORKDIR /app/frontend
    
    # Alpine でのネイティブ拡張対策（sharp 等）
    RUN apk add --no-cache libc6-compat
    
    # 🔁 Railway 環境変数（NEXT_PUBLIC_*）
    ARG NEXT_PUBLIC_FIREBASE_API_KEY
    ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
    ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    ARG NEXT_PUBLIC_FIREBASE_APP_ID
    ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
    
    ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
        NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
        NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
        NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
    
    # まず package.json / lock のみコピー（Docker 層キャッシュのため）
    COPY ./frontend/package.json ./frontend/package-lock.json ./
    
    # Reproducible install（lock に厳密準拠）
    # ※ フロントは build に devDeps が必要なことが多いので omit は付けない
    RUN npm ci
    
    # 依存に firebase が入っているか & 中の @firebase/app が解決できるか早期チェック
    # （入っていない場合はここで明確に失敗させる）
    RUN npm ls firebase && npm ls @firebase/app || (echo "\n❌ 'firebase' が dependencies に無い/壊れている可能性があります。package.json を確認してください。\n" && exit 1)
    
    # 残りのソースをコピー
    COPY ./frontend /app/frontend
    
    # メモリ対策（必要なら）
    ENV NODE_OPTIONS="--max_old_space_size=1024"
    
    # ビルド
    RUN npm run build
    
    # 成果物の存在チェック
    RUN ls -la /app/frontend/.next || (echo "ERROR: frontend build folder missing!" && exit 1)
    
    
    # ---------------------------------------
    # (2) Backend stage
    # ---------------------------------------
    FROM node:18-alpine
    
    WORKDIR /app/backend
    
    # 必要に応じて
    RUN apk add --no-cache libc6-compat
    
    # 先に package/lock をコピーして ci
    COPY ./backend/package.json ./backend/package-lock.json ./
    # 本番用に devDeps を省くなら --omit=dev（必要に応じて調整）
    RUN npm ci --omit=dev
    
    # 残りのソース
    COPY ./backend /app/backend
    
    # フロントのビルド成果物を公開ディレクトリへコピー
    # （server.js が /public を配信する前提のまま）
    COPY --from=frontend-build /app/frontend/.next /app/backend/public
    
    # 動作確認
    RUN ls -la /app/backend && ls -la /app/backend/public || (echo "ERROR: frontend build not copied to backend/public!" && exit 1)
    
    EXPOSE 5001
    CMD ["node", "server.js"]
    