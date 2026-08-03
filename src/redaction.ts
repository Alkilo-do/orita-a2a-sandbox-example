/**
 * Token redaction utilities.
 * Tokens must never appear in logs or output.
 */

/**
 * Masks all characters after position 16 with bullet characters.
 * Ensures that secrets (e.g. orita_test_XXXXX…) never leak in output.
 *
 * @example
 * redact("orita_test_hpZGbB-jXRcaqDKQaa7LUB3VfJUw4TQq")
 * // → "orita_test_hpZGb••••••••••••••••••••••••••••"
 */
export function redact(value: string): string {
  if (value.length <= 16) {
    return "•".repeat(value.length);
  }
  const visible = value.slice(0, 16);
  const masked = "•".repeat(value.length - 16);
  return visible + masked;
}

/** Pattern that matches any Orita sandbox token. */
const TOKEN_PATTERN = /orita_test_[A-Za-z0-9\-_]+/g;

/**
 * Sanitises a log message, replacing any embedded token with its redacted
 * form before printing to stdout.  Never call console.log with raw tokens;
 * always route through safeLog.
 */
export function safeLog(msg: string): void {
  const sanitised = msg.replace(TOKEN_PATTERN, (token) => redact(token));
  // eslint-disable-next-line no-console
  console.log(sanitised);
}
