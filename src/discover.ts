/**
 * Orita Agent Card discovery.
 *
 * Fetches and validates the publicly available Agent Card, verifies that all
 * required A2A skills are present, and extracts the A2A endpoint URL.
 */
import { config } from "./config.js";

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  examples?: string[];
  inputModes?: string[];
  outputModes?: string[];
}

export interface AgentInterface {
  url: string;
  protocolVersion: string;
}

export interface AgentProvider {
  url: string;
  organization: string;
}

export interface AgentCard {
  name: string;
  description?: string;
  version?: string;
  documentationUrl?: string;
  provider?: AgentProvider;
  supportedInterfaces: AgentInterface[];
  skills: AgentSkill[];
  capabilities?: Record<string, unknown>;
  securitySchemes?: Record<string, unknown>;
  securityRequirements?: Array<Record<string, unknown>>;
  defaultInputModes?: string[];
  defaultOutputModes?: string[];
  signatures?: Array<unknown>;
}

export interface DiscoveryResult {
  card: AgentCard;
  a2aEndpoint: string;
  authScheme: string;
}

const REQUIRED_SKILLS = [
  "resolve_service",
  "hold_service_option",
  "release_service_option",
  "confirm_service_booking",
  "cancel_service_booking",
] as const;

/**
 * Discovers the Orita A2A agent by fetching and validating the public Agent
 * Card.
 *
 * @throws {Error} If the card is malformed, missing required skills, or
 *   served over plain HTTP.
 */
export async function discoverOritaAgent(
  agentCardUrl: string = config.agentCardUrl,
): Promise<DiscoveryResult> {
  // Enforce HTTPS for security — never fetch credentials over plain HTTP.
  if (!agentCardUrl.startsWith("https://")) {
    throw new Error(
      `Agent Card URL must use HTTPS. Got: ${agentCardUrl}`,
    );
  }

  const res = await fetch(agentCardUrl, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch Agent Card from ${agentCardUrl}: HTTP ${res.status}`,
    );
  }

  const card = (await res.json()) as AgentCard;

  // --- Structural validation ---
  if (!card.name || typeof card.name !== "string") {
    throw new Error("Agent Card missing required field: name");
  }
  if (!Array.isArray(card.skills)) {
    throw new Error("Agent Card missing required field: skills");
  }
  if (!Array.isArray(card.supportedInterfaces)) {
    throw new Error("Agent Card missing required field: supportedInterfaces");
  }

  // --- Skills validation ---
  const skillIds = new Set(card.skills.map((s: AgentSkill) => s.id));
  const missingSkills: string[] = [];
  for (const required of REQUIRED_SKILLS) {
    if (!skillIds.has(required)) {
      missingSkills.push(required);
    }
  }
  if (missingSkills.length > 0) {
    throw new Error(
      `Agent Card is missing required skills: ${missingSkills.join(", ")}`,
    );
  }

  // --- Extract A2A endpoint ---
  if (card.supportedInterfaces.length === 0) {
    throw new Error("Agent Card has no supportedInterfaces");
  }
  const primaryInterface = card.supportedInterfaces[0];
  if (!primaryInterface.url || typeof primaryInterface.url !== "string") {
    throw new Error("Agent Card supportedInterfaces[0] missing url");
  }
  const a2aEndpoint = primaryInterface.url;

  // --- Auth scheme ---
  const securitySchemes = card.securitySchemes ?? {};
  const authScheme = Object.keys(securitySchemes)[0] ?? "bearerAuth";

  return { card, a2aEndpoint, authScheme };
}
