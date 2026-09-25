# Viralab Product Roadmap

Status: Proposed  
Date: 2026-09-24  
Scope: product delivery, validation and evolution  
Related: `ARCHITECTURE.md`, `ALGORITHM_ROADMAP.md`, `ALGORITHM_DECISIONS.md`, `competitive-teardown.md`

## 1. Purpose

This roadmap answers a different question from the architecture and algorithm roadmaps.

The architecture documents answer:

> How should Viralab be built safely and evolve technically?

The algorithm roadmap answers:

> In which sequence should historical observations become trustworthy temporal intelligence?

This product roadmap answers:

> **What should Viralab ship, in what order, so real users can validate whether the product is useful before we invest heavily in features and models they may not need?**

The governing principle is:

> **Product without users is unvalidated code.**

Viralab should reach users as early as the current product can deliver a coherent useful experience. Architectural sophistication and algorithmic completeness are not release gates unless they are necessary for safety, correctness, reliability or the user value being tested.

Versions in this document are therefore **learning contracts**, not feature-completion milestones.

---

## 2. Product principles

### 2.1 Ship before completing the ideal system

V1 does not need:

- Video Outlier v2;
- automatic lifecycle transitions;
- adaptive sampling driven by temporal signals;
- Breakout Channels;
- Niche Momentum;
- opportunity lifecycle;
- billing automation;
- saved searches;
- watchlists;
- alerts;
- MCP;
- a large AI feature set.

Those may become valuable later. They must not prevent the first users from testing the product that already exists.

### 2.2 Real behavior outranks roadmap assumptions

A repeated user problem is stronger evidence than a feature previously planned.

Examples:

- users repeatedly ask to search a niche -> improve dataset search/filtering;
- users repeatedly revisit the same channels -> consider watchlists/tracking;
- users ask "is this still early?" -> prioritize temporal evidence;
- users ask "why was this detected?" -> improve explainability;
- users ask to be notified -> build alerts;
- users copy data into agents/spreadsheets -> consider API/MCP/export;
- users like the product but do not return -> solve retention before expanding breadth.

### 2.3 Data collection may advance in parallel without blocking product delivery

Historical observations require calendar time to become useful.

Therefore Viralab may collect a bounded historical dataset while V1 is being validated, provided that:

- provider budget remains bounded;
- scheduling semantics are explicit;
- no undocumented lifecycle algorithm is invented;
- raw observations remain immutable;
- historical collection does not become a prerequisite for launching the current Explorer.

### 2.4 New complexity needs evidence

A feature or algorithm enters a product release for at least one of these reasons:

1. observed user demand;
2. measured activation/retention problem;
3. data-quality/correctness requirement;
4. cost/quota/reliability requirement;
5. demonstrated improvement in opportunity usefulness through replay/backtest/shadow evaluation.

"Competitors have it" is context, not sufficient prioritization evidence.

### 2.5 Measure usefulness, not just traffic

Page views and registrations matter, but Viralab exists to help a person identify an actionable YouTube opportunity.

The product needs to learn whether users:

- inspect opportunities;
- open underlying videos/channels;
- return to see new opportunities;
- track or save interesting signals;
- act on findings;
- recommend the product;
- express willingness to pay;
- actually pay.

---

## 3. Current state assessment

This section reflects the repository and deployed pipeline as of 2026-09-24.

### 3.1 Implemented and production-capable

| Capability | Status | Notes |
| --- | --- | --- |
| Cloudflare-native runtime | Implemented | API, Workers, Queues, Hyperdrive and web delivery |
| Supabase PostgreSQL | Implemented | System of record |
| Drizzle migrations | Implemented | Production migration workflow exists |
| CI | Implemented | lint, typecheck, tests, build, DB migrations and web smoke |
| CD | Implemented | Cloudflare Workers/web deployment from successful main CI |
| YouTube discovery | Implemented | asynchronous discovery queue |
| Channel ingestion | Implemented | bounded/freshness-aware asynchronous enrichment |
| Canonical channels/videos | Implemented | persisted in PostgreSQL |
| Video statistics | Implemented | discovery/provider ingestion |
| Video Outlier v1 | Implemented | lifetime channel average baseline |
| Opportunity persistence | Implemented | analytics worker recomputes persisted opportunities |
| Explorer API | Implemented | dataset-first; no provider call during normal read |
| Explorer UI | Implemented | opportunity feed + score filter |
| Landing | Implemented | i18n, product positioning, sample, early-access flow |
| Server-side waitlist | Implemented | persistence + rate limiting |
| Supabase Auth foundation | Implemented | Google OAuth flow supported |
| Anonymous Explorer allowance | Implemented | browser quota + hashed-IP ceiling |
| Signup bonus | Implemented | one-time account-level bonus |
| Sentry browser monitoring | Implemented | first-party tunnel/production integration |
| Product analytics storage | Partial | `analytics_events` exists |
| Discovery search event | Implemented | `search_performed` is persisted |
| Historical observation schema | Implemented | channel/video immutable observations |
| Observation idempotency | Implemented | one-hour entity bucket |
| Provider quota persistence | Implemented | concurrent reservation tested |
| Observation scheduler runtime | Implemented | bounded due-work + quota admission |
| Observation consumer | Implemented | provider refresh + immutable observation |
| Analytics handoff | Implemented | observation -> analytics queue |
| Analytics replay boundary | Implemented foundation | current worker still recomputes v1 opportunities |

The current main branch passes CI and the Cloudflare deployment workflow has completed successfully after the historical-foundation merge.

### 3.2 Implemented foundation, but not yet active product behavior

The historical observation system exists, but this distinction is important:

- newly discovered channel/video schedules are created as `DISCOVERED`;
- they do not automatically become `ACTIVE`;
- they have no automatically assigned sampling interval;
- they have no automatically assigned `next_observation_at`;
- the scheduler only processes `ACTIVE` or `COLD` rows that are due.

Therefore the production runtime contains the historical-observation machinery, but **automatic ongoing historical collection is not yet a generalized live product behavior**.

This is consistent with the TDD: lifecycle/sampling policy was deliberately not invented before the algorithm decisions were defined.

### 3.3 Not yet implemented as product capabilities

- temporal primitives exposed to product models;
- automatic Recency/Growth/Discovery lifecycle decisions;
- adaptive historical sampling;
- Video Outlier v2;
- age-normalized video baselines;
- Breakout Channels;
- Niche Momentum;
- cross-channel confirmation as a product model;
- opportunity lifecycle such as emerging/accelerating/saturating/decaying;
- channel analysis page;
- saved opportunities/searches;
- watchlists;
- alerts;
- billing/paid entitlements;
- API/MCP product;
- user-facing niche search over the owned dataset;
- user-facing discovery request from Explorer;
- product feedback on opportunity usefulness.

### 3.4 Product-measurement gap

The repository has an analytics boundary and stores `search_performed` for provider-discovery requests.

However, the current Explorer does not itself trigger discovery; it reads persisted opportunities.

The product therefore lacks enough instrumentation to answer basic validation questions such as:

- how many users opened Explorer?
- which opportunity did they inspect?
- which YouTube video did they open?
- which signals were useful?
- did they return?
- did signup improve engagement?
- which niches do actual users want?
- what caused them to leave?

This is a more urgent V1 gap than implementing another algorithm.

### 3.5 Documentation drift to correct separately

Two current documents lag the implementation:

- `README.md` describes historical observations as the next architectural stage even though the foundation is merged and deployed;
- `landing-v2.md` lists server-side waitlist persistence as deferred even though it is implemented.

These should be corrected, but documentation cleanup itself must not delay user validation.

---

## 4. Versioning strategy

The intended sequence is:

```text
CURRENT
technical/product foundation
        |
        v
V1 — Production Validation
real users use current intelligence
        |
        v
V1.1 — Activation + First Retention Loop
fix what prevents repeated use
        |
        v
V1.2 — First Commercial Validation
test willingness to pay around proven value
        |
        v
V2 — Temporal Intelligence
make timing/trajectory materially better
        |
        v
V3 — Breakout + Radar
proactive opportunity discovery
        |
        v
V4 — Niche Intelligence / Platform
cross-channel market intelligence and integrations
```

The sequence after V1 is conditional. User evidence may reorder V1.1/V1.2 features or reduce the scope of later versions.

---

# V1 — Production Validation

## 5. Objective

Put the existing Viralab value proposition in front of real external users and learn whether the current opportunity feed is useful.

V1 should answer:

> **Will people repeatedly use Viralab to discover YouTube opportunities with the current dataset and explainable Outlier v1?**

This is not a "complete MVP". It is the smallest production experiment that can generate trustworthy product learning.

## 6. V1 user experience

A V1 user should be able to:

1. understand what Viralab does from the landing page;
2. enter the Explorer;
3. see real persisted opportunities;
4. understand the basic evidence:
   - score;
   - multiplier;
   - observed views;
   - baseline views;
   - confidence;
5. open the underlying YouTube video;
6. sign in when their anonymous allowance is exhausted;
7. provide lightweight feedback;
8. return later and see a refreshed opportunity dataset.

The current Explorer is fundamentally enough to start this test.

## 7. V1 launch blockers

Only issues that prevent a trustworthy real-user experiment should block V1.

### 7.1 Product analytics

Add a minimal event vocabulary, for example:

```text
landing_viewed
waitlist_joined
explorer_viewed
explorer_results_loaded
explorer_filter_changed
opportunity_opened
outbound_video_opened
signup_started
signup_completed
quota_exhausted
feedback_submitted
```

Do not collect events without an explicit product question.

At minimum, V1 must allow analysis of:

```text
landing
  -> Explorer
  -> opportunity interaction
  -> outbound video
  -> return
```

and:

```text
anonymous quota exhausted
  -> signup
  -> continued Explorer usage
```

### 7.2 Lightweight usefulness feedback

The product needs one low-friction method to learn whether an opportunity was useful.

Examples:

- Useful / Not useful;
- "I would investigate this";
- optional short comment.

Do not build a community/review system.

### 7.3 Production auth smoke test

Verify the actual production OAuth path end-to-end:

```text
/login
 -> Google
 -> Supabase
 -> /auth/callback
 -> session
 -> /explore
 -> authenticated API
```

### 7.4 Remove misleading dead-end product paths

The login page currently links to `/plans`, while there is no dedicated paid-plan product yet.

Before V1, either:

- hide that CTA;
- convert it to a waitlist/pricing-interest action;
- or provide a minimal honest pricing-interest page.

Do not build billing merely to satisfy the link.

### 7.5 Data quality / seed coverage

Before inviting users, ensure Explorer contains enough recent real opportunities for the intended test cohort.

Use the existing discovery pipeline to seed/refresh a bounded set of niches.

This may initially be operated manually or through internal controlled discovery. Autonomous market-wide discovery is not a V1 prerequisite.

### 7.6 Operational safety

Must be verified, not expanded indefinitely:

- CI green;
- production deployment green;
- API health;
- Sentry receiving failures;
- queue consumers operating;
- quota budgets bounded;
- no obvious duplicate/corruption issue;
- rate limits/quota behavior understood;
- simple rollback path.

## 8. Explicit V1 non-blockers

Do **not** delay V1 for:

- Algorithm 01;
- Video Outlier v2;
- lifecycle automation;
- adaptive sampling;
- Breakout Channels;
- Niche Momentum;
- channel page;
- saved searches;
- alerts;
- billing;
- MCP/API;
- AI titles/scripts/thumbnails;
- large-scale autonomous discovery;
- visual redesign unless current UX prevents use.

## 9. V1 cohort

Start deliberately small.

Suggested first cohort:

- 10–20 external users;
- creators/researchers/operators who already look for YouTube opportunities;
- enough variation to expose whether the product works only for the creator's own mental model.

Prefer direct contact over broad public launch initially because qualitative feedback is more valuable than anonymous traffic at this stage.

## 10. V1 success signals

Do not reduce early validation to one percentage.

Strong signals include:

- users reach Explorer without guidance;
- users open multiple opportunities;
- users click through to actual videos/channels;
- users return without being reminded;
- users ask for more/fresher opportunities;
- users ask to track/save a signal;
- users can explain what Viralab helped them discover;
- several users independently request the same missing capability;
- at least some users express credible willingness to pay.

Weak signals include:

- landing-page compliments;
- waitlist count with no product use;
- one successful demo;
- social impressions;
- a large dataset nobody explores.

## 11. V1 exit gate

Proceed based on observed behavior, not because a scheduled sprint ended.

A reasonable gate is reached after:

- at least ~10 external users have meaningfully used Explorer;
- several complete more than one session;
- at least 5 qualitative conversations or equivalent feedback records exist;
- the team can identify the top 2–3 repeated user problems;
- product telemetry is sufficient to distinguish acquisition, activation and return behavior.

If users do not find the current feed useful, stop adding advanced algorithms and first understand why.

---

# Parallel Track A — Start Accumulating Historical Data

## 12. Why this runs beside V1

Historical intelligence needs elapsed real time.

Waiting until after product validation to begin all observation collection would delay later temporal experiments unnecessarily.

But automatically implementing the entire lifecycle system before launch would violate the product-first principle.

## 13. Controlled historical collection

During V1, activate only a bounded, explicit observation cohort.

Recommended constraints:

- manually or deterministically seed a controlled set of channel/video schedules;
- explicit lifecycle state;
- fixed cadence;
- explicit quota budget;
- no automatic ACTIVE/COLD/ARCHIVED inference;
- no product claims based on unfinished temporal signals;
- monitor observation quality and provider cost.

The goal is:

> accumulate useful history while users validate the existing product.

This track does not block V1 release.

---

# V1.1 — Activation and First Retention Loop

## 14. Objective

Fix the most common reasons real users cannot repeatedly extract value from the V1 Explorer.

No fixed feature set should be committed before V1 evidence.

The likely candidates below are conditional.

## 15. Candidate branches based on user behavior

### If users cannot find relevant opportunities

Prioritize:

- dataset-side text/niche search;
- language/country filters;
- channel-size filters;
- recency filters;
- stronger sorting/ranking controls.

Do not automatically add all filters. Add the ones users repeatedly need.

### If users find opportunities but cannot evaluate them

Prioritize:

- channel context;
- recent videos;
- clearer explanation of baseline;
- clearer evidence payload;
- basic Channel Analysis page.

### If users repeatedly revisit the same items

Prioritize:

- saved opportunities;
- tracked channels;
- simple watchlist.

### If users repeatedly ask "what changed since yesterday?"

Prioritize:

- historical comparison;
- recent-delta presentation;
- notification/alert exploration.

This becomes strong evidence for moving temporal algorithms toward product exposure.

### If users do not return

Investigate:

- insufficient dataset freshness;
- low opportunity relevance;
- weak onboarding;
- lack of changing content;
- poor niche coverage;
- product does not solve a recurring problem.

Do not assume alerts are the solution before understanding the cause.

## 16. V1.1 data work

Continue historical collection.

If observation quality and coverage are sufficient, begin **Algorithm 01 — Temporal Primitives** according to the existing Algorithm Roadmap and Decision Register.

This work may run in shadow/internal mode and does not need immediate user-facing exposure.

---

# V1.2 — First Commercial Validation

## 17. Objective

Test whether repeated product value can become willingness to pay.

Do this only after users demonstrate actual repeated use or a high-value workflow.

## 18. Commercial experiment

Before building a sophisticated subscription system, test the offer.

Potential paid value should come from observed demand, for example:

- more Explorer usage;
- fresher data;
- tracked channels;
- tracked niches;
- saved searches;
- alerts;
- manual/on-demand refresh;
- deeper analysis.

The first paid pilot may be operationally simple.

The objective is not billing automation. The objective is:

> **Will someone exchange money for the value Viralab already demonstrated?**

## 19. V1.2 exit gate

Evidence should include some combination of:

- repeated active users;
- explicit upgrade intent;
- at least one real paid pilot/customer;
- recurring feature/value request associated with willingness to pay;
- provider cost/unit economics understood well enough not to price blindly.

If no one is willing to pay, learn why before implementing a large entitlement/billing system.

---

# V2 — Temporal Intelligence

## 20. Entry condition

V2 should start because evidence shows that **timing, freshness or trajectory materially improves user decisions**, not simply because the Algorithm Roadmap exists.

Examples of qualifying user questions:

- "Is this still early?"
- "Is this growing now or did it already peak?"
- "When did this start moving?"
- "Is this one viral video or a changing channel?"
- "Why is Viralab showing this now?"

## 21. Technical sequence

V2 follows the existing Algorithm Roadmap rather than inventing a competing sequence:

### Algorithm 01 — Temporal primitives

- absolute growth;
- relative growth;
- velocity;
- acceleration;
- observation quality;
- confidence.

### Algorithm 02 — Lifecycle + sampling v1

Use temporal evidence to make historical collection economically sustainable.

- lifecycle transitions;
- hysteresis;
- adaptive cadence;
- discovery strength;
- provider-budget prioritization.

### Algorithm 03 — Temporal video baseline

- same-channel age-aware cohorts;
- robust baseline;
- cold-start/fallback behavior.

### Algorithm 04 — Video Outlier v2

- temporal baseline;
- velocity/trajectory evidence;
- confidence separate from score;
- shadow v1/v2 comparison;
- gated rollout.

## 22. V2 product experience

Candidate user-visible capabilities:

- recent velocity;
- acceleration/trajectory;
- age-aware outlier explanation;
- "why detected";
- evidence quality/confidence;
- simple signal history;
- "detected at" / "first abnormal observation" where defensible.

Do not expose an opaque "AI viral probability".

## 23. V2 validation gate

Outlier v2 should not replace v1 because it is more sophisticated.

It should demonstrate at least one material improvement:

- earlier useful detection;
- better precision/relevance;
- better ranking;
- lower false positives;
- stronger user preference;
- clearer decision support.

Run v1 and v2 in parallel before promotion.

---

# V3 — Breakout Channels and Opportunity Radar

## 24. Entry condition

Move here when users demonstrate that per-video opportunities are not enough and channel-level trajectory is valuable.

## 25. Algorithm foundation

Use **Algorithm 05 — Breakout Channels**:

- subscriber/view velocity;
- relative growth;
- acceleration;
- recent-video breadth;
- publishing activity;
- scale normalization;
- confidence/minimum history.

## 26. Product capabilities

Candidate V3:

- Breakout Channel opportunities;
- channel detail/trajectory;
- Radar ranked by new material changes;
- tracked opportunities;
- notification/alert delivery if prior user evidence supports it;
- explanation timeline.

The Radar should not merely be another sort order over the Explorer.

Its value should be:

> "What became interesting since I last checked?"

## 27. V3 retention thesis

V3 is where Viralab can become habitual:

```text
open Viralab
 -> see new/changed opportunities
 -> investigate evidence
 -> track interesting items
 -> return when state changes
```

If this loop does not increase repeat usage, do not add more notification channels merely to manufacture engagement.

---

# V4 — Niche Momentum and Cross-Channel Intelligence

## 28. Entry condition

V4 requires:

- sufficient historical breadth;
- stable entity-level signals;
- a defensible niche/topic classification strategy;
- evidence that users want market-level rather than only video/channel-level intelligence.

## 29. Algorithm foundation

Use **Algorithm 06 — Niche Momentum**:

- accelerating-video count;
- breakout-channel count;
- distinct-channel breadth;
- persistence across windows;
- rediscovery;
- dominance protection;
- niche taxonomy/classification.

## 30. Product capabilities

Candidate V4:

- emerging niche/topic opportunities;
- cross-channel confirmation;
- niche evidence timelines;
- breadth vs magnitude;
- emerging/sustained/decaying states if validated;
- saturation/decay experiments;
- Radar across video/channel/niche opportunity types.

This is the stage where the competitive thesis from `competitive-teardown.md` can become fully product-visible.

---

# Later — Distribution, Integrations and Expansion

## 31. API / MCP

Build when users demonstrate they want Viralab data outside Viralab.

Signals:

- repeated exports/copying;
- automation requests;
- agencies operating across many channels;
- users asking agents to consume the dataset.

API/MCP is a distribution surface, not an early moat.

## 32. Generative AI

Titles, thumbnails, scripts and generic idea generation should remain later unless users explicitly demand them as the next action after an opportunity.

A better future use of AI is likely to operate **on top of proprietary opportunity evidence**, for example:

- summarize why a signal is interesting;
- explain supporting/contradicting evidence;
- compare related opportunities;
- generate research briefs.

Do not build a generic creator copilot before the intelligence product itself is validated.

## 33. Additional providers

Other content platforms should enter only if customer workflows require them.

The provider-neutral architecture makes this possible, but provider breadth does not validate YouTube opportunity intelligence.

---

## 34. Prioritization framework after V1

Every meaningful roadmap candidate should answer:

### User evidence

- Who asked for this?
- How often?
- What behavior supports the request?
- Is this an actual problem or a proposed solution?

### Product effect

Does it improve:

- acquisition;
- activation;
- opportunity usefulness;
- retention;
- willingness to pay;
- revenue?

### Data effect

Does it improve:

- freshness;
- coverage;
- evidence quality;
- lead time;
- model correctness?

### Cost

What does it consume:

- engineering time;
- provider quota;
- database/storage;
- operational complexity;
- support burden?

### Reversibility

Can we test it cheaply before committing to the full architecture?

---

## 35. Features that should require evidence before implementation

Do not implement these solely because they are present in competitor products:

- thumbnail generator;
- title generator;
- script writer;
- transcript/chat analysis;
- social/community;
- complex dashboards;
- many notification channels;
- mobile app;
- browser extension;
- full public API;
- MCP;
- team workspaces;
- enterprise RBAC;
- multi-provider ingestion.

---

## 36. Product metrics

### Acquisition

- landing visitors;
- waitlist conversion;
- invite acceptance;
- signup conversion.

### Activation

A meaningful V1 activation should involve product evidence, not account creation.

Candidate definition:

> User loads Explorer and interacts with at least one opportunity.

Track:

- Explorer sessions;
- results loaded;
- opportunity interactions;
- outbound video/channel opens.

### Retention

- users returning in 1/7/30 days;
- repeat Explorer sessions;
- repeated opportunity interactions;
- tracked/saved item revisits when those features exist.

### Value

- useful/not-useful feedback;
- opportunities saved/tracked;
- video/channel investigations;
- qualitative reports of actions taken;
- willingness to pay;
- paid conversion.

### Data/model quality

- opportunity coverage;
- score/rank distributions;
- stale opportunity rate;
- observation coverage;
- lead time;
- false positive feedback;
- provider cost per useful opportunity.

### Reliability

- API/Worker errors;
- queue retry/DLQ;
- provider quota consumption;
- Sentry errors;
- migration/deploy failures.

---

## 37. Product feedback cadence

Early-stage product work should run in short loops:

```text
ship
 -> observe
 -> talk to users
 -> inspect telemetry
 -> choose one problem
 -> change product
 -> ship again
```

The roadmap should be reviewed after each meaningful cohort or commercial experiment.

Do not wait for a major numbered version to react to obvious user evidence.

---

## 38. Relationship to the Algorithm Roadmap

The Algorithm Roadmap remains valid.

This document changes its **priority relative to product release**, not its technical sequence.

The intended relationship is:

```text
Product V1 can launch
        |
        +--> collect user evidence
        |
        +--> collect bounded historical data in parallel
                    |
                    v
              Algorithm 01
                    |
                    v
              Algorithm 02
                    |
          only promote models
          when evidence supports
                    |
                    v
                 V2+
```

The algorithm roadmap must not be interpreted as:

```text
Algorithm 01
 -> 02
 -> 03
 -> 04
 -> 05
 -> 06
 -> finally launch product
```

That ordering would optimize the system before validating the customer problem.

---

## 39. Immediate next actions

### P0 — Launch learning loop

1. add minimal Explorer/product instrumentation;
2. add lightweight opportunity feedback;
3. production-smoke OAuth and Explorer quota flows;
4. remove/fix the misleading `/plans` CTA;
5. seed/refresh enough real opportunities for the first cohort;
6. identify and invite the first 10–20 external users;
7. conduct short interviews while reading actual telemetry.

### P1 — Start the clock on historical data

1. select a bounded observation cohort;
2. explicitly seed schedule/cadence under controlled quota;
3. verify observations accumulate correctly;
4. monitor cost and data quality;
5. keep automatic lifecycle transitions disabled.

### P2 — Choose V1.1 from evidence

Do not preselect it now.

At the end of the first cohort, choose the highest-value repeated problem and implement the smallest solution.

---

## 40. Roadmap summary

| Version | Primary goal | Product promise |
| --- | --- | --- |
| **V1** | Production validation | "Show me interesting YouTube video opportunities." |
| **V1.1** | Activation + retention | "Help me find and evaluate the opportunities relevant to me." |
| **V1.2** | Commercial validation | "This is valuable enough that I will pay to keep using it." |
| **V2** | Temporal intelligence | "Show me what is changing now, why, and how early I am." |
| **V3** | Breakout + Radar | "Tell me which channels/signals became important since I last checked." |
| **V4** | Niche momentum | "Show me broader market movements confirmed across independent creators." |

The versions after V1 are hypotheses.

**The next release is determined by users, not by the longest remaining list of unimplemented features.**
