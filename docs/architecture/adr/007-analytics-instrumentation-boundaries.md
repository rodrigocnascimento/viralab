# ADR-007: Separate infrastructure observability, product analytics, and Business Intelligence

- **Status:** Accepted
- **Date:** 2026-09-16

## Context

Viralab produces and consumes several different kinds of operational and analytical signals. Treating all of them as one generic "analytics" concern would blur ownership, retention, access, storage, and product boundaries.

Three distinct questions must be answered:

1. **Is the platform healthy?** Operators need to diagnose API failures, queue retries, dead letters, database problems, latency, scheduler execution, external API errors, quota pressure, and other runtime behavior.
2. **What intelligence is Viralab delivering to a user?** A user may monitor a niche, inspect channels, follow historical growth, compare outliers, or track an opportunity over time. These are product capabilities and their data is part of the customer-facing domain.
3. **How is Viralab itself being used, and what aggregate signals can improve the business?** The platform owner needs to understand usage and demand patterns such as searches per day, niches receiving increasing attention, feature adoption, and correlations between user interest and Viralab's proprietary YouTube opportunity dataset.

The third category is particularly important because it can become a proprietary strategic dataset. For example, a rising volume of searches for a niche can be combined with observed breakout channels and video outliers in that niche. That signal is different from both an infrastructure metric and a single user's niche analysis.

These categories may eventually share visualization or storage technology, but they must not share semantics or ownership merely because the same tool can display them.

## Decision

Viralab will maintain three explicit instrumentation and analytics layers.

### 1. Infrastructure Observability

**Audience:** Viralab operators/developers.

**Purpose:** Explain whether the system is healthy and why a technical operation succeeded, degraded, retried, or failed.

Examples include:

- Worker request/error rate and latency;
- Cloudflare Queue throughput, retry count, consumer failures, backlog and dead-letter behavior;
- Cron Trigger executions and failures;
- Supabase/PostgreSQL connectivity, query latency, pool/connection pressure and storage health;
- YouTube API errors, quota consumption and throttling;
- structured application logs;
- correlation IDs spanning HTTP requests, scheduled work, queue messages and database operations.

This layer should preferentially use provider-native telemetry and established observability tooling rather than a custom Viralab administrative dashboard. Cloudflare and Supabase telemetry are the initial sources; additional metrics/log aggregation or dashboards can be introduced when operational needs justify them.

Infrastructure telemetry is **not domain data** and must not become a dependency for product or BI calculations.

### 2. Product Analytics / Customer Intelligence

**Audience:** Viralab users.

**Purpose:** Deliver the YouTube Opportunity Intelligence product itself.

Examples include:

- niche monitoring configured by a user;
- channel and video historical evolution;
- breakout channels;
- video outliers;
- niche opportunity indicators;
- saved searches, tracked opportunities and future alerts;
- analytical views derived from immutable channel/video snapshots.

This information belongs to the Viralab product domain. It must be modeled as durable application data with explicit domain semantics, rather than reconstructed from logs or infrastructure telemetry.

Where data is user-scoped, authorization boundaries must be preserved. Aggregate platform intelligence must not expose another user's private configuration or activity.

### 3. Business Intelligence

**Audience:** Viralab owner/internal business operation.

**Purpose:** Understand how the platform is being used, identify demand and market signals, guide product decisions, and create aggregate intelligence that may itself become a strategic or commercial asset.

Examples include:

- search volume per day/week/month;
- searches by normalized niche/topic;
- growth or decline in interest for a niche inside Viralab;
- niches created or monitored over time;
- feature adoption and usage frequency;
- channels/videos/opportunities most frequently investigated in aggregate;
- conversion funnels and retention signals when those concepts exist;
- correlation between internal search demand and Viralab's YouTube dataset, such as increasing niche interest combined with breakout-channel or outlier activity.

Business Intelligence is **intentional historical data**, not merely retained logs. Events that may be valuable for longitudinal analysis must therefore be captured with stable semantics at the moment they occur.

For example, a future search flow should emit/persist a semantic event equivalent to `search_performed` with enough normalized context to support aggregation. A raw HTTP access log such as `GET /search?q=...` is not an acceptable long-term BI source.

BI data may later support internal dashboards, reports, trend detection, product prioritization, proprietary models, or commercial intelligence products. This ADR does not commit Viralab to building those interfaces during the current foundation phase.

## Data boundaries

The layers may describe the same real-world action from different perspectives without being the same record.

For a user searching for `homelab`, for example:

```text
Infrastructure Observability
  HTTP request latency = 83 ms
  queue messages = 4
  YouTube API calls = 2

Product Domain
  search/discovery results
  channels and videos discovered
  snapshots and opportunity metrics

Business Intelligence
  search_performed
  normalized_topic = homelab
  occurred_at = ...
```

The infrastructure record can expire without destroying business history. The BI event can be aggregated without becoming part of the user's product state. Product data can be deleted or changed according to its own lifecycle without redefining infrastructure telemetry.

## Collection principles

1. **Capture semantics, not implementation accidents.** BI events describe user/business actions (`search_performed`, `niche_created`) rather than HTTP routes, button IDs, or queue internals.
2. **Do not derive durable BI exclusively from logs.** Logs are optimized for diagnosis and may have shorter retention or change format.
3. **Do not use BI as observability.** Operational alerting must not depend on analytical event pipelines.
4. **Do not use infrastructure metrics as product state.** Customer-facing historical intelligence belongs in domain persistence.
5. **Prefer append-oriented historical capture for BI events.** Aggregates can be recomputed as definitions evolve.
6. **Minimize captured personal data.** Store only the user/account identifiers and context required for legitimate platform analysis, and prefer normalized/aggregate dimensions where individual identity is unnecessary.
7. **Keep access boundaries explicit.** Infrastructure observability and BI are internal surfaces; customer intelligence follows product authorization rules.
8. **Instrument important domain actions when the feature is introduced.** Viralab should not attempt to predict every future event during Foundation, but it should avoid shipping strategically important flows without intentional event capture.

## Initial implementation strategy

This ADR defines boundaries now but deliberately avoids creating a large analytics subsystem before the corresponding product flows exist.

During the Cloudflare runtime foundation:

- establish structured logs and correlation identifiers for Infrastructure Observability;
- rely initially on Cloudflare/Supabase operational telemetry where it is sufficient;
- do not create a custom infrastructure dashboard;
- do not introduce speculative BI tables containing no real events.

Starting with Discovery and subsequent user-facing cases:

- define a small versioned taxonomy of semantic BI events alongside each relevant feature;
- persist strategically useful events durably;
- keep raw events sufficiently stable to permit later aggregation and reprocessing;
- introduce internal BI queries/dashboards only when there is useful captured history to analyze.

The exact BI storage schema, event transport, retention period, visualization tool, and whether BI events eventually use a dedicated analytical store are intentionally deferred. PostgreSQL is acceptable for the MVP while volume remains modest.

## Consequences

### Positive

- operational telemetry cannot accidentally become the product's source of truth;
- user-facing analytics remains a clean domain concern;
- Viralab starts accumulating proprietary demand history as soon as meaningful product flows exist;
- BI can correlate user demand with the historical YouTube dataset, creating a potentially strong intelligence flywheel;
- infrastructure dashboards can evolve independently from customer and business interfaces;
- provider-native tooling can be used without coupling core analytical data to a provider.

### Trade-offs

- some actions will intentionally produce records in more than one layer;
- event naming and versioning require discipline;
- BI introduces data-governance and privacy responsibilities as usage grows;
- a future analytical workload may eventually outgrow the transactional PostgreSQL database and require a separate analytical path.

## Rejected alternatives

### One analytics/telemetry subsystem for everything

Rejected because operational telemetry, customer-facing domain state, and owner-facing BI have different semantics, retention, access and reliability requirements.

### Build a custom admin/observability dashboard immediately

Rejected for the current phase. Provider-native operational tooling gives higher leverage while the platform is small. A custom internal surface should exist only where Viralab-specific business or operational workflows justify it.

### Reconstruct BI later from logs

Rejected. Logs are implementation-oriented, retention may be limited, schemas change, and semantic information can be lost. Strategically useful actions must be intentionally captured when they occur.

### Treat Business Intelligence as customer product analytics

Rejected. Aggregate platform-level demand signals serve a different audience and may combine activity across the platform. They require separate authorization, privacy, aggregation and productization decisions.

## Relationship to other ADRs

- ADR-001 defines the Cloudflare-native runtime whose native telemetry participates in Infrastructure Observability.
- ADR-002 defines Supabase PostgreSQL and the application's trust boundary for persisted data.
- ADR-003 defines Cloudflare Queues and their at-least-once processing behavior, which must be observable operationally but must not define BI semantics.
- ADR-005 separates scheduling from processing; both require infrastructure correlation and operational visibility.
- ADR-006 defines immutable YouTube historical snapshots, which are a primary product analytical source and can later be correlated with aggregate BI demand signals.
