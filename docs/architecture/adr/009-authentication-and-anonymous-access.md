# ADR-009: Authentication, anonymous identity and product quota

Status: Accepted

## Context

Viralab needs identity before user-owned features (saved searches, watchlists, alerts, preferences and billing) create anonymous data contracts that are expensive to migrate later.

The Explorer is also an acquisition surface. A short-window security rate limit does not implement the product requirement: a legitimate visitor may spend minutes analysing each result and never hit a 10 requests/minute threshold. We need to distinguish infrastructure abuse protection from a daily anonymous product allowance.

Browser fingerprinting based on canvas, WebGL, fonts or hardware is deliberately avoided. It is privacy-invasive, brittle, creates false positives and remains bypassable.

## Decision

### Authentication
- Supabase Auth is the identity provider.
- The browser owns the Supabase session and sends the access token as `Authorization: Bearer <token>`.
- API/application code consumes a provider-neutral `AuthContext`.
- `public.profiles` stores Viralab-owned user data keyed by the Supabase Auth UUID.
- Google OAuth is the first social provider. Login scopes are identity-only and separate from future YouTube authorization.
- RLS is not the primary authorization mechanism for the Worker API.

### Three independent controls

1. **Security rate limit:** 30 requests/minute/IP using Cloudflare Rate Limiting Binding. This protects infrastructure and is not a product entitlement.
2. **Anonymous product quota:** 10 successful Explorer consultations/day per anonymous browser identity.
3. **First-signup bonus:** the first account registration grants a one-time pool of 5 additional Explorer consultations.
4. **Circumvention ceiling:** 50 anonymous Explorer consultations/day per hashed IP. This limits casual private/incognito-window resets without treating an IP as a person.

Registration is therefore an acquisition step, not a repeatable login reward or unlimited entitlement. Future paid-plan entitlements will be evaluated independently and can bypass the free allowance.

### Anonymous identity

The web client creates a cryptographically random UUID on first Explorer use and persists it in localStorage. It sends that identifier in `X-Viralab-Anonymous-ID`.

The API validates the UUID before using it. The identifier is pseudonymous, carries no user data and is not authentication.

Normal tabs share the identifier. Private/incognito storage can create a new identifier, so the secondary hashed-IP ceiling exists as a coarse anti-circumvention signal.

The API never persists raw IP addresses. It derives a one-way SHA-256 key before quota evaluation.

### Quota state

Anonymous daily counters require coordinated read-modify-write semantics. Cloudflare Workers KV is explicitly eventually consistent and does not provide atomic transactions, so it is not authoritative enough for quota enforcement. A SQLite-backed Durable Object is used instead for strongly consistent counter state.

The anonymous quota day is UTC. Anonymous counter state is keyed by quota subject and day. The signup bonus is different: it is persisted on the Viralab profile and never resets.

### Exhaustion contract

When either anonymous daily quota is exhausted, the API returns:

```json
{
  "error": "anonymous_quota_exhausted",
  "upgrade": "sign_in",
  "quota": {
    "limit": 10,
    "remaining": 0,
    "resetsAt": "2026-09-19T00:00:00.000Z"
  }
}
```

The web client routes to `/login?reason=anonymous_quota`. Only that route renders quota-exhaustion messaging. A normal `/login` renders neutral authentication copy. Creating an account for the first time grants a one-time 5-search bonus; the secondary “View paid plans” CTA remains reserved for the later entitlement layer.

## Security boundaries

- Invalid bearer tokens fail closed.
- Quota checks happen before the opportunity repository is read.
- Raw IP is never stored in Viralab quota state.
- Anonymous IDs are validated server-side and cannot grant authenticated privileges.
- Clearing storage or changing IP cannot be made impossible in a browser. The goal is to prevent casual bypass while making account creation easier than circumvention.
- No invasive device fingerprint is collected.
- Provider quota and Explorer quota are unrelated: Explorer continues to read Viralab's dataset and never calls YouTube directly.

## Initial product policy

| Capability | Anonymous | Authenticated |
| --- | --- | --- |
| Landing/sample | Yes | Yes |
| Explorer | 10/day/browser; secondary 50/day/IP | 10/day/browser + one-time 5-search signup bonus |
| Saved searches | No | Planned |
| Watchlists/alerts | No | Planned |
| Account/profile | No | Yes |
| Billing/entitlements | No | Planned |

## Consequences

Rate limiting, product quota and future paid entitlements remain separate concepts. Anonymous conversion is driven by an explicit daily allowance rather than accidental abuse throttling. The approach resists casual incognito resets without invasive fingerprinting and leaves a clean path to account-level Free/Pro quota policies.
