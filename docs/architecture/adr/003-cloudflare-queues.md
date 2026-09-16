# ADR-003: Replace Redis/BullMQ with Cloudflare Queues

- Status: Accepted
- Date: 2026-09-16

## Context

The Foundation created a BullMQ worker backed by Redis. BullMQ is capable and appropriate for conventional Node worker fleets, but it requires Redis plus at least one persistent consumer runtime. Viralab's MVP needs asynchronous work delivery, retry, batching and fan-out; it does not specifically need Redis or BullMQ.

Discovery processing must tolerate duplicate delivery, transient YouTube/database failures and gradual growth in the number of channels/videos being refreshed.

## Decision

Use Cloudflare Queues as the hosted asynchronous transport and Cloudflare Worker queue consumers as processors. Remove BullMQ and Redis from the production runtime once the queue skeleton is established.

Queue messages are versioned commands/references. They must be small, validated, non-secret and independently retryable. Consumers are designed for at-least-once delivery and therefore must be idempotent.

## Message rules

Every message should include:

- schema/envelope version;
- explicit message type;
- stable job identifier;
- discovery run/correlation identifier when applicable;
- stable entity/seed identifiers;
- minimal reason/context needed to process the command.

Messages should not contain complete channel/video records, credentials, arbitrary raw YouTube responses or large arrays. Canonical state belongs in PostgreSQL.

## Retry policy

Retry transient upstream/network/database failures. Do not indefinitely retry invalid messages, unsupported versions or permanent upstream errors. Dead-letter handling is required before production discovery traffic becomes material.

Application code must not assume exactly-once delivery. Database uniqueness, upsert semantics and explicit idempotency keys form the final integrity boundary.

## Alternatives considered

### Keep BullMQ + Upstash Redis

Advantages: familiar API, rich job features, easier portability between Node hosts.

Rejected because it retains Redis and requires a compatible persistent worker runtime. Those dependencies do not create product value at MVP stage.

### No queue; process everything in Cron

Rejected because scheduling and processing have different reliability/performance characteristics and discovery requires bounded fan-out and independent retries.

### Cloudflare Workflows

Potentially valuable for durable multi-step orchestration, but not selected now. Queues solve the immediate command/fan-out problem with less orchestration complexity. Workflows can be evaluated when a concrete long-lived multi-step process requires persisted step semantics.

## Consequences

- BullMQ-specific features must not be assumed by application services.
- Queue topology and retry/DLQ configuration become part of infrastructure-as-code/configuration.
- Local tests need a queue adapter or Worker runtime harness.
- A future migration to another broker is feasible because the message/application dispatch boundary is explicit.
