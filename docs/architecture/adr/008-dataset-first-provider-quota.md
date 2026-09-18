# ADR-008 — Separate product queries from provider discovery quota

Status: Accepted
Date: 2026-09-18

## Context

Viralab has two very different kinds of "search":

1. product queries made by users against Viralab's own dataset;
2. provider discovery calls that execute against the YouTube Data API.

Treating these as the same operation would couple product usage directly to external quota consumption. A user may perform many exploratory searches in a session, while YouTube `search.list` has a separate default quota bucket of 100 calls per day per project. At the same time, Viralab itself needs provider quota for autonomous discovery, scheduled refresh and opportunity generation.

The product must therefore scale read/query activity independently from provider discovery activity.

## Decision

Viralab will use a dataset-first query model.

A normal user query reads Viralab-owned data first and does not imply a YouTube API call. Provider discovery/refresh is explicit, budgeted and asynchronous.

The distinction is:

```text
Product query
  -> Viralab database / search index
  -> no provider quota by default

Provider discovery / refresh
  -> quota policy
  -> queue
  -> YouTube API
  -> persist/update Viralab dataset
```

User-visible search volume and provider-call volume are separate metrics.

## Quota ownership

YouTube quota is a shared platform resource. It is not implicitly owned by the user initiating a UI query.

The platform quota allocator must reserve capacity across at least these classes:

- autonomous Viralab discovery;
- paid/on-demand refresh;
- scheduled monitoring/tracking;
- operational reserve/retries.

The exact percentages are runtime policy, not an architectural constant, and may evolve with quota extensions and product usage.

## Free vs paid behavior

The architecture must support product tiers without baking pricing into infrastructure code.

Baseline intent:

- free users can query the Viralab dataset and consume platform-generated discoveries;
- free users should not create unbounded provider discovery work;
- paid features may be allowed to request provider refresh/discovery subject to plan policy and platform quota;
- "refresh credits", freshness tiers, tracked niches or scheduled monitoring can map to the same underlying quota-policy layer.

Entitlements belong above the YouTube gateway. The provider package remains unaware of subscriptions or pricing.

## Freshness and deduplication

A request for data already considered fresh must reuse stored data rather than call the provider again.

Provider work should deduplicate by normalized discovery key and/or canonical entity identity. Multiple users requesting equivalent data inside a freshness window should converge on the same provider work rather than consume quota independently.

Examples:

```text
100 users query "homelab"
-> 100 product reads
-> 0 provider calls if dataset is fresh
```

or:

```text
100 users request stale "homelab"
-> one normalized refresh/discovery job
-> one provider search operation
-> refreshed shared dataset
```

## Provider quota model

As of 2026-09-18, YouTube documents:

- `search.list`: 1 quota unit per call in its own Search Queries bucket, with a default limit of 100 calls/day;
- `channels.list`: 1 unit per call from the general quota pool;
- the general pool defaults to 10,000 units/day for endpoints outside dedicated granular buckets.

Provider limits are configuration/policy inputs and can change. Code should model operation cost separately from bucket capacity.

## Metrics

At minimum, track:

- product queries;
- provider calls by operation;
- provider calls by source: platform discovery, user refresh, scheduler, retry;
- cache/freshness hits;
- deduplicated provider requests;
- quota consumed / remaining by bucket;
- provider calls per active paid user;
- provider calls per autonomous discovery run.

The important unit-economics metric is provider work per paying/active user, not UI searches per user.

## Consequences

Positive:

- users can search heavily without linearly consuming YouTube quota;
- autonomous discovery retains protected quota capacity;
- shared dataset value improves with scale;
- pricing can be based on freshness, tracking and discovery value instead of raw query count;
- provider costs remain measurable and controllable.

Trade-offs:

- freshness policy becomes a first-class subsystem;
- provider work needs deduplication and admission control;
- asynchronous refresh means some user queries may return cached data while refresh happens separately;
- a quota allocator/scheduler is required before aggressive autonomous discovery.

## Implementation impact

Current Case 02 and Case 03 work remains valid. No existing persistence or gateway contract must be discarded.

Required follow-up:

- Case 03.4 discovery-to-ingestion handoff should avoid duplicate channel enrichment and respect entity freshness;
- future user-facing search endpoints must query Viralab storage first rather than proxy YouTube search;
- autonomous discovery requires a scheduler/quota allocator before production scale;
- on-demand refresh APIs must pass through entitlement, freshness, deduplication and quota-policy checks;
- Case 04+ scoring/explorer features should consume Viralab-owned data, not invoke provider search directly.
