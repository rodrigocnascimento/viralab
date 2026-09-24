# Viralab

Viralab is a YouTube Opportunity Intelligence platform focused on detecting promising channels, videos and niches before their growth becomes obvious.

The current MVP is dataset-first: provider discovery and ingestion build Viralab-owned data in PostgreSQL, while product reads such as Explorer query that dataset without proxying YouTube.

## Current capabilities

- asynchronous YouTube video discovery;
- canonical channel and video persistence;
- asynchronous channel enrichment;
- video statistics enrichment;
- explainable video-outlier model v1 and persisted opportunities;
- dataset-only Explorer API and Vue UI;
- Supabase Auth foundation plus anonymous Explorer allowance;
- Cloudflare-native queues, Workers, Hyperdrive and production delivery;
- Sentry browser monitoring through a first-party tunnel.

Historical observations, adaptive sampling, dataset lifecycle and asynchronous historical analytics are the next architectural stage. Their accepted direction is documented in `docs/architecture/ARCHITECTURE.md`; the detailed algorithm roadmap will be formalized separately after this documentation realignment.

## Current runtime

```text
Browser / Vue 3 + Vite
        |
        v
Cloudflare Edge / HTTP Worker (apps/api)
        |
        +--> PostgreSQL / Supabase through Hyperdrive
        |
        +--> viralab-discovery queue
                    |
                    v
             apps/discovery
                    |
                    +--> YouTube Data API
                    +--> canonical channels/videos
                    +--> video statistics
                    |
                    +--> viralab-channel-ingestion queue
                                  |
                                  v
                         apps/channel-ingestion
                                  |
                                  +--> YouTube Data API
                                  +--> canonical channel enrichment
                                  |
                                  v
                         PostgreSQL opportunities
                                  |
                                  v
                         GET /api/v1/opportunities
                                  |
                                  v
                              Explorer
```

PostgreSQL is the system of record. Cloudflare Queues coordinates asynchronous work. Redis/BullMQ and TypeORM belong only to the historical foundation and are not part of the target runtime.

## Requirements

- Node.js 22+
- pnpm 10+
- Docker with Docker Compose for local PostgreSQL
- a YouTube Data API v3 key for real provider smoke tests
- Wrangler/Cloudflare account when exercising hosted queue/Hyperdrive bindings

## Install and local database

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
```

`docker-compose.yml` runs PostgreSQL 16 for local development. Hosted production uses Supabase PostgreSQL; Workers connect through Cloudflare Hyperdrive.

## Workspace

```text
apps/
  api/                 Cloudflare HTTP Worker
  channel-ingestion/   Cloudflare channel-ingestion queue consumer
  discovery/           Cloudflare discovery queue consumer
  web/                 Vue 3 + Vite application and Sentry tunnel Worker

packages/
  auth/                provider-neutral authentication contracts/helpers
  database/            Drizzle schema, migrations and persistence adapters
  providers/           provider-neutral discovery/channel gateway contracts
  rate-limit/          rate-limit application boundary
  shared/              versioned API/queue/analytics contracts
  youtube/             YouTube Data API adapter, mapping, quota/error policy

docs/
  architecture/        architecture, ADRs and implemented case records
  operations/          operational runbooks
  product/             product-facing implementation decisions
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

CI does not require a live YouTube API key. Provider access is isolated behind `@viralab/providers` and `@viralab/youtube` and is mocked in automated tests.

## Current product flow

A discovery request is accepted asynchronously:

```http
POST /api/v1/discoveries
Content-Type: application/json

{"query":"homelab"}
```

Discovery performs bounded provider work, persists canonical entities and current statistics, and hands stale/new channels to the dedicated channel-ingestion queue. Current opportunity scoring uses an intentionally simple lifetime channel baseline; it is explicitly not a recent-growth or velocity model.

Explorer reads persisted opportunities only:

```http
GET /api/v1/opportunities
```

The browser does not query Supabase directly and product reads do not imply provider calls.

## Provider quota discipline

Provider quota is a shared platform resource. Product-query volume and provider-call volume are separate concerns.

The current implementation models provider operation costs and bounded work. The target architecture adds persistent quota budgeting across discovery, channel observations, video observations and operational reserve. Budget allocation will be runtime-configurable rather than embedded in scoring or provider adapters.

## Historical-data direction

The next data stage separates canonical current state from immutable time-series observations:

```text
channels/videos
      |
      v
Observation Scheduler
      |
      v
Observation Queue(s)
      |
      v
channel_observations / video_observations
      |
      v
asynchronous signal computation
      |
      +--> lifecycle policy
      +--> opportunity models
```

Accepted design decisions include a one-hour observation idempotency bucket, adaptive sampling with nominal 6h -> 12h -> 24h -> 72h intervals, and dataset lifecycle states ACTIVE/COLD/ARCHIVED driven initially by Recency, Growth and Discovery signals. These are architectural decisions, not claims that the corresponding runtime has already been implemented.

The existing video-outlier v1 remains the production model while historical data accumulates. A separate follow-up will formalize the algorithm roadmap for velocity, acceleration, temporal baselines, momentum/decay, breakout channels and niche intelligence.

## Health contract

`GET /health` returns `200` when PostgreSQL is reachable and `503` with a degraded status when it is not.

## Documentation

Start with `docs/architecture/ARCHITECTURE.md`. Accepted decisions are indexed under `docs/architecture/adr/README.md`. Case documents record the scope and rationale of delivered vertical slices and should be read as historical implementation records rather than as the current whole-system description.
