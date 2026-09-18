# ADR-009: Authentication and anonymous Explorer access

Status: Accepted

## Context

Viralab needs identity before user-owned features (saved searches, watchlists, alerts, preferences and billing) create anonymous data contracts that are expensive to migrate later.

The Explorer is a product acquisition surface. Anonymous users should be able to inspect real dataset-backed opportunities, but repeated anonymous access must be deliberately constrained so authentication becomes the natural upgrade path.

## Decision

- Supabase Auth is the identity provider.
- The browser owns the Supabase session and sends the access token as `Authorization: Bearer <token>` to the Cloudflare API Worker.
- API/application code consumes a provider-neutral `AuthContext`; it must not depend on Supabase user objects.
- Supabase remains identity infrastructure, not the application's authorization layer. Viralab authorization and entitlements live in application policy.
- Provider access is verified by the API before authenticated operations.
- `public.profiles` stores Viralab-owned user data keyed by the Supabase Auth UUID. Product preferences and billing state do not belong in Auth metadata.
- Explorer remains accessible anonymously, but anonymous requests are subject to a coarse IP-based rate limit. Authenticated Explorer requests are not subject to that anonymous acquisition limit.
- Rate limiting is an abuse/acquisition control, not an identity boundary. IP addresses are not persisted by Viralab.
- Explorer reads Viralab's dataset only; authentication never turns Explorer into a direct YouTube query path.
- Google OAuth is the first social provider. Google login scopes are identity-only and are intentionally separate from any future YouTube channel authorization.
- RLS is not the primary authorization mechanism for the Worker API. It may be added as defense-in-depth for selected tables later.

## Security boundaries

- Reject malformed, missing, expired or unverifiable bearer tokens on protected endpoints.
- Validate issuer/audience/subject and token expiry, not merely the JWT shape.
- Never ship a Supabase secret/service-role key to the browser.
- Only publish the Supabase project URL and publishable key to the web client.
- OAuth redirects in production must be exact allow-listed URLs.
- Anonymous rate limits must use Cloudflare's client IP signal and a one-way key; the raw IP is not stored.
- A 429 response includes Retry-After and does not query the opportunity repository.

## Initial product policy

| Capability | Anonymous | Authenticated |
| --- | --- | --- |
| Landing/sample | Yes | Yes |
| Explorer dataset | Yes, rate-limited | Yes |
| Saved searches | No | Planned |
| Watchlists/alerts | No | Planned |
| Account/profile | No | Yes |
| Billing/entitlements | No | Planned |

The initial anonymous limit is 10 Explorer requests per 60 seconds per IP. It is intentionally a coarse acquisition control. Product-level daily/free-tier quotas can later be implemented against user/account identity without overloading this primitive.

## Consequences

Identity is established before user-owned product features. The API remains portable because application code depends on AuthContext rather than Supabase SDK types. Anonymous browsing remains useful for conversion while authenticated traffic has a stable identity for future entitlements.
