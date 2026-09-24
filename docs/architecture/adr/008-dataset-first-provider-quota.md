# ADR-008 — Separate product queries from provider discovery/observation quota

Status: Accepted
Date: 2026-09-18
Clarified: 2026-09-23

## Context

Viralab has two fundamentally different workload classes:

1. product queries made by users against Viralab's own dataset;
2. provider work that discovers or refreshes external entities.

Treating them as the same operation would couple product usage directly to external-provider limits. Users may explore the dataset heavily while Viralab must preserve provider capacity for autonomous discovery, historical observations, explicit refresh and operational recovery.

## Decision

Viralab uses a **dataset-first query model**.

```text
Product query
  -> Viralab database/search projection
  -> no provider call by default

Provider discovery / observation
  -> freshness/lifecycle/admission policy
  -> quota budget
  -> queue
  -> provider adapter
  -> persist Viralab-owned data
```

Product-query volume and provider-call volume are separate metrics and entitlements.

## Quota ownership

External-provider capacity is a shared platform resource. It is not implicitly owned by the user initiating a UI query.

Quota/rate limits are accounted per provider and per provider bucket/operation where applicable. Provider operation cost and bucket capacity are distinct concepts.

The target allocator reserves runtime-configurable capacity across at least:

- discovery;
- channel observations;
- video observations;
- operational reserve.

Future paid/on-demand refresh may receive its own allocation/class without changing provider adapters.

The exact percentages and environment-variable names are runtime policy, not architectural constants. Allocation configuration must be validated.

## Persistent budgeting

Budget state cannot exist only in Worker memory. A restart/redeploy must not forget already-consumed daily capacity.

Admission policy must be able to answer, for a proposed operation:

```text
Is this work eligible/freshness-due?
Is its lifecycle allowed to spend provider capacity?
Is budget available for this workload class/provider bucket?
If yes -> admit/reserve and enqueue/execute
If no  -> defer intentionally
```

The exact persistence/concurrency mechanism is an implementation decision to be designed with the scheduler.

## Dataset lifecycle interaction

Provider budget should be spent preferentially on entities whose lifecycle/sampling policy says another observation is useful.

Accepted lifecycle states:

- ACTIVE — routinely eligible for observation;
- COLD — observed at reduced cadence;
- ARCHIVED — retained in Viralab but consumes no routine provider quota.

Lifecycle v1 is driven initially by Recency, Growth and Discovery signals. A rediscovered or newly active entity may be promoted and become eligible again.

## Free vs paid behavior

Pricing/plan entitlements belong above provider adapters.

Baseline intent:

- users query the shared Viralab dataset without each read causing provider work;
- free usage must not create unbounded provider work;
- paid/on-demand freshness can later map to the same admission/budget layer;
- provider packages remain unaware of subscriptions/pricing.

## Freshness and deduplication

Fresh stored data is reused. Equivalent stale work should converge rather than consume quota once per user or queue retry.

Discovery, canonical ingestion and future observations each need idempotency appropriate to their semantics. Historical observations use a one-hour entity bucket; scheduling cadence is independent from that bucket.

## Provider quota model

Quota/rate-limit semantics are provider-specific inputs behind provider-neutral orchestration.

For YouTube, operation metadata must be defined in one code/documentation source of truth and kept aligned with current provider behavior. Do not infer a provider call from a product query, and do not encode product-tier semantics inside the YouTube adapter.

If multiple provider credential pools are ever introduced, they must represent genuinely distinct use cases, not quota sharding for identical workload. Routing is an orchestration/policy decision and there is no automatic cross-pool borrowing.

## Metrics

At minimum track:

- product queries;
- provider calls by provider, operation and workload source;
- admitted/deferred work;
- freshness/lifecycle skips;
- deduplicated provider requests;
- configured/consumed/remaining budget by workload class and provider bucket;
- observation writes/deduplications;
- retries and operational reserve consumption.

## Consequences

Positive:

- product exploration scales independently from provider limits;
- autonomous discovery and historical observation cannot accidentally starve each other when budgets are configured;
- dataset lifecycle reduces waste on low-value entities;
- provider cost remains measurable and controllable;
- pricing can later map to freshness/tracking value rather than raw UI requests.

Trade-offs:

- quota allocation becomes a persistent coordination problem;
- freshness/lifecycle/admission policy becomes first-class;
- asynchronous refresh may return existing dataset state while provider work is deferred;
- allocation defaults need operational tuning from real usage.

## Relationship to other decisions

- ADR-005 keeps scheduling/admission separate from provider processing.
- ADR-006 defines immutable observations and adaptive lifecycle-aware capture.
- ADR-007 keeps operational quota telemetry distinct from product/BI semantics.
- ADR-009 product/anonymous Explorer quota is independent from provider quota.
