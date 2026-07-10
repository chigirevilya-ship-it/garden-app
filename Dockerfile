# Build stage
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve stage — Node server: static SPA + multi-user API (+ optional AI proxy)
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=80 DATA_DIR=/app/data
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server
COPY src/lib/aiRequest.mjs ./src/lib/aiRequest.mjs
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO /dev/null http://localhost/api/health || exit 1
CMD ["node", "server/index.mjs"]
