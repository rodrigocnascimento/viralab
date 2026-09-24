# TDD — Historical Observation Foundation and Architecture Corrections

Status: Proposed implementation plan  
Date: 2026-09-24  
Depends on: ADR-005, ADR-006, ADR-008, ADR-010  
Scope: code changes required to make the current implementation conform to the accepted historical-data architecture

## 1. Purpose

This Technical Design Document translates the accepted documentation changes into concrete code work.

It intentionally distinguishes three categories:

1. **Required corrections** — current code violates or materially couples concerns that the accepted architecture now separates.
2. **Required foundation** — code/data structures that must exist before historical observation scheduling can operate.
3. **Deferred work** — algorithmic/product decisions that are intentionally not yet defined and therefore must not be implemented in this change.

This TDD does **not** define the future algorithm roadmap. In particular it does not invent lifecycle thresholds, growth formulas, momentum/decay formulas, temporal baselines, breakout-channel scoring or niche scoring.

## 2. Current-state assessment

The existing runtime already has useful boundaries that should be preserved:

- provider-neutral ports in `@viralab/providers`;
- YouTube implementation in `@viralab/youtube`;
- versioned queue contracts in `@viralab/shared`;
- Cloudflare queue consumers as composition roots;
- canonical `channels` and `videos` in PostgreSQL;
- channel freshness/claim handling for discovery-to-channel-ingestion handoff;
- video-outlier v1 as a pure scoring function;
- Explorer reading persisted opportunities rather than YouTube.

No rewrite of those components is required.

### 2.1 Required correction: persistence currently orchestrates analytics

`DiscoveryRepository.upsertVideo()` currently invokes opportunity recomputation, and `DiscoveryRepository.enrichChannel()` recomputes opportunities for all videos in the channel.

This means a persistence operation has two responsibilities:

```text
persist canonical fact
        +
interpret fact into product model
```

It also means a scoring/database failure can fail the ingestion operation even after provider data was successfully acquired.

That conflicts with the accepted boundary:

```text
ingestion records facts
analytics interprets facts
```

and with the requirement that analytical work be replayable without another provider call.

This is the principal correction required in existing code.

### 2.2 Required correction: repository responsibility is too broad

`DiscoveryRepository` currently owns discovery persistence, channel-ingestion claims, channel enrichment and opportunity recomputation.

Historical observations would make this object broader still. New historical work must **not** be added to `DiscoveryRepository`.

The migration should be incremental rather than a large repository rewrite.

### 2.3 No correction required: video-outlier v1 formula

The existing `scoreVideoOutlier` implementation matches the documented v1 model and should remain unchanged until the algorithm roadmap explicitly supersedes it.

The misleading comment that assumes a specific future “Case 07” replacement should be changed to a neutral statement because case numbering/model choice is not yet finalized.

### 2.4 No correction required: current discovery channel freshness claim

The existing discovery → channel-ingestion freshness/lease mechanism solves a different problem from historical observation idempotency. It should remain in place until the observation scheduler provides an intentional replacement for that workflow.

Do not reuse the one-hour observation bucket as a substitute for the existing queue-publication claim.

## 3. Target boundaries

The implementation target is:

```text
                         +------------------+
                         | Discovery Worker |
                         +--------+---------+
                                  |
                                  v
                         CanonicalRepository
                                  |
                                  +------> channels/videos
                                  |
                                  +------> Analytics request
                                             |
                                             v
                                      Analytics Worker
                                             |
                                             v
                                      opportunities

Cron
 |
 v
Observation Scheduler
 |
 +--> DueWorkRepository
 +--> Lifecycle/Sampling policy
 +--> ProviderBudget
 |
 v
Observation Queue
 |
 v
Observation Consumer
 |
 +--> Provider ports
 +--> CanonicalRepository
 +--> ObservationRepository
 |
 +--> Analytics request
          |
          v
   Analytics Worker
```

The exact number of Cloudflare Workers/queues may be staged, but these application responsibilities must remain separable.

## 4. Database changes

### 4.1 Channel observations

Add an append-oriented `channel_observations` table.

Required fields:

```text
id                  uuid primary key
channel_id          uuid FK -> channels.id
observed_at         timestamptz
observation_bucket  timestamptz
subscriber_count    bigint nullable
view_count          bigint nullable
video_count         bigint nullable
source              text
job_id              uuid nullable
created_at          timestamptz
```

Constraints/indexes:

```text
UNIQUE(channel_id, observation_bucket)
INDEX(channel_id, observed_at DESC)
INDEX(observation_bucket)
```

`observation_bucket` is the UTC start of the hour containing `observed_at`.

`source` records acquisition context such as discovery/scheduler/manual without encoding product pricing.

### 4.2 Video observations

Add `video_observations`:

```text
id                  uuid primary key
video_id            uuid FK -> videos.id
observed_at         timestamptz
observation_bucket  timestamptz
view_count          bigint nullable
like_count          bigint nullable
comment_count       bigint nullable
source              text
job_id              uuid nullable
created_at          timestamptz
```

Constraints/indexes:

```text
UNIQUE(video_id, observation_bucket)
INDEX(video_id, observed_at DESC)
INDEX(observation_bucket)
```

### 4.3 Lifecycle/due-work projection

Do not calculate due state by scanning observation history on every Cron run.

Add scheduling projection fields to canonical entities, or an equivalent dedicated tracking table. Prefer a dedicated table if channel/video scheduling state begins to diverge materially.

Minimum state required by the accepted architecture:

```text
lifecycle_state       DISCOVERED | ACTIVE | COLD | ARCHIVED
next_observation_at   timestamptz nullable
last_observed_at      timestamptz nullable
sampling_interval     integer nullable   # seconds
lifecycle_changed_at  timestamptz
updated_at            timestamptz
```

Required selection index:

```text
INDEX(lifecycle_state, next_observation_at)
```

### Important staging constraint

The exact lifecycle transition algorithm is not defined yet.

Therefore the schema may be introduced before automatic transition logic, but production scheduling must not pretend to derive ACTIVE/COLD/ARCHIVED from arbitrary thresholds. Until the algorithm roadmap is accepted, lifecycle assignment should use deterministic bootstrap/default behavior only.

### 4.4 Provider budget accounting

Provider budget must survive Worker restarts and support atomic concurrent admission.

Introduce a durable daily accounting model. A suitable relational shape is:

```text
provider_quota_usage
- provider
- quota_date
- workload_class
- consumed_units
- reserved_units
- updated_at

UNIQUE(provider, quota_date, workload_class)
```

Initial workload classes:

```text
discovery
channel_observation
video_observation
reserve
```

The exact unit is provider-policy-defined. Do not conflate “one HTTP request” with “one quota unit”.

Admission/reservation must be atomic. A read-then-write sequence without locking/atomic update is not acceptable under concurrent Workers.

## 5. Repository decomposition

Introduce focused persistence ports/adapters as new functionality is added:

```text
CanonicalContentRepository
  upsertChannel(...)
  upsertVideo(...)
  enrichChannel(...)

ChannelIngestionClaimRepository
  claim(...)
  release(...)

ObservationRepository
  appendChannelObservation(...)
  appendVideoObservation(...)
  getRecent...(...)        # only when a defined algorithm needs it

ObservationScheduleRepository
  listDue(...)
  markScheduled/advance(...)

ProviderQuotaRepository
  reserve(...)
  consume/commit(...)
  release(...)             # if reservation semantics require it

OpportunityRepository
  existing product reads/writes
```

This does not require immediately deleting `DiscoveryRepository`. Existing methods can be extracted as each affected workflow is changed. The acceptance criterion is that no new observation/quota/analytics responsibilities are added to the existing catch-all repository.

## 6. Observation bucket utility

Create one pure shared/domain utility for UTC hourly bucketing.

Contract:

```ts
observationBucket(new Date('2026-09-24T18:31:30.000Z'))
// 2026-09-24T18:00:00.000Z
```

Requirements:

- deterministic;
- UTC only;
- no locale/timezone dependence;
- used by both channel and video observation writers;
- database uniqueness remains the final race-condition boundary.

A duplicate insert for the same entity/hour is an idempotent outcome, not an application failure.

## 7. Queue contracts

### 7.1 Observation request

Add a versioned provider-neutral observation message rather than reusing the discovery message.

A practical v1 envelope:

```ts
{
  version: 1,
  type: 'content.observation.requested',
  provider: 'youtube',
  entityType: 'channel' | 'video',
  entityId: UUID,
  providerEntityId: string,
  jobId: UUID,
  correlationId: UUID,
  requestedAt: ISODateTime,
  source: 'scheduler' | 'manual' | 'discovery'
}
```

The message contains identifiers and execution context, not copied channel/video state.

Channel and video messages may later split if provider workflows require materially different contracts; do not split them merely for symmetry.

### 7.2 Analytics request

Add a separate versioned message emitted only after the source data required by the current analytical job is durable.

Conceptual envelope:

```ts
{
  version: 1,
  type: 'analytics.opportunity.requested',
  entityType: 'video' | 'channel',
  entityId: UUID,
  correlationId: UUID,
  sourceJobId: UUID,
  requestedAt: ISODateTime,
  reason: 'discovery' | 'observation' | 'channel_enrichment'
}
```

Do not put calculated scores/signals into the queue message. Analytics should load owned source data.

## 8. Decouple opportunity recomputation from ingestion

This is the required existing-code correction.

### Current

```text
DiscoveryRepository.upsertVideo()
  -> persist video
  -> recompute opportunity

DiscoveryRepository.enrichChannel()
  -> persist channel
  -> load all videos
  -> recompute every opportunity
```

### Target

```text
ingestion
  -> persist source fact/current projection
  -> commit
  -> enqueue analytics request
  -> ingestion succeeds

analytics consumer
  -> load current source data
  -> scoreVideoOutlier(v1)
  -> upsert/delete opportunity
```

Provider ingestion must not be rolled back/retried because opportunity scoring failed.

For the current v1 model, channel enrichment may require analytics refresh for the channel's videos because the lifetime channel baseline changed. That fan-out belongs to analytics orchestration, not `enrichChannel()`.

A bounded/replayable mechanism must be used; do not perform an unbounded synchronous loop inside the channel persistence method.

## 9. Observation consumers

### 9.1 Channel observation

The channel observation consumer should:

1. validate the versioned message;
2. call the provider through `ChannelProvider`;
3. validate provider identity;
4. persist the latest canonical projection and immutable channel observation coherently;
5. treat same-hour duplicate observation as success;
6. emit analytics/signal work after source persistence succeeds;
7. record quota usage;
8. ack only after required source persistence succeeds;
9. classify provider failures with existing retry semantics.

The existing channel-ingestion service can share provider mapping/application helpers, but historical observation semantics should not be hidden inside the old discovery freshness claim.

### 9.2 Video observation

A provider-neutral video-refresh port is required if the current provider contracts do not expose one independently of discovery search.

The consumer should batch provider calls where the provider API supports safe bounded batching, because video observation volume is expected to exceed channel observation volume.

It follows the same persistence/idempotency/analytics rules as channel observations.

## 10. Observation scheduler

Add a dedicated scheduled application service.

Responsibilities:

1. determine the bounded amount of work this invocation may inspect/emit;
2. query indexed due ACTIVE/COLD entities;
3. apply the current sampling policy;
4. request atomic provider-budget admission;
5. enqueue observation commands;
6. advance/lease due-work state so concurrent Cron invocations do not duplicate large batches;
7. expose admitted/deferred/skipped counters.

Non-responsibilities:

- provider HTTP calls;
- opportunity scoring;
- scanning all historical observations;
- defining lifecycle formulas;
- recursive discovery.

### 10.1 Bootstrap before lifecycle algorithm formalization

Because exact Recency/Growth/Discovery transitions are not yet defined, implementation should be staged.

A safe initial stage is:

- newly eligible entities receive an explicit initial lifecycle state;
- fixed accepted sampling defaults can be represented;
- scheduler machinery can be tested against explicitly seeded lifecycle/due state;
- automatic lifecycle promotion/demotion remains disabled until its algorithm TDD/ADR is accepted.

This prevents architecture work from silently inventing product algorithms.

## 11. Provider quota budget

### 11.1 Configuration

Add validated runtime configuration for:

- total provider daily budget;
- discovery allocation;
- channel-observation allocation;
- video-observation allocation;
- reserve allocation.

Exact environment variable names can be chosen during implementation, but validation must guarantee:

- non-negative values;
- allocations are internally consistent;
- configured workload allocations cannot silently exceed the configured total;
- invalid production configuration fails explicitly.

### 11.2 Admission

Budget is checked before provider work is intentionally scheduled/executed.

The budget service consumes provider operation cost metadata; it does not hard-code YouTube pricing into lifecycle or scheduler code.

Concurrency-safe reservation is required so two Workers cannot both observe the same remaining budget.

### 11.3 Failure semantics

The implementation must explicitly define:

- when reservation becomes consumed;
- what happens when provider rejects before a billable operation;
- what happens when provider succeeds but database persistence fails;
- whether/how abandoned reservations expire.

Until these semantics are tested, do not advertise quota accounting as exact.

### 11.4 Implemented v1 failure semantics

The foundation implementation uses conservative daily reservations:

- the scheduler atomically reserves the provider operation's expected quota cost before enqueueing;
- a successful provider observation converts that reservation to consumed capacity;
- a permanent provider rejection releases the reservation;
- a retryable provider/infrastructure failure retains the reservation for the queue retry, preventing another scheduler invocation from spending the same capacity;
- if all queue retries are exhausted and the message reaches the DLQ, the reservation remains conservative for the rest of that UTC quota day;
- abandoned reservations therefore expire operationally at the next UTC quota date because admission only reads the current `quota_date` bucket.

This intentionally prefers temporary under-utilization to exceeding the provider's daily budget. A future reservation-ledger model may provide finer-grained expiry/reconciliation if operational evidence justifies the extra state.

## 12. Analytics worker

The first analytics worker does **not** introduce a new algorithm. It moves the existing v1 computation to the correct asynchronous boundary.

Responsibilities:

- validate analytics request;
- load owned canonical/current data;
- run `scoreVideoOutlier`;
- upsert/delete the v1 opportunity;
- emit structured outcome telemetry;
- retry independently from provider ingestion.

Later signal computation may be separated further when the algorithm roadmap defines reusable historical signals.

No `derived_signals` table is required by this TDD because no finalized derived-signal persistence requirement exists yet.

## 13. Migration/deployment order

Use expand-first deployment.

Recommended order:

```text
1. additive database migration
   - observation tables
   - due/lifecycle projection
   - quota accounting

2. deploy consumers/readers that understand new contracts
   - analytics consumer
   - observation consumer(s)

3. deploy producers
   - ingestion analytics handoff
   - observation scheduler

4. enable Cron / production scheduling

5. only after algorithm roadmap:
   - enable automatic lifecycle transitions
   - enable historical-model scoring
```

Do not remove the existing synchronous opportunity path until the asynchronous path is deployed and verified. During cutover, avoid double-writing opportunities in a way that changes `detected_at` or creates noisy analytics.

A feature/config gate is acceptable for staged activation.

## 14. Testing strategy

### 14.1 Pure unit tests

Required:

- hourly UTC bucket boundaries;
- sampling-policy mapping once implemented;
- budget configuration validation;
- budget admission arithmetic;
- queue schemas/version rejection;
- existing `scoreVideoOutlier` regression tests;
- duplicate-observation outcome semantics.

### 14.2 Database/integration tests

Required:

- same entity + same hour produces one observation;
- adjacent hourly buckets produce two observations;
- channel/video FK integrity;
- due-work indexed selection;
- lifecycle state persistence;
- atomic quota reservation under competing attempts;
- analytics upsert/delete remains idempotent.

### 14.3 Application-service tests

Required:

- successful provider observation persists source before analytics handoff;
- analytics enqueue failure does not erase the durable observation;
- analytics failure does not cause a provider re-fetch;
- provider retryable/permanent failures preserve current semantics;
- scheduler never emits ARCHIVED routine work;
- exhausted budget defers without provider call;
- bounded scheduler invocation never exceeds configured batch size.

### 14.4 Worker tests

Required:

- malformed/unknown-version messages are handled explicitly;
- retry vs ack behavior is correct;
- queue producer/consumer bindings are optional only where intentional;
- Cron handler performs coordination only;
- structured correlation/job/entity fields survive the pipeline.

## 15. Observability

Add structured events/counters for:

```text
observation.scheduler.started/completed
observation.admitted
observation.deferred
observation.persisted
observation.duplicate
observation.failed

provider_budget.reserved
provider_budget.consumed
provider_budget.exhausted

analytics.requested
analytics.completed
analytics.failed

lifecycle.transitioned      # only after transition algorithm exists
```

Include provider, workload class, entity type/id where safe, job/correlation ID, operation, quota cost and outcome.

Do not use operational logs as a replacement for observation rows or product analytics events.

## 16. Explicit non-goals

This TDD does not implement or define:

- Recency/Growth/Discovery formulas or weights;
- automatic ACTIVE/COLD/ARCHIVED transition thresholds;
- absolute/relative growth algorithms;
- velocity or acceleration formulas;
- momentum/decay scoring;
- discovery-momentum scoring;
- age-normalized baseline;
- robust baseline/MAD/percentile policy;
- video-outlier v2;
- breakout-channel model;
- niche momentum;
- retention/downsampling;
- pricing/paid refresh policy.

Those require the algorithm-roadmap formalization requested as the next project step.

## 17. Implementation slices

### Slice A — Correct existing analytics coupling

- extract opportunity write/recompute behavior from `DiscoveryRepository`;
- introduce an analytics application boundary;
- preserve `scoreVideoOutlier` v1 exactly;
- add regression tests;
- change only the misleading future-case comment.

This is a **correction** and can be implemented independently.

### Slice B — Observation persistence foundation

- additive observation schema/migration;
- hourly bucket utility;
- `ObservationRepository`;
- duplicate/idempotency tests.

This is required foundation and does not require lifecycle algorithms.

### Slice C — Scheduling and quota state

- lifecycle/due-work projection;
- provider quota accounting;
- validated budget configuration;
- atomic admission primitives;
- scheduler application service with explicit seeded states.

Automatic lifecycle transitions remain off.

### Slice D — Observation workers

- shared observation queue contract;
- channel observation consumer;
- video provider port/consumer;
- current-projection + immutable-observation persistence;
- quota telemetry;
- analytics handoff.

### Slice E — Production scheduling

- Cloudflare queue bindings/DLQ;
- Cron binding;
- bounded due selection/lease;
- deployment ordering;
- dashboards/log fields;
- guarded production activation.

### Slice F — Algorithm roadmap implementation

Not part of this TDD. Begins only after the separate algorithm roadmap is reviewed and accepted.

## 18. Acceptance criteria

The architecture-alignment work is complete when:

1. provider ingestion can persist successfully even if opportunity analytics later fails;
2. opportunity v1 behavior and Explorer contract remain backward compatible;
3. channel and video observations are immutable and idempotent within a one-hour UTC bucket;
4. duplicate queue delivery cannot create duplicate same-hour observations;
5. scheduler selection is bounded and uses indexed due state;
6. ARCHIVED entities cannot receive routine scheduled observations;
7. provider budget state survives Worker restart and is concurrency-safe;
8. discovery, channel observation and video observation consumption can be accounted separately;
9. observation acquisition and analytics can retry independently;
10. no unapproved lifecycle/scoring algorithm has been invented as part of infrastructure work;
11. all new queue contracts are versioned and validated;
12. CI covers bucket/idempotency, budget concurrency, scheduler bounds and v1 scoring regression.

## 19. Decisions intentionally left open

The following must be answered by the algorithm-roadmap work, not opportunistically during implementation:

- measurable definition of Recency;
- measurable definition of Growth;
- measurable definition of Discovery/rediscovery strength;
- lifecycle transition thresholds and hysteresis;
- rules that map signals to 6h/12h/24h/72h cadence;
- minimum historical sample requirements;
- temporal baseline windows;
- robust-statistics policy;
- composite momentum/decay semantics;
- model versioning for future historical opportunity models.

If implementation reaches one of these questions before the roadmap is accepted, stop at the boundary rather than choose an arbitrary constant.
