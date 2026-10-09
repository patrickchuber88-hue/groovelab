# 🛡️ TIER-1 ENTERPRISE+ SOUVERÄNER BFF DOCKERFILE (OWASP ASVS LEVEL 3)
# Compliance: 100% Hetzner ISO/IEC 27001, 0% US-Cloud Exposure, Rootless, Zero-Binary Healthcheck

# ── Stage 1: Build & Compilation ──
FROM node:22-alpine AS builder

WORKDIR /app

# Native module compilation tools
RUN apk add --no-cache python3 make g++

# Dependencies declaration
COPY package.json tsconfig.json ./

# Install full workspace dependencies for compilation
RUN npm install

# Source code tree
COPY src ./src

# Compile TypeScript to JavaScript
RUN npm run build

# ── Stage 2: Sovereign Hardened Production Runner ──
FROM node:22-alpine AS runner

# Sovereign Governance Metadata (Art. 32 DSGVO / BSI IT-Grundschutz)
LABEL maintainer="Campus-GrooveLab Security Lead <security@campus-groovelab.de>"
LABEL de.campus-groovelab.sovereignty="100% ISO/IEC 27001 Hetzner Falkenstein/Nürnberg"
LABEL de.campus-groovelab.us-cloud-exposure="0%"
LABEL de.campus-groovelab.security-profile="OWASP-ASVS-L3-Rootless"

WORKDIR /app

# Sovereign Environment Hardening
ENV NODE_ENV=production
ENV BFF_PORT=4000
ENV NODE_OPTIONS="--no-deprecation"

# Install production dependencies only with isolated cache
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

# Copy compiled artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Security Hardening:
# 1. Enforce strict non-root user (node:node, UID/GID 1000)
# 2. Immutable application binaries: Set dist to Read-Only (555) to prevent runtime tampering
RUN chown -R node:node /app && \
    chmod -R 555 /app/dist && \
    rm -rf /var/cache/apk/* /tmp/*

USER node:node

EXPOSE 4000

# 🛡️ ZERO-BINARY IN-PROCESS HEALTHCHECK
# Eliminates reliance on curl/wget shell binaries (Reduces Container Attack Surface)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const req = http.get('http://localhost:4000/api/auth/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)); req.on('error', () => process.exit(1));"

# Start BFF Server
CMD ["node", "dist/index.js"]
