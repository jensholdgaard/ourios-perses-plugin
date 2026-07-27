/**
 * RFC0041.1/.2 — the container halves, against the released
 * `ourios-server` image (see `run-e2e.sh` for the fixture topology and
 * the graceful-shutdown flush choreography). The criteria live in the
 * main repository's RFC 0041 §5.
 */
import { OuriosDatasource } from "../src/datasources/ourios-datasource";
import { getOuriosLogData } from "../src/queries/ourios-log-query/get-ourios-log-data";
import type { OuriosDatasourceClient } from "../src/datasources/ourios-datasource/ourios-datasource-types";

const OPEN_URL = process.env.OPEN_QUERY_URL!;
const AUTH_URL = process.env.AUTH_QUERY_URL!;
const GOOD = process.env.E2E_TOKEN_GOOD!;
const OTHER = process.env.E2E_TOKEN_OTHER!;

const TENANT = "e2e-tenant";
// The seeded records sit at 2026-07-27T10:00:00Z and +1s.
const START = new Date("2026-07-27T09:00:00.000Z");
const END = new Date("2026-07-27T11:00:00.000Z");

function client(url: string, tenant = TENANT): OuriosDatasourceClient {
  return OuriosDatasource.createClient(
    { directUrl: url, tenant },
    { proxyUrl: undefined },
  );
}

const RANGE = `range(${START.toISOString()}, ${END.toISOString()})`;

describe("RFC0041.1 — open mode", () => {
  it("succeeds with no credential configured", async () => {
    const response = await client(OPEN_URL).query({
      query: `severity >= trace | ${RANGE}`,
    });
    expect(response.rows).toBe(1); // the INFO record; severity 0 is below trace
  });
});

describe("RFC0041.1 — enforcement", () => {
  it("a valid token for the tenant succeeds", async () => {
    const response = await client(AUTH_URL).query(
      { query: `severity >= trace | ${RANGE}` },
      { authorization: `Bearer ${GOOD}` },
    );
    expect(response.rows).toBe(1);
  });

  it("no token surfaces the API's 401 as the missing-credential error", async () => {
    await expect(
      client(AUTH_URL).query({ query: `severity >= trace | ${RANGE}` }),
    ).rejects.toThrow(/401.*no valid credential/s);
  });

  it("a token not covering the tenant surfaces the API's 403, distinctly", async () => {
    const rejection = client(AUTH_URL).query(
      { query: `severity >= trace | ${RANGE}` },
      { authorization: `Bearer ${OTHER}` },
    );
    await expect(rejection).rejects.toThrow(
      /403.*does not cover the configured tenant/s,
    );
    await expect(rejection).rejects.not.toThrow(/401/);
  });
});

describe("RFC0041.2 — log-panel parity over the wire", () => {
  const context = {
    timeRange: { start: START, end: END },
    variableState: {},
    datasourceStore: {
      getDatasourceClient: async () => client(OPEN_URL),
    },
  };

  it("maps the RFC 0016 response per §3.2", async () => {
    const result = await getOuriosLogData(
      { query: "severity >= trace" },
      // The plugin-system context type is far wider than the slice the
      // implementation touches; the stub carries exactly that slice.
      context as never,
    );
    expect(result.logs.entries).toHaveLength(1);
    const entry = result.logs.entries![0]!;
    expect(entry.line).toBe("hello from the e2e fixture");
    expect(entry.timestamp).toBe(1785146400); // ns -> s
    expect(entry.labels?.severity).toBe("INFO");
    expect(entry.labels?.model).toBe("claude-fable-5");
    expect(result.logs.metadata?.stats?.bytesExamined).toBeGreaterThan(0);
    expect(result.metadata?.executedQueryString).toContain("range(");
  });

  it("labels SeverityNumber 0 as unspecified via the band fallback", async () => {
    const result = await getOuriosLogData(
      // RFC0002.21: the floor bypass admits the unspecified record.
      { query: "template_id > 0" },
      context as never,
    );
    const unspecified = result.logs.entries!.find(
      (entry) => entry.line === "unspecified severity line",
    );
    expect(unspecified).toBeDefined();
    expect(unspecified!.labels?.severity).toBe("unspecified");
  });

  it("a DSL error surfaces carrying the API's message", async () => {
    await expect(
      getOuriosLogData({ query: "nonsense_field == 1" }, context as never),
    ).rejects.toThrow(/rejected the query \(400\).*nonsense_field/s);
  });
});
