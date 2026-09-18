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
| IP daily ceiling | 50/day | casual incognito/private-mode circumvention |

The browser identity is a random UUID persisted in localStorage and sent as `X-Viralab-Anonymous-ID`. It is not a login credential. Raw IP is not persisted.

Daily quota state uses a SQLite-backed Durable Object because quota increments need strong coordination. Workers KV was considered and rejected for authoritative enforcement because its reads are eventually consistent and concurrent read-modify-write increments are not atomic.

When the daily browser quota is exhausted, Explorer redirects to the login screen. The screen offers Google sign-in and a “View paid plans” CTA; plans themselves are deferred.

Authenticated Explorer traffic bypasses anonymous product quota. Account and paid-plan entitlements will be a later policy layer rather than an extension of the IP rate limiter.

## Manual provider configuration

Production Google OAuth requires credentials from Google Auth Platform and enabling Google in Supabase Authentication > Providers. Configure the Supabase callback URI shown by that provider in Google, then configure Viralab's production Site URL and exact redirect URL in Supabase Authentication > URL Configuration.

No Google client secret belongs in this repository or in Vite variables.
