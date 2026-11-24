# syntax=docker/dockerfile:1

# ---- deps: install production+dev dependencies once ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# postinstall only copies Monaco (handled by the build stage's prebuild step).
RUN npm ci --ignore-scripts

# ---- build: generate Prisma client + Next.js production build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run db:generate && npm run build

# ---- runtime: Next.js server + Docker CLI for the Run/Scan sandbox ----
FROM node:22-alpine AS runtime
WORKDIR /app
# The Run and Security Scan features shell out to the host's Docker daemon.
RUN apk add --no-cache docker-cli
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
EXPOSE 3000
# Apply migrations, seed the master data (idempotent), then start Next.js.
CMD ["sh", "-c", "npm run db:deploy && npm run db:seed && npm run start"]
