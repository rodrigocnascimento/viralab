# ADR-002: Use Supabase as managed PostgreSQL without direct client access

- Status: Accepted
- Date: 2026-09-16

## Context

Viralab requires a relational system of record for channels, videos, historical snapshots, discovery provenance/runs and later opportunity signals. The team considered Supabase but identified RLS complexity as an undesirable concern for the MVP.

RLS becomes central when untrusted clients access Supabase APIs/database capabilities directly. Viralab does not require that topology. The browser can use the Viralab API as its trust boundary while backend Workers connect to PostgreSQL.

## Decision

Use Supabase as a managed PostgreSQL provider, not as the application architecture.

The production data path is:

```text
Browser -> Viralab Worker API -> Hyperdrive -> PostgreSQL
Queue consumer --------------------^             ^
Scheduler/application services ------------------+
```

Viralab will not depend on Supabase Auth, browser database SDK access, PostgREST or Realtime for the MVP. RLS is therefore not required as the primary authorization mechanism for the current architecture.

## Rationale

This preserves normal PostgreSQL semantics, permits conventional migrations and constraints, centralizes authorization in Viralab's backend, prevents database credentials from reaching clients, and avoids coupling domain code to Supabase-specific APIs.

## Alternatives considered

### Direct Supabase client from Vue with RLS

Rejected for now. It introduces an additional authorization policy surface and makes RLS correctness security-critical before the product needs direct database access.

### Self-hosted PostgreSQL

Rejected for MVP production because backup, upgrades, availability and host lifecycle would become Viralab responsibilities.

### Cloudflare D1

Not selected because Viralab's expected historical/analytical relational workload and existing PostgreSQL direction benefit from PostgreSQL capabilities and ecosystem. Changing database engines would solve no current product problem.

### Neon PostgreSQL

A valid alternative. Supabase is selected as provider for the current MVP, but the architecture intentionally uses PostgreSQL protocols and migrations so provider migration remains feasible.

## Consequences

- Backend authorization is mandatory before exposing protected product data.
- Database roles/network/TLS credentials remain infrastructure secrets.
- Supabase-specific product features should not leak into repositories without a new decision.
- If direct browser access is introduced later, RLS and the changed trust model require a new ADR/security review.
- Provider free-tier lifecycle/limits are operational constraints and must be monitored; they are not encoded into domain logic.
