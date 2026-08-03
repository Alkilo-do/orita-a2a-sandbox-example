/**
 * Tests for token redaction utilities.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { redact, safeLog } from "../src/redaction.js";

describe("redact", () => {
  it("preserves the first 16 characters", () => {
    const token = "orita_test_hpZGbB-jXRcaqDKQaa7LUB3VfJUw4TQq";
    const result = redact(token);
    expect(result.slice(0, 16)).toBe("orita_test_hpZGb");
  });

  it("masks everything after position 16 with bullets", () => {
    const token = "orita_test_hpZGbB-jXRcaqDKQaa7LUB3VfJUw4TQq";
    const result = redact(token);
    expect(result.slice(16)).toMatch(/^•+$/);
  });

  it("preserves total length of the token", () => {
    const token = "orita_test_hpZGbB-jXRcaqDKQaa7LUB3VfJUw4TQq";
    expect(redact(token)).toHaveLength(token.length);
  });

  it("masks short tokens entirely", () => {
    const result = redact("short");
    expect(result).toMatch(/^•+$/);
    expect(result).toHaveLength(5);
  });

  it("handles exactly 16 character tokens (fully masked — no remainder to preserve)", () => {
    const token = "0123456789abcdef";
    const result = redact(token);
    // Tokens ≤ 16 chars are masked entirely since there are no safe prefix chars
    expect(result).toMatch(/^•+$/);
    expect(result).toHaveLength(16);
  });

  it("does not contain the original secret after position 16", () => {
    const token = "orita_test_hpZGbB-jXRcaqDKQaa7LUB3VfJUw4TQq";
    const result = redact(token);
    // The secret suffix should NOT appear
    expect(result).not.toContain("B-jXRcaqDKQaa7LUB3VfJUw4TQq");
  });
});

describe("safeLog", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("redacts orita_test_* tokens in log messages", () => {
    safeLog("token is orita_test_hpZGbB-jXRcaqDKQaa7LUB3VfJUw4TQq");
    expect(consoleSpy).toHaveBeenCalledOnce();
    const logged = consoleSpy.mock.calls[0][0] as string;
    expect(logged).not.toContain("orita_test_hpZGbB-jXRcaqDKQaa7LUB3VfJUw4TQq");
    expect(logged).toContain("orita_test_hpZGb");
    expect(logged).toContain("•");
  });

  it("leaves non-token strings unchanged", () => {
    safeLog("hello world");
    expect(consoleSpy).toHaveBeenCalledWith("hello world");
  });

  it("redacts multiple tokens in a single message", () => {
    safeLog(
      "a=orita_test_hpZGbB-jXRcaqDKQaa7LUB3VfJUw4TQq b=orita_test_abcdefghijklmnopqrstuvwxyz",
    );
    const logged = consoleSpy.mock.calls[0][0] as string;
    // Neither full token should appear
    expect(logged).not.toContain("B-jXRcaqDKQaa7LUB3VfJUw4TQq");
    expect(logged).not.toContain("abcdefghijklmnopqrstuvwxyz");
  });
});
