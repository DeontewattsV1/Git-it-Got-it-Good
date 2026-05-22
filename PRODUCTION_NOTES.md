# Production Notes – Git Manager MCP

This document outlines hardening requirements before deploying the Git Manager MCP server to production.

---

## OAuth & Identity

The starter implementation includes OAuth discovery endpoints and delegates user login to GitHub OAuth.

Before production deployment:

- Replace in-memory OAuth storage with Redis or PostgreSQL.
- Encrypt stored GitHub access tokens using a dedicated encryption key.
- Rotate encryption keys on a schedule.
- Validate OAuth state parameters and enforce CSRF protection.
- Restrict callback origins to known domains.

---

## Token Storage

- Never log access tokens.
- Store tokens encrypted at rest.
- Use short-lived tokens when possible.
- Prefer GitHub App installation tokens over broad OAuth tokens for fine-grained repository permissions.

---

## Dependency Management

- Pin exact dependency versions in package.json.
- Use `npm ci` for deterministic installs.
- Enable Dependabot for automated security updates.
- Run `npm audit` in CI and fail on high-severity vulnerabilities.

---

## API Hardening

- Add rate limiting (per-user and per-IP).
- Add request origin validation.
- Enforce strict JSON schema validation on all tool inputs.
- Disable any unused endpoints.

---

## Write Safety Controls

- Default `ALLOW_WRITES=false` in production.
- Require explicit approval tokens for all write operations.
- Block destructive actions (repository deletion, secret writes, force pushes).
- Log every mutation attempt, including denied actions.

---

## Audit & Observability

- Persist structured audit logs (JSON format).
- Log tool name, arguments (redacted), user ID, timestamp, result status.
- Integrate with centralized logging (Datadog, CloudWatch, ELK).
- Monitor unusual write attempts or permission escalations.

---

## Infrastructure

- Enforce HTTPS (TLS 1.2+).
- Use a reverse proxy (NGINX or equivalent) with request size limits.
- Run the server inside a minimal container image.
- Use non-root containers.

---

## CI/CD

- Build and test on every commit.
- Run TypeScript type checks and linting.
- Enforce branch protection rules on main.

---

## Final Deployment Checklist

- [ ] Redis or Postgres configured for session storage
- [ ] Token encryption verified
- [ ] Rate limiting active
- [ ] Write actions gated by approval tokens
- [ ] Structured audit logging enabled
- [ ] HTTPS enforced
- [ ] Dependency versions pinned

This scaffold was generated in a sandbox environment. `npm install` and `npm run build` were not executed here. Before production, validate dependency integrity, run builds locally or in CI, and verify all environment variables are properly configured.
