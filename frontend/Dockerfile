# ✅ フロントエンドのビルド用
FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ✅ 静的ファイルを提供するための設定
FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/build /app/build
RUN npm install -g serve
CMD ["npx", "serve", "-s", "/app/build", "-l", "3001"]  # ✅ `-s /app/build` に変更
