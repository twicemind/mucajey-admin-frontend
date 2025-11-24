FROM node:20-alpine AS build

WORKDIR /app
ENV NODE_ENV=development

# Install dependencies with lockfile fidelity (include dev deps for build)
COPY package*.json ./
RUN npm ci --include=dev

# Build production bundle
COPY . .
RUN npm run build

# Runtime: nginx serving the built SPA
FROM nginx:1.27-alpine

WORKDIR /usr/share/nginx/html

# Clean default site and copy hardened config
RUN rm /etc/nginx/conf.d/default.conf \
    && mkdir -p /var/cache/nginx /var/run/nginx /var/log/nginx \
    && chown -R nginx:nginx /var/cache/nginx /var/run/nginx /var/log/nginx
COPY --chown=nginx:nginx nginx.conf /etc/nginx/nginx.conf

# Copy built assets
COPY --from=build /app/dist ./

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q --spider http://127.0.0.1:8080/ || exit 1

USER nginx

CMD ["nginx", "-g", "daemon off;"]
