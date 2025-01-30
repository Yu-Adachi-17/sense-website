# 1. ベースイメージ
FROM node:18-alpine

# 2. 作業ディレクトリを設定
WORKDIR /app

# 3. パッケージをコピーしてインストール
COPY package*.json ./
RUN npm install

# 4. 残りのファイルをコピー
COPY . .

# 5. ポートを公開
EXPOSE 3000

# 6. ビルド時に `RUN node backend/server.js` は実行しない！
# 代わりに、コンテナが実行されるときに `server.js` を起動する
CMD ["node", "server.js"]
