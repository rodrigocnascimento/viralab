# Case 02 — YouTube Discovery

Status: Implemented historical case record

> This document records the Case 02 scope as delivered. For the current whole-system architecture and later historical-observation decisions, see `ARCHITECTURE.md` and the ADR index.
Date: 2026-09-16
Issue: #6

## Objective

Case 02 is Viralab's first product vertical slice. A normalized search intent is accepted by the HTTP API, recorded as a Business Intelligence event, dispatched as asynchronous discovery work, resolved against the YouTube Data API, and persisted as canonical channels/videos in PostgreSQL.

The implementation must prove the following invariant:

> Repeating a search or receiving a queue message more than once may create additional search-intent history, but it must never create duplicate canonical YouTube channels or videos.

## Flow

```text
POST /api/v1/discoveries
        |
        +--> validate + normalize query
        +--> create discovery request id
        +--> persist search_performed BI event
        +--> enqueue youtube.discovery.requested
        |
        v
      202 Accepted

Cloudflare Queue
        |
        v
Discovery consumer
        |
        +--> validate versioned message
        +--> YouTube search.list (quota cost: 1 unit/call; separate daily search bucket)
        +--> normalize provider response
        +--> upsert channels
        +--> upsert videos
        +--> structured completion/failure log
        v
Supabase PostgreSQL
```

The HTTP request does not wait for YouTube. `202 Accepted` means work was durably accepted for asynchronous processing, not that discovery completed.

## API contract

### Request

`POST /api/v1/discoveries`

```json
{
  "query": "homelab"
}
```

Normalization rules for the MVP:

- trim leading/trailing whitespace;
- collapse repeated internal whitespace;
- preserve human-readable casing in the original value if useful for audit/display;
- produce a lowercase normalized value for BI aggregation and deduplication policy;
- reject empty queries;
- cap input length before sending anything to the provider.

### Accepted response

```json
{
  "id": "<uuid>",
  "status": "accepted",
  "query": "homelab"
}
```

HTTP status: `202`.

A future discovery-status resource can expose processing state. Case 02 does not require polling/status UI.

## Queue contract

Queue messages are commands, not copied YouTube payloads.

```json
{
  "version": 1,
  "type": "youtube.discovery.requested",
  "jobId": "<uuid>",
  "correlationId": "<uuid>",
  "query": "homelab",
  "requestedAt": "2026-09-16T00:00:00.000Z"
}
```

`jobId` identifies one submitted discovery job. `correlationId` follows the action across HTTP, BI capture, queue logs and provider calls. Consumers reject unknown versions/types explicitly.

Cloudflare Queue delivery is at-least-once. Therefore `jobId` is useful for observability, but canonical persistence correctness is enforced by database uniqueness constraints on provider IDs.

## Persistence model

### channels

Canonical representation of a discovered YouTube channel.

Required initial columns:

- `id` UUID primary key;
- `youtube_id` text unique, not null;
- `title` text not null;
- `description` text nullable;
- `thumbnail_url` text nullable;
- `published_at` timestamptz nullable;
- `first_discovered_at` timestamptz not null;
- `last_discovered_at` timestamptz not null;
- `created_at` / `updated_at` timestamptz not null.

Case 02 intentionally does not pretend that search results contain the complete channel analytical profile. Subscriber/view/video counts belong to Channel Ingestion and historical observations belong to ADR-006 snapshots.

### videos

Canonical representation of a discovered YouTube video.

Required initial columns:

- `id` UUID primary key;
- `youtube_id` text unique, not null;
- `channel_id` UUID FK to channels, not null;
- `title` text not null;
- `description` text nullable;
- `thumbnail_url` text nullable;
- `published_at` timestamptz nullable;
- `first_discovered_at` timestamptz not null;
- `last_discovered_at` timestamptz not null;
- `created_at` / `updated_at` timestamptz not null.

Views, likes and comments are deliberately absent from this canonical table in Case 02. They are observations that change over time and will be captured through the historical model rather than overwritten as if they were identity metadata.

### analytics_events

Append-oriented Business Intelligence events defined by ADR-007.

Initial columns:

- `id` UUID primary key;
- `event_name` text not null;
- `event_version` integer not null;
- `occurred_at` timestamptz not null;
- `correlation_id` UUID nullable;
- `actor_id` text nullable;
- `properties` jsonb not null;
- `created_at` timestamptz not null.

For `search_performed@1`, properties initially contain:

```json
{
  "query": "homelab",
  "normalizedQuery": "homelab",
  "source": "discovery_api"
}
```

This table is intentionally generic at the event envelope level but the event payload is versioned and must be validated by application contracts. It is not a dumping ground for arbitrary logs.

## Upsert and idempotency

YouTube provider IDs are natural external identities; internal UUIDs remain Viralab identities.

Channel upsert conflict key: `channels.youtube_id`.

Video upsert conflict key: `videos.youtube_id`.

On rediscovery, mutable descriptive metadata may be refreshed and `last_discovered_at` advances. `first_discovered_at` and the internal UUID remain unchanged.

The consumer resolves/upserts the channel before the video so the video always references the canonical internal channel id.

A duplicate queue delivery must therefore converge on the same channel/video rows.

A repeated user search is different: it is a new business action and intentionally creates another `search_performed` event even when all discovered entities already exist.

## YouTube gateway

Provider-specific HTTP/JSON remains inside `packages/youtube`.

Application code consumes a narrow gateway such as:

```ts
interface YouTubeDiscoveryGateway {
  searchVideos(input: {
    query: string;
    maxResults: number;
  }): Promise<YouTubeDiscoveryResult>;
}
```

The normalized result contains only fields Viralab understands. Raw Google response types must not leak into repositories or queue contracts.

The initial discovery operation uses `search.list` with `part=snippet` and `type=video`. Search results give both video identity and channel identity/snippet metadata sufficient for initial canonical discovery. Richer channel/video observations are deferred to subsequent ingestion cases so Case 02 does not multiply quota usage unnecessarily.

## Quota model

YouTube quota is an application resource, not an invisible provider implementation detail.

For Case 02:

- `search.list` has an explicit modeled cost of 1 quota unit per call and is governed by its own daily search-call bucket;
- the gateway exposes operation cost metadata in code;
- one accepted discovery should perform a bounded number of search calls;
- no pagination loop is unbounded;
- known channels/videos are refreshed later through cheaper ID-based endpoints, not rediscovered through search;
- provider quota exhaustion is classified as a non-immediate-retry condition;
- transient 5xx/network failures are retryable;
- malformed requests/auth/key configuration failures are permanent until configuration/input changes.

Quota accounting/limits can become persistent in a later case. The important Case 02 constraint is that call cost and retry behavior are explicit from the first provider integration.

## Error taxonomy

The YouTube adapter maps provider/network failures into application-facing categories:

- `rate_limited` — retryable with provider/backoff semantics;
- `quota_exhausted` — do not hot-retry;
- `provider_unavailable` — retryable;
- `invalid_request` — permanent for this job;
- `unauthorized` — configuration failure, permanent for this job;
- `unexpected_provider_response` — explicit failure; retry only when policy says it is safe.

The queue adapter decides `ack`/`retry` based on this classification. Domain/application code does not import Cloudflare message types.

## Observability

Every discovery carries `jobId` and `correlationId`.

Structured events should make these stages distinguishable:

- `discovery.accepted`;
- `discovery.started`;
- `youtube.request.completed` with operation and quota-cost metadata;
- `discovery.persisted` with counts, not full provider payloads;
- `discovery.failed` with classified error and retry disposition.

Do not log API keys, complete provider responses, or user-sensitive data.

## Package boundaries

Target implementation shape:

```text
apps/api
  HTTP adapter
  discovery route

apps/discovery
  queue consumer adapter

packages/shared
  versioned discovery queue/API contracts

packages/youtube
  YouTube Data API adapter
  response mapping
  error classification
  quota operation metadata

packages/database
  Drizzle schema
  migrations
  repositories for channels/videos/analytics events
```

At the time of Case 02, the repository still contained legacy Case 01 TypeORM/Redis worker artifacts. ADR-003/004 superseded those choices; subsequent implementation completed the Cloudflare/Drizzle direction.

## Test strategy

CI does not call YouTube.

Unit tests cover query normalization, queue contract validation, response mapping, error classification and quota metadata.

Repository tests cover conflict/upsert semantics where the test environment can provide PostgreSQL. At minimum, schema constraints and repository behavior must be written so duplicate provider IDs cannot create duplicate canonical rows.

HTTP tests inject/fake queue and analytics ports. Consumer tests inject/fake the YouTube gateway and repositories.

A manual development smoke test with a real API key validates the acceptance path using `homelab`.

## Delivery slices

1. **Contracts and schema** — query normalization, queue envelope, Drizzle canonical schema, BI event schema and migration.
2. **YouTube gateway** — bounded search, mapping, quota metadata and error classification.
3. **Application pipeline** — accept discovery, persist BI event, enqueue command, consume command and idempotently persist results.
4. **Cloudflare adapters** — bindings/wrangler configuration, queue producer/consumer wiring and Hyperdrive database adapter.
5. **Validation** — automated tests, docs and real-key smoke-test instructions.

Each slice should be independently reviewable; do not wait for UI work to prove ingestion correctness.

## Acceptance smoke test

With Supabase/Hyperdrive (or local PostgreSQL), Cloudflare queue bindings and `YOUTUBE_API_KEY` configured:

1. submit `homelab`;
2. receive `202 Accepted` with job id;
3. observe the queue consumer process the job;
4. query PostgreSQL and confirm real channels/videos exist;
5. submit/process `homelab` again;
6. confirm canonical YouTube IDs remain unique;
7. confirm two intentional `search_performed` events exist;
8. inspect correlated structured logs without exposing credentials.
