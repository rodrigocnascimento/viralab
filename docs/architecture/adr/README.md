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
| [ADR-010](./010-historical-observation-policy.md) | Define historical observation idempotency, lifecycle, adaptive sampling and persistent provider-budget policy | Accepted |

## 2026-09 historical-data decision

ADR-010 records the material historical-data constraints added after ADR-005/006/008: one-hour observation buckets, adaptive sampling, ACTIVE/COLD/ARCHIVED lifecycle and persistent workload-class provider budgeting. The original accepted ADRs remain unchanged so their decision history stays recoverable.

Exact lifecycle thresholds and analytical formulas remain intentionally open for the algorithm-roadmap formalization.

## When an ADR is required

Create an ADR when a choice changes a major runtime/provider, data ownership or consistency model, security/trust boundary, persistence technology, asynchronous delivery semantics, public/internal contract, deployment strategy, or creates a constraint that would be expensive to reverse.

Routine implementation details do not require ADRs.
