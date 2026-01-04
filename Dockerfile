# ---------------------------------------
# (1) Frontend build stage
# ---------------------------------------
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

RUN apk add --no-cache libc6-compat

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

COPY ./frontend/package.json ./frontend/package-lock.json ./
RUN npm ci

RUN npm ls firebase && npm ls @firebase/app || (echo "\n❌ 'firebase' が dependencies に無い/壊れている可能性があります。package.json を確認してください。\n" && exit 1)

COPY ./frontend /app/frontend

ENV NODE_OPTIONS="--max_old_space_size=1024"
RUN npm run build

RUN ls -la /app/frontend/.next || (echo "ERROR: frontend build folder missing!" && exit 1)


# ---------------------------------------
# (2) Backend stage (Debian + chromium)
# ---------------------------------------
FROM node:20-bookworm-slim

WORKDIR /app/backend
ENV NODE_ENV=production

# Puppeteer: Chromium を自前で入れて、ダウンロードをスキップ
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# npm install 時に postinstall 等の scripts を走らせない（ここが肝）
ENV npm_config_ignore_scripts=true

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  chromium \
  ffmpeg \
  fonts-noto-cjk \
  fonts-noto-color-emoji \
  && rm -rf /var/lib/apt/lists/*

COPY ./backend/package.json ./backend/package-lock.json ./

# scripts を無視してインストール（postinstall の apk が走らない）
RUN npm ci --omit=dev

COPY ./backend /app/backend

RUN mkdir -p /app/backend/public
COPY --from=frontend-build /app/frontend/.next /app/backend/public

RUN ls -la /app/backend && ls -la /app/backend/public || (echo "ERROR: frontend build not copied to backend/public!" && exit 1)

EXPOSE 5001
CMD ["node", "server.js"]
