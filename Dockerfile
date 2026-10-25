# ==========================================
# Stage 1: Builder
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy application source code
COPY . .

# Pass version and commit hash into build environment
ARG APP_VERSION=1.0.0
ARG GIT_COMMIT=unknown
ENV VITE_APP_VERSION=$APP_VERSION
ENV VITE_GIT_COMMIT=$GIT_COMMIT

# Build Vite SPA production bundle to ./dist
RUN npm run build

# ==========================================
# Stage 2: Runner
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies and tsx for server execution
RUN npm ci --omit=dev && npm install tsx --no-save

# Copy built frontend SPA assets from builder stage
COPY --chown=node:node --from=builder /app/dist ./dist

# Copy Hono server source code
COPY --chown=node:node server ./server

# Switch to unprivileged built-in node user for security
USER node

# Expose server port
EXPOSE 3000

# Docker healthcheck querying /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --spider -q http://localhost:3000/api/health || exit 1

# Start Hono server
CMD ["npm", "run", "start"]
