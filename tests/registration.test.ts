/**
 * Tests for sandbox registration.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerSandboxAgent } from "../src/register-sandbox.js";

const MOCK_REGISTRATION_RESPONSE = {
  registrationId: "areg_testregistrationid123",
  status: "approved_for_sandbox",
  clientId: "org_sandbox_v1_orita",
  secret: "orita_test_hpZGbBtesttoken12345678901234567890",
  prefix: "orita_test_hpZGb",
  environment: "sandbox",
  sandboxOrgId: "org_sandbox_v1_orita",
  scopes: [
    "resolutions:create",
    "resolutions:read",
    "bookings:read",
    "a2a:resolve",
    "a2a:hold",
    "a2a:confirm",
  ],
  rateLimitPerHour: 20,
  expiresAt: "2026-08-05T00:00:00.000Z",
  sandbox: {
    description: "Sandbox environment with 5 fake providers.",
    providers: 5,
    a2aEndpoint: "https://orita.online/api/a2a/v1",
    agentCard: "https://orita.online/.well-known/agent-card.json",
    note: "All bookings use testMode=true.",
  },
  quickstart: {
    step1: "...",
    step2: "...",
    step3: "...",
    docs: "https://orita.online/developers/a2a",
  },
  warning: "Store this secret immediately.",
};

function mockFetch(body: unknown, status = 201) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response);
}

describe("registerSandboxAgent", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a SandboxCredential with a valid token", async () => {
    vi.stubGlobal("fetch", mockFetch(MOCK_REGISTRATION_RESPONSE));
    const cred = await registerSandboxAgent();
    expect(cred.token).toBe(MOCK_REGISTRATION_RESPONSE.secret);
    expect(cred.token).toMatch(/^orita_test_/);
  });

  it("validates status=approved_for_sandbox", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({ ...MOCK_REGISTRATION_RESPONSE, status: "pending" }),
    );
    await expect(registerSandboxAgent()).rejects.toThrow("approved_for_sandbox");
  });

  it("validates token format starts with orita_test_", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({ ...MOCK_REGISTRATION_RESPONSE, secret: "invalid_token" }),
    );
    await expect(registerSandboxAgent()).rejects.toThrow("valid secret token");
  });

  it("validates scopes array is non-empty", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({ ...MOCK_REGISTRATION_RESPONSE, scopes: [] }),
    );
    await expect(registerSandboxAgent()).rejects.toThrow("scopes");
  });

  it("validates expiresAt is present", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({ ...MOCK_REGISTRATION_RESPONSE, expiresAt: undefined }),
    );
    await expect(registerSandboxAgent()).rejects.toThrow("expiresAt");
  });

  it("validates sandbox.providers is present", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        ...MOCK_REGISTRATION_RESPONSE,
        sandbox: { ...MOCK_REGISTRATION_RESPONSE.sandbox, providers: 0 },
      }),
    );
    await expect(registerSandboxAgent()).rejects.toThrow("sandbox.providers");
  });

  it("throws on HTTP error", async () => {
    vi.stubGlobal("fetch", mockFetch({ error: "rate limited" }, 429));
    await expect(registerSandboxAgent()).rejects.toThrow("HTTP 429");
  });

  it("returns sandboxOrgId and scopes", async () => {
    vi.stubGlobal("fetch", mockFetch(MOCK_REGISTRATION_RESPONSE));
    const cred = await registerSandboxAgent();
    expect(cred.sandboxOrgId).toBe("org_sandbox_v1_orita");
    expect(cred.scopes).toContain("a2a:resolve");
    expect(cred.scopes).toContain("a2a:hold");
    expect(cred.scopes).toContain("a2a:confirm");
  });

  it("includes a2a scopes in response", async () => {
    vi.stubGlobal("fetch", mockFetch(MOCK_REGISTRATION_RESPONSE));
    const cred = await registerSandboxAgent();
    expect(cred.scopes).toHaveLength(6);
  });
});
