# Viralab Algorithm Roadmap

Status: Proposed
Date: 2026-09-24
Depends on: ADR-010, Historical Observation Foundation

## 1. Purpose

This roadmap defines the analytical sequence that turns Viralab's historical observations into explainable opportunity intelligence.

The objective is not to create one opaque "viral score". The system should first derive reusable temporal signals, then use those signals for dataset lifecycle/sampling policy, and only then compose versioned product models.

The implementation order is deliberately conservative:

```text
observations
   |
   v
temporal primitives
   |
   +--> lifecycle + sampling
   |
   +--> video opportunity models
   |
   +--> channel opportunity models
   |
   +--> niche aggregation
```

Each phase must be backtestable from owned historical data and must preserve raw observations.

## 2. Algorithm design principles

1. **Raw observations are immutable.** Model changes never rewrite source history.
2. **Signals precede scores.** Growth, velocity, acceleration and rediscovery are reusable facts/derived measurements, not product verdicts.
3. **Time matters.** Counter deltas must be normalized by elapsed observation time.
4. **Entity age matters.** A 12-hour-old video and a 2-year-old video should not share an unqualified baseline.
5. **Channel size matters, but must not dominate.** Relative performance is required to surface small accelerating channels.
6. **Robust baselines beat means where outliers contaminate history.**
7. **Insufficient history is an explicit state.** Missing evidence must not silently become zero.
8. **Lifecycle uses hysteresis.** Promotion and demotion thresholds must differ to avoid oscillation.
9. **Every model is versioned and explainable.** Persist inputs/evidence sufficient to reconstruct a result.
10. **Provider quota is part of the optimization problem.** Sampling policy spends more where information value is higher.

## 3. Measurement vocabulary

For a monotonically increasing metric `M`, with observations `(M0,t0)` and `(M1,t1)`:

```text
dt_hours        = (t1 - t0) / 1 hour
absolute_growth = M1 - M0
velocity        = absolute_growth / dt_hours
relative_growth = absolute_growth / max(M0, epsilon)
```

For three valid observations:

```text
acceleration = (velocity_current - velocity_previous)
               / elapsed_hours_between_velocity_midpoints
```

Counter regressions are treated as data-quality/provider events, not negative organic growth, unless a metric explicitly supports decreases.

A signal must carry at least:

```text
value
window
sample_count
computed_at
quality/confidence metadata
algorithm_version
```

## 4. Phase A — Temporal primitives

**Goal:** establish trustworthy reusable historical measurements before changing product scoring.

### A1. Observation quality

Define and test:

- valid adjacent observation selection;
- actual elapsed-time normalization rather than assumed cadence;
- duplicate/hour semantics already guaranteed by persistence;
- counter-reset/regression handling;
- missing/private metric handling;
- maximum acceptable observation gap for each derived signal.

### A2. Growth

Implement for channel and video counters:

- absolute growth;
- relative growth;
- views/hour;
- subscribers/hour for channels when subscriber count is available;
- likes/hour and comments/hour where useful.

Initial windows should be observation-pair based. Fixed semantic windows such as 6h/24h/7d are introduced only after enough dataset coverage exists to evaluate interpolation/gap behavior.

### A3. Acceleration

Compute change in velocity only when at least three temporally valid observations exist.

Acceleration is primarily a ranking/trajectory signal. It must not be used as a lifecycle prerequisite because newly discovered entities will often lack three observations.

### A4. Confidence

Signal confidence is derived from evidence quality, not from the signal magnitude.

Inputs include:

- number of observations;
- elapsed coverage;
- gap quality;
- metric availability;
- baseline sample size.

Deliverable: a versioned temporal-signal library with deterministic unit/property tests.

## 5. Phase B — Lifecycle and adaptive sampling v1

**Goal:** activate the observation system without prematurely coupling it to product opportunity scores.

Lifecycle policy uses three independent families:

### Recency

For videos:

```text
age = now - published_at
```

For channels, recency is primarily inferred from recent publishing activity in Viralab's known video dataset, not from channel creation age.

Use recency bands rather than a weighted magic score. Proposed bands for calibration:

```text
very recent: <= 48h
recent:      <= 7d
aging:       <= 30d
old:         > 30d
```

These are **initial calibration parameters**, not permanent product truth. They must remain configuration/model constants with versioned tests.

### Growth

Growth strength is based on time-normalized movement. It must be relative to an entity-specific or cohort baseline when such a baseline is available.

Bootstrap behavior when history is insufficient:

- newly discovered content may be ACTIVE based on recency/discovery evidence;
- lack of growth history does not imply weak growth;
- after two observations, velocity can participate;
- after three, acceleration can participate.

### Discovery

Discovery strength captures how often Viralab independently encounters an entity through discovery work.

Required state:

```text
first_discovered_at
last_discovered_at
discovery_count/window
distinct discovery runs/window
```

Repeated sightings in the same discovery job must not inflate strength.

### Lifecycle state machine

Lifecycle is categorical, with hysteresis:

```text
DISCOVERED
   |
   | eligible bootstrap evidence
   v
 ACTIVE ----------------------+
   |                           |
   | sustained weak evidence   | renewed recency/growth/discovery
   v                           |
 COLD -------------------------+
   |
   | prolonged weak evidence
   v
 ARCHIVED
   |
   | rediscovery / renewed evidence
   +-----------> ACTIVE
```

Important invariant: **ARCHIVED is reversible**.

Exact transition thresholds should be calibrated using collected distributions. The first implementation should expose named policy parameters rather than burying constants in control flow.

### Sampling policy

Lifecycle and cadence remain separate. Proposed v1 mapping:

```text
ACTIVE + high information value     -> 6h
ACTIVE + medium information value   -> 12h
ACTIVE + low information value      -> 24h
COLD                                -> 72h
ARCHIVED                            -> none
```

Information value is determined from recency, observed movement and rediscovery evidence; it is not the product opportunity score.

Quota pressure may defer observations but must not mutate lifecycle state merely because budget is exhausted.

Deliverable: ADR + TDD for lifecycle/sampling, distribution analysis, deterministic state-machine tests, shadow-mode evaluation, then guarded production activation.

## 6. Phase C — Temporal video baseline

**Goal:** replace the lifetime-average weakness in video-outlier v1 with an age-aware, robust comparison while keeping v1 available during evaluation.

### Cohort

A video should be compared with previous videos from the same channel at approximately the same **video age**.

For target video age `A`:

```text
peer_performance_i(A) = views of prior video i at/near age A
```

This requires historical video observations. Do not compare a video's 12-hour views with another video's lifetime views.

### Robust baseline

Candidate v2 baseline:

```text
baseline(A) = median(peer_performance(A))
outlier_multiplier = observed_views(A) / max(baseline(A), epsilon)
```

Median is the initial preferred estimator because a channel's previous viral hit should not inflate the baseline as strongly as a mean.

For larger peer samples, evaluate:

- median;
- trimmed mean;
- percentile position;
- MAD-based robust z-score.

Do not select among them by intuition. Backtest ranking stability and useful-opportunity precision.

### Cold start

If same-channel peer history is insufficient:

1. keep v1 as fallback;
2. mark the evidence model/fallback explicitly;
3. later evaluate cohort baselines by channel size/niche, but do not make them a prerequisite for v2.

Deliverable: offline video-outlier-v2 evaluator running alongside v1 without changing Explorer ranking.

## 7. Phase D — Video momentum / outlier v2

**Goal:** identify videos outperforming their expected trajectory, not merely their channel lifetime average.

Candidate independent features:

- age-normalized outlier multiplier;
- current views/hour relative to peer velocity;
- acceleration;
- engagement velocity where available;
- recency;
- confidence/evidence quality.

Avoid a single hand-tuned weighted sum initially. First persist/inspect feature distributions and evaluate monotonic transformations independently.

A production composite must satisfy:

- score range and interpretation documented;
- confidence separate from score;
- evidence payload names every contributing signal and model version;
- v1/v2 can run in parallel;
- rollout supports shadow -> compare -> gated product use.

## 8. Phase E — Breakout Channels v1

**Goal:** surface small/medium channels whose trajectory is changing materially.

Channel breakout must not be equivalent to "large subscriber growth". Candidate features:

- subscriber velocity and relative subscriber growth;
- channel view velocity;
- acceleration;
- publishing recency/frequency;
- number/fraction of recent videos individually outperforming baseline;
- repeated discovery sightings.

The model should normalize for channel scale. A small channel doubling rapidly can be more interesting than a large channel adding the same absolute subscribers.

Minimum history must be explicit. When subscriber counts are hidden, the model should degrade to view/video/discovery evidence rather than fabricate subscriber growth.

Deliverable: explainable breakout-channel opportunity type with its own model version and confidence.

## 9. Phase F — Niche momentum

**Goal:** infer opportunity at topic/niche level from aggregates of entity-level evidence.

This phase comes after reliable video/channel signals because niche momentum built directly from raw search results will be noisy and quota-sensitive.

Candidate aggregates:

- count of accelerating videos;
- count of breakout channels;
- median/upper-percentile velocity change;
- breadth: distinct channels participating;
- persistence across multiple observation windows;
- discovery frequency.

A niche signal should distinguish one viral anomaly from broad movement across independent channels.

Niche taxonomy/topic assignment is a separate product/data problem and must be specified before this phase is implemented.

## 10. Evaluation framework

No historical model should go directly from formula to Explorer.

Each model follows:

```text
define
 -> unit/property tests
 -> offline replay/backtest
 -> shadow computation
 -> distribution/quality review
 -> gated product exposure
 -> monitor
 -> promote or rollback
```

### Offline metrics

Before labeled user feedback exists, measure:

- coverage: fraction of eligible entities that receive a valid signal;
- stability: sensitivity to observation gaps and one extra sample;
- rank persistence across adjacent evaluation times;
- lead time: how early a signal appears before a later high-performance state;
- false acceleration caused by tiny denominators;
- opportunity diversity across channel-size bands;
- provider-cost impact of lifecycle/sampling changes.

Later add product labels such as saves, follows, dismissals and downstream creator actions. Do not optimize on click-through alone.

## 11. Versioning and persistence

Raw observations remain immutable.

Derived signals should initially be recomputable. Persist them only when one of these becomes true:

- computation cost is material;
- product reads need low-latency signal access;
- exact historical model replay/audit requires the computed value;
- multiple models repeatedly consume the same expensive derivation.

When persisted, use an explicit structure equivalent to:

```text
entity_type
entity_id
signal_type
signal_version
window
value/evidence
computed_at
source_observation_range
```

Opportunity evidence must reference model version and enough signal metadata to explain the result.

## 12. Implementation sequence

### Algorithm 01 — Temporal primitives
- observation-pair selection;
- growth/relative growth;
- velocity;
- acceleration;
- signal confidence/data-quality rules.

### Algorithm 02 — Lifecycle + sampling v1
- discovery-strength state;
- recency bands;
- growth-strength classification;
- hysteretic lifecycle transitions;
- 6h/12h/24h/72h cadence;
- shadow scheduler comparison;
- guarded activation.

### Algorithm 03 — Temporal baseline evaluator
- same-channel video-age cohorts;
- median baseline;
- sample sufficiency/fallback;
- offline comparison against lifetime-average v1.

### Algorithm 04 — Video Outlier v2
- temporal baseline + trajectory signals;
- confidence;
- shadow v1/v2 comparison;
- gated Explorer rollout.

### Algorithm 05 — Breakout Channels v1
- channel trajectory signals;
- scale normalization;
- recent-video breadth;
- opportunity projection.

### Algorithm 06 — Niche Momentum
- taxonomy prerequisite;
- multi-channel aggregation;
- persistence/breadth;
- niche opportunity projection.

## 13. Explicitly deferred decisions

The roadmap intentionally does **not** freeze these before data exists:

- final lifecycle thresholds/dwell times;
- exact definition of high/medium/low information value;
- final peer-cohort size;
- interpolation method for matching video age;
- median vs trimmed mean vs MAD/percentile final baseline;
- weights/transforms for video v2;
- breakout-channel composite weights;
- niche taxonomy and aggregation thresholds.

These are calibration decisions. Each should be resolved using Viralab's collected distributions/backtests and recorded in the relevant ADR/TDD.

## 14. Immediate next slice

The next implementation should be **Algorithm 01 — Temporal Primitives**, not lifecycle transitions.

Reason: lifecycle Growth and information-value sampling depend on trustworthy time-normalized measurements. Implementing lifecycle first would force arbitrary growth semantics into orchestration.

Algorithm 01 can be implemented without changing production opportunity ranking or activating automatic lifecycle transitions. Its output gives us the measurement layer needed to make Algorithm 02 a defensible policy rather than a collection of guesses.
