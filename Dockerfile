# ─────────────────────────────────────────────
# Stage 1: Build
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files, workspace manifests, and packages
COPY package.json package-lock.json ./
COPY apps/groovelab/package.json ./apps/groovelab/
COPY packages/ ./packages/

# Install dependencies cleanly without git hooks
RUN npm ci --ignore-scripts

# Copy the rest of the app source and build scripts
COPY apps/groovelab/ ./apps/groovelab/
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

# Remove default nginx files and ensure snippets directory exists
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/* && mkdir -p /etc/nginx/snippets

# Copy built assets from builder
COPY --from=builder /app/apps/groovelab/dist /usr/share/nginx/html

# Copy reusable security headers into snippets (not into conf.d to prevent duplicate http block inclusion)
COPY apps/groovelab/nginx.security.conf /etc/nginx/snippets/security-headers.conf
COPY apps/groovelab/nginx.default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
