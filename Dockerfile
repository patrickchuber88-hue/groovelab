# ─────────────────────────────────────────────
# Stage 1: Build
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files and app package files
COPY package.json package-lock.json ./
COPY apps/groovelab/package.json ./apps/groovelab/

RUN npm ci

# Copy the rest of the app source and packages
COPY apps/groovelab/ ./apps/groovelab/
COPY packages/ ./packages/

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

# SPA routing: all unknown paths → index.html
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    \n\
    # Optimization: Tuned gzip for high traffic\n\
    gzip on;\n\
    gzip_vary on;\n\
    gzip_proxied any;\n\
    gzip_comp_level 6;\n\
    gzip_min_length 256;\n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;\n\
    \n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
        # Optimization: Prevent browser caching index.html to ensure instant updates\n\
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";\n\
    }\n\
    location /assets/ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
        # Optimization: Turn off logging for static assets to drastically reduce disk I/O\n\
        access_log off;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
