# 1. Node.jsの軽量イメージを使う
FROM node:18-alpine

# 2. 作業ディレクトリを /app にする
WORKDIR /app

# 3. package.json をコピー（キャッシュを活用するため最初にコピー）
COPY package*.json ./

# 4. 依存関係をインストール
RUN npm install

# 5. 残りのソースコードをコピー
COPY . .

# 6. アプリのポートを公開
EXPOSE 3000

# 7. コンテナ起動時にサーバーを実行
CMD ["node", "server.js"]

