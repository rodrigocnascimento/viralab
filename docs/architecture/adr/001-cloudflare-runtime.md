# ADR-001: Adopt Cloudflare-native runtime for the MVP

- Status: Accepted
- Date: 2026-09-16
- Decision owners: Viralab
- Scope: Case 01.2B and subsequent MVP cases

## Context

The initial foundation assumed conventional long-running Node.js processes: Fastify API, BullMQ worker, Redis, PostgreSQL and production containers intended for Fly.io. That architecture is familiar and portable, but creates multiple always-on managed resources before Viralab has validated its product hypothesis.

Viralab's early workload is unusually compatible with event-driven infrastructure: a static web application, a relatively small HTTP API, scheduled discovery, asynchronous fan-out, external YouTube API calls, and PostgreSQL persistence. The worker does not need to be a continuously running process if queue consumption is platform-managed.

The objective is not merely to find a free host. We want to minimize fixed operational cost and infrastructure ownership without creating a throwaway architecture.

## Decision

Use Cloudflare as the primary MVP runtime:

- Vue/Vite static assets at the edge;
- Workers for HTTP API;
- Cron Triggers for bounded scheduling;
- Cloudflare Queues for asynchronous jobs and consumers;
- Hyperdrive for PostgreSQL connectivity/pooling/acceleration;
- Supabase PostgreSQL as the managed system of record.

Application/domain code will remain isolated from Cloudflare runtime APIs through adapter boundaries.

## Alternatives considered

### Fly.io + managed PostgreSQL + Redis

Advantages: conventional containers; straightforward Fastify/BullMQ operation; low migration effort from the initial foundation.

Rejected for the MVP because multiple paid/always-on resources create fixed cost and operational surface before product validation.

### Render/Railway/Koyeb-style container PaaS

Advantages: conventional Node deployment and low code migration.

Not selected as the target architecture because free-tier availability/sleep/persistence characteristics can change and the long-running BullMQ worker remains an architectural requirement rather than a product requirement.

### Cloudflare for web/API but external persistent worker

Advantages: smaller migration; BullMQ could remain.

Rejected because it retains Redis and an always-on worker solely to preserve an implementation choice. Platform queues provide the required asynchronous delivery model directly.

### Everything in one Cron invocation

Advantages: minimal components.

Rejected because discovery can fan out, upstream calls fail independently, quota must be controlled, and long jobs need retry/isolation. A monolithic cron would couple scheduling and processing and become fragile as the dataset grows.

## Consequences

Positive:

- near-zero fixed infrastructure footprint during MVP validation;
- scheduler, queues and consumers are managed primitives;
- no Redis operational dependency;
- horizontal event processing without maintaining a worker fleet;
- deployment geographically close to users for HTTP/static paths;
- clear scale path within the same event model.

Negative/trade-offs:

- runtime is not a traditional Node server;
- Worker CPU/runtime limits must be considered in algorithm design;
- Cloudflare configuration becomes deployment-critical;
- local development requires Wrangler/runtime emulation;
- some Node libraries may require compatibility validation;
- migration away from Cloudflare would require replacing transport/scheduling/queue adapters.

## Guardrails

No business service may require Cloudflare-specific Request/Queue/ExecutionContext types. Queue payloads are versioned contracts. PostgreSQL remains canonical. Compute-heavy future algorithms may move to another runtime without moving the product's data model or application contracts.
