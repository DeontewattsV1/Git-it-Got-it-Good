# Git-it-Got-it-Good Production Hardening

This production layer adds:

- Hardened Docker Compose
- Redis-backed session storage
- AES-256-GCM token encryption middleware
- GitHub App installation authentication
- Strict write gating
- Structured audit logging
- CI with exact dependency pinning, deterministic install checks, typecheck, lint, build, and high-severity audit gating

## Required setup

```bash
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Paste the generated key into `TOKEN_ENCRYPTION_KEY_BASE64`.

## Lockfile requirement

CI intentionally fails unless `package-lock.json` is committed.

```bash
npm install --package-lock-only --ignore-scripts
git add package-lock.json
git commit -m "Add deterministic npm lockfile"
```

## Run locally

```bash
npm ci --ignore-scripts
npm run typecheck
npm run lint
npm audit --audit-level=high
npm run build
```

## Run with Docker Compose

```bash
docker compose up --build
```

Health check:

```bash
curl http://localhost:3000/health
```

Readiness check:

```bash
curl http://localhost:3000/ready
```

## Safety defaults

Writes are disabled by default:

```bash
ALLOW_WRITES=false
```

To enable write-capable routes later, keep approval gating enabled:

```bash
ALLOW_WRITES=true
REQUIRE_APPROVAL_FOR_WRITES=true
BLOCK_DESTRUCTIVE_ACTIONS=true
```
