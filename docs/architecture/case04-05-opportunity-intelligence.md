# Case 04 + 05 — Opportunity Intelligence Vertical Slice

Status: Implemented historical case record

> This document records the currently deployed opportunity model and Explorer contract. The v1 algorithm intentionally remains active while Viralab accumulates the historical dataset required for later temporal models.

## Goal

Turn the shared Viralab dataset into explainable opportunity signals and expose them through a dataset-only Explorer. Product reads never proxy YouTube.

## Case 04 — Video outlier model v1

Discovery enriches returned video IDs with `videos.list(part=statistics)` in one batch. This adds one general provider request per non-empty discovery while discovery remains a separate provider operation.

For each enriched video/channel pair:

```text
baseline_views = channel_lifetime_views / channel_video_count
multiplier     = observed_video_views / baseline_views
candidate      = multiplier >= 1.5
```

The persisted evidence records model version and source counts.

### Score

The implementation uses a bounded logarithmic transformation so increasingly large multipliers continue to improve the score without allowing extreme values to dominate linearly.

Conceptually/currently:

```text
signal = log2(multiplier / 1.5 + 1)
score  = clamp(round(signal * 35), 1, 100)
```

### Confidence

Confidence is not a probability that the opportunity will succeed. It is a bounded evidence-strength indicator based on the size of the channel's published-video sample.

Current model:

```text
sample_confidence = min(1, log10(channel_video_count + 1) / 3)
confidence        = clamp(round(35 + sample_confidence * 60), 20, 95)
```

### Explicit limitations

The lifetime-average baseline is deliberately an MVP approximation.

It does **not** account for:

- video age;
- recent channel performance;
- temporal velocity or acceleration;
- historical distribution/variance;
- prior viral videos distorting a mean;
- niche-relative behavior.

Therefore v1 must not be described as recent growth, 7d/30d velocity, breakout probability or an age-normalized outlier.

The accepted historical architecture will preserve observations required to build better temporal baselines. The exact successor algorithms, formulas and thresholds are intentionally deferred to the algorithm-roadmap formalization rather than being invented in this case document.

## Case 05 — Explorer

`GET /api/v1/opportunities` reads only PostgreSQL.

Filters:

- `minScore` 0–100, default 40;
- `limit` 1–100, default 30;
- `detectedAfter` ISO timestamp, optional.

Results are ordered by score then detection time and expose evidence-facing metrics required by the UI: score, confidence, multiplier, observed views, baseline views, video identity and channel identity.

`/explore` is served by the Cloudflare static-assets SPA and calls the Viralab API. The UI must identify the signal as dataset-backed and explain the v1 lifetime baseline accurately.

## Relationship to the historical roadmap

The accepted architecture now distinguishes:

```text
immutable observations
        |
        v
derived signals
        |
        +--> lifecycle policy
        +--> opportunity models
```

Potential later analytical families include growth, velocity, acceleration, discovery frequency, temporal/age-normalized and robust baselines, momentum/decay, video-outlier v2, breakout channels and niche momentum.

These are **roadmap candidates, not implemented algorithms or finalized formulas**. The existing v1 model remains the production baseline until a later case explicitly supersedes it.
