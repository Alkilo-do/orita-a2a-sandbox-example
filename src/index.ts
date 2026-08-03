/**
 * orita-a2a-sandbox-example
 *
 * Public API surface — re-exports the main building blocks so the package
 * can be used as a library as well as a CLI demo.
 */

export { discoverOritaAgent } from "./discover.js";
export type { AgentCard, AgentSkill, DiscoveryResult } from "./discover.js";

export { verifyAgentCardSignature } from "./verify-agent-card.js";

export { registerSandboxAgent } from "./register-sandbox.js";
export type { SandboxCredential } from "./register-sandbox.js";

export { createOritaA2AClient } from "./create-a2a-client.js";
export type { OritaA2AClient } from "./create-a2a-client.js";

export { sendA2AMessage, getTask } from "./task-runner.js";
export type { A2ATask, A2AMessage } from "./task-runner.js";

export { redact, safeLog } from "./redaction.js";

export {
  ServiceOptionsArtifactSchema,
  ServiceHoldArtifactSchema,
  ApprovalRequestArtifactSchema,
  BookingArtifactSchema,
  TASK_STATES,
  MEDIA_TYPES,
} from "./artifacts.js";
export type {
  ServiceOptionsArtifact,
  ServiceHoldArtifact,
  ApprovalRequestArtifact,
  BookingArtifact,
  TaskState,
} from "./artifacts.js";

export { config, DEFAULTS } from "./config.js";
