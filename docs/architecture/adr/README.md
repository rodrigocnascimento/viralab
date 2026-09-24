# Architecture Decision Records

This directory records architectural decisions that materially constrain Viralab's implementation or operating model.

## Conventions

Each ADR has a stable number and one of these statuses: Proposed, Accepted, Superseded, Deprecated, Rejected.

Accepted ADRs are not rewritten to hide history. If a decision changes materially, add a new ADR and mark the previous ADR as Superseded with a reference to its replacement. Small clarifications that do not change the decision may be edited in place.

## Current decisions

| ADR | Decision | Status |
| --- | --- | --- |
| [ADR-001](./001-cloudflare-runtime.md) | Adopt Cloudflare-native runtime for the MVP | Accepted |
| [ADR-002](./002-supabase-postgres.md) | Use Supabase as managed PostgreSQL without direct product-table client access | Accepted |
| [ADR-003](./003-cloudflare-queues.md) | Replace Redis/BullMQ with Cloudflare Queues | Accepted |
| [ADR-004](./004-drizzle.md) | Replace TypeORM with Drizzle | Accepted |
| [ADR-005](./005-scheduler-processing-separation.md) | Separate scheduling/policy from provider processing | Accepted |
| [ADR-006](./006-historical-snapshots.md) | Treat historical observations as immutable analytical source data | Accepted |
| [ADR-007](./007-analytics-instrumentation-boundaries.md) | Separate infrastructure observability, product analytics and Business Intelligence | Accepted |
| [ADR-008](./008-dataset-first-provider-quota.md) | Separate product queries from provider discovery/observation quota | Accepted |
| [ADR-009](./009-authentication-and-anonymous-access.md) | Establish authentication, anonymous identity and product quota boundaries | Accepted |

## 2026-09 historical-data clarification

The accepted architecture now has concrete direction for one-hour observation buckets, adaptive sampling, ACTIVE/COLD/ARCHIVED dataset lifecycle, persistent configurable provider quota budgeting and asynchronous analytics.

These clarify ADR-005/006/008 without yet defining exact lifecycle thresholds or analytical formulas. The algorithm roadmap will be formalized separately after the documentation realignment; create additional ADRs if that work introduces a new durable architectural constraint.

## When an ADR is required

Create an ADR when a choice changes a major runtime/provider, data ownership or consistency model, security/trust boundary, persistence technology, asynchronous delivery semantics, public/internal contract, deployment strategy, or creates a constraint that would be expensive to reverse.

Routine implementation details do not require ADRs.
