# Authentication foundation

## Authentication flow

1. Web signs in through Supabase Auth.
2. Supabase manages the browser session.
3. Web sends the access token to Viralab API as a Bearer token.
4. API verifies it and creates a provider-neutral AuthContext.
5. Protected use cases consume AuthContext.userId.
6. A Viralab profile is created/upserted lazily.

## Anonymous Explorer policy

Explorer is a dataset-backed product preview, not a YouTube provider query.

Three controls are intentionally separate:

| Control | Initial policy | Purpose |
| --- | --- | --- |
| Security burst rate limit | 30/min/IP | flood/abuse protection |
| Browser daily quota | 10/day | acquisition/product allowance |
| Signup bonus | +5 once per account | first-registration conversion incentive |
| IP daily ceiling | 50/day | casual incognito/private-mode circumvention |

The browser identity is a random UUID persisted in localStorage and sent as `X-Viralab-Anonymous-ID`. It is not a login credential. Raw IP is not persisted.

Daily quota state uses a SQLite-backed Durable Object because quota increments need strong coordination. Workers KV was considered and rejected for authoritative enforcement because its reads are eventually consistent and concurrent read-modify-write increments are not atomic.

When the daily browser quota is exhausted, Explorer redirects to `/login?reason=anonymous_quota`. Quota-exhaustion copy is conditional; a normal `/login` does not claim that the user exhausted anything.

The same Explorer flow first uses any remaining anonymous allowance for that browser. A newly created account owns a one-time 5-search bonus persisted in the application profile; login/logout does not replenish it. Authentication does not mean unlimited free traffic. Paid-plan entitlements will be a later policy layer rather than an extension of the IP rate limiter.

## Manual provider configuration

Production Google OAuth requires credentials from Google Auth Platform and enabling Google in Supabase Authentication > Providers. Configure the Supabase callback URI shown by that provider in Google, then configure Viralab's production Site URL and exact redirect URL in Supabase Authentication > URL Configuration.

No Google client secret belongs in this repository or in Vite variables.
