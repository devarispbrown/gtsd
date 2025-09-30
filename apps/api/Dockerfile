# Multi-stage Dockerfile for GTSD API

# Stage 1: Base image with dependencies
FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Set working directory
WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/

# Install dependencies (using frozen lockfile for reproducible builds)
RUN pnpm install --frozen-lockfile --filter @gtsd/api...

# Stage 2: Build stage
FROM base AS build

# Copy source code
COPY apps/api ./apps/api
COPY tsconfig.json ./

# Build the application
WORKDIR /app/apps/api
RUN pnpm build

# Stage 3: Production stage
FROM node:20-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY --chown=nodejs:nodejs pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY --chown=nodejs:nodejs apps/api/package.json ./apps/api/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod --filter @gtsd/api...

# Copy built application
COPY --chown=nodejs:nodejs --from=build /app/apps/api/dist ./apps/api/dist
COPY --chown=nodejs:nodejs --from=build /app/apps/api/src/db/migrations ./apps/api/src/db/migrations

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Set environment
ENV NODE_ENV=production

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "apps/api/dist/index.js"]