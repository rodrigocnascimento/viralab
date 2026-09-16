# Viralab

Viralab is a YouTube Opportunity Intelligence platform focused on detecting promising channels and videos before their growth becomes obvious.

This repository currently contains **Case 01 — Foundation**. YouTube-specific discovery and analytics are intentionally not implemented yet.

## Requirements

- Node.js 22+
- pnpm 10+
- Docker with Docker Compose

## Quick start

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm dev
```

Open:

- Web: http://localhost:5173
- API health: http://localhost:3000/health

The home page calls the API health endpoint and displays API/PostgreSQL status. The worker starts a BullMQ worker and reports Redis connectivity in its logs.

## Workspace

```text
apps/
  api/       Fastify HTTP API
  web/       Vue 3 + Vite application
  worker/    BullMQ background worker
packages/
  database/  TypeORM DataSource and migrations
  shared/    shared runtime contracts/environment validation
docs/
  architecture/
```

## Commands

```bash
pnpm dev          # API + web + worker in watch mode
pnpm build        # build every workspace package
pnpm lint         # lint every workspace package
pnpm typecheck    # typecheck every workspace package
pnpm test         # run tests in every workspace package
pnpm db:migrate   # apply pending TypeORM migrations
pnpm db:revert    # revert the last TypeORM migration
```

## Local infrastructure

`docker-compose.yml` runs PostgreSQL 16 and Redis 7 with persistent local volumes and health checks.

Default development credentials live only in `.env.example`/Compose and are not intended for production.

## Health contract

`GET /health` returns `200` when PostgreSQL is reachable and `503` with a degraded status when it is not.

Example:

```json
{
  "status": "ok",
  "service": "viralab-api",
  "dependencies": { "database": "up" },
  "timestamp": "2026-09-16T00:00:00.000Z"
}
```

## Architecture

See `docs/architecture/foundation.md` for Case 01 decisions and boundaries.

## Roadmap

Case 01.1 adds CI/CD and Fly.io deployment. Case 02 begins YouTube Discovery. Production/deployment configuration is deliberately excluded from this branch.
