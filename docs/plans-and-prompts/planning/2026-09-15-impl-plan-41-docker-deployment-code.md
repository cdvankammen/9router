# Implementation Plan 41 — Docker & Deployment Hardening — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #docker #deployment #compose #healthcheck #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (existing `Dockerfile`, `docker-compose.yml`, `DOCKER.md`, `start.sh`, `custom-server.js` standalone wrapper, `next.config.mjs` output mode, `package.json` scripts).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — build the image, run compose, hit `/healthz`, exercise upgrade/rollback.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-41-docker-deployment.md`, `../research/9router/impl-plan-78-multi-environment-deployment.md`, `../research/9router/impl-plan-39-migration-backup-restore.md`.

## Scope

**In scope:** multi-stage Dockerfile (build → runtime, non-root, pinned bases); compose profiles (minimal/full/dev) with health checks + data volume; `/healthz` endpoint in `custom-server.js`; documented upgrade (backup → pull → migrate → verify) + rollback; structured stdout logs.
**Out of scope:** Kubernetes manifests; remote registries/CI publishing; secrets manager integration.

## Milestones

### M1 — Multi-stage Dockerfile

**Reference code (`Dockerfile` — replace):**

```dockerfile
# ---- build stage ----
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime stage ----
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Non-root user
RUN useradd --create-home --uid 10001 ninerouter
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/custom-server.js ./custom-server.js
COPY --from=build /app/package.json ./package.json
# Data dir (usage/logs live under ~/.9router → HOME must be writable)
ENV HOME=/home/ninerouter
RUN mkdir -p /home/ninerouter/.9router && chown -R ninerouter:ninerouter /home/ninerouter
USER ninerouter
EXPOSE 20128
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:20128/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "custom-server.js"]
```

**Acceptance criteria:** image builds; runs as non-root; healthcheck passes; image size minimized vs current.

### M2 — Compose profiles + health checks + volumes

**Reference code (`docker-compose.yml` — replace):**

```yaml
services:
  ninerouter:
    build: .
    image: ninerouter:local
    ports:
      - "20128:20128"
    environment:
      - PORT=20128
      - HOSTNAME=0.0.0.0
      - JWT_SECRET=${JWT_SECRET:?set JWT_SECRET}
      - INITIAL_PASSWORD=${INITIAL_PASSWORD:?set INITIAL_PASSWORD}
      - API_KEY_SECRET=${API_KEY_SECRET:?set API_KEY_SECRET}
      - MACHINE_ID_SALT=${MACHINE_ID_SALT:?set MACHINE_ID_SALT}
    volumes:
      - ninerouter-data:/home/ninerouter/.9router
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:20128/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s
    restart: unless-stopped

  # Optional: cloud-sync sidecar (profile: full)
  # sync:
  #   profiles: ["full"]
  #   image: ninerouter:local
  #   command: ["node", "scripts/sync-worker.mjs"]
  #   volumes: [ninerouter-data:/home/ninerouter/.9router]

volumes:
  ninerouter-data:
```

**Acceptance criteria:** `docker compose up` works; healthcheck green; data persists across restarts; profiles documented.

### M3 — /healthz endpoint

**Reference code (`custom-server.js` addition):**

```js
// In the request handler, before routing:
if (req.url === "/healthz") {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", uptime: process.uptime(), version: process.env.npm_package_version ?? "dev" }));
  return;
}
```

**Acceptance criteria:** `/healthz` returns 200 with JSON; used by compose healthcheck.

### M4 — Deployment workflows doc + tests

**Reference code (`DOCKER.md` additions):**

```markdown
## Upgrade workflow
1. Backup: `docker compose exec ninerouter node -e "fetch('http://127.0.0.1:20128/api/v1/backup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'create',label:'pre-upgrade'})})"`
2. Pull new image: `docker compose pull && docker compose up -d`
3. Migrations run automatically on boot (see plan 39 migrator).
4. Verify: `curl http://localhost:20128/healthz` + dashboard smoke test.
## Rollback
- `docker compose up -d --force-recreate <previous-image-tag>` (keep previous tag; data volume is untouched).
```

**Files touched:** `Dockerfile`, `docker-compose.yml`, `DOCKER.md`, `custom-server.js`, `tests/unit/deployment.test.js` (new: healthz handler unit test, config validation).

**Acceptance criteria:** docs complete; healthz unit-tested; upgrade/rollback steps verified manually once.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Next standalone output | Missing assets | Copy static/public explicitly |
| Non-root user | Writable dirs | HOME + data dir chown |
| Env secrets | Compose leakage | `${VAR:?}` required vars; .env not committed |
| Upgrade breakage | Data loss | Backup-first workflow; volume untouched on rollback |

## Verification

- Unit: healthz handler
- Manual: `docker build` → `docker compose up` → healthcheck → upgrade/rollback drill
- Regression: `tests/__baseline__/verify-no-regression.mjs`