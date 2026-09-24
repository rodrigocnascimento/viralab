# ADR-006: Treat historical observations as immutable analytical source data

- Status: Accepted
- Date: 2026-09-16
- Clarified: 2026-09-23

## Context

Viralab's competitive advantage depends on its own historical observations. Current channel/video values alone cannot answer how quickly a metric changed, whether growth is accelerating, or how a new video compares with the entity's historical behavior.

Breakout, outlier, momentum and lifecycle decisions require observations across time.

Older documentation used the term **snapshot**. The preferred current term is **observation**, because the stored row represents measured time-series facts rather than a complete copy of an entity.

## Decision

Separate canonical current state from immutable time-series observations.

- `channels` and `videos` hold stable identity, descriptive metadata and useful latest/current projections.
- `channel_observations` will append channel counters such as subscribers, views and video count at observation time.
- `video_observations` will append video counters such as views, likes and comments at observation time.
- normal ingestion never rewrites an old observation to make history resemble current state.

Observations are analytical source data, not opportunity scores.

## Observation idempotency

Observation insertion uses a **one-hour bucket per entity** as the idempotency granularity.

Conceptually:

```text
UNIQUE(channel_id, observation_bucket)
UNIQUE(video_id, observation_bucket)
```

The bucket is UTC-aligned.

Sampling cadence and idempotency bucket are different concerns. An entity may normally be sampled every 6, 12, 24 or 72 hours while the one-hour uniqueness bucket leaves room for legitimate higher-frequency observations later without changing the schema.

Queue retries inside the same entity/hour must converge rather than append meaningless duplicates.

## Sampling and lifecycle

Historical capture follows an adaptive policy rather than a single permanent interval.

Accepted nominal cadence:

```text
strong/new signal -> 6h
stable            -> 12h
lower activity    -> 24h
cold              -> 72h
archived          -> no routine observation
```

Known entities participate in a lifecycle:

```text
DISCOVERED -> ACTIVE -> COLD -> ARCHIVED
                ^                |
                +----------------+
                  rediscovery /
                  renewed signal
```

Lifecycle policy will initially use Recency, Growth and Discovery signal families. Exact transition thresholds and signal formulas are intentionally deferred to the algorithm-roadmap formalization.

ARCHIVED is a provider-spend state, not deletion. Historical observations remain retained/queryable.

## Data integrity

All observation timestamps are UTC. Where useful, upstream semantic time is distinct from Viralab observation/ingestion time.

Canonical current-state updates and observation append operations must preserve a coherent ordering/transaction boundary where a workflow requires both.

Historical model outputs never overwrite observations. Model version/evidence belongs to derived/product projections such as opportunities.

## Analytical boundary

The intended direction is:

```text
immutable observations
        |
        v
derived signal computation
        |
        +--> lifecycle policy
        |
        +--> opportunity models
```

Candidate future signals include growth, velocity, acceleration, discovery frequency, temporal/age-normalized baselines, robust baselines, momentum and decay. This ADR does not define their formulas or thresholds.

## Retention

No aggressive historical retention/deletion policy is adopted for the MVP. Storage usage will be measured first.

Any future downsampling or retention policy must preserve the analytical requirements of the accepted signal/model roadmap and requires a new decision because it can irreversibly remove product information.

## Consequences

Positive:

- historical calculations are reproducible;
- analytics/model failures can be replayed without calling the provider again;
- current-state reads remain simple;
- model evolution does not destroy source facts;
- adaptive sampling controls provider/storage growth without conflating it with observation identity.

Trade-offs:

- storage grows with observation frequency;
- lifecycle and scheduling policy become first-class subsystems;
- time-series indexes/queries require deliberate design;
- one-hour bucket semantics must remain consistent across writers;
- retention/downsampling becomes a future product/analytics decision.
