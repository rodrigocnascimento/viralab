# Architecture Decision Records

This directory records architectural decisions that materially constrain Viralab's implementation or operating model.

## Conventions

Each ADR has a stable number and one of these statuses: Proposed, Accepted, Superseded, Deprecated, Rejected.

Accepted ADRs are not rewritten to hide history. If a decision changes materially, add a new ADR and mark the previous ADR as Superseded with a reference to its replacement. Small clarifications that do not change the decision may be edited in place.

## Current decisions

| ADR | Decision | Status |
| --- | --- | --- |
| [ADR-001](./001-cloudflare-runtime.md) | Adopt Cloudflare-native runtime for the MVP | Accepted |
| [ADR-002](./002-supabase-postgres.md) | Use Supabase as managed PostgreSQL without direct client access | Accepted |
| [ADR-003](./003-cloudflare-queues.md) | Replace Redis/BullMQ with Cloudflare Queues | Accepted |
| [ADR-004](./004-drizzle.md) | Replace TypeORM with Drizzle | Accepted |
| [ADR-005](./005-scheduler-processing-separation.md) | Separate scheduling from discovery processing | Accepted |
| [ADR-006](./006-historical-snapshots.md) | Treat historical snapshots as immutable analytical source data | Accepted |
| [ADR-007](./007-analytics-instrumentation-boundaries.md) | Separate infrastructure observability, product analytics, and Business Intelligence | Accepted |
| [ADR-008](./008-dataset-first-provider-quota.md) | Separate product queries from provider discovery quota | Accepted |

## When an ADR is required

Create an ADR when a choice changes a major runtime/provider, data ownership or consistency model, security/trust boundary, persistence technology, asynchronous delivery semantics, public/internal contract, deployment strategy, or creates a constraint that would be expensive to reverse.

Routine implementation details do not require ADRs.
