# mucajey-admin-frontend

React/TypeScript Admin UI built with Vite.

## Docker (Production)
```bash
# Build optimized bundle and nginx image (serves on 8080)
docker build -t mucajey-admin-frontend:latest .

# Run container
docker run --rm -p 8080:8080 mucajey-admin-frontend:latest
```

- SPA routing via nginx `try_files` fallback to `index.html`
- Security headers and asset caching configured in `nginx.conf`
- Healthcheck probes `http://127.0.0.1:8080/`

## Development
```bash
npm install
npm run dev -- --host
```

Other scripts:
- `npm run build` – Production build to `dist/`
- `npm run lint` – ESLint
- `npm run preview` – Preview built assets
