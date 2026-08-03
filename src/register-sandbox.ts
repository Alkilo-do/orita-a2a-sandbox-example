/**
 * Sandbox registration.
 *
 * Obtains a short-lived sandbox credential from Orita's agent-onboarding
 * endpoint.  No manual API key or account is required.
 *
 * The token is held in memory only — it is NEVER written to disk or printed
 * in plain text.
 */
import { config } from "./config.js";
import { redact } from "./redaction.js";

export interface SandboxRegistrationResponse {
  registrationId: string;
  status: string;
  clientId: string;
  secret: string;
  prefix: string;
  environment: string;
  sandboxOrgId: string;
  scopes: string[];
  rateLimitPerHour: number;
  expiresAt: string;
  sandbox: {
    description: string;
    providers: number;
    a2aEndpoint: string;
    agentCard: string;
    note: string;
  };
  quickstart: {
    step1: string;
    step2: string;
    step3: string;
    docs: string;
  };
  warning: string;
}

export interface SandboxCredential {
  /** Bearer token — keep in memory only, never log. */
  token: string;
  expiresAt: string;
  sandboxOrgId: string;
  scopes: string[];
  registrationId: string;
}

/**
 * Registers the calling agent for a temporary sandbox session.
 *
 * @param registrationUrl  Override for testing; defaults to production URL.
 * @returns SandboxCredential with the bearer token in memory.
 */
export async function registerSandboxAgent(
  registrationUrl: string = config.sandboxRegistrationUrl,
): Promise<SandboxCredential> {
  const res = await fetch(registrationUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "orita-a2a-sandbox-example/1.0.0",
      Accept: "application/json",
    },
    body: JSON.stringify({ requestedUseCase: "provider_resolution" }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "(no body)");
    throw new Error(
      `Sandbox registration failed: HTTP ${res.status} — ${body}`,
    );
  }

  const data = (await res.json()) as SandboxRegistrationResponse;

  // Validate required fields
  if (data.status !== "approved_for_sandbox") {
    throw new Error(
      `Expected status=approved_for_sandbox, got status=${data.status}`,
    );
  }
  if (!data.secret || !data.secret.startsWith("orita_test_")) {
    throw new Error("Registration response missing valid secret token.");
  }
  if (!Array.isArray(data.scopes) || data.scopes.length === 0) {
    throw new Error("Registration response missing scopes.");
  }
  if (!data.expiresAt) {
    throw new Error("Registration response missing expiresAt.");
  }
  if (!data.sandbox?.providers) {
    throw new Error("Registration response missing sandbox.providers.");
  }

  // Print redacted token — never print the real value
  console.log(`  ✓ Sandbox credential issued: ${redact(data.secret)}`);
  console.log(`  ✓ Scopes: ${data.scopes.join(", ")}`);
  console.log(
    `  ✓ Expires: ${new Date(data.expiresAt).toLocaleString()} | Sandbox providers: ${data.sandbox.providers}`,
  );

  return {
    token: data.secret, // in memory only
    expiresAt: data.expiresAt,
    sandboxOrgId: data.sandboxOrgId,
    scopes: data.scopes,
    registrationId: data.registrationId,
  };
}
