/**
 * Tests for Orita artifact Zod schemas.
 */
import { describe, it, expect } from "vitest";
import {
  ServiceOptionsArtifactSchema,
  ServiceHoldArtifactSchema,
  ApprovalRequestArtifactSchema,
  BookingArtifactSchema,
  TASK_STATES,
  MEDIA_TYPES,
} from "../src/artifacts.js";

const VALID_SLOT = {
  start: "2026-08-10T14:30:00.000Z",
  end: "2026-08-10T15:30:00.000Z",
  timezone: "America/New_York",
};

const VALID_SERVICE = {
  id: "faebdbc2-62d9-4f29-89b4-2d8e68768624",
  displayName: "Initial Consultation",
  durationMinutes: 60,
};

const VALID_PROVIDER = {
  id: "99831cff-54c4-433f-af6e-4e0756547c59",
  displayName: "SARAH CHEN",
};

describe("ServiceOptionsArtifactSchema", () => {
  const validArtifact = {
    kind: "orita.service-options",
    status: "options_proposed",
    resolutionId: "2524c38e-fc48-40be-baf7-e2ae1161f4e5",
    options: [
      {
        rank: 1,
        optionId: "e82d76f7-8326-4496-8d7f-e3d86a6d0807",
        score: 80,
        reason: "Meets all required constraints.",
        slot: VALID_SLOT,
        service: VALID_SERVICE,
        provider: VALID_PROVIDER,
        availabilityStatus: "verified_available",
      },
    ],
  };

  it("parses a valid ServiceOptionsArtifact", () => {
    const result = ServiceOptionsArtifactSchema.parse(validArtifact);
    expect(result.kind).toBe("orita.service-options");
    expect(result.options).toHaveLength(1);
    expect(result.options[0].optionId).toBe("e82d76f7-8326-4496-8d7f-e3d86a6d0807");
  });

  it("rejects wrong kind", () => {
    expect(() =>
      ServiceOptionsArtifactSchema.parse({ ...validArtifact, kind: "wrong.kind" }),
    ).toThrow();
  });

  it("requires resolutionId", () => {
    const { resolutionId: _r, ...noRes } = validArtifact;
    expect(() => ServiceOptionsArtifactSchema.parse(noRes)).toThrow();
  });

  it("requires options array", () => {
    expect(() =>
      ServiceOptionsArtifactSchema.parse({ ...validArtifact, options: undefined }),
    ).toThrow();
  });

  it("validates option slot has start/end/timezone", () => {
    const badSlot = { ...validArtifact };
    badSlot.options = [{ ...validArtifact.options[0], slot: { start: "bad" } as unknown as typeof VALID_SLOT }];
    expect(() => ServiceOptionsArtifactSchema.parse(badSlot)).toThrow();
  });
});

describe("ServiceHoldArtifactSchema", () => {
  const validHold = {
    kind: "orita.service-hold",
    holdId: "a7eb9e13-0af2-4e89-818c-28faa9d49426",
    status: "active",
    optionId: "e82d76f7-8326-4496-8d7f-e3d86a6d0807",
    resolutionId: "2524c38e-fc48-40be-baf7-e2ae1161f4e5",
    expiresAt: "2026-08-03T03:36:31.406Z",
  };

  it("parses a valid ServiceHoldArtifact", () => {
    const result = ServiceHoldArtifactSchema.parse(validHold);
    expect(result.kind).toBe("orita.service-hold");
    expect(result.holdId).toBe("a7eb9e13-0af2-4e89-818c-28faa9d49426");
  });

  it("rejects missing holdId", () => {
    const { holdId: _h, ...noHoldId } = validHold;
    expect(() => ServiceHoldArtifactSchema.parse(noHoldId)).toThrow();
  });

  it("rejects wrong kind", () => {
    expect(() =>
      ServiceHoldArtifactSchema.parse({ ...validHold, kind: "orita.wrong" }),
    ).toThrow();
  });
});

describe("ApprovalRequestArtifactSchema", () => {
  const validApproval = {
    kind: "orita.approval-request",
    approvalChallengeId: "apr_r3ml7o9i0buawtd8lpjtyuf6",
    resolutionId: "2524c38e-fc48-40be-baf7-e2ae1161f4e5",
    optionId: "e82d76f7-8326-4496-8d7f-e3d86a6d0807",
    holdId: "a7eb9e13-0af2-4e89-818c-28faa9d49426",
    expiresAt: "2026-08-03T03:39:37.842Z",
    requestedAction: "confirm_service_booking",
  };

  it("parses a valid ApprovalRequestArtifact", () => {
    const result = ApprovalRequestArtifactSchema.parse(validApproval);
    expect(result.kind).toBe("orita.approval-request");
    expect(result.approvalChallengeId).toBe("apr_r3ml7o9i0buawtd8lpjtyuf6");
  });

  it("requires approvalChallengeId", () => {
    const { approvalChallengeId: _a, ...noChallenge } = validApproval;
    expect(() => ApprovalRequestArtifactSchema.parse(noChallenge)).toThrow();
  });

  it("requires holdId", () => {
    const { holdId: _h, ...noHold } = validApproval;
    expect(() => ApprovalRequestArtifactSchema.parse(noHold)).toThrow();
  });

  it("requires requestedAction", () => {
    const { requestedAction: _r, ...noAction } = validApproval;
    expect(() => ApprovalRequestArtifactSchema.parse(noAction)).toThrow();
  });
});

describe("BookingArtifactSchema", () => {
  const validBooking = {
    kind: "orita.booking",
    id: "5e23ae76-728f-46d9-aef3-b34400d8eed8",
    status: "confirmed",
    slot: VALID_SLOT,
    service: VALID_SERVICE,
    provider: VALID_PROVIDER,
    customer: { name: "Sandbox User", email: "sandbox@example.invalid" },
    transport: "a2a",
  };

  it("parses a valid BookingArtifact", () => {
    const result = BookingArtifactSchema.parse(validBooking);
    expect(result.kind).toBe("orita.booking");
    expect(result.id).toBe("5e23ae76-728f-46d9-aef3-b34400d8eed8");
    expect(result.status).toBe("confirmed");
  });

  it("requires id", () => {
    const { id: _i, ...noId } = validBooking;
    expect(() => BookingArtifactSchema.parse(noId)).toThrow();
  });

  it("requires status", () => {
    const { status: _s, ...noStatus } = validBooking;
    expect(() => BookingArtifactSchema.parse(noStatus)).toThrow();
  });

  it("requires provider", () => {
    const { provider: _p, ...noProvider } = validBooking;
    expect(() => BookingArtifactSchema.parse(noProvider)).toThrow();
  });
});

describe("TASK_STATES", () => {
  it("includes all four expected states", () => {
    expect(TASK_STATES).toContain("completed");
    expect(TASK_STATES).toContain("input_required");
    expect(TASK_STATES).toContain("failed");
    expect(TASK_STATES).toContain("running");
  });
});

describe("MEDIA_TYPES", () => {
  it("defines all four artifact media types", () => {
    expect(MEDIA_TYPES.serviceOptions).toBe(
      "application/vnd.orita.service-options+json",
    );
    expect(MEDIA_TYPES.booking).toBe("application/vnd.orita.booking+json");
    expect(MEDIA_TYPES.serviceHold).toBe(
      "application/vnd.orita.service-hold+json",
    );
    expect(MEDIA_TYPES.approvalRequest).toBe(
      "application/vnd.orita.approval-request+json",
    );
  });
});
