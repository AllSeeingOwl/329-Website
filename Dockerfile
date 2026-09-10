# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm and set environment variable
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_SCRIPT_SHELL=/bin/sh

# Copy dependency definition files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including devDependencies required for build), ignoring scripts like husky
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# Copy application source code
COPY . .

# Build TypeScript server code and Vite frontend assets into dist/
RUN pnpm run build

# Prune dev dependencies for production image optimization, ignoring scripts
RUN pnpm prune --prod --ignore-scripts

# Stage 2: Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy necessary files from builder stage
COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Expose port 3000
EXPOSE 3000

# Healthcheck for container health verification
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start production Express server
CMD ["node", "dist/server.js"]
