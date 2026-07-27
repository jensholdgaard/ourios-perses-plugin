/**
 * RFC 0016 error-envelope handling (RFC0041.1).
 *
 * Ourios answers errors as `{"error":{"kind":"…","message":"…"}}`. The
 * datasource surfaces each auth outcome as a *distinct, visible* error —
 * a missing credential (401) reads differently from a token that does
 * not cover the tenant (403) — and always carries the API's own message
 * rather than swallowing it into a generic failure.
 */

export interface OuriosApiError {
  kind?: string;
  message?: string;
}

/** Parse the RFC 0016 error envelope; undefined when the body is not it. */
export function parseErrorEnvelope(text: string): OuriosApiError | undefined {
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null && "error" in parsed) {
      const error = (parsed as { error: unknown }).error;
      // `typeof null === "object"`: require a real object so the
      // return type's `undefined`-when-absent contract holds.
      if (
        typeof error === "object" &&
        error !== null &&
        !Array.isArray(error)
      ) {
        return error as OuriosApiError;
      }
    }
  } catch {
    // Not JSON — fall through to the raw text.
  }
  return undefined;
}

/**
 * One human-readable line per outcome class. The 401/403 texts are part
 * of the RFC0041.1 contract: each auth failure mode must be visibly
 * distinct in the datasource/panel error state.
 */
export function describeQueryError(status: number, bodyText: string): string {
  const envelope = parseErrorEnvelope(bodyText);
  const apiMessage = envelope?.message ?? bodyText;
  switch (status) {
    case 401:
      return `Ourios authentication required (401): the datasource sent no valid credential. ${apiMessage}`;
    case 403:
      return `Ourios tenant not authorized (403): the credential does not cover the configured tenant. ${apiMessage}`;
    case 400:
      return `Ourios rejected the query (400): ${apiMessage}`;
    default:
      return `Ourios returned ${status}: ${apiMessage}`;
  }
}
