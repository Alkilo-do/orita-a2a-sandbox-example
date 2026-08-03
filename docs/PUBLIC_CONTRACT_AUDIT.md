# Public Contract Audit

Recorded: 2026-08-03  
Audited against: **https://orita.online** (production)

---

## Agent Card

**URL:** `https://orita.online/.well-known/agent-card.json`  
**A2A Endpoint:** `https://orita.online/api/a2a/v1`  
**Protocol Version:** `1.0`  
**Agent Version:** `1.0.0`  
**Documentation:** `https://orita.online/developers/a2a`

### Agent Card Fields

| Field | Value |
|-------|-------|
| `name` | `"Orita Service Transaction Agent"` |
| `description` | `"Resolves and executes professional-service bookings across authorized provider networks..."` |
| `provider.organization` | `"Orita"` |
| `provider.url` | `"https://orita.online"` |
| `capabilities.streaming` | `false` |
| `capabilities.pushNotifications` | `false` |
| `defaultInputModes` | `["application/json"]` |
| `defaultOutputModes` | `["application/json"]` |

### Required Skills (all 5 present)

| Skill ID | Input Modes | Output Modes |
|----------|-------------|--------------|
| `resolve_service` | `application/json`, `application/vnd.orita.service-request+json` | `application/json`, `application/vnd.orita.service-options+json` |
| `hold_service_option` | `application/json`, `application/vnd.orita.service-hold+json` | `application/json`, `application/vnd.orita.service-hold+json` |
| `release_service_option` | `application/json` | `application/json` |
| `confirm_service_booking` | `application/json`, `application/vnd.orita.approval-response+json` | `application/json`, `application/vnd.orita.booking+json`, `application/vnd.orita.approval-request+json` |
| `cancel_service_booking` | `application/json` | `application/json` |

### Signature Status

At time of audit, `signatures` array contains `[null]` — the production card is served over HTTPS but does not yet embed a signed JWS.  The JWKS endpoint is live and contains a valid ES256 key with `kid=orita-a2a-v1-2026-08-02`.

---

## AI Catalog

**URL:** `https://orita.online/.well-known/ai-catalog.json`  
**Schema:** `https://ai-resource-discovery.org/schemas/catalog/v0.9/catalog.json`

Resources exposed:
- `application/a2a-agent-card+json` → agent card
- `application/openapi+json;version=3.1.0` → REST OpenAPI spec
- `application/json` → MCP server

---

## JWKS

**URL:** `https://orita.online/a2a/jwks.json`

```json
{
  "keys": [{
    "kty": "EC",
    "crv": "P-256",
    "x": "3j58ZK1sR3kUmaQ1lpHYdk5qt6v3X5EIbWHV4ZtW78A",
    "y": "cAv69d1Jm_xFy4x7WWvXk0Oe-Pvl6Ez_Gd0QMm5ldb8",
    "kid": "orita-a2a-v1-2026-08-02",
    "use": "sig",
    "alg": "ES256"
  }]
}
```

---

## Sandbox Registration

**Endpoint:** `POST https://orita.online/api/v2/agent-onboarding/registrations`

### Request Schema

```json
{
  "requestedUseCase": "provider_resolution"
}
```

### Response Schema (HTTP 201)

```json
{
  "registrationId": "areg_<id>",
  "status": "approved_for_sandbox",
  "clientId": "org_sandbox_v1_orita",
  "secret": "orita_test_<token>",
  "prefix": "orita_test_<first5chars>",
  "environment": "sandbox",
  "sandboxOrgId": "org_sandbox_v1_orita",
  "scopes": [
    "resolutions:create",
    "resolutions:read",
    "bookings:read",
    "a2a:resolve",
    "a2a:hold",
    "a2a:confirm"
  ],
  "rateLimitPerHour": 20,
  "expiresAt": "<ISO8601 ~48h from now>",
  "sandbox": {
    "description": "Sandbox environment with 5 fake providers. No real emails or webhooks.",
    "providers": 5,
    "a2aEndpoint": "https://orita.online/api/a2a/v1",
    "agentCard": "https://orita.online/.well-known/agent-card.json",
    "note": "All bookings in this sandbox use testMode=true and will not trigger real notifications."
  },
  "quickstart": {
    "step1": "Fetch the Agent Card: GET https://orita.online/.well-known/agent-card.json",
    "step2": "Set Authorization: Bearer orita_test_<prefix>…",
    "step3": "POST https://orita.online/api/a2a/v1/message:send with skill: resolve_service",
    "docs": "https://orita.online/developers/a2a"
  },
  "warning": "Store this secret immediately. It will not be shown again."
}
```

**Token indicator:** `secret` starts with `orita_test_`.  
**Test-booking indicator:** `sandbox.note` confirms `testMode=true`; no real notifications sent.

---

## A2A Message Schemas

### Request Envelope (all skills)

```json
{
  "skill": "<skill_id>",
  "message": {
    "kind": "message",
    "messageId": "<uuid>",
    "contextId": "<ctx_prefix>_<uuid>",
    "role": "user",
    "parts": [{
      "kind": "data",
      "data": { ... }
    }]
  }
}
```

**Required headers:**
- `Authorization: Bearer orita_test_<token>`
- `A2A-Version: 1.0`
- `Content-Type: application/json`

### Task Response Envelope (all skills)

```json
{
  "id": "task_<id>",
  "contextId": "<ctx_id>",
  "skillId": "<skill_id>",
  "state": "completed | input_required | failed | running",
  "artifact": { ... },
  "resolutionId": "<uuid>",
  "holdId": "<uuid>",
  "bookingId": "<uuid>",
  "createdAt": "<ISO8601>",
  "updatedAt": "<ISO8601>",
  "expiresAt": "<ISO8601>"
}
```

---

## Skill Schemas

### resolve_service

**Input (`kind: "orita.service-request"`):**
```json
{
  "schemaVersion": "1.0",
  "kind": "orita.service-request",
  "dateRange": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" },
  "preferences": { "earliestAvailable": true },
  "limit": 3
}
```

**Artifact (`kind: "orita.service-options"`, state=completed):**
```json
{
  "kind": "orita.service-options",
  "status": "options_proposed",
  "schemaVersion": "1.0",
  "resolutionId": "<uuid>",
  "policyId": "policy_default",
  "transactionId": "txn_<id>",
  "approvalRequired": true,
  "expiresAt": "<ISO8601>",
  "policyVersion": 1,
  "options": [{
    "rank": 1,
    "optionId": "<uuid>",
    "score": 80,
    "reason": "Meets all required constraints.",
    "slot": { "start": "<ISO8601>", "end": "<ISO8601>", "timezone": "America/New_York" },
    "service": { "id": "<uuid>", "displayName": "Initial Consultation", "durationMinutes": 60 },
    "provider": { "id": "<uuid>", "displayName": "SARAH CHEN" },
    "availabilityStatus": "verified_available",
    "rankingFactors": [{ "code": "EARLIEST_AVAILABLE", "points": 30 }],
    "matchedConstraints": [{ "code": "SERVICE_SUPPORTED", "field": "serviceId", "status": "matched", "sourceStatus": "verified" }]
  }],
  "summary": {
    "evaluatedSlots": 14,
    "optionsReturned": 3,
    "providersScanned": 91,
    "eligibleProviders": 24,
    "providersWithVerifiedAvailability": 3
  },
  "warnings": [],
  "exclusionSummary": { "SERVICE_NOT_SUPPORTED": 67 }
}
```

---

### hold_service_option

**Input (`kind: "orita.hold-request"`):**
```json
{
  "schemaVersion": "1.0",
  "kind": "orita.hold-request",
  "resolutionId": "<uuid>",
  "optionId": "<uuid>",
  "ttlSeconds": 120
}
```

**Artifact (`kind: "orita.service-hold"`, state=completed):**
```json
{
  "kind": "orita.service-hold",
  "holdId": "<uuid>",
  "status": "active",
  "optionId": "<uuid>",
  "resolutionId": "<uuid>",
  "expiresAt": "<ISO8601>",
  "schemaVersion": "1.0"
}
```

---

### confirm_service_booking — without approval

**Input (`kind: "orita.confirm-request"`):**
```json
{
  "schemaVersion": "1.0",
  "kind": "orita.confirm-request",
  "resolutionId": "<uuid>",
  "optionId": "<uuid>",
  "holdId": "<uuid>"
}
```

**Artifact (`kind: "orita.approval-request"`, state=input_required):**

This is the **approval challenge** — Orita refuses to create a booking without explicit approval evidence.

```json
{
  "kind": "orita.approval-request",
  "approvalChallengeId": "apr_<id>",
  "resolutionId": "<uuid>",
  "optionId": "<uuid>",
  "holdId": "<uuid>",
  "expiresAt": "<ISO8601>",
  "optionHash": "sha256:<hash>",
  "requestedAction": "confirm_service_booking",
  "schemaVersion": "1.0"
}
```

---

### confirm_service_booking — with approval

**Input (`kind: "orita.approval-response"`):**
```json
{
  "schemaVersion": "1.0",
  "kind": "orita.approval-response",
  "approvalChallengeId": "apr_<id>",
  "approved": true,
  "approvedAt": "<ISO8601>",
  "resolutionId": "<uuid>",
  "optionId": "<uuid>",
  "holdId": "<uuid>",
  "customer": { "name": "Sandbox User", "email": "sandbox@example.invalid" },
  "idempotencyKey": "<unique_key>"
}
```

**Artifact (`kind: "orita.booking"`, state=completed):**
```json
{
  "kind": "orita.booking",
  "id": "<uuid>",
  "status": "confirmed",
  "slot": { "start": "<ISO8601>", "end": "<ISO8601>", "timezone": "America/New_York" },
  "service": { "id": "<uuid>", "displayName": "Initial Consultation", "durationMinutes": 60 },
  "provider": { "id": "<uuid>", "displayName": "SARAH CHEN" },
  "customer": { "name": "Sandbox User", "email": "sandbox@example.invalid", "timezone": "UTC" },
  "optionId": "<uuid>",
  "resolutionId": "<uuid>",
  "transport": "a2a",
  "organizationId": "<uuid>",
  "createdAt": "<ISO8601>",
  "schemaVersion": "1.0"
}
```

---

## Task State Values

| State | Meaning |
|-------|---------|
| `completed` | Task finished successfully; `artifact` contains the result |
| `input_required` | Orita needs additional input (e.g. approval challenge) |
| `failed` | Task failed; check error details |
| `running` | Task is still processing |

---

## Artifact Kinds

| Kind | Media Type |
|------|-----------|
| `orita.service-options` | `application/vnd.orita.service-options+json` |
| `orita.service-hold` | `application/vnd.orita.service-hold+json` |
| `orita.approval-request` | `application/vnd.orita.approval-request+json` |
| `orita.booking` | `application/vnd.orita.booking+json` |

---

## Test-Booking Indicator

Sandbox bookings carry `testMode=true` and `environment=sandbox` server-side.  
They **do not** trigger:
- Real provider notifications
- Customer email/SMS
- Webhook deliveries to external systems
- The `FIRST_EXTERNAL_A2A_CONFIRMED_BOOKING` milestone

The `sandbox.note` field in the registration response confirms this behaviour.

---

## Approval Challenge Structure

The approval challenge (`orita.approval-request` artifact) enforces an explicit human-in-the-loop approval gate:

| Field | Type | Description |
|-------|------|-------------|
| `approvalChallengeId` | `string` | Opaque ID that must be echoed back in the approval response |
| `resolutionId` | `string` | Resolution context |
| `optionId` | `string` | Option being approved |
| `holdId` | `string` | Active hold for the option |
| `expiresAt` | `ISO8601` | Challenge expires; approval must arrive before this |
| `optionHash` | `sha256:<hash>` | Integrity check of the option the agent is approving |
| `requestedAction` | `string` | Always `"confirm_service_booking"` |
| `schemaVersion` | `string` | Always `"1.0"` |
