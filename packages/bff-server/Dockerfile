# 🛡️ Tier-1 Enterprise BFF Dockerfile (Multi-Stage, Alpine, Non-Root)

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies needed for node-gyp (if any native modules are used)
RUN apk add --no-cache python3 make g++

# Copy package.json and tsconfig
COPY package.json tsconfig.json ./

# Install all dependencies (including dev for building)
RUN npm install

# Copy source code
COPY src ./src

# Build TypeScript to JavaScript
RUN npm run build

# Stage 2: Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

# Define environment variables
ENV NODE_ENV=production
ENV BFF_PORT=4000

# Security: Do not run as root
# Alpine node image comes with a 'node' user
RUN chown -R node:node /app

USER node

# Copy package.json to install only production dependencies
COPY --chown=node:node package.json ./

# Install only production dependencies for a tiny image size
RUN npm install --omit=dev --ignore-scripts

# Copy the compiled dist folder from the builder stage
COPY --chown=node:node --from=builder /app/dist ./dist

# Expose the port
EXPOSE 4000

# Healthcheck for orchestration (e.g., Docker Swarm, Kubernetes)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/auth/health || exit 1

# Start the server
CMD ["node", "dist/index.js"]
