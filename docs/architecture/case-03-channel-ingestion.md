# Case 03 — Channel Ingestion

Status: Design baseline
Date: 2026-09-17

## Objective

Case 03 turns a discovered YouTube channel into an enriched canonical channel profile that Viralab can use as the basis for later outlier detection, historical tracking and opportunity scoring.

Case 02 proved search-driven discovery and canonical identity. Case 03 adds a cheaper ID-driven enrichment path based on `channels.list`, without conflating mutable current state with historical observations.

The central invariant is:

> A YouTube channel has one canonical current-state row keyed by `youtube_id`; repeated ingestion refreshes that row idempotently and never creates duplicate channels.

Historical observations remain a separate concern governed by ADR-006 and are not introduced in Case 03.

## Scope

Case 03 includes channel-ingestion queueing, `channels.list` enrichment, current-state persistence, observability, quota-cost accounting, idempotency and retry/DLQ behavior. It excludes historical snapshots, recurring schedules, uploads-playlist video ingestion, outlier scoring and user-facing channel explorer endpoints.

## Flow

```text
Canonical channel discovered
        |
        +--> enqueue youtube.channel.ingestion.requested
        v
Cloudflare Queue
        |
        v
Channel ingestion consumer
        |
        +--> validate versioned message
        +--> YouTube channels.list
        +--> normalize provider response
        +--> update canonical channels row
        +--> structured completion/failure log
        v
Supabase PostgreSQL
```

## Queue contract

```json
{
  "version": 1,
  "type": "youtube.channel.ingestion.requested",
  "jobId": "<uuid>",
  "correlationId": "<uuid>",
  "channelId": "<internal-channel-uuid>",
  "youtubeChannelId": "UC...",
  "requestedAt": "2026-09-17T00:00:00.000Z",
  "source": "discovery"
}
```

`channelId` is Viralab identity. `youtubeChannelId` avoids a database read only to construct the provider request. Consumers reject unknown versions/types.

## Persistence model

Extend `channels` with nullable current-state enrichment fields:

- `custom_url` text;
- `country` text;
- `default_language` text;
- `uploads_playlist_id` text;
- `subscriber_count` bigint;
- `view_count` bigint;
- `video_count` bigint;
- `hidden_subscriber_count` boolean;
- `last_ingested_at` timestamptz.

`youtube_id` remains unique. `first_discovered_at` is never overwritten. `last_discovered_at` remains discovery activity, not ingestion freshness. `updated_at` advances on enrichment.

Latest statistics live on `channels` as the current projection. ADR-006 remains authoritative: historical observations will be appended to snapshot tables later while `channels` remains current state.

## YouTube gateway

Add a narrow `channels.list` operation in `packages/youtube` using `snippet`, `statistics`, and `contentDetails`. Raw Google payload shapes must not leak beyond the provider package.

Numeric counters are parsed safely for bigint persistence.

## Quota model

Case 03 reuses discovered channel IDs rather than searching again. One ingestion job performs one bounded `channels.list` request. Cost is explicit. Quota exhaustion is not hot-retried; transient provider failures are retryable according to the Case 02 taxonomy.

## Idempotency

Queue delivery is at-least-once. Repeated ingestion refreshes the same canonical row, advances `last_ingested_at`, preserves discovery identity/timestamps, and never creates another channel. A mismatch between expected and returned YouTube channel identity fails explicitly.

## Observability

Structured events:

- `channel_ingestion.started`;
- `youtube.request.completed`;
- `channel_ingestion.persisted`;
- `channel_ingestion.failed`.

Logs carry IDs and counts, not full provider payloads, API keys or arbitrary descriptions.

## Trigger strategy

After Case 02 persists discovery results, enqueue one ingestion command per unique canonical channel. If 25 videos belong to 18 channels, emit at most 18 jobs. Discovery does not call `channels.list` inline.

## Queue topology

Dedicated queue and DLQ:

- `viralab-channel-ingestion`;
- `viralab-channel-ingestion-dlq`.

This isolates retry policy, throughput/backpressure and observability, and allows future scheduled refresh to reuse the ingestion consumer.

## Package boundaries

```text
apps/discovery
  emits channel ingestion commands

apps/channel-ingestion
  queue consumer + orchestration

packages/shared
  versioned ingestion contract

packages/youtube
  channels.list adapter

packages/database
  schema migration + canonical update
```

## Delivery plan

### Case 03.1 — Contracts and persistence
- extend `channels` schema;
- migration;
- versioned queue contract;
- repository enrichment update;
- tests.

### Case 03.2 — YouTube gateway
- `channels.list`;
- response normalization;
- bigint-safe statistics parsing;
- error classification;
- tests.

### Case 03.3 — Ingestion Worker
- new Worker app;
- queue consumer + DLQ;
- Hyperdrive;
- structured logs;
- retry/ack policy;
- tests.

### Case 03.4 — Discovery handoff
- producer binding;
- one job per unique channel;
- correlation propagation;
- duplicate-channel tests.

### Case 03.5 — Runtime validation
- create queue + DLQ;
- deploy through GitHub Actions;
- discovery smoke test;
- verify enriched columns and logs.

## Acceptance criteria

A production discovery can discover canonical entities, enqueue unique channel enrichment jobs, call `channels.list` asynchronously, persist current channel state idempotently, preserve correlation across logs, survive duplicate delivery and route exhausted retries to a dedicated DLQ.

## Architectural decisions

No new ADR is required. Case 03 applies ADR-001 through ADR-007, especially ADR-003/005 for queue/processing separation, ADR-006 for snapshot boundaries and ADR-007 for log/BI separation.
