# ─────────────────────────────────────────────
# Stage 1: Build
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files and app package files
COPY package.json package-lock.json ./
COPY apps/groovelab/package.json ./apps/groovelab/

RUN npm ci

# Copy the rest of the app source, packages, and build scripts
COPY apps/groovelab/ ./apps/groovelab/
COPY packages/ ./packages/
COPY scripts/ ./scripts/

# Build args for Supabase (injected by Coolify as env vars at build time)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build:groovelab

# ─────────────────────────────────────────────
# Stage 2: Serve with nginx
# ─────────────────────────────────────────────
FROM nginx:stable-alpine AS production

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder
COPY --from=builder /app/apps/groovelab/dist /usr/share/nginx/html

# Copy hardened Nginx security configuration and server definition
COPY apps/groovelab/nginx.security.conf /etc/nginx/conf.d/security-headers.conf
COPY apps/groovelab/nginx.default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
