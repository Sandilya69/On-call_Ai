# ============================================
# OnCall Maestro — Dockerfile (PRD 9.2)
# ============================================
# Multi-stage build for production Node.js image.

# ── Stage 1: Build ───────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# ── Stage 2: Production ─────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy Prisma schema (needed for runtime)
COPY prisma ./prisma
RUN npx prisma generate

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S maestro && \
    adduser -S maestro -u 1001 -G maestro

# Create audio storage directory
RUN mkdir -p /app/storage/audio && chown -R maestro:maestro /app/storage

USER maestro

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health/live || exit 1

# Start with dumb-init for proper PID 1 signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
