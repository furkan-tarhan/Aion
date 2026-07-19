# --- base: ortak bağımlılıklar ---
# Not: cross-platform (Windows geliştirme / Linux container) lock dosyası uyumsuzluklarını
# önlemek için `npm ci` yerine `npm install` kullanılıyor.
FROM node:20-bookworm-slim AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# --- dev: hot-reload'lu geliştirme ortamı (docker-compose.yml tarafından kullanılır) ---
FROM base AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

# --- build: TypeScript derlemesi ---
FROM base AS build
COPY . .
RUN npm run build

# --- prod: sadece derlenmiş çıktı + production bağımlılıkları (docker-compose.prod.yml tarafından kullanılır) ---
FROM node:20-bookworm-slim AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 5000
CMD ["node", "dist/index.js"]
