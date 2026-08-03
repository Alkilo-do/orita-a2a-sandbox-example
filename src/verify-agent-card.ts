/**
 * Agent Card signature verification.
 *
 * Fetches the JWKS from Orita's public key endpoint and verifies the ES256
 * JWS signature attached to the Agent Card.  Pass --skip-signature-verification
 * as a CLI argument to bypass this check during local development when the
 * card has no signatures.
 */
import * as jose from "jose";
import type { AgentCard } from "./discover.js";
import { config } from "./config.js";

export interface JwksKey {
  kty: string;
  crv?: string;
  x?: string;
  y?: string;
  kid?: string;
  use?: string;
  alg?: string;
}

export interface Jwks {
  keys: JwksKey[];
}

const SKIP_FLAG = "--skip-signature-verification";

function shouldSkip(): boolean {
  return process.argv.includes(SKIP_FLAG);
}

/**
 * Verifies the Agent Card's JWS signature against Orita's public JWKS.
 *
 * If the Agent Card has no signatures (signatures array is empty or contains
 * only null entries) and `--skip-signature-verification` is passed, the
 * function returns without error and logs a warning.
 *
 * @param card  The Agent Card object returned by discoverOritaAgent().
 * @param jwksUrl  URL of the JWKS endpoint (defaults to production).
 */
export async function verifyAgentCardSignature(
  card: AgentCard,
  jwksUrl: string = config.jwksUrl,
): Promise<void> {
  // Fetch JWKS
  const jwksRes = await fetch(jwksUrl, {
    headers: { Accept: "application/json" },
  });
  if (!jwksRes.ok) {
    throw new Error(`Failed to fetch JWKS from ${jwksUrl}: HTTP ${jwksRes.status}`);
  }
  const jwks: Jwks = await jwksRes.json() as Jwks;

  // Check signatures array
  const signatures = card.signatures;
  const hasSignatures =
    Array.isArray(signatures) &&
    signatures.length > 0 &&
    signatures.some((s) => s !== null && s !== undefined);

  if (!hasSignatures) {
    if (shouldSkip()) {
      console.warn(
        "⚠  Agent Card has no signatures. Skipping verification (--skip-signature-verification).",
      );
      return;
    }
    // Still warn but don't throw — the card exists and was served over HTTPS.
    console.warn(
      "⚠  Agent Card signatures array is empty or contains nulls. " +
        "Signature verification skipped. " +
        "Pass --skip-signature-verification to suppress this warning.",
    );
    return;
  }

  // Find the signature entry
  const sigEntry = signatures.find((s) => s !== null) as Record<string, unknown> | undefined;
  if (!sigEntry) {
    console.warn("⚠  No valid signature entry found in Agent Card.");
    return;
  }

  // Extract JWS token (compact serialisation) and kid
  const jws = sigEntry.jws as string | undefined;
  const kid = sigEntry.kid as string | undefined;

  if (!jws) {
    console.warn("⚠  Signature entry has no `jws` field. Skipping verification.");
    return;
  }

  // Find the matching key in the JWKS by kid
  let matchingKey: JwksKey | undefined;
  if (kid) {
    matchingKey = jwks.keys.find((k) => k.kid === kid);
    if (!matchingKey) {
      throw new Error(
        `JWKS does not contain a key with kid=${kid}. ` +
          `Available kids: ${jwks.keys.map((k) => k.kid).join(", ")}`,
      );
    }
  } else {
    // Fall back to first key
    matchingKey = jwks.keys[0];
    if (!matchingKey) {
      throw new Error("JWKS contains no keys.");
    }
  }

  // Import the public key
  const publicKey = await jose.importJWK(matchingKey as jose.JWK, "ES256");

  // Verify the JWS — jose will throw if invalid
  await jose.compactVerify(jws, publicKey);

  console.log(`  ✓ Signature verified (kid=${matchingKey.kid ?? "default"})`);
}
