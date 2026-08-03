/**
 * Orita A2A HTTP client factory.
 *
 * Wraps @a2a-js/sdk types and creates a lightweight HTTP client that speaks
 * Orita's REST A2A dialect:
 *   POST {a2aEndpoint}/message:send   { skill, message }
 *   GET  {a2aEndpoint}/tasks/{id}
 *
 * The token is passed as a Bearer header and is never logged.
 */

export interface OritaA2AClient {
  /** A2A endpoint base URL, e.g. https://orita.online/api/a2a/v1 */
  a2aEndpoint: string;
  /** Internal fetch wrapper — do not expose token externally. */
  _fetch: (path: string, init: RequestInit) => Promise<Response>;
}

/**
 * Creates an authenticated A2A client for Orita's endpoint.
 *
 * @param token       Bearer token from registerSandboxAgent() — kept in closure.
 * @param a2aEndpoint Base URL for the A2A service.
 */
export function createOritaA2AClient(
  token: string,
  a2aEndpoint: string,
): OritaA2AClient {
  /**
   * Authenticated fetch — injects Authorization and A2A-Version headers.
   * The token is captured in the closure and never leaves this module.
   */
  async function authenticatedFetch(
    path: string,
    init: RequestInit,
  ): Promise<Response> {
    const url = `${a2aEndpoint}${path}`;
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("A2A-Version", "1.0");
    headers.set("Content-Type", "application/json");
    headers.set("Accept", "application/json");
    headers.set("User-Agent", "orita-a2a-sandbox-example/1.0.0");

    return fetch(url, { ...init, headers });
  }

  return {
    a2aEndpoint,
    _fetch: authenticatedFetch,
  };
}
