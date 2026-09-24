# ADR-010: Historical observation scheduling, lifecycle and provider-budget policy

- Status: Accepted
- Date: 2026-09-24

## Context

ADR-005 established that scheduling and provider processing are separate concerns. ADR-006 established immutable historical source data. ADR-008 separated dataset product reads from provider quota.

Those decisions intentionally left several material historical-data policies unresolved: observation idempotency granularity, how known entities stop consuming provider capacity, how sampling cadence adapts, and how provider capacity is protected across discovery and historical observations.

These choices constrain persistence, consistency, scheduling and operations and therefore require their own ADR rather than retroactive changes to ADR-005/006/008.

## Decision

### Observation identity

Historical observation insertion uses a **one-hour UTC bucket per entity** as the default idempotency granularity:

```text
UNIQUE(channel_id, observation_bucket)
UNIQUE(video_id, observation_bucket)
```

The bucket prevents queue retries or equivalent work inside the same hour from appending meaningless duplicate measurements.

Sampling cadence and observation identity are separate. A six-hour scheduled cadence does not imply a six-hour uniqueness bucket.

### Dataset lifecycle

Known entities participate in a provider-spend lifecycle:

```text
DISCOVERED -> ACTIVE -> COLD -> ARCHIVED
                ^                |
                +----------------+
                  rediscovery /
                  renewed signal
```

- **ACTIVE**: routinely eligible for observation.
- **COLD**: eligible at reduced cadence.
- **ARCHIVED**: retained with history but consumes no routine provider capacity.
- rediscovery or renewed evidence may reactivate an entity.

The first lifecycle policy will use three signal families: **Recency, Growth and Discovery**.

This ADR does not define their formulas, weights or transition thresholds. Those belong to the algorithm-roadmap formalization.

### Adaptive sampling

The accepted nominal cadence is:

```text
strong/new signal -> 6h
stable            -> 12h
lower activity    -> 24h
cold              -> 72h
archived          -> no routine observation
```

These values are policy defaults and may become runtime-configurable. Lifecycle answers whether Viralab should keep investing in an entity; sampling answers when the next observation is useful.

### Observation scheduler

A dedicated observation scheduling policy selects known entities that are due, applies lifecycle/sampling rules, applies provider-budget admission and enqueues bounded work.

```text
Cron
  -> Observation Scheduler
  -> due-work + lifecycle/sampling policy
  -> provider-budget admission
  -> Observation Queue
  -> consumer/provider
  -> current projection + immutable observation
```

The scheduler must select through indexed due-work state rather than repeatedly scan historical observations to reconstruct eligibility.

### Persistent provider budgeting

Provider capacity is allocated across workload classes. The initial target distinguishes at least:

- discovery;
- channel observations;
- video observations;
- operational reserve.

Allocations are runtime policy rather than hard-coded architectural percentages.

Consumed/reserved capacity must survive Worker restart/redeploy. Budget enforcement therefore cannot rely only on process memory. The exact persistence and concurrency mechanism is deferred to implementation design.

This refines ADR-008 without changing its core dataset-first decision or its rule that provider-specific cost/capacity remains behind provider-aware policy boundaries.

### Analytics isolation

A successfully acquired observation is durable source data independent from downstream scoring success.

```text
observation persisted
        |
        v
derived signal computation
        |
        +--> lifecycle policy
        +--> opportunity models
```

Historical analytical work should be replayable from stored observations without consuming provider quota again.

## Relationship to previous ADRs

- ADR-005 remains the source decision for scheduler/processor separation. This ADR applies that pattern specifically to historical observations.
- ADR-006 remains the source decision for immutable historical source data. This ADR chooses its default observation idempotency granularity and lifecycle/sampling policy.
- ADR-008 remains the source decision for dataset-first product reads and provider quota separation. This ADR adds persistent workload-class budgeting for historical collection.
- ADR-007 continues to separate infrastructure telemetry from product analytics and BI.

This ADR does **not** supersede ADR-005, ADR-006 or ADR-008 because their original decisions remain valid. It records new constraints that were previously left open.

## Consequences

Positive:

- accepted historical policies have a recoverable decision record;
- queue retries converge at the observation boundary;
- low-value entities stop consuming routine provider capacity;
- sampling can react to signal without changing observation identity;
- discovery and historical collection can protect capacity from one another;
- provider acquisition remains replay-independent from analytical models.

Trade-offs:

- due-work/lifecycle state becomes first-class persisted state;
- one-hour bucket semantics must be consistent across writers;
- quota allocation requires durable concurrent accounting;
- lifecycle thresholds and algorithm semantics still require separate formalization;
- adaptive scheduling adds policy complexity compared with a fixed global interval.
