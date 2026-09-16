# ADR-006: Treat historical snapshots as immutable analytical source data

- Status: Accepted
- Date: 2026-09-16

## Context

Viralab's competitive advantage depends on its own historical observations. Current channel/video values alone cannot answer how quickly a metric changed relative to the entity's baseline. Breakout and outlier detection require observations across time.

A conventional CRUD model that simply overwrites subscriber/view counts would destroy the primary input for the product's future intelligence models.

## Decision

Separate stable/current entities from time-series observations. `channels` and `videos` hold identity and useful latest metadata; snapshot tables preserve observations over time. Normal ingestion does not update old snapshots to make history resemble current data.

Corrections/backfills, if required, must be explicit operations with provenance rather than silent mutation.

## Data integrity

Snapshot insertion must have an intentional uniqueness/idempotency policy so queue retries do not create meaningless duplicates. The exact bucket/key can differ by snapshot type and will be finalized with the Case 02 schema.

All observation timestamps are UTC and distinguish, where useful, the upstream semantic time from Viralab's observation/ingestion time.

## Retention

No aggressive historical retention/deletion policy is adopted for MVP. Storage usage will be measured first. Any future downsampling or retention policy must preserve the analytical requirements of velocity, acceleration, baseline and outlier calculations and requires a new decision because it can irreversibly reduce product information.

## Consequences

- storage grows with observation frequency;
- query/index design matters as history grows;
- current-state reads remain simple through entity tables/materialized latest values;
- later scoring models can be recalculated from historical source data;
- data retention becomes a product/analytics decision, not routine log cleanup.
