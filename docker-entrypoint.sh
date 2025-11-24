#!/bin/sh
set -e

TEMPLATE_PATH="/usr/share/nginx/html/runtime-config.template.js"
OUTPUT_PATH="/usr/share/nginx/html/runtime-config.js"

API_BASE_RUNTIME="${ADMIN_BACKEND_BASE_URL:-${VITE_API_URL:-}}"
MUCAJEY_BASE_RUNTIME="${ADMIN_FRONTEND_MUCAJEY_API_URL:-${VITE_MUCAJEY_API_URL:-}}"

if [ -f "$TEMPLATE_PATH" ]; then
  export RUNTIME_API_BASE_URL="$API_BASE_RUNTIME" \
         RUNTIME_MUCAJEY_API_URL="$MUCAJEY_BASE_RUNTIME"

  envsubst '${RUNTIME_API_BASE_URL} ${RUNTIME_MUCAJEY_API_URL}' < "$TEMPLATE_PATH" > "$OUTPUT_PATH"
fi

if [ ! -s "$OUTPUT_PATH" ]; then
  echo 'window.__APP_CONFIG__ = {};' > "$OUTPUT_PATH"
fi

exec "$@"
