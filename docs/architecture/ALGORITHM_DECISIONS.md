# Algorithm Decision Register

Status: Open decisions
Date: 2026-09-24
Related: `ALGORITHM_ROADMAP.md`
Owner: Viralab

## 1. Purpose

This document is the decision register for Viralab's algorithm roadmap.

It records questions that must be explicitly decided before or during each algorithm phase, preventing implementation details, thresholds, formulas, or product semantics from being chosen opportunistically inside code.

A decision remains **OPEN** until it has evidence, rationale and an accepted resolution. Decisions that require real Viralab distributions should not be frozen prematurely.

Statuses:

- **OPEN** — decision still required;
- **EXPERIMENT** — candidate approaches must be evaluated with data;
- **DECIDED** — accepted and ready to be encoded in ADR/TDD/code;
- **DEFERRED** — intentionally postponed to a later algorithm phase.

---

## 2. Algorithm 01 — Temporal Primitives

These are the immediate decisions required before implementing the first algorithm slice.

### TP-01 — Maximum observation gap

**Status:** OPEN  
**Question:** What is the maximum elapsed time between observations for a velocity measurement to remain valid?

Considerations:
- actual elapsed time is always used in normalization;
- a mathematically computable delta is not necessarily analytically representative;
- the limit may differ by entity/metric;
- large gaps may remain useful for growth while being unsuitable for short-term velocity.

### TP-02 — Counter regression/reset policy

**Status:** OPEN  
**Question:** How should Viralab handle a provider counter where `M(t1) < M(t0)`?

Examples:
- deleted/private views or videos;
- provider corrections;
- subscriber-count corrections;
- upstream inconsistencies.

Candidate semantics include invalidating the interval, emitting a data-quality event, or supporting metric-specific decreases. Organic negative growth must not be inferred accidentally from a monotonic counter.

### TP-03 — Missing/private metrics

**Status:** OPEN  
**Question:** How should derived signals behave when metrics such as subscriber count, likes, or comments are unavailable?

Required property: missing evidence is distinct from a numeric zero.

### TP-04 — Small-denominator protection

**Status:** OPEN  
**Question:** How should relative growth behave when the previous value is zero or very small?

The policy must prevent tiny denominators from generating meaningless extreme relative-growth values while retaining useful early-stage growth evidence.

### TP-05 — Signal confidence

**Status:** OPEN  
**Question:** What evidence determines confidence for a temporal signal?

Candidate inputs:
- observation count;
- elapsed historical coverage;
- observation-gap quality;
- metric availability;
- baseline/cohort sample size.

Confidence must measure evidence quality, not duplicate signal magnitude.

### TP-06 — Pair-based vs fixed-window signals

**Status:** OPEN  
**Question:** Does Algorithm 01 initially compute only adjacent-observation measurements, or also semantic windows such as 6h, 24h and 7d?

A fixed-window implementation also requires decisions about interpolation, nearest-observation tolerance and incomplete windows.

### TP-07 — Derived-signal persistence

**Status:** OPEN  
**Question:** Should temporal primitives initially be recomputed from observations or persisted?

Persistence should be justified by computation cost, read latency, audit/replay requirements, or repeated consumption by multiple models.

---

## 3. Algorithm 02 — Lifecycle

### LC-01 — DISCOVERED to ACTIVE

**Status:** DEFERRED  
What minimum bootstrap evidence makes a newly discovered entity eligible for routine observation?

### LC-02 — ACTIVE to COLD

**Status:** DEFERRED  
What measurable sustained weakness moves an entity out of active observation?

### LC-03 — COLD to ARCHIVED

**Status:** DEFERRED  
How long and how weak must evidence remain before routine provider spending stops?

### LC-04 — Reactivation

**Status:** DEFERRED  
Which rediscovery, recency, or growth evidence promotes COLD/ARCHIVED back to ACTIVE?

### LC-05 — Dwell time

**Status:** DEFERRED  
How long must a condition remain true before a downgrade occurs?

### LC-06 — Evidence composition

**Status:** DEFERRED  
Which combinations of Recency, Growth and Discovery are sufficient for each transition?

### LC-07 — Hysteresis thresholds

**Status:** DEFERRED  
What distinct promotion/demotion thresholds prevent lifecycle oscillation?

### LC-08 — Entity-specific policies

**Status:** DEFERRED  
Should channels and videos have different lifecycle policies?

---

## 4. Algorithm 02 — Adaptive Sampling

### AS-01 — Information-value classes

**Status:** DEFERRED  
What measurable evidence defines high, medium and low information value?

### AS-02 — Cadence mapping

**Status:** DEFERRED  
How do information value and lifecycle map to 6h, 12h, 24h and 72h cadence?

### AS-03 — Recency priority

**Status:** DEFERRED  
Can recency alone justify the highest sampling frequency?

### AS-04 — Acceleration priority

**Status:** DEFERRED  
Should positive acceleration automatically increase observation frequency?

### AS-05 — Downsampling evidence

**Status:** DEFERRED  
How much evidence is required before reducing observation frequency?

### AS-06 — Quota pressure

**Status:** DEFERRED  
How should quota pressure prioritize competing eligible entities without altering their lifecycle state?

### AS-07 — Intra-workload priority

**Status:** DEFERRED  
Within channel/video allocations, do entities require an explicit priority ordering?

---

## 5. Discovery Strength

### DS-01 — Rediscovery window

**Status:** DEFERRED  
Which time window or windows represent meaningful rediscovery?

### DS-02 — Counting unit

**Status:** DEFERRED  
Should discovery strength count raw appearances or distinct discovery runs?

### DS-03 — Query diversity

**Status:** DEFERRED  
Should appearances from distinct queries contribute additional evidence?

### DS-04 — Similar-query deduplication

**Status:** DEFERRED  
How do we prevent semantically similar discovery queries from artificially inflating strength?

### DS-05 — Discovery decay

**Status:** DEFERRED  
Does old discovery evidence decay, and at what semantics?

### DS-06 — Discovery state persistence

**Status:** DEFERRED  
Which discovery facts must be stored: first/last discovery, counts by window, distinct runs, query provenance?

---

## 6. Algorithm 03 — Temporal Video Baseline

### TB-01 — Minimum peer sample

**Status:** DEFERRED  
How many previous videos are required for a trustworthy same-channel baseline?

### TB-02 — Maximum cohort

**Status:** DEFERRED  
How much historical channel content remains relevant to the baseline?

### TB-03 — Comparable video age

**Status:** EXPERIMENT  
How should observations be matched at approximately the same video age: tolerance window, relative tolerance, nearest observation, or interpolation?

### TB-04 — Robust estimator

**Status:** EXPERIMENT  
Which estimator performs best for Viralab data: median, trimmed mean, percentile model, MAD-based score, or another robust statistic?

### TB-05 — Historical relevance

**Status:** DEFERRED  
Should very old videos be excluded or time-weighted?

### TB-06 — Content formats

**Status:** DEFERRED  
Should Shorts, standard videos and live streams use separate baselines?

### TB-07 — Cold start

**Status:** DEFERRED  
What happens when same-channel history is insufficient?

### TB-08 — v1 fallback

**Status:** DEFERRED  
Under which exact conditions does Video Outlier v1 remain the fallback evidence model?

---

## 7. Algorithm 04 — Video Outlier v2

### VO2-01 — Feature set

**Status:** DEFERRED  
Which temporal features are admitted to the production model?

### VO2-02 — Feature normalization

**Status:** EXPERIMENT  
How is each feature normalized before comparison/composition?

### VO2-03 — Composition

**Status:** EXPERIMENT  
How should temporal outlier multiplier, velocity and acceleration be composed?

### VO2-04 — Engagement semantics

**Status:** DEFERRED  
Are likes/comments part of score, confidence, evidence only, or a separate signal?

### VO2-05 — Recency semantics

**Status:** DEFERRED  
Is recency a score component, eligibility filter, cohort selector, or combination?

### VO2-06 — Score vs confidence

**Status:** DEFERRED  
Define the independent meanings and ranges of opportunity score and confidence.

### VO2-07 — Opportunity threshold

**Status:** EXPERIMENT  
What evidence threshold promotes a derived signal to a persisted product opportunity?

### VO2-08 — Very-new-video protection

**Status:** DEFERRED  
How are extreme ratios from very young videos/tiny baselines controlled?

### VO2-09 — v1 to v2 rollout

**Status:** DEFERRED  
What shadow/backtest/product criteria permit v2 to replace v1 in Explorer?

---

## 8. Algorithm 05 — Breakout Channels

### BC-01 — Channel-size semantics

**Status:** DEFERRED  
What does small/medium channel mean analytically, if explicit size bands are needed at all?

### BC-02 — Scale normalization

**Status:** EXPERIMENT  
Should subscriber count, channel views, historical velocity, or a combination normalize channel scale?

### BC-03 — Evaluation window

**Status:** EXPERIMENT  
Which temporal window best represents breakout behavior?

### BC-04 — Recent-video breadth

**Status:** DEFERRED  
How many/fraction of recent videos must exhibit abnormal performance?

### BC-05 — Single-hit behavior

**Status:** DEFERRED  
Can one exceptional video make a channel a breakout candidate, or is breadth required?

### BC-06 — Subscriber contribution

**Status:** DEFERRED  
How much subscriber velocity contributes relative to view/video evidence?

### BC-07 — Hidden subscribers

**Status:** DEFERRED  
Define graceful degradation when subscriber count is unavailable.

### BC-08 — Minimum history

**Status:** DEFERRED  
What evidence is required before a breakout classification is trustworthy?

### BC-09 — Opportunity threshold

**Status:** EXPERIMENT  
What conditions create a breakout-channel opportunity?

---

## 9. Algorithm 06 — Niche Momentum

### NM-01 — Niche definition

**Status:** DEFERRED  
What constitutes a niche in Viralab?

### NM-02 — Taxonomy source

**Status:** DEFERRED  
Is taxonomy curated, provider-derived, embedding/cluster-derived, model-classified, or hybrid?

### NM-03 — Multi-label classification

**Status:** DEFERRED  
Can a video/channel belong to multiple niches, and with what confidence?

### NM-04 — Entity classification

**Status:** DEFERRED  
How are channels/videos assigned to niches reproducibly?

### NM-05 — Breadth requirement

**Status:** EXPERIMENT  
How many independent channels are required before movement is considered niche-level?

### NM-06 — Dominance protection

**Status:** DEFERRED  
How do we prevent one viral channel/video from dominating niche momentum?

### NM-07 — Momentum window

**Status:** EXPERIMENT  
Which temporal windows represent emerging versus sustained niche momentum?

### NM-08 — Breadth vs magnitude

**Status:** EXPERIMENT  
How are participation breadth and individual growth magnitude combined?

### NM-09 — Momentum lifecycle

**Status:** DEFERRED  
How are niche momentum start, persistence, decay and end defined?

---

## 10. Evaluation and Calibration

### EV-01 — Success definition

**Status:** OPEN  
What measurable outcome means an opportunity model is useful to Viralab users?

### EV-02 — Initial ground truth

**Status:** OPEN  
What proxy ground truth is used before enough explicit user feedback exists?

### EV-03 — v1/v2 comparison metric

**Status:** DEFERRED  
Which metrics determine whether v2 is materially better than v1?

### EV-04 — Lead time

**Status:** OPEN  
How early should Viralab detect an opportunity before it becomes obvious from raw scale?

### EV-05 — False positives

**Status:** OPEN  
How are false-positive opportunities operationally defined and measured?

### EV-06 — Channel-size stratification

**Status:** OPEN  
Which cohorts are used to verify that evaluation is not dominated by large channels?

### EV-07 — Minimum historical coverage

**Status:** OPEN  
How much historical data is required before a backtest is considered representative?

### EV-08 — Shadow-mode duration/promotion

**Status:** DEFERRED  
What evidence and minimum runtime allow a shadow model to become product-facing?

---

## 11. Versioning and Storage

### VS-01 — Derived-signal materialization

**Status:** OPEN  
Are signals recomputed or persisted? This is linked to TP-07.

### VS-02 — Materialization granularity

**Status:** DEFERRED  
If persisted, at what temporal granularity are signals stored?

### VS-03 — Opportunity evidence

**Status:** OPEN  
What minimum evidence payload must a persisted opportunity contain?

### VS-04 — Exact historical reproducibility

**Status:** OPEN  
Must Viralab reproduce an old score exactly, including its historical parameter set?

### VS-05 — Model-version semantics

**Status:** OPEN  
Which changes require a new model version: formula, parameter, cohort policy, thresholds, or all behavior-affecting changes?

### VS-06 — Backfill policy

**Status:** DEFERRED  
When a model changes, do we backfill historical derived results, recompute lazily, or keep only forward results?

### VS-07 — Parallel model results

**Status:** DEFERRED  
How long and where are v1/v2 results retained simultaneously during experimentation?

---

## 12. Decision gates

The roadmap should progress through explicit gates.

### Gate A — Before Algorithm 01 implementation

Must decide:

- TP-01 maximum observation gap;
- TP-02 counter regression policy;
- TP-03 missing metrics;
- TP-04 small-denominator protection;
- TP-05 confidence semantics;
- TP-06 pair-based vs fixed-window initial scope;
- TP-07 persistence strategy.

### Gate B — Before automatic lifecycle activation

Must decide LC-01 through LC-08, AS-01 through AS-07 and the required Discovery Strength state. Decisions should be informed by distributions produced by Algorithm 01.

### Gate C — Before Video Outlier v2 product scoring

Must resolve Temporal Baseline experiments and VO2 production semantics, backed by offline replay and shadow results.

### Gate D — Before Breakout Channels

Must have reliable channel temporal signals and explicit scale-normalization/minimum-history policy.

### Gate E — Before Niche Momentum

Must first define the niche taxonomy/classification model and have stable entity-level temporal signals.

---

## 13. Decision-record template

When resolving an item, replace its status and record:

```text
Decision ID:
Status: DECIDED
Decision:
Rationale:
Evidence:
Alternatives considered:
Consequences:
Model/policy version affected:
Date:
```

Algorithm constants must be traceable to a decision in this register, an ADR, or the corresponding algorithm TDD. Constants that materially affect model behavior must not appear in production code without that provenance.
