/**
 * A2A message sender and task retriever.
 *
 * Sends messages to Orita's A2A endpoint and returns the resulting task.
 * All IDs are treated as opaque strings.
 */
import type { OritaA2AClient } from "./create-a2a-client.js";

export interface A2AMessage {
  kind: "message";
  messageId: string;
  contextId: string;
  role: "user";
  parts: Array<{
    kind: "data";
    data: Record<string, unknown>;
  }>;
}

export interface A2ATask {
  id: string;
  contextId: string;
  skillId: string;
  state: "completed" | "input_required" | "failed" | "running";
  artifact: Record<string, unknown>;
  resolutionId?: string;
  holdId?: string;
  bookingId?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

/**
 * Sends a message to the Orita A2A agent and returns the resulting task.
 *
 * @param client     Authenticated A2A client from createOritaA2AClient().
 * @param skill      Skill ID to invoke (e.g. "resolve_service").
 * @param data       Message payload (the data field of the first message part).
 * @param contextId  Conversation context ID — all messages in a flow share one.
 * @param messageId  Unique message ID for this specific message.
 */
export async function sendA2AMessage(
  client: OritaA2AClient,
  skill: string,
  data: Record<string, unknown>,
  contextId: string,
  messageId: string,
): Promise<A2ATask> {
  const message: A2AMessage = {
    kind: "message",
    messageId,
    contextId,
    role: "user",
    parts: [{ kind: "data", data }],
  };

  const body = JSON.stringify({ skill, message });

  const res = await client._fetch("/message:send", {
    method: "POST",
    body,
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "(no body)");
    throw new Error(
      `A2A message:send failed for skill=${skill}: HTTP ${res.status} — ${errorBody}`,
    );
  }

  const task = (await res.json()) as A2ATask;
  return task;
}

/**
 * Retrieves a task by ID using the A2A tasks API.
 *
 * @param client  Authenticated A2A client.
 * @param taskId  Opaque task ID returned by sendA2AMessage().
 */
export async function getTask(
  client: OritaA2AClient,
  taskId: string,
): Promise<A2ATask> {
  const res = await client._fetch(`/tasks/${taskId}`, {
    method: "GET",
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "(no body)");
    throw new Error(
      `A2A tasks/${taskId} failed: HTTP ${res.status} — ${errorBody}`,
    );
  }

  return (await res.json()) as A2ATask;
}
