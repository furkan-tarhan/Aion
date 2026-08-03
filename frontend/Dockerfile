# --- base: ortak bağımlılıklar ---
# Not: package-lock.json Windows'ta üretildiği için Next.js/SWC'nin Linux'a özel
# optional dependency'leri kilit dosyasında olmayabilir; bu yüzden `npm ci` yerine
# `npm install` kullanılıyor (platforma göre doğru native binary'leri çözer).
FROM node:20-bookworm-slim AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# --- dev: hot-reload'lu geliştirme ortamı (docker-compose.yml tarafından kullanılır) ---
FROM base AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# --- build: production build (standalone çıktı) ---
FROM base AS build
ENV DOCKER_BUILD=true
COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost:5000
ARG NEXT_PUBLIC_SITE_URL=http://localhost
# Sentry DSN gizli değildir (client bundle'a gömülür) ama derleme anında ARG olarak geçilmesi
# gerekir; tanımsızsa Sentry.init dsn=undefined ile çağrılır ve sessizce devre dışı kalır.
ARG NEXT_PUBLIC_SENTRY_DSN=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
RUN npm run build

# --- prod: minimal runtime imajı (docker-compose.prod.yml tarafından kullanılır) ---
FROM node:20-bookworm-slim AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
