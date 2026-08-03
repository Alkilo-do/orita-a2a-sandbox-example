/**
 * Tests for Agent Card signature verification.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyAgentCardSignature } from "../src/verify-agent-card.js";
import type { AgentCard } from "../src/discover.js";

// Real production JWKS key (public — safe to embed in tests)
const REAL_JWKS = {
  keys: [
    {
      kty: "EC",
      crv: "P-256",
      x: "3j58ZK1sR3kUmaQ1lpHYdk5qt6v3X5EIbWHV4ZtW78A",
      y: "cAv69d1Jm_xFy4x7WWvXk0Oe-Pvl6Ez_Gd0QMm5ldb8",
      kid: "orita-a2a-v1-2026-08-02",
      use: "sig",
      alg: "ES256",
    },
  ],
};

function mockFetchFor(data: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response);
}

const CARD_NO_SIGS: AgentCard = {
  name: "Orita Service Transaction Agent",
  supportedInterfaces: [
    { url: "https://orita.online/api/a2a/v1", protocolVersion: "1.0" },
  ],
  skills: [],
  signatures: [null],
};

const CARD_WITH_INVALID_SIG: AgentCard = {
  ...CARD_NO_SIGS,
  signatures: [
    {
      kid: "orita-a2a-v1-2026-08-02",
      jws: "invalid.jws.token",
    },
  ],
};

const CARD_WITH_UNKNOWN_KID: AgentCard = {
  ...CARD_NO_SIGS,
  signatures: [
    {
      kid: "unknown-kid-xyz",
      jws: "some.jws.token",
    },
  ],
};

describe("verifyAgentCardSignature", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts a card with no signatures (nulls only) without throwing", async () => {
    vi.stubGlobal("fetch", mockFetchFor(REAL_JWKS));
    // Should not throw — logs a warning instead
    await expect(
      verifyAgentCardSignature(CARD_NO_SIGS, "https://orita.online/a2a/jwks.json"),
    ).resolves.toBeUndefined();
  });

  it("rejects an invalid JWS token", async () => {
    vi.stubGlobal("fetch", mockFetchFor(REAL_JWKS));
    await expect(
      verifyAgentCardSignature(
        CARD_WITH_INVALID_SIG,
        "https://orita.online/a2a/jwks.json",
      ),
    ).rejects.toThrow();
  });

  it("rejects an unknown kid", async () => {
    vi.stubGlobal("fetch", mockFetchFor(REAL_JWKS));
    await expect(
      verifyAgentCardSignature(
        CARD_WITH_UNKNOWN_KID,
        "https://orita.online/a2a/jwks.json",
      ),
    ).rejects.toThrow("unknown-kid-xyz");
  });

  it("throws if JWKS fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
        text: async () => "{}",
      } as Response),
    );
    await expect(
      verifyAgentCardSignature(CARD_NO_SIGS, "https://orita.online/a2a/jwks.json"),
    ).rejects.toThrow("HTTP 503");
  });

  it("throws if JWKS has no keys", async () => {
    vi.stubGlobal("fetch", mockFetchFor({ keys: [] }));
    const cardWithSig: AgentCard = {
      ...CARD_NO_SIGS,
      signatures: [{ jws: "some.jws.token" }],
    };
    await expect(
      verifyAgentCardSignature(cardWithSig, "https://orita.online/a2a/jwks.json"),
    ).rejects.toThrow("no keys");
  });
});
