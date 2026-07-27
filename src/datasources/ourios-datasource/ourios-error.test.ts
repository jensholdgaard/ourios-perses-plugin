/**
 * RFC0041.1 (unit half) — each auth outcome is a distinct, visible
 * error carrying the API's own message. The container e2e drives the
 * same paths against a real `ourios-server`.
 */
import { describeQueryError, parseErrorEnvelope } from "./ourios-error";

describe("parseErrorEnvelope", () => {
  it("extracts the RFC 0016 envelope", () => {
    expect(
      parseErrorEnvelope(
        JSON.stringify({
          error: {
            kind: "missing_tenant",
            message: "the X-Ourios-Tenant header is required",
          },
        }),
      ),
    ).toEqual({
      kind: "missing_tenant",
      message: "the X-Ourios-Tenant header is required",
    });
  });

  it("returns undefined for non-JSON and non-envelope bodies", () => {
    expect(parseErrorEnvelope("upstream proxy error")).toBeUndefined();
    expect(parseErrorEnvelope(JSON.stringify({ rows: 0 }))).toBeUndefined();
    // typeof null === "object" must not leak a null through the guard.
    expect(parseErrorEnvelope(JSON.stringify({ error: null }))).toBeUndefined();
    expect(parseErrorEnvelope(JSON.stringify({ error: ["x"] }))).toBeUndefined();
  });
});

describe("describeQueryError (the RFC0041.1 auth matrix)", () => {
  const envelope = (kind: string, message: string) =>
    JSON.stringify({ error: { kind, message } });

  it("401 (missing credential) and 403 (wrong tenant) are distinct", () => {
    const missing = describeQueryError(
      401,
      envelope("unauthenticated", "bearer token required"),
    );
    const wrongTenant = describeQueryError(
      403,
      envelope("forbidden", "token does not cover tenant"),
    );
    expect(missing).toContain("401");
    expect(missing).toContain("no valid credential");
    expect(missing).toContain("bearer token required");
    expect(wrongTenant).toContain("403");
    expect(wrongTenant).toContain("does not cover the configured tenant");
    expect(wrongTenant).toContain("token does not cover tenant");
    expect(missing).not.toEqual(wrongTenant);
  });

  it("carries the API message for query rejections (RFC0041.2 error half)", () => {
    const msg = describeQueryError(
      400,
      envelope(
        "invalid_query",
        'unknown field "sum"; expected one of the §7 fields',
      ),
    );
    expect(msg).toContain("rejected the query");
    expect(msg).toContain('unknown field "sum"');
  });

  it("falls back to raw text when the body is not the envelope", () => {
    expect(describeQueryError(502, "bad gateway")).toContain("bad gateway");
  });
});
