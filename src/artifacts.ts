/**
 * Zod schemas for Orita A2A artifact types.
 *
 * All artifact schemas are validated at runtime to ensure the integration
 * stays aligned with the actual Orita API contract.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const SlotSchema = z.object({
  start: z.string().datetime({ offset: true }),
  end: z.string().datetime({ offset: true }),
  timezone: z.string(),
});

const ServiceSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  durationMinutes: z.number().int().positive().optional(),
});

const ProviderSchema = z.object({
  id: z.string(),
  displayName: z.string(),
});

// ---------------------------------------------------------------------------
// ServiceOptionsArtifact  (kind: "orita.service-options")
// ---------------------------------------------------------------------------

const ServiceOptionSchema = z.object({
  rank: z.number().int().positive(),
  optionId: z.string(),
  score: z.number(),
  reason: z.string().optional(),
  slot: SlotSchema,
  service: ServiceSchema,
  provider: ProviderSchema,
  availabilityStatus: z.string(),
  rankingFactors: z.array(z.object({ code: z.string(), points: z.number() })).optional(),
  matchedConstraints: z
    .array(
      z.object({
        code: z.string(),
        field: z.string().optional(),
        status: z.string(),
        sourceStatus: z.string().optional(),
      }),
    )
    .optional(),
});

export const ServiceOptionsArtifactSchema = z.object({
  kind: z.literal("orita.service-options"),
  status: z.string(),
  resolutionId: z.string(),
  options: z.array(ServiceOptionSchema),
  schemaVersion: z.string().optional(),
  policyId: z.string().optional(),
  transactionId: z.string().optional(),
  approvalRequired: z.boolean().optional(),
  expiresAt: z.string().optional(),
  summary: z
    .object({
      evaluatedSlots: z.number().optional(),
      optionsReturned: z.number().optional(),
      providersScanned: z.number().optional(),
      eligibleProviders: z.number().optional(),
      providersWithVerifiedAvailability: z.number().optional(),
    })
    .optional(),
});

export type ServiceOptionsArtifact = z.infer<typeof ServiceOptionsArtifactSchema>;

// ---------------------------------------------------------------------------
// ServiceHoldArtifact  (kind: "orita.service-hold")
// ---------------------------------------------------------------------------

export const ServiceHoldArtifactSchema = z.object({
  kind: z.literal("orita.service-hold"),
  holdId: z.string(),
  status: z.string(),
  optionId: z.string(),
  resolutionId: z.string(),
  expiresAt: z.string(),
  schemaVersion: z.string().optional(),
});

export type ServiceHoldArtifact = z.infer<typeof ServiceHoldArtifactSchema>;

// ---------------------------------------------------------------------------
// ApprovalRequestArtifact  (kind: "orita.approval-request")
// ---------------------------------------------------------------------------

export const ApprovalRequestArtifactSchema = z.object({
  kind: z.literal("orita.approval-request"),
  approvalChallengeId: z.string(),
  resolutionId: z.string(),
  optionId: z.string(),
  holdId: z.string(),
  expiresAt: z.string(),
  requestedAction: z.string(),
  optionHash: z.string().optional(),
  schemaVersion: z.string().optional(),
});

export type ApprovalRequestArtifact = z.infer<typeof ApprovalRequestArtifactSchema>;

// ---------------------------------------------------------------------------
// BookingArtifact  (kind: "orita.booking")
// ---------------------------------------------------------------------------

export const BookingArtifactSchema = z.object({
  kind: z.literal("orita.booking"),
  id: z.string(),
  status: z.string(),
  slot: SlotSchema,
  service: ServiceSchema,
  provider: ProviderSchema,
  optionId: z.string().optional(),
  resolutionId: z.string().optional(),
  customer: z
    .object({
      name: z.string(),
      email: z.string(),
      timezone: z.string().optional(),
    })
    .optional(),
  transport: z.string().optional(),
  organizationId: z.string().optional(),
  createdAt: z.string().optional(),
  schemaVersion: z.string().optional(),
});

export type BookingArtifact = z.infer<typeof BookingArtifactSchema>;

// ---------------------------------------------------------------------------
// Task state values
// ---------------------------------------------------------------------------

export const TASK_STATES = ["completed", "input_required", "failed", "running"] as const;
export type TaskState = (typeof TASK_STATES)[number];

// ---------------------------------------------------------------------------
// Artifact media types
// ---------------------------------------------------------------------------

export const MEDIA_TYPES = {
  serviceOptions: "application/vnd.orita.service-options+json",
  serviceHold: "application/vnd.orita.service-hold+json",
  approvalRequest: "application/vnd.orita.approval-request+json",
  booking: "application/vnd.orita.booking+json",
} as const;
