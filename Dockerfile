FROM node:20-alpine AS build

ARG VITE_API_URL
ARG VITE_MUCAJEY_API_URL

WORKDIR /app
ENV NODE_ENV=development \
    VITE_API_URL=${VITE_API_URL} \
    VITE_MUCAJEY_API_URL=${VITE_MUCAJEY_API_URL}

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
    && chown -R nginx:nginx /var/cache/nginx /var/run/nginx /var/log/nginx \
    && apk add --no-cache gettext
COPY --chown=nginx:nginx nginx.conf /etc/nginx/nginx.conf

# Copy built assets
COPY --from=build --chown=nginx:nginx /app/dist ./

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q --spider http://127.0.0.1:8080/ || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
USER nginx

CMD ["nginx", "-g", "daemon off;"]
