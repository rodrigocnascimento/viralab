# ADR-004: Replace TypeORM with Drizzle for the Worker/PostgreSQL persistence layer

- Status: Accepted
- Date: 2026-09-16

## Context

The initial foundation selected TypeORM before the production runtime was chosen. The database currently has very little product schema, so the cost of changing persistence tooling is low. The target runtime is now Cloudflare Workers connecting to PostgreSQL through Hyperdrive.

Viralab needs explicit SQL-friendly schema evolution, strong TypeScript inference, predictable serverless initialization and transparent control over historical-data queries. The product will eventually perform increasingly analytical SQL over snapshots; hiding SQL behind a heavy entity abstraction is not a goal.

## Decision

Adopt Drizzle as the primary schema/query/migration toolkit for application persistence and use the PostgreSQL driver compatible with the chosen Hyperdrive path. Retire TypeORM after equivalent migration/tooling foundations are in place.

Schema definitions, migrations and repository implementations live in `packages/database`. Runtime-specific binding acquisition stays outside the package's domain-facing interfaces.

## Why now

Changing ORM after channels, videos, snapshots, opportunities and analytical queries are deeply implemented would be expensive. At Case 01.2B the database foundation is still small, making this the lowest-risk point to align persistence with the selected runtime.

## Alternatives considered

### Keep TypeORM

Possible, and avoids immediate churn. Not selected because Viralab does not benefit materially from entity/Active Record-style abstractions, Worker compatibility adds another validation surface, and upcoming snapshot/analytics queries favor explicit relational/query-builder control.

### Raw `pg` only

Technically simple and maximally transparent. Not selected as the default because typed schema/query composition and migration tooling are useful, while Drizzle remains close to SQL. Raw SQL remains acceptable for queries where it is clearer or necessary.

### Prisma

Not selected because the architecture values a lightweight Worker-oriented SQL layer and direct control over PostgreSQL queries. Introducing a larger generated client/runtime does not solve a current requirement.

## Migration policy

Migrations are version-controlled and applied as a controlled deployment step. Runtime handlers never auto-migrate. Production schema changes should be backward-compatible with the currently deployed code when rollout ordering requires it. Data-destructive migrations require explicit review and backup/recovery consideration.

## Consequences

- Existing TypeORM DataSource/migration scaffolding will be removed/replaced.
- CI must verify schema/migration tooling.
- Repositories should expose application concepts rather than Drizzle query objects to consumers.
- Complex analytical SQL may use Drizzle SQL primitives or explicit SQL without violating this ADR.
