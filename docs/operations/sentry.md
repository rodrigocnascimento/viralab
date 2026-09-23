# Sentry setup

Viralab uses Sentry for browser-side error monitoring and Cloudflare observability for Worker-side logs/traces.

## Scope

The first integration target is `apps/web`:

- unhandled browser exceptions
- Vue render/component exceptions
- unhandled promise rejections
- release identification by Git SHA
- production source maps
- Browser Tracing at a conservative sample rate
- Session Replay only when an error occurs; text is masked and media is blocked

The Sentry SDK is disabled when `VITE_SENTRY_DSN` is absent, so CI/local builds do not emit events by default.

## Sentry organization

Organization slug:

```text
viralab
```

Do not commit setup run codes, auth tokens or other temporary authorization material.

## GitHub repository configuration

Configure these in GitHub repository settings before production deployment.

### Actions variables

```text
VITE_SENTRY_DSN=<public browser DSN>
SENTRY_PROJECT=<Sentry project slug>
```

The DSN is a public client identifier, not a privileged credential. Keeping it as a repository variable still makes deployment configuration explicit.

### Actions secret

```text
SENTRY_AUTH_TOKEN=<organization auth token>
```

The token is used only by the Sentry Vite plugin during the production build to upload source maps. It must never be exposed through a `VITE_*` variable or committed to the repository.

Use the minimum CI permissions required for source-map/release operations. Sentry documents `org:ci` for CI workflows.

## Production build

`.github/workflows/cd-web.yml` injects:

- `VITE_SENTRY_DSN`
- `VITE_SENTRY_RELEASE` = GitHub commit SHA
- `SENTRY_RELEASE` = GitHub commit SHA
- `SENTRY_ORG=viralab`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`

The Vite plugin is enabled only when both `SENTRY_AUTH_TOKEN` and `SENTRY_PROJECT` exist.

Production source maps are generated as hidden maps, uploaded to Sentry, and removed from the deployed artifact afterward.

## Runtime policy

Current defaults:

```text
tracesSampleRate = 0.10
replaysSessionSampleRate = 0
replaysOnErrorSampleRate = 1.0
sendDefaultPii = false
```

Replay masks all text and blocks all media.

These values are intentionally conservative for an early-stage product and can be tuned after real traffic is observed.

## Verification

After deploying with Sentry configured:

1. Open the production application.
2. Confirm a Sentry release exists with the deployed Git SHA.
3. Trigger a controlled test exception from a temporary development-only code path or browser console instrumentation.
4. Confirm the issue resolves to original Vue/TypeScript source through uploaded source maps.
5. Remove any temporary test exception immediately.

Do not add a permanent public `/sentry-test` endpoint or query parameter to production.

## Agent integration

The Sentry Agent Plugin is separate from the application SDK. It provides Sentry skills and a hosted MCP connection to supported coding agents.

Installation authorization/run codes are ephemeral setup material and must not be committed to this repository.


## First-party tunnel

Browser envelopes are sent to the same-origin endpoint `/api/sentry` instead of directly to Sentry ingest. This reduces telemetry loss caused by browser extensions and privacy filters that block known third-party observability domains.

The web Cloudflare Worker owns this route and forwards accepted envelopes to the Viralab Sentry project. The tunnel is deliberately not a generic proxy:

- only `POST /api/sentry` is accepted
- envelope size is capped at 1 MB
- the envelope header must contain the expected Sentry origin and project ID
- the upstream origin and project ID are fixed server-side
- the CI `SENTRY_AUTH_TOKEN` is never used or exposed at runtime

All other requests continue through the Cloudflare static-assets binding, including SPA fallback behavior.

The tunnel improves delivery when a filter blocks Sentry's public ingest hostname. It cannot guarantee telemetry when an extension blocks the SDK itself, blocks the first-party route by request semantics, or prevents JavaScript execution.

Cloudflare Web Analytics is separate from Sentry. A browser may independently block `static.cloudflareinsights.com`; that does not indicate an application failure and is outside the Sentry tunnel.
