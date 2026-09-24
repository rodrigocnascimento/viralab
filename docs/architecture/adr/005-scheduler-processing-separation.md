# ADR-005: Separate scheduling/policy from processing

- Status: Accepted
- Date: 2026-09-16
- Clarified: 2026-09-23

## Context

Viralab periodically discovers and refreshes external provider data. A Cron Trigger could technically perform provider work directly, but that would combine timing, work selection, lifecycle/freshness policy, quota admission, external calls, fan-out, persistence and retry in one invocation.

Dataset growth and provider quota make that coupling increasingly risky. The same separation originally adopted for discovery also applies to the historical observation pipeline.

## Decision

Cron-triggered schedulers are bounded coordinators only. They decide **what work is due and admissible** and enqueue it. Queue consumers perform external data acquisition, persistence and downstream processing.

The architecture distinguishes scheduling concerns by policy:

```text
Discovery Scheduler
  -> select due discovery strategies/seeds
  -> enforce discovery bounds/budget
  -> enqueue discovery work

Observation Scheduler
  -> select known entities due for observation
  -> evaluate lifecycle and adaptive-sampling policy
  -> enforce observation budget
  -> enqueue observation work
```

A scheduler must not call YouTube for bulk acquisition, recursively crawl entities or calculate analytical models inline.

Schedulers may share implementation infrastructure where useful, but discovery policy and observation policy remain separate application concerns.

## Historical observation policy

The accepted target uses:

- lifecycle states ACTIVE, COLD and ARCHIVED;
- lifecycle signals based initially on Recency, Growth and Discovery;
- adaptive nominal observation intervals of 6h -> 12h -> 24h -> 72h;
- no routine observations for ARCHIVED entities;
- rediscovery or renewed signal may reactivate an entity.

The exact measurable lifecycle thresholds are deliberately deferred to the algorithm-roadmap formalization. This ADR establishes the scheduling boundary, not a scoring formula.

## Run/work model

A scheduled run should eventually record enough information to explain:

- what triggered the run;
- which policy selected work;
- configured/available quota budget;
- work/messages admitted and deferred;
- provider operations consumed;
- success/failure/defer counters;
- terminal diagnostics.

This allows questions such as: Why was this entity fetched? Why was it deferred? Which lifecycle/sampling policy applied? How much provider budget did the run consume?

## Bounds

Schedulers must have explicit limits. They may never create an unbounded recursive crawl or scan an unbounded dataset in one invocation.

Selection should use indexed due-work state (for example a future `next_observation_at` projection) rather than repeatedly scanning all historical observations to decide what is due.

## Consequences

Positive:

- Cron invocations remain short and predictable;
- provider work receives queue retry/backpressure semantics;
- discovery and historical refresh can evolve independently;
- quota policy is evaluated before expensive work is emitted;
- lifecycle/adaptive-sampling changes do not require provider-adapter changes.

Trade-offs:

- schedule time and completed observations are eventually consistent;
- due-work state and scheduler idempotency require explicit design;
- run/work metadata adds persistence and operational complexity;
- quota budgeting must coordinate across scheduler invocations rather than rely on process memory.
