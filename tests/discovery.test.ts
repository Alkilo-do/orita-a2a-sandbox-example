/**
 * Tests for Orita Agent Card discovery.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { discoverOritaAgent } from "../src/discover.js";

const MOCK_CARD = {
  name: "Orita Service Transaction Agent",
  description: "Test agent",
  version: "1.0.0",
  supportedInterfaces: [
    { url: "https://orita.online/api/a2a/v1", protocolVersion: "1.0" },
  ],
  skills: [
    { id: "resolve_service", name: "Resolve Service", description: "..." },
    { id: "hold_service_option", name: "Hold Service Option", description: "..." },
    { id: "release_service_option", name: "Release Service Option", description: "..." },
    { id: "confirm_service_booking", name: "Confirm Service Booking", description: "..." },
    { id: "cancel_service_booking", name: "Cancel Service Booking", description: "..." },
  ],
  securitySchemes: { bearerAuth: {} },
  securityRequirements: [{ schemes: { bearerAuth: {} } }],
  signatures: [null],
};

function mockFetch(response: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => response,
    text: async () => JSON.stringify(response),
  } as Response);
}

describe("discoverOritaAgent", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects non-HTTPS agent card URLs", async () => {
    await expect(
      discoverOritaAgent("http://orita.online/.well-known/agent-card.json"),
    ).rejects.toThrow("HTTPS");
  });

  it("validates Agent Card has required field: name", async () => {
    const card = { ...MOCK_CARD, name: undefined };
    vi.stubGlobal("fetch", mockFetch(card));
    await expect(discoverOritaAgent()).rejects.toThrow("name");
  });

  it("validates Agent Card has required field: skills", async () => {
    const card = { ...MOCK_CARD, skills: undefined };
    vi.stubGlobal("fetch", mockFetch(card));
    await expect(discoverOritaAgent()).rejects.toThrow("skills");
  });

  it("validates Agent Card has required field: supportedInterfaces", async () => {
    const card = { ...MOCK_CARD, supportedInterfaces: undefined };
    vi.stubGlobal("fetch", mockFetch(card));
    await expect(discoverOritaAgent()).rejects.toThrow("supportedInterfaces");
  });

  it("validates all 5 required skills are present", async () => {
    const card = {
      ...MOCK_CARD,
      skills: MOCK_CARD.skills.filter((s) => s.id !== "cancel_service_booking"),
    };
    vi.stubGlobal("fetch", mockFetch(card));
    await expect(discoverOritaAgent()).rejects.toThrow("cancel_service_booking");
  });

  it("extracts A2A endpoint from supportedInterfaces[0].url", async () => {
    vi.stubGlobal("fetch", mockFetch(MOCK_CARD));
    const result = await discoverOritaAgent();
    expect(result.a2aEndpoint).toBe("https://orita.online/api/a2a/v1");
  });

  it("returns the full card object", async () => {
    vi.stubGlobal("fetch", mockFetch(MOCK_CARD));
    const result = await discoverOritaAgent();
    expect(result.card.name).toBe("Orita Service Transaction Agent");
    expect(result.card.skills).toHaveLength(5);
  });

  it("throws on non-OK HTTP response", async () => {
    vi.stubGlobal("fetch", mockFetch({ error: "not found" }, 404));
    await expect(discoverOritaAgent()).rejects.toThrow("HTTP 404");
  });

  it("throws when supportedInterfaces is empty", async () => {
    const card = { ...MOCK_CARD, supportedInterfaces: [] };
    vi.stubGlobal("fetch", mockFetch(card));
    await expect(discoverOritaAgent()).rejects.toThrow("no supportedInterfaces");
  });

  it("includes authScheme in result", async () => {
    vi.stubGlobal("fetch", mockFetch(MOCK_CARD));
    const result = await discoverOritaAgent();
    expect(result.authScheme).toBe("bearerAuth");
  });
});
