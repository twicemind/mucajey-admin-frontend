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
RUN rm -rf dist .next build \
    && npm run build

FROM node:20-alpine AS runtime

ARG VITE_API_URL
ARG VITE_MUCAJEY_API_URL

WORKDIR /app
ENV NODE_ENV=production \
    VITE_API_URL=${VITE_API_URL} \
    VITE_MUCAJEY_API_URL=${VITE_MUCAJEY_API_URL}

COPY --from=build /app .
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh && \
    apk add --no-cache gettext

EXPOSE 4173

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "start"]
