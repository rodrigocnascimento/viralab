# ADR-005: Separate scheduling from discovery processing

- Status: Accepted
- Date: 2026-09-16

## Context

Viralab must periodically discover and refresh YouTube data. A Cron Trigger could technically perform discovery directly, but that would combine timing, work selection, YouTube calls, fan-out, persistence and retry in one invocation. Dataset size and YouTube quota make that coupling increasingly risky.

## Decision

Cron is a coordinator only. Scheduled handlers decide what work is due, enforce a bounded run/quota policy, persist run metadata where appropriate and enqueue work. Queue consumers perform external data acquisition and persistence.

```text
Cron -> policy/run creation -> enqueue -> consumer -> YouTube -> PostgreSQL
```

The scheduler must have explicit bounds. It may never create an unbounded recursive crawl.

## Discovery run model

A run should eventually record at least: identifier, trigger/strategy, start/end timestamps, status, configured quota/work budget, operation counters, messages/candidates scheduled, success/failure counters and terminal diagnostics.

This makes discovery explainable and permits questions such as: Why was this channel fetched? Which strategy found it? How much quota did a run consume? Where did a run fail? Did the scheduler stop because of policy or an incident?

## Consequences

- scheduled handlers stay short and deterministic;
- individual discovery tasks can retry independently;
- run-level observability becomes possible;
- queue backlog can absorb bursts;
- eventual consistency is accepted between schedule time and completed observations;
- run completion requires explicit accounting rather than assuming Cron completion means discovery completion.
