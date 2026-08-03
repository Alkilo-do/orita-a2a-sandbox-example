# Orita A2A Sandbox Example

[![Tests](https://github.com/Alkilo-do/orita-a2a-sandbox-example/actions/workflows/test.yml/badge.svg)](https://github.com/Alkilo-do/orita-a2a-sandbox-example/actions/workflows/test.yml)
[![Live Smoke](https://github.com/Alkilo-do/orita-a2a-sandbox-example/actions/workflows/live-smoke.yml/badge.svg)](https://github.com/Alkilo-do/orita-a2a-sandbox-example/actions/workflows/live-smoke.yml)

Discover Orita and complete a provider-resolution booking through A2A — **without creating an account or obtaining an API key manually.**

```bash
git clone https://github.com/Alkilo-do/orita-a2a-sandbox-example
cd orita-a2a-sandbox-example
npm install
npm run demo
```

## What happens

| Step | Action | How |
|------|--------|-----|
| 1 | Fetch Orita's Agent Card | `GET /.well-known/agent-card.json` |
| 2 | Verify card signature | ES256 / JWKS at `/a2a/jwks.json` |
| 3 | Register for sandbox access | `POST /api/v2/agent-onboarding/registrations` |
| 4 | Create authenticated A2A client | Bearer token in memory only |
| 5 | Resolve provider options | `resolve_service` skill |
| 6 | Hold the first option | `hold_service_option` skill |
| 7 | Demonstrate approval boundary | `confirm_service_booking` → `input_required` |
| 8 | Approve and confirm | `orita.approval-response` → `orita.booking` |
| 9 | Verify idempotency | Same `idempotencyKey` → same booking ID |
| 10 | Retrieve the final task | `GET /tasks/{id}` |

## Sample output

```
🔍 Step 1: Discovering Orita...
  ✓ Agent: Orita Service Transaction Agent
  ✓ A2A endpoint: https://orita.online/api/a2a/v1
  ✓ Protocol: 1.0
  ✓ Skills: resolve_service, hold_service_option, release_service_option, confirm_service_booking, cancel_service_booking

🔐 Step 2: Verifying Agent Card signature...
  ✓ Agent Card signature verified
  ✓ Algorithm: ES256
  ✓ Key ID: orita-a2a-v1-2026-08-02

📋 Step 3: Registering for sandbox access...
  ✓ Sandbox credential issued: orita_test_••••••••••••••••••••••••••••••••
  ✓ Scopes: resolutions:create, resolutions:read, bookings:read, a2a:resolve, a2a:hold, a2a:confirm
  ✓ Expires: ... | Sandbox providers: 5

🤖 Step 4: Creating A2A client...
  ✓ Client ready → https://orita.online/api/a2a/v1

🔎 Step 5: Resolving providers...
  ✓ Task: task_...
  ✓ Options returned: 3
  1. SARAH CHEN — 2026-08-10 14:30 UTC (score 80)

⏸  Step 6: Holding first option...
  ✓ Hold ID: ...

🚫 Step 7: Demonstrating approval boundary...
  ✓ Orita refused to book without explicit approval (state=input_required)
  ✓ Approval challenge: apr_...

✅ Step 8: Approving and confirming...
  ✓ Booking created: 5e23ae76-••••••••••••••••••••••••••••••••••••••
  ✓ Status: confirmed

🔄 Step 9: Verifying idempotency...
  ✓ Same booking ID returned
  ✓ No duplicate booking created

📥 Step 10: Retrieving final task...
  ✓ Task state: completed

────────────────────────────────────────
Orita A2A sandbox transaction completed

Account required:     No
Manual API key:       No
Provider resolution:  Completed
Option held:          Completed
Explicit approval:    Completed
Test booking:         Confirmed
Duplicate booking:    No
────────────────────────────────────────
```

## Architecture

```
External example agent
  ↓ public discovery
GET https://orita.online/.well-known/agent-card.json
  ↓ anonymous registration
POST https://orita.online/api/v2/agent-onboarding/registrations
     { "requestedUseCase": "provider_resolution" }
  → { "secret": "orita_test_…", "scopes": […] }
  ↓ A2A messages (Bearer token, in memory only)
POST https://orita.online/api/a2a/v1/message:send
     { "skill": "resolve_service",  "message": { … } }
     { "skill": "hold_service_option", "message": { … } }
     { "skill": "confirm_service_booking", "message": { … } }   ← approval gate
  ↓
Sandbox booking (testMode=true, no real notifications)
```

## Project structure

```
src/
  config.ts              — environment config with production defaults
  redaction.ts           — token masking (never logs secrets)
  discover.ts            — Agent Card fetch + validation
  verify-agent-card.ts   — ES256 JWS signature verification
  register-sandbox.ts    — anonymous sandbox registration
  create-a2a-client.ts   — authenticated A2A HTTP client
  task-runner.ts         — sendA2AMessage() + getTask()
  artifacts.ts           — Zod schemas for all artifact kinds
  demo.ts                — full 10-step demo CLI
  index.ts               — library re-exports

tests/
  discovery.test.ts      — Agent Card discovery unit tests
  signature.test.ts      — signature verification unit tests
  registration.test.ts   — sandbox registration unit tests
  artifacts.test.ts      — Zod artifact schema unit tests
  redaction.test.ts      — token redaction unit tests
  live-smoke.test.ts     — full end-to-end test (production, manual)

docs/
  PUBLIC_CONTRACT_AUDIT.md — exact schemas recorded from production audit
```

## Configuration (optional)

No configuration is required. All defaults point to Orita production.

| Variable | Default |
|----------|---------|
| `ORITA_ORIGIN` | `https://orita.online` |
| `ORITA_AGENT_CARD_URL` | `https://orita.online/.well-known/agent-card.json` |
| `ORITA_SANDBOX_REGISTRATION_URL` | `https://orita.online/api/v2/agent-onboarding/registrations` |
| `ORITA_JWKS_URL` | `https://orita.online/a2a/jwks.json` |
| `ORITA_A2A_ENDPOINT` | `https://orita.online/api/a2a/v1` |

Skip signature verification during local dev:

```bash
npm run demo -- --skip-signature-verification
```

## Testing

```bash
# Unit tests (no network)
npm test

# Type-check
npm run typecheck

# Full end-to-end against production (uses live API)
npm run test:live

# Build
npm run build
```

## Security notes

- The sandbox token is **never written to disk** — it lives in memory only for the duration of the demo.
- All log output redacts token values after position 16 (`orita_test_hpZGb••••••••`).
- Sandbox tokens expire in 24 hours.
- The registration endpoint is rate-limited to 20 calls/hour.

## Links

- [Agent Card](https://orita.online/.well-known/agent-card.json)
- [AI Catalog](https://orita.online/.well-known/ai-catalog.json)
- [JWKS](https://orita.online/a2a/jwks.json)
- [A2A Documentation](https://orita.online/developers/a2a)
- [Orita Developers](https://orita.online/developers)
- [A2A Protocol Specification](https://a2a-protocol.org/latest/specification/)
- [Official A2A JavaScript SDK](https://www.npmjs.com/package/@a2a-js/sdk)
- [Public Contract Audit](docs/PUBLIC_CONTRACT_AUDIT.md)

## License

Apache-2.0
