# Viralab Architecture

Status: Accepted target architecture
Last updated: 2026-09-23

## 1. Purpose

Viralab is a YouTube Opportunity Intelligence platform. Its core hypothesis is that useful signals can be detected before a channel, video or niche becomes obviously viral. The durable product asset is Viralab's own historical dataset and the intelligence derived from changes in that dataset over time.

The production architecture is Cloudflare-native and event-driven while PostgreSQL remains the system of record. The architecture optimizes for low fixed infrastructure cost, bounded provider usage, historical-data integrity, idempotent asynchronous processing, explainable analytics, provider portability and the ability to evolve analytical models without rebuilding ingestion.

## 2. Architectural principles

1. **Historical data is the moat.** Canonical entities preserve current state; immutable observations preserve what Viralab knew at a point in time.
2. **PostgreSQL is the system of record.** Cloudflare primitives coordinate execution but do not become the canonical analytical database.
3. **Scheduling is policy, processing is execution.** Schedulers decide what work is due and admissible; workers perform provider and persistence work.
4. **Ingestion records facts; analytics interprets facts.** Provider acquisition must not depend on an opportunity model succeeding.
5. **Signals are not opportunities.** Reusable derived signals may feed lifecycle policy and multiple opportunity models.
6. **Queues carry commands/references, not copied domain state.**
7. **Consumers are idempotent.** Queue delivery is treated as at-least-once.
8. **Provider quota is a shared resource.** Every external operation has understood cost/capacity and is admitted by a budget policy.
9. **Product reads are dataset-first.** A normal Explorer/search read does not imply a provider call.
10. **Infrastructure SDKs terminate at adapter boundaries.** Application/domain code must remain provider/runtime neutral where practical.
11. **Observability and replayability are ingestion correctness concerns.**
12. **Algorithms remain explainable and versioned.** A model change must not rewrite historical observations to fit the new model.

## 3. Current production topology

```text
Browser / Vue
      |
      v
Cloudflare Edge
      |
      +--> static web assets
      |
      +--> HTTP API ------------------------------+
                                                   |
                                                   v
                                            PostgreSQL
                                                   ^
                                                   |
HTTP API --> Discovery Queue --> Discovery Worker |
                                  |                |
                                  +--> YouTube     |
                                  +--> channels/videos
                                  +--> video statistics
                                  |
                                  +--> Channel Ingestion Queue
                                                |
                                                v
                                      Channel Ingestion Worker
                                                |
                                                +--> YouTube
                                                +--> channel current state
```

The current opportunity model is computed from Viralab-owned current-state data and persisted for Explorer. Historical observation scheduling is accepted target architecture but is not yet implemented.

External systems:

- **YouTube Data API**: upstream source for discovery and observations.
- **Cloudflare**: edge runtime, static delivery, schedules, queues, queue consumers, rate limiting and Hyperdrive.
- **Supabase**: managed PostgreSQL and authentication provider. Browser database access/PostgREST/RLS are not the primary application data path.
- **Sentry**: browser error/performance/replay telemetry through a first-party tunnel.
- **GitHub Actions**: quality gates, migrations and deployment automation.

## 4. Runtime boundaries

### 4.1 Web

Vue 3/Vite is served at the Cloudflare edge. The browser communicates with Viralab HTTP APIs and uses Supabase Auth for identity/session establishment. Product data is accessed through Viralab APIs; the browser does not query product tables directly.

### 4.2 HTTP API

The API is a Cloudflare Worker. Its entry point owns protocol concerns: parsing, validation, authentication context, product quota/rate-limit boundaries, serialization, correlation and HTTP error mapping.

Application services must not require Cloudflare `Request`, `Response`, `ExecutionContext`, Queue or Hyperdrive types.

### 4.3 Schedulers

Cron-triggered schedulers perform bounded coordination only. A scheduler may select due work, evaluate freshness/lifecycle policy, enforce quota budget, create run/work metadata and enqueue commands.

A scheduler does not crawl YouTube, perform large analytical computations or synchronously execute the work it schedules.

The architecture distinguishes at least two scheduling concerns:

```text
Discovery Scheduler
  -> selects bounded discovery work

Observation Scheduler
  -> selects due known entities
  -> applies lifecycle + adaptive-sampling policy
  -> applies quota budget
  -> enqueues observation work
```

They may share infrastructure or code where appropriate, but their policies and work types are distinct.

### 4.4 Queues and consumers

Cloudflare Queues is the hosted asynchronous transport. Messages contain stable identifiers, versioned work type, correlation metadata and minimal execution context.

Consumers validate envelopes before dispatch. Unknown versions/types fail explicitly. Provider/network/database failures follow classified retry policy. Acknowledgement occurs only after required persistence succeeds.

### 4.5 PostgreSQL and Hyperdrive

Supabase PostgreSQL is canonical. Runtime Workers connect through Hyperdrive using a Worker-compatible PostgreSQL driver. Migrations are controlled deployment operations and never execute implicitly on every Worker startup/request.

## 5. Source layout

Current major boundaries:

```text
apps/
  web/                     Vue/Vite UI + static-assets/Sentry tunnel Worker
  api/                     Cloudflare HTTP Worker
  discovery/               discovery queue consumer
  channel-ingestion/       channel enrichment queue consumer

packages/
  auth/                    provider-neutral auth contracts/helpers
  database/                Drizzle schema, migrations and persistence
  providers/               provider-neutral provider ports/contracts
  rate-limit/              application rate-limit boundary
  shared/                  versioned API/queue/analytics contracts
  youtube/                 YouTube adapter, normalization, error/quota metadata
```

Future packages/apps should be created only when a real boundary exists. Do not manufacture a domain package merely to match an architectural diagram.

## 6. Application boundaries

Dependency direction follows ports and adapters:

```text
Cloudflare HTTP / Cron / Queue
          |
          v
   application services
          |
     +----+----------+
     |               |
     v               v
 persistence ports  provider ports
     |               |
     v               v
 PostgreSQL       YouTube adapter
```

A useful rule is that provider/runtime concerns may be composed at Worker entry points but should not become application APIs.

The historical stage introduces an additional conceptual boundary:

```text
provider ingestion
      |
      v
canonical state + immutable observations
      |
      v
signal computation
      |
      +--> lifecycle policy
      |
      +--> opportunity models
```

Signal computation and opportunity modeling are conceptually separate even if an early implementation shares a Worker or transaction.

## 7. Data architecture

### 7.1 Canonical current state

`channels` and `videos` hold stable identity, useful descriptive metadata and the latest known projection required by current product flows.

Current-state rows may be updated idempotently. They are not a substitute for time-series history.

### 7.2 Immutable observations

The accepted historical model uses append-oriented observations:

- `channel_observations`: channel subscriber/view/video counters at observation time;
- `video_observations`: video view/like/comment counters at observation time.

"Observation" is the preferred current term; older documents may use "snapshot" for the same historical concept.

Observations are facts, not model outputs. Normal ingestion never edits old observations to make history resemble current state.

Observation idempotency uses a **one-hour observation bucket per entity**. Sampling cadence and idempotency granularity are intentionally separate concepts: an entity may normally be sampled every six hours while the one-hour bucket permits legitimate higher-frequency future observations without a schema redesign.

All observation timestamps are UTC.

### 7.3 Dataset lifecycle

Known entities are not observed forever at the same priority. The accepted lifecycle is:

```text
DISCOVERED -> ACTIVE -> COLD -> ARCHIVED
                ^                |
                +----------------+
                  rediscovery /
                  renewed signal
```

ARCHIVED means "no routine provider spend", not deletion. Historical data remains queryable.

Lifecycle policy v1 will be based on three signal families:

- **Recency**: evidence of recent content/entity activity;
- **Growth**: observed metric movement;
- **Discovery**: renewed/repeated appearance through Viralab discovery.

The exact measurable transition thresholds are intentionally deferred to the algorithm-roadmap formalization. Documentation must not invent weights or a single magic lifecycle score before that work.

### 7.4 Adaptive sampling

Accepted nominal cadence:

```text
strong/new signal -> 6h
stable            -> 12h
lower activity    -> 24h
cold              -> 72h
archived          -> no routine observation
```

These intervals are policy, not persistence schema. Lifecycle and sampling answer different questions:

- lifecycle: should Viralab continue investing in this entity?
- sampling: when should Viralab observe it again?

### 7.5 Opportunities

`opportunities` is a product projection/model output. It must record sufficient evidence and model version to explain why the opportunity existed.

Changing an opportunity model must not mutate historical observations.

## 8. Current discovery and ingestion flow

```text
POST discovery
      |
      v
Discovery Queue
      |
      v
Discovery Worker
      |
      +--> bounded provider discovery
      +--> canonical channel/video upsert
      +--> video statistics enrichment
      +--> channel freshness/claim gate
                    |
                    v
          Channel Ingestion Queue
                    |
                    v
          Channel Ingestion Worker
                    |
                    +--> provider enrichment
                    +--> canonical channel projection
```

Fan-out is bounded. Provider work is deduplicated/freshness-gated where applicable.

The historical observation flow will reuse canonical identities but is a separate orchestration concern.

## 9. Historical observation flow — accepted target

```text
Cron
 |
 v
Observation Scheduler
 |
 +--> select due ACTIVE/COLD entities
 +--> evaluate adaptive cadence
 +--> enforce provider quota budget
 |
 v
Observation Queue(s)
 |
 v
Observation Consumer
 |
 +--> provider API
 +--> update canonical current projection
 +--> append immutable observation (1h bucket)
 |
 v
Analytics/Signal Queue
 |
 v
Signal Computation
 |
 +--> lifecycle policy
 +--> opportunity models
```

Analytics is asynchronous relative to provider ingestion. A scoring/model failure must not invalidate a successfully acquired observation.

## 10. Idempotency and delivery semantics

Queue delivery is at-least-once. Correctness relies on:

- stable job/correlation identifiers;
- database unique constraints as the final integrity boundary;
- upsert for canonical entities;
- one-hour observation uniqueness per entity;
- atomic freshness/claim transitions where required;
- transactions for coupled persistence state;
- acknowledgement only after required persistence succeeds;
- retries only for retryable classifications.

Exactly-once execution is not assumed.

## 11. Provider quota architecture

Product reads and provider calls are separate.

```text
Product query
  -> Viralab dataset
  -> no provider call by default

Provider work
  -> admission/freshness/lifecycle policy
  -> quota budget
  -> queue
  -> provider adapter
```

The provider adapter owns operation-specific cost/capacity metadata; orchestration owns why work should be admitted.

The accepted target introduces persistent **quota budgeting** with runtime-configurable allocations for at least:

- discovery;
- channel observations;
- video observations;
- operational reserve.

The exact environment-variable names and percentage defaults are implementation details. Allocations must be validated and must not rely only on Worker memory: a restart cannot reset already-consumed daily budget.

Provider operation cost and provider bucket capacity are distinct concepts and must remain modeled separately.

## 12. Analytical model boundaries

The current production model is **video outlier v1**. It intentionally uses a lifetime channel baseline and remains active while historical observations accumulate.

Historical observations are intended to support reusable derived signals before they are composed into opportunity models. Candidate signal families identified for later formalization include:

- absolute and relative growth;
- time-normalized velocity;
- acceleration;
- discovery frequency/rediscovery;
- temporal and age-normalized baselines;
- robust baselines resistant to prior viral outliers;
- momentum and decay.

Candidate composite models include video-outlier v2, breakout-channel detection and niche momentum.

These names describe the analytical direction only. **No formula, threshold, weighting or implementation commitment is established here.** The algorithm roadmap will be formalized in a separate follow-up after the documentation realignment.

## 13. Current video-outlier v1

The existing model remains intentionally simple:

```text
baseline_views = channel_lifetime_views / channel_video_count
multiplier     = observed_video_views / baseline_views
candidate      = multiplier >= 1.5
```

The score is a bounded logarithmic transformation of multiplier and confidence grows with the channel's published-video sample size. The implementation and Case 04/05 document are the source of truth for the exact v1 formula.

This model is not velocity, recent growth, a 7d/30d trend or an age-normalized comparison. UI/product copy must not imply otherwise.

## 14. Failure handling

Failures are classified at least as:

- validation/permanent;
- upstream retryable;
- quota/policy deferral;
- database transient;
- integrity/conflict/idempotent no-op;
- programmer/model error.

Historical analytics adds an important isolation rule: provider acquisition/persistence success is independent from downstream analytical success. Failed analytics can be replayed from owned observations without consuming provider quota again.

## 15. Observability

Structured telemetry should correlate request/run/job/message/entity identifiers, provider operation, duration, outcome and error classification.

Relevant counters include product queries, provider calls by operation/source, quota budget consumed/remaining, queue retries/DLQ, canonical entities discovered/refreshed, observations written/deduplicated, lifecycle transitions, signal jobs and opportunity model outcomes.

Operational logs are not the product dataset and are not a substitute for durable observations or BI events.

## 16. Security and access model

Supabase Auth provides identity. The browser sends access tokens to Viralab APIs. Application authorization uses provider-neutral auth context; RLS is not the primary Worker API authorization boundary.

Security rate limiting, anonymous product allowance, authenticated entitlements and provider quota are separate controls. Explorer reads Viralab-owned data and never consumes YouTube quota directly.

Secrets remain in platform/GitHub secret stores and must not appear in logs or committed configuration.

## 17. Deployment architecture

Pull request:

```text
checkout -> install -> lint -> typecheck -> test -> build
```

Production deployment performs controlled migrations before code that requires them and deploys consumers before producers when introducing new queue contracts. Destructive schema changes should follow expand/migrate/contract when availability/data safety requires it.

## 18. Local development and testing

Wrangler provides local Worker/event runtime; PostgreSQL may run through Docker Compose. CI does not require real provider credentials.

Tests are layered:

- pure unit tests for normalization, scoring, lifecycle/quota policy and contracts;
- repository integration tests where PostgreSQL semantics matter;
- Worker/adapter tests for HTTP/queue/scheduled entry points;
- manual provider smoke tests only when real upstream behavior must be verified.

Historical algorithms should be deterministic over stored observations so they can be tested/replayed without provider access.

## 19. Evolution rule

Case documents are historical implementation records. Accepted ADRs record durable constraints. This document describes the current whole-system architecture and accepted near-term target.

When an architectural decision changes materially, create/supersede an ADR rather than silently rewriting history. When implementation catches up with an accepted target, update this document from "target" to "current" without changing the underlying decision history.
