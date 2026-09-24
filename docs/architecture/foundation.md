# Foundation architecture — historical record

Status: Superseded as current architecture
Original scope: Case 01
Superseded by: ADR-001, ADR-003, ADR-004 and `ARCHITECTURE.md`

## Purpose of this document

This file preserves the initial Case 01 foundation decisions for repository history. It is **not** the current Viralab runtime architecture.

The original foundation intentionally established conventional Node.js boundaries before the production runtime had been selected:

```text
Fastify API        -> PostgreSQL 16 / TypeORM
BullMQ Worker      -> Redis 7
Docker containers  -> candidate Fly.io deployment
```

Subsequent investigation selected a Cloudflare-native architecture. The following original choices are therefore historical only:

- Fastify as the production HTTP runtime;
- BullMQ as the hosted asynchronous transport;
- Redis as a production queue dependency;
- TypeORM as the persistence toolkit;
- long-running production containers/Fly.io as the canonical deployment target.

Do not add new product behavior to those superseded paths.

## What remains true from Foundation

The following principles survived the runtime migration and remain part of the current architecture:

- a pnpm/TypeScript monorepo with explicit application/package boundaries;
- PostgreSQL as the system of record;
- explicit migrations rather than runtime schema synchronization;
- environment validation and secret separation;
- a health contract that verifies database reachability;
- asynchronous work isolated from HTTP request handling;
- infrastructure adapters kept outside business/application contracts;
- automated lint, typecheck, tests and build gates.

## Current replacements

| Foundation choice | Current choice |
| --- | --- |
| Fastify production API | Cloudflare HTTP Worker |
| BullMQ | Cloudflare Queues |
| Redis queue backend | Managed queue primitive; no Redis production dependency |
| TypeORM | Drizzle |
| Fly.io/container-first production | Cloudflare Workers + Hyperdrive |
| local Docker PostgreSQL + Redis | local PostgreSQL remains useful; Redis is no longer required |

The durable decisions are recorded in the ADRs:

- ADR-001 — Cloudflare-native runtime;
- ADR-002 — Supabase managed PostgreSQL;
- ADR-003 — Cloudflare Queues;
- ADR-004 — Drizzle;
- ADR-005 — scheduler/processing separation.

For the current whole-system view, read `docs/architecture/ARCHITECTURE.md`.
