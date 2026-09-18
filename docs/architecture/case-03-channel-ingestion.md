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
        +--> freshness/claim gate
        +--> enqueue content.channel.ingestion.requested
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
  "type": "content.channel.ingestion.requested",
  "provider": "youtube",
  "jobId": "<uuid>",
  "correlationId": "<uuid>",
  "channelId": "<internal-channel-uuid>",
  "providerChannelId": "UC...",
  "requestedAt": "2026-09-17T00:00:00.000Z",
  "source": "discovery"
}
```

`channelId` is Viralab identity. `provider` selects the platform adapter and `providerChannelId` is the external channel identity without leaking YouTube naming into orchestration. Consumers reject unknown versions/types/providers. The MVP supports only `youtube`; additional providers are additive.

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
- `last_ingested_at` timestamptz;
- `last_ingestion_requested_at` timestamptz.

`youtube_id` remains unique. `first_discovered_at` is never overwritten. `last_discovered_at` remains discovery activity, not ingestion freshness. `last_ingestion_requested_at` is a short-lived claim used to deduplicate concurrent handoff attempts. The claim also stores the owning discovery job and the child ingestion job ID so a retry of the same discovery can resume publication instead of acknowledging an orphaned claim. Claim state is cleared after successful enrichment. `updated_at` advances on discovery/enrichment policy writes.

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
- `provider.request.completed` (with `provider` and provider operation, e.g. YouTube `channels.list`);
- `channel_ingestion.persisted`;
- `channel_ingestion.failed`.

Logs carry IDs and counts, not full provider payloads, API keys or arbitrary descriptions.

## Trigger strategy

After Case 02 persists discovery results, enqueue at most one ingestion command per unique canonical channel that actually requires enrichment. If 25 videos belong to 18 channels, emit no more than 18 jobs, and fewer when a channel is already fresh enough to reuse.

The handoff uses an atomic database claim over canonical channel identity. A channel is claimable only when its `last_ingested_at` is outside the configured freshness window and no non-expired ingestion claim exists. The MVP defaults are 6 hours of channel freshness and a 15-minute claim lease, both runtime-configurable. Multiple discoveries encountering the same fresh or already-claimed channel therefore do not generate repeated `channels.list` work. If queue publication fails, the worker attempts to release the claim. If the release itself fails or the worker terminates after the claim commits, the same discovery job can recognize ownership of the existing claim and republish the same child ingestion job ID on retry instead of silently skipping it.

Discovery does not call `channels.list` inline. User-facing product queries also do not invoke this flow directly; they read Viralab-owned data first, with explicit refresh/discovery requests admitted separately through quota policy as defined by ADR-008.

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

packages/providers
  provider-neutral discovery/channel contracts

packages/youtube
  YouTube adapter implementing provider contracts

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
- dedicated `apps/channel-ingestion` Worker;
- queue consumer contract for `viralab-channel-ingestion` with `viralab-channel-ingestion-dlq`;
- Hyperdrive-backed persistence;
- provider adapter composition (YouTube for the MVP);
- structured provider-neutral logs;
- retry/ack policy driven by provider error classification;
- unit tests for orchestration, persistence mapping and retry policy.

Runtime queue creation and production deployment remain Case 03.5 concerns so merging the application code does not require the new Cloudflare resources to exist yet.

### Case 03.4 — Discovery handoff
- producer integration behind an optional queue binding;
- one job per unique stale/un-enriched channel;
- atomic freshness/claim gate using `last_ingested_at` + `last_ingestion_requested_at`;
- configurable freshness and claim-lease windows;
- release claim when queue publication fails;
- correlation propagation;
- duplicate/fresh/concurrent-claim tests.

The Wrangler producer binding itself is activated in Case 03.5 after the Cloudflare queue exists, so merging 03.4 cannot break the current production discovery deploy.

### Case 03.5 — Runtime validation
- provision `viralab-channel-ingestion` and `viralab-channel-ingestion-dlq`;
- bind discovery as producer through `CHANNEL_INGESTION_QUEUE`;
- deploy the channel-ingestion Worker before enabling the discovery producer;
- keep `YOUTUBE_API_KEY` as a Cloudflare Worker secret managed outside the deploy workflow;
- deploy through GitHub Actions;
- run a production discovery smoke test;
- verify migration 0002, handoff counters, channel enrichment, correlation IDs and queue/DLQ health.

Deployment ordering is intentional:

```text
database migration
  -> API
  -> channel-ingestion consumer
  -> discovery producer
```

This ensures the consumer exists before discovery can publish channel-ingestion work. The `YOUTUBE_API_KEY` secret is provisioned directly in Cloudflare for the channel-ingestion Worker and is intentionally not exported through GitHub Actions.

## Acceptance criteria

A production discovery can discover canonical entities, enqueue unique channel enrichment jobs, call `channels.list` asynchronously, persist current channel state idempotently, preserve correlation across logs, survive duplicate delivery and route exhausted retries to a dedicated DLQ.

## Architectural decisions

Case 03 applies ADR-001 through ADR-008, especially ADR-003/005 for queue/processing separation, ADR-006 for snapshot boundaries, ADR-007 for log/BI separation and ADR-008 for dataset-first querying, freshness and provider-quota admission.
