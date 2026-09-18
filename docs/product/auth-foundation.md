# Authentication foundation

## Flow

1. Web app signs in through Supabase Auth.
2. Supabase manages the browser session.
3. Web sends the access token to the Viralab API as a Bearer token.
4. The API verifies the token and converts claims into a provider-neutral AuthContext.
5. Protected use cases consume AuthContext.userId.
6. A profile row is created/upserted lazily when an authenticated user reaches the API.

## Anonymous Explorer

The Explorer remains a dataset-backed preview. Anonymous requests are rate-limited at the API edge. Authenticated requests bypass the anonymous acquisition limiter after successful token verification.

This is deliberately different from provider quota: Explorer never calls YouTube directly.

## Manual provider configuration

Production Google OAuth requires credentials from Google Auth Platform and enabling Google in Supabase Authentication > Providers. Configure the Supabase callback URI shown by that provider in Google, then configure Viralab's production Site URL and exact redirect URL in Supabase Authentication > URL Configuration.

No Google client secret belongs in this repository or in Vite variables.
