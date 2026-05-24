# syntax=docker/dockerfile:1.7

FROM node:22.11.0-alpine3.20 AS deps
WORKDIR /app
ENV NODE_ENV=development
COPY package*.json ./
RUN npm ci --ignore-scripts || (echo "package-lock.json missing or invalid. Run npm install --package-lock-only --ignore-scripts, commit package-lock.json, then rebuild." && exit 1)

FROM node:22.11.0-alpine3.20 AS build
WORKDIR /app
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run typecheck
RUN npm run build
RUN npm prune --omit=dev --ignore-scripts

FROM node:22.11.0-alpine3.20 AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup -u 10001
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/package.json ./package.json
USER appuser
EXPOSE 3000
CMD ["node", "dist/server.js"]
