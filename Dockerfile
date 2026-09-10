# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependency definition files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including devDependencies required for build)
# Skip scripts initially to avoid build failures
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# Copy application source code
COPY . .

# Now rebuild to allow native modules to compile
# This runs the build scripts that were skipped above
RUN pnpm install --no-save

# Build TypeScript and Vite frontend assets
# Note: The script is "build:vite" in package.json, not "build"
RUN pnpm run build:vite

# Prune dev dependencies for production image optimization
RUN pnpm prune --prod

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
