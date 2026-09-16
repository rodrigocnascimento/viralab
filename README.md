# Viralab

Viralab is a YouTube Opportunity Intelligence platform focused on detecting promising channels, videos and niches before their growth becomes obvious.

The repository now includes the **Case 02 — YouTube Discovery** vertical slice on top of the accepted Cloudflare-native architecture.

## Current runtime

```text
Vue/Vite web
    |
    v
Cloudflare HTTP Worker (apps/api)
    |
    +--> PostgreSQL / Supabase through Hyperdrive
    +--> Cloudflare Queue: viralab-discovery
                         |
                         v
                 apps/discovery
                         |
                         +--> YouTube Data API
                         +--> PostgreSQL / Supabase through Hyperdrive
```

PostgreSQL is the system of record. Cloudflare Queues coordinates asynchronous work. Redis/BullMQ and TypeORM are no longer part of the target runtime.

## Requirements

- Node.js 22+
- pnpm 10+
- Docker with Docker Compose for local PostgreSQL
- a YouTube Data API v3 key for real discovery smoke tests
- Wrangler/Cloudflare account when exercising hosted queue/Hyperdrive bindings

## Install and local database

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
```

`docker-compose.yml` runs PostgreSQL 16 only. Hosted production uses Supabase PostgreSQL; Workers should connect through Cloudflare Hyperdrive.

## Workspace

```text
apps/
  api/          Cloudflare HTTP Worker
  discovery/    Cloudflare Queue consumer
  web/          Vue 3 + Vite application
packages/
  database/     Drizzle schema, migrations and repositories
  shared/       versioned API/queue/analytics contracts
  youtube/      YouTube Data API gateway, mapping, quota/error policy
docs/
  architecture/
```

## Commands

```bash
pnpm dev          # API Worker + discovery Worker + web
pnpm build        # build every workspace package
pnpm lint         # lint every workspace package
pnpm typecheck    # typecheck every workspace package
pnpm test         # run tests in every workspace package
pnpm db:migrate   # apply Drizzle migrations
pnpm db:generate  # generate migrations from schema changes
```

CI never needs a live YouTube API key. Provider access is isolated behind the `@viralab/youtube` gateway and mocked in automated tests.

## Case 02 discovery contract

Submit a search intent with:

```http
POST /api/v1/discoveries
Content-Type: application/json

{"query":"homelab"}
```

The API returns `202 Accepted` after recording the semantic `search_performed` BI event and enqueueing versioned discovery work:

```json
{
  "id": "<job-uuid>",
  "status": "accepted",
  "query": "homelab"
}
```

The queue consumer performs one bounded YouTube `search.list` call, normalizes provider results and upserts canonical `channels` and `videos`. Unique constraints on YouTube IDs make duplicate queue delivery safe. A repeated intentional search still creates another `search_performed` event because it is a new business action.

## YouTube quota discipline

Case 02 explicitly models `search.list` as a 100-unit operation. Discovery is bounded to at most 50 results per job and does not recursively paginate. Known entities are not refreshed through repeated search; later ingestion cases use ID-based endpoints for refresh and historical observations.

Provider errors are classified into retryable rate/provider failures versus permanent invalid/auth/quota failures so Cloudflare Queue retry behavior does not accidentally burn quota.

## Real-data smoke test

1. Provision/run PostgreSQL and apply `pnpm db:migrate`.
2. Create the `viralab-discovery` Cloudflare Queue.
3. Configure the same Hyperdrive binding for `apps/api` and `apps/discovery`, or use `DATABASE_URL` for local Worker development.
4. Set `YOUTUBE_API_KEY` as a secret on the discovery Worker.
5. Start/deploy both Workers.
6. `POST /api/v1/discoveries` with `{"query":"homelab"}`.
7. Confirm a `202` response, queue consumption and `discovery.persisted` structured log.
8. Query `channels`, `videos` and `analytics_events` in PostgreSQL.
9. Submit `homelab` again and verify channel/video `youtube_id` values remain unique while a second `search_performed` event is appended.

## Health contract

`GET /health` returns `200` when PostgreSQL is reachable and `503` with a degraded status when it is not.

## Architecture

Start with `docs/architecture/ARCHITECTURE.md` and the accepted ADRs under `docs/architecture/adr/`. The detailed Case 02 design is in `docs/architecture/case-02-youtube-discovery.md`.
