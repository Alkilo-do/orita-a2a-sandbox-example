/**
 * Central configuration — all values default to Orita production.
 * Override via environment variables for custom deployments.
 */
export const DEFAULTS = {
  origin: "https://orita.online",
  agentCardUrl: "https://orita.online/.well-known/agent-card.json",
  sandboxRegistrationUrl:
    "https://orita.online/api/v2/agent-onboarding/registrations",
  jwksUrl: "https://orita.online/a2a/jwks.json",
  a2aEndpoint: "https://orita.online/api/a2a/v1",
} as const;

export const config = {
  origin: process.env.ORITA_ORIGIN ?? DEFAULTS.origin,
  agentCardUrl:
    process.env.ORITA_AGENT_CARD_URL ?? DEFAULTS.agentCardUrl,
  sandboxRegistrationUrl:
    process.env.ORITA_SANDBOX_REGISTRATION_URL ??
    DEFAULTS.sandboxRegistrationUrl,
  jwksUrl: process.env.ORITA_JWKS_URL ?? DEFAULTS.jwksUrl,
  a2aEndpoint: process.env.ORITA_A2A_ENDPOINT ?? DEFAULTS.a2aEndpoint,
};
