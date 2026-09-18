# Case 04 + 05 — Opportunity Intelligence Vertical Slice

## Goal
Turn the shared Viralab dataset into explainable opportunity signals and expose them through a dataset-only Explorer. Product reads never proxy YouTube.

## Case 04 — Video outlier model v1
Discovery enriches the returned video IDs with `videos.list(part=statistics)` in one batch. This adds one general-quota request per non-empty discovery while `search.list` remains the discovery call.

For each enriched channel, Viralab computes:

`baseline_views = channel_lifetime_views / channel_video_count`

`multiplier = observed_video_views / baseline_views`

A candidate must reach at least **1.5x** baseline. Score is a bounded logarithmic transformation of the multiplier (1–100). Confidence (20–95) grows with the channel's published-video sample size. The persisted evidence records model version and source counts.

This is deliberately an MVP baseline, not a claim about recent velocity. Case 07 replaces lifetime-average baseline with observation-window history while preserving the opportunity API contract.

## Case 05 — Explorer
`GET /api/v1/opportunities` reads only Postgres. Filters:
- `minScore` 0–100, default 40
- `limit` 1–100, default 30
- `detectedAfter` ISO timestamp, optional

Results are ordered by score then detection time and include the evidence-facing metrics required by the UI: score, confidence, multiplier, observed views, baseline views, video and channel identity.

`/explore` is served by the same Cloudflare static-assets SPA and calls `api.viralab.space` (override with `VITE_API_BASE_URL`). The UI explicitly identifies the signal as dataset-backed and explains the v1 baseline.

## Deferred
Historical snapshots, time-window velocity, niche clustering/momentum, alerts and radar remain Cases 07/08. The v1 model must not be presented as 7d/30d growth.
