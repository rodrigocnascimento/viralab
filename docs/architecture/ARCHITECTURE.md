# Viralab Architecture

Status: Accepted for Case 01.2B
Last updated: 2026-09-16

## 1. Purpose

Viralab is a YouTube Opportunity Intelligence platform. Its core hypothesis is that useful signals can be detected before a channel, video, or niche becomes obviously viral. The durable product asset is not a trending page: it is Viralab's own historical dataset and the intelligence derived from changes in that dataset over time.

This document defines the target architecture beginning with Case 01.2B. It intentionally replaces the container-first Fastify + BullMQ + Redis deployment model introduced during the initial foundation with a Cloudflare-native event-driven runtime while retaining PostgreSQL as the system of record.

The architecture optimizes for: very low fixed infrastructure cost during validation; reliable scheduled ingestion; asynchronous fan-out; explicit control of YouTube API quota; historical data integrity; idempotent processing; portability of the domain and data model; observability; and a credible scale-up path without an early rewrite of the product core.

## 2. Architectural principles

1. Historical data is the moat. Raw observations and normalized snapshots are first-class product data.
2. PostgreSQL is the system of record. Cloudflare primitives coordinate execution; they do not become the canonical analytical database.
3. The scheduler schedules; it does not perform expensive discovery work.
4. Queues carry commands/references, not large domain state.
5. Consumers are idempotent. Queue delivery is treated as at-least-once.
6. Quota is a resource. Every YouTube API operation must have an understood quota cost and an execution budget.
7. HTTP transport, scheduled execution, queue delivery, persistence, and YouTube access are adapters around application/domain code.
8. Prefer managed/serverless infrastructure while the product hypothesis is being validated.
9. Avoid provider coupling in business rules. Cloudflare-specific types should terminate at adapter boundaries.
10. Observability and replayability are part of ingestion correctness, not optional production polish.

## 3. System context

```text
Users
  |
  v
Cloudflare Edge
  |
  +--> Vue/Vite static assets
  |
  +--> HTTP Worker API ------------------------------+
                                                     |
Cron Trigger                                         |
  |                                                  |
  v                                                  |
Discovery Scheduler --> Cloudflare Queues            |
                         |                            |
                         v                            |
                   Queue Consumer                    |
                         |                            |
                         +--> YouTube Data API        |
                         |                            |
                         +--> Hyperdrive -------------+
                                  |
                                  v
                          Supabase PostgreSQL
```

External systems are deliberately few:

- YouTube Data API: authoritative upstream source for discovery and channel/video observations.
- Cloudflare: edge runtime, static delivery, schedules, queues, queue consumers, deployment and database connection acceleration/pooling through Hyperdrive.
- Supabase: managed PostgreSQL only. Viralab does not require Supabase Auth, browser database access, PostgREST, or RLS for this architecture.
- GitHub Actions: quality gates and deployment automation.

## 4. Runtime topology

### 4.1 Web

The Vue 3/Vite application is built into static assets and served at the Cloudflare edge. It communicates only with the Viralab HTTP API. The browser never receives PostgreSQL credentials and does not query Supabase directly.

### 4.2 HTTP API

The API executes in a Cloudflare Worker. The Worker entry point owns protocol concerns: request parsing, routing, validation boundary, authentication when introduced, response serialization, request correlation and mapping domain/application errors to HTTP responses.

Application services must not depend on Request, Response, ExecutionContext, Cloudflare Queue, Hyperdrive bindings, or Wrangler-specific configuration.

### 4.3 Scheduler

Cron Trigger invokes `scheduled()`. The scheduler should do bounded coordination work only: acquire/verify a logical run, decide what discovery work is due, enforce budget/policy, create work records when applicable, enqueue messages, and terminate.

It must not scan an unbounded number of channels, recursively crawl YouTube, or calculate large analytical models inline.

### 4.4 Queues and consumers

Cloudflare Queues replaces Redis/BullMQ for hosted asynchronous execution. Queue messages represent explicit work such as discovering a seed/query, refreshing a channel, refreshing recent videos, or calculating a derived signal.

A message should contain stable identifiers and execution metadata rather than copied entities. Example envelope:

```json
{
  "version": 1,
  "type": "channel.refresh",
  "jobId": "01J...",
  "runId": "01J...",
  "channelId": "UC...",
  "attemptContext": {
    "reason": "scheduled_refresh"
  }
}
```

Consumers validate the envelope before dispatch. Unknown versions/types fail explicitly rather than being silently ignored.

### 4.5 PostgreSQL and Hyperdrive

Supabase PostgreSQL is the canonical datastore. Runtime Workers connect through Cloudflare Hyperdrive using a Worker-compatible PostgreSQL driver. Hyperdrive is an infrastructure adapter: application code should receive repository interfaces or database abstractions rather than a Hyperdrive binding.

Migrations are never executed by HTTP requests, queue consumers, or every Worker startup. They are a controlled deployment/CI operation.

## 5. Target source layout

The intended shape is:

```text
apps/
  web/                     Vue/Vite UI
  api/                     Cloudflare HTTP Worker
  discovery/               scheduled + queue Worker entry points
packages/
  database/                schema, migrations, DB client/repositories
  shared/                  env-independent shared contracts/utilities
  youtube/                 YouTube gateway, quota model, DTO mapping
  domain/                  optional extraction as domain complexity grows
```

Case 01.2B may evolve toward this layout incrementally. A package should be created only when it has a real boundary; we should not manufacture packages solely to match the diagram.

## 6. Application boundaries

Use a ports-and-adapters direction of dependency:

```text
Cloudflare HTTP / Cron / Queue
          |
          v
   application services
          |
     +----+----+
     |         |
     v         v
 repositories  YouTube port
     |         |
     v         v
PostgreSQL   YouTube adapter
```

The domain/application layer may define ports such as `ChannelRepository`, `VideoRepository`, `SnapshotRepository`, `DiscoveryRunRepository`, `OpportunityRepository`, `YouTubeGateway`, `Clock`, and `IdGenerator`. Adapters implement them.

This is not a requirement to implement full Clean Architecture ceremony for every CRUD path. The rule is simpler: infrastructure SDKs must not become the domain API.

## 7. Data architecture

The initial data model should distinguish identity/current metadata from observations over time.

Likely entities:

- `channels`: stable YouTube channel identity and latest normalized metadata.
- `channel_snapshots`: append-oriented observations such as subscriber/view/video counts at a point in time.
- `videos`: stable YouTube video identity and latest normalized metadata.
- `video_snapshots`: append-oriented observations such as view/like/comment counts at a point in time.
- `discovery_runs`: lifecycle, trigger, budget, counters, status and diagnostics for discovery executions.
- `discovery_candidates`: optional provenance linking a discovered channel/video to query, seed or strategy.
- `opportunities`: materialized/recorded signals when the scoring model exists.

Snapshots are not merely audit records. They are the raw material for velocity, acceleration, baseline, outlier and breakout calculations. Destructive updates must not erase historical observations required by later algorithms.

Timestamps should be stored in UTC. External YouTube identifiers should have uniqueness constraints. Natural upstream IDs may be used as alternate keys while internal IDs remain available for relational stability.

## 8. Discovery pipeline

A normal run is expected to follow this shape:

```text
Cron
  |
  v
Create discovery_run
  |
  v
Select due strategies/seeds
  |
  v
Estimate/reserve quota budget
  |
  v
Enqueue bounded work
  |
  +------------------------------+
                                 v
                         Consume message
                                 |
                         Validate + dedupe
                                 |
                         Call YouTube API
                                 |
                         Normalize response
                                 |
                         Transactional persist
                                 |
                         Emit/enqueue next work
                                 |
                         Update run counters
```

Fan-out must be bounded. A single response must not be able to recursively create unlimited queue traffic. Every strategy needs limits such as max pages, max candidates, refresh age, run budget and/or depth.

## 9. Idempotency and delivery semantics

Queue delivery is treated as at-least-once. The system must remain correct when a message is delivered more than once or a consumer fails after the external call but before acknowledgement.

Mechanisms include:

- stable `jobId`/deduplication keys where useful;
- database unique constraints as the final integrity boundary;
- upsert for stable entities;
- snapshot uniqueness based on an intentional observation bucket/key rather than accidental duplicate insertion;
- transactions for state changes that must be atomic;
- acknowledgement only after required persistence succeeds;
- retries only for errors classified as retryable.

Exactly-once execution is not assumed.

## 10. YouTube quota architecture

YouTube quota can become a tighter constraint than compute. Therefore quota accounting belongs in the architecture.

Viralab uses a **dataset-first query model**. A product search performed by a user queries Viralab-owned data and does not imply a YouTube request. Provider discovery and refresh are separate, asynchronous operations admitted by freshness, deduplication, entitlement and quota policy.

This separation is deliberate: users may perform many exploratory queries, while the platform must preserve scarce provider capacity for autonomous discovery, paid/on-demand refresh, scheduled monitoring and operational reserve. UI-query volume and provider-call volume are therefore separate metrics.

The YouTube adapter exposes operations with known cost metadata rather than allowing arbitrary HTTP calls throughout the codebase. Current provider policy must model operation cost separately from bucket capacity: `search.list` costs 1 unit but belongs to a dedicated Search Queries bucket with a default 100 calls/day, while `channels.list` costs 1 unit from the general quota pool.

Fresh stored data must be reused. Equivalent stale requests should converge on shared provider work rather than consume quota once per user. Pricing/plan entitlements live above the provider gateway; free users can consume the shared Viralab dataset without receiving unbounded provider quota.

A discovery run should have a configured budget and record estimated/actual operation counts. On quota exhaustion or upstream throttling, the system should stop creating unnecessary work and preserve the run state for diagnosis. We should prefer incremental refresh from our own known dataset over repeatedly rediscovering the same universe.

ADR-008 defines the dataset-first and shared-quota policy in detail.

## 11. Failure handling

Failures are classified at least as:

- validation/permanent: malformed message, unsupported version, invalid identifier; do not retry indefinitely;
- upstream retryable: transient YouTube/network/server error; retry with platform backoff;
- quota/policy: budget exhausted or quota unavailable; stop/defer intentionally;
- database transient: connection/temporary database error; retry;
- integrity/conflict: handle idempotently or fail with actionable diagnostics;
- programmer error: surface loudly and preserve correlation information.

Dead-letter handling should be configured once message workflows are introduced. A dead-letter message must retain enough identifiers to trace its run and original work without embedding sensitive credentials or huge payloads.

## 12. Observability

Every invocation should be traceable by structured fields such as `requestId`, `runId`, `jobId`, `messageType`, `channelId`/`videoId` when applicable, duration, outcome and error classification.

Operational counters worth persisting or emitting include: discovery runs started/completed/failed, queue messages produced/processed/retried/dead-lettered, YouTube calls by operation, quota budget consumed, candidates discovered, channels/videos refreshed, snapshots written, duplicate/no-op observations and processing latency.

Do not log API keys, database URLs, authorization headers, full environment objects, or raw payloads by default.

## 13. Security and access model

The browser talks to Viralab API only. PostgreSQL is not a client-side integration. Supabase RLS is therefore not the primary authorization boundary and is not required for the MVP runtime.

Secrets are stored as platform/GitHub secrets as appropriate and never committed. Production database access should use TLS. API input and queue envelopes are validated at ingress. CORS is explicit. Administrative/debug endpoints must not expose environment or database details.

If direct Supabase client access is introduced in the future, that is a new trust boundary and requires a separate architecture/security decision, including RLS.

## 14. Deployment architecture

Pull request:

```text
checkout -> install -> lint -> typecheck -> test -> build
```

Main after merge:

```text
quality gates
   |
   +--> database migration (controlled, once)
   |
   +--> deploy Worker(s)/static assets
   |
   +--> smoke checks
```

A failed migration prevents deployment of code requiring it. Destructive schema changes should follow expand/migrate/contract when availability/data safety requires it.

The current Docker production targets become non-canonical after the Cloudflare migration. They may be removed once the Worker runtime is proven, rather than maintained as a second deployment path with no owner.

## 15. Local development

Local development should preserve fast feedback without requiring paid infrastructure. Wrangler provides the Worker/event runtime locally. PostgreSQL may remain local through Docker Compose for development/tests. Hosted integration can use a non-production Supabase project when needed.

Tests should be layered:

- pure unit tests for scoring, normalization, quota and policy logic;
- repository integration tests against PostgreSQL where database semantics matter;
- Worker/adapter tests for HTTP, scheduled and queue handlers;
- a small number of deployment smoke tests.

## 16. Scale path

The architecture intentionally permits incremental scaling:

1. increase Worker/Queue paid limits without changing domain code;
2. tune batching/concurrency and discovery policy;
3. scale PostgreSQL/Hyperdrive;
4. partition high-volume snapshots when measurements justify it;
5. introduce analytical replicas/warehouse only when PostgreSQL workloads demonstrate the need;
6. split queue types/consumers by workload if noisy-neighbor effects appear;
7. move a compute-heavy algorithm to a dedicated runtime behind the same application boundary if Worker CPU characteristics become unsuitable.

We should not introduce Kafka, Kubernetes, a warehouse, Redis, or a permanent worker fleet based on hypothetical scale.

## 17. Explicit non-goals for Case 01.2B

- implementing the YouTube discovery algorithm itself;
- final breakout/outlier scoring;
- authentication/billing;
- direct browser-to-Supabase data access;
- multi-region database architecture;
- data warehouse/lake;
- real-time UI updates;
- generalized workflow engine;
- Cloudflare Workflows unless a concrete orchestration need emerges.

## 18. Case 01.2B completion criteria

Case 01.2B is complete when the repository has a reproducible Cloudflare runtime foundation, the web/API can be built for the target runtime, scheduled and queue event contracts have a tested skeleton, PostgreSQL access is designed/configured through the chosen adapter and Hyperdrive, obsolete BullMQ/Redis runtime dependencies are removed, schema migration strategy is established, CI remains green, deployment configuration is documented, and no YouTube business discovery logic has leaked prematurely into the infrastructure case.
