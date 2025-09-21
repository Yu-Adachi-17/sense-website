# --- Build stage ---
    FROM node:20-alpine AS build
    WORKDIR /app
    
    # 依存 → ソース の順でコピー
    COPY frontend/package*.json ./frontend/
    WORKDIR /app/frontend
    RUN npm ci
    COPY frontend/ ./
    
    # 省サイズ: スタンドアロン出力
    # next.config.js に { output: 'standalone' } を入れておくと最適
    RUN npm run build
    
    # --- Runtime stage ---
    FROM node:20-alpine AS runner
    WORKDIR /app
    
    # スタンドアロン出力だけコピー（依存も同梱されます）
    # 公式: .next/standalone + .next/static + public を配ればOK
    # https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
    COPY --from=build /app/frontend/.next/standalone ./
    COPY --from=build /app/frontend/.next/static ./frontend/.next/static
    COPY --from=build /app/frontend/public ./frontend/public
    
    # ポートは 3000
    EXPOSE 3000
    CMD ["node", "server.js"]
    