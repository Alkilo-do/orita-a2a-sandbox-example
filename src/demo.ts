/**
 * Orita A2A Sandbox — full end-to-end demonstration.
 *
 * Steps:
 *   1. Discover Orita via public Agent Card
 *   2. Verify Agent Card signature (or skip with --skip-signature-verification)
 *   3. Register for temporary sandbox access (no account needed)
 *   4. Create authenticated A2A client
 *   5. Resolve provider options
 *   6. Hold the first option
 *   7. Demonstrate the approval boundary (confirm without approval → input_required)
 *   8. Approve and confirm the booking
 *   9. Verify idempotency (retry → same booking ID)
 *  10. Retrieve the final task
 *
 * Run: npm run demo
 * Run with sig skip: npm run demo -- --skip-signature-verification
 */
import crypto from "node:crypto";
import { discoverOritaAgent } from "./discover.js";
import { verifyAgentCardSignature } from "./verify-agent-card.js";
import { registerSandboxAgent } from "./register-sandbox.js";
import { createOritaA2AClient } from "./create-a2a-client.js";
import { sendA2AMessage, getTask } from "./task-runner.js";
import { redact } from "./redaction.js";
import {
  ServiceOptionsArtifactSchema,
  ServiceHoldArtifactSchema,
  ApprovalRequestArtifactSchema,
  BookingArtifactSchema,
} from "./artifacts.js";

const LINE = "─".repeat(40);

/** Returns YYYY-MM-DD for a date N days from now (UTC). */
function daysFromNow(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function runDemo(): Promise<void> {
  const startMs = Date.now();

  console.log("\n🔍 Step 1: Discovering Orita...");
  const { card, a2aEndpoint } = await discoverOritaAgent();
  console.log(`  ✓ Agent: ${card.name}`);
  console.log(`  ✓ A2A endpoint: ${a2aEndpoint}`);
  console.log(`  ✓ Protocol: ${card.supportedInterfaces[0].protocolVersion}`);
  console.log(`  ✓ Skills: ${card.skills.map((s) => s.id).join(", ")}`);

  console.log("\n🔐 Step 2: Verifying Agent Card signature...");
  await verifyAgentCardSignature(card, "https://orita.online/a2a/jwks.json");

  console.log("\n📋 Step 3: Registering for sandbox access...");
  const { token, expiresAt, scopes } = await registerSandboxAgent();
  console.log(`  ✓ Token expires: ${expiresAt}`);
  console.log(`  ✓ Scopes granted: ${scopes.length}`);

  console.log("\n🤖 Step 4: Creating A2A client...");
  const client = createOritaA2AClient(token, a2aEndpoint);
  console.log(`  ✓ Client ready → ${a2aEndpoint}`);

  const contextId = `ctx_demo_${crypto.randomUUID()}`;

  // -------------------------------------------------------------------------
  // Step 5 — Resolve providers
  // -------------------------------------------------------------------------
  console.log("\n🔎 Step 5: Resolving providers...");
  const tomorrow = daysFromNow(1);
  const twoWeeks = daysFromNow(14);

  const resolveTask = await sendA2AMessage(
    client,
    "resolve_service",
    {
      schemaVersion: "1.0",
      kind: "orita.service-request",
      dateRange: { from: tomorrow, to: twoWeeks },
      preferences: { earliestAvailable: true },
      limit: 3,
    },
    contextId,
    crypto.randomUUID(),
  );

  if (resolveTask.state !== "completed") {
    console.error(`FAIL: resolve_service returned state=${resolveTask.state}`);
    process.exit(3);
  }

  const resolveArtifact = ServiceOptionsArtifactSchema.parse(resolveTask.artifact);
  const options = resolveArtifact.options;

  if (!options.length) {
    console.error("FAIL: No provider options returned.");
    process.exit(4);
  }

  const resolutionId = resolveArtifact.resolutionId;
  const firstOpt = options[0];

  console.log(`  ✓ Task: ${resolveTask.id}`);
  console.log(`  ✓ Resolution ID: ${resolutionId}`);
  console.log(`  ✓ Options returned: ${options.length}`);
  options.slice(0, 3).forEach((opt, i) => {
    console.log(
      `  ${i + 1}. ${opt.provider.displayName} — ${opt.slot.start.slice(0, 16).replace("T", " ")} UTC (score ${opt.score})`,
    );
  });

  // -------------------------------------------------------------------------
  // Step 6 — Hold first option
  // -------------------------------------------------------------------------
  console.log("\n⏸  Step 6: Holding first option...");
  const holdTask = await sendA2AMessage(
    client,
    "hold_service_option",
    {
      schemaVersion: "1.0",
      kind: "orita.hold-request",
      resolutionId,
      optionId: firstOpt.optionId,
      ttlSeconds: 120,
    },
    contextId,
    crypto.randomUUID(),
  );

  if (holdTask.state !== "completed") {
    console.error(`FAIL: hold_service_option returned state=${holdTask.state}`);
    process.exit(4);
  }

  const holdArtifact = ServiceHoldArtifactSchema.parse(holdTask.artifact);
  const holdId = holdArtifact.holdId;

  console.log(`  ✓ Hold ID: ${holdId}`);
  console.log(`  ✓ Hold expires: ${holdArtifact.expiresAt}`);

  // -------------------------------------------------------------------------
  // Step 7 — Demonstrate approval boundary
  // -------------------------------------------------------------------------
  console.log("\n🚫 Step 7: Demonstrating approval boundary...");
  console.log("  Sending confirm without approval evidence...");

  const noApprovalTask = await sendA2AMessage(
    client,
    "confirm_service_booking",
    {
      schemaVersion: "1.0",
      kind: "orita.confirm-request",
      resolutionId,
      optionId: firstOpt.optionId,
      holdId,
    },
    contextId,
    crypto.randomUUID(),
  );

  if (noApprovalTask.state !== "input_required") {
    console.error(
      `FAIL: Orita created a booking without explicit approval! ` +
        `state=${noApprovalTask.state}`,
    );
    process.exit(5);
  }
  console.log("  ✓ Orita refused to book without explicit approval (state=input_required)");

  const challenge = ApprovalRequestArtifactSchema.parse(noApprovalTask.artifact);
  console.log(`  ✓ Approval challenge: ${challenge.approvalChallengeId}`);
  console.log(`  ✓ Requested action: ${challenge.requestedAction}`);

  // -------------------------------------------------------------------------
  // Step 8 — Approve and confirm
  // -------------------------------------------------------------------------
  console.log("\n✅ Step 8: Approving and confirming...");

  const idempKey = `demo_idem_${crypto.randomUUID()}`;

  const approvalPayload = {
    schemaVersion: "1.0",
    kind: "orita.approval-response",
    approvalChallengeId: challenge.approvalChallengeId,
    approved: true,
    approvedAt: new Date().toISOString(),
    resolutionId,
    optionId: firstOpt.optionId,
    holdId,
    customer: {
      name: "Sandbox User",
      email: "sandbox@example.invalid",
    },
    idempotencyKey: idempKey,
  };

  const confirmTask = await sendA2AMessage(
    client,
    "confirm_service_booking",
    approvalPayload,
    contextId,
    crypto.randomUUID(),
  );

  if (confirmTask.state !== "completed") {
    console.error(
      `FAIL: confirm_service_booking returned state=${confirmTask.state}`,
    );
    process.exit(5);
  }

  const booking = BookingArtifactSchema.parse(confirmTask.artifact);
  const bookingId = booking.id;

  console.log(`  ✓ Booking created: ${redact(bookingId)}`);
  console.log(`  ✓ Status: ${booking.status}`);
  console.log(`  ✓ Provider: ${booking.provider.displayName}`);
  console.log(
    `  ✓ Slot: ${booking.slot.start.slice(0, 16).replace("T", " ")} → ${booking.slot.end.slice(11, 16)} UTC`,
  );

  // -------------------------------------------------------------------------
  // Step 9 — Idempotency verification
  // -------------------------------------------------------------------------
  console.log("\n🔄 Step 9: Verifying idempotency...");

  const retryTask = await sendA2AMessage(
    client,
    "confirm_service_booking",
    approvalPayload, // identical payload + same idempotencyKey
    contextId,
    crypto.randomUUID(), // new messageId is fine
  );

  if (retryTask.state !== "completed") {
    console.error(
      `FAIL: Idempotency retry returned state=${retryTask.state}`,
    );
    process.exit(6);
  }

  const retryBooking = BookingArtifactSchema.parse(retryTask.artifact);

  if (retryBooking.id !== bookingId) {
    console.error(
      `FAIL: Duplicate booking created! Original=${bookingId} Retry=${retryBooking.id}`,
    );
    process.exit(6);
  }
  console.log(`  ✓ Same booking ID returned: ${redact(retryBooking.id)}`);
  console.log("  ✓ No duplicate booking created");

  // -------------------------------------------------------------------------
  // Step 10 — Retrieve final task
  // -------------------------------------------------------------------------
  console.log("\n📥 Step 10: Retrieving final task...");

  const finalTask = await getTask(client, confirmTask.id);
  console.log(`  ✓ Task ID: ${finalTask.id}`);
  console.log(`  ✓ Task state: ${finalTask.state}`);

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);

  console.log(`\n${LINE}`);
  console.log("Orita A2A sandbox transaction completed\n");
  console.log("Account required:     No");
  console.log("Manual API key:       No");
  console.log("Provider resolution:  Completed");
  console.log("Option held:          Completed");
  console.log("Explicit approval:    Completed");
  console.log("Test booking:         Confirmed");
  console.log("Duplicate booking:    No");
  console.log(`Elapsed time:         ${elapsed}s`);
  console.log(`Booking ID:           ${redact(bookingId)}`);
  console.log(`Task ID:              ${finalTask.id}`);
  console.log(LINE);

  process.exit(0);
}

runDemo().catch((err) => {
  console.error("\n💥 Demo failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
