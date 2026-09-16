# Foundation architecture

## Scope

Case 01 establishes the runtime boundaries and local infrastructure only. YouTube discovery, ingestion, analytics, snapshots and production deployment are intentionally deferred.

## Runtime topology

```text
Vue 3 / Vite (apps/web)
        |
        | HTTP
        v
Fastify (apps/api) ----> PostgreSQL 16

BullMQ Worker (apps/worker) ----> Redis 7
```

## Packages

- `@viralab/shared`: environment contracts and code genuinely shared by runtimes.
- `@viralab/database`: TypeORM DataSource and migrations. Domain entities will be added only when their Cases require them.

## Decisions

### Monorepo

pnpm workspaces keep the three deployable runtimes and shared packages independently buildable without introducing a monorepo orchestrator in the MVP.

### Database

TypeORM uses explicit migrations with `synchronize: false`. This makes schema evolution reproducible and safe for later environments.

### Environment

Runtime environment variables are parsed at process startup with Zod. Invalid configuration fails fast instead of surfacing later as partial runtime failures.

### Worker

The worker owns a BullMQ `Worker` connected to Redis. Queue producers, schedules, retry policies and quota-control semantics belong to later ingestion Cases.

### Health

`GET /health` verifies the API process and performs a live PostgreSQL `SELECT 1`. It returns HTTP 503 with `degraded` when PostgreSQL cannot be reached.

## Deferred to Case 01.1

GitHub Actions, Fly.io configuration, production Dockerfiles and deployment concerns are intentionally excluded from this Case.
