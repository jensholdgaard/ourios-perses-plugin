/**
 * RFC0041.5 — the wire-level typed-aggregation half, run only on the
 * matrix leg whose server carries RFC 0042 typed columns (>= 0.6.0;
 * `run-e2e.sh` starts that leg with `config-open-typed.yaml` and sets
 * TYPED_E2E=1). The 0.5.0 declared-minimum leg skips this suite — its
 * server rejects the typed config entries — which is exactly the
 * compatibility boundary this criterion exists to pin.
 */
import { OuriosDatasource } from "../src/datasources/ourios-datasource";
import { toTimeSeriesData } from "../src/queries/ourios-time-series-query/get-ourios-time-series-data";
import type { OuriosDatasourceClient } from "../src/datasources/ourios-datasource/ourios-datasource-types";

import { requireEnv } from "./env";

const typed = process.env.TYPED_E2E === "1";
const describeTyped = typed ? describe : describe.skip;

describeTyped("RFC0041.5 — wire-level typed sums", () => {
  const OPEN_URL = requireEnv("OPEN_QUERY_URL");
  const RANGE =
    "range(2026-07-27T09:00:00.000Z, 2026-07-27T12:00:00.000Z)";

  function client(): OuriosDatasourceClient {
    return OuriosDatasource.createClient(
      { directUrl: OPEN_URL, tenant: "e2e-tenant" },
      { proxyUrl: undefined },
    );
  }

  it("sums the Float64 column per model and bucket, with an all-NULL bucket staying null", async () => {
    const response = await client().query({
      query: `template_id > 0 | ${RANGE} | sum(attr.cost_usd) by attr.model, bucket(1h)`,
    });
    const { series } = toTimeSeriesData(response.aggregate ?? []);
    expect(series).toHaveLength(1);
    const fable = series[0]!;
    expect(fable.name).toBe("claude-fable-5");
    // Bucket one carries the seeded 12.5; bucket two's only record has
    // no cost_usd, so the group sum is NULL — a gap, NEVER zero.
    expect(fable.values).toEqual([
      [Date.parse("2026-07-27T10:00:00Z"), 12.5],
      [Date.parse("2026-07-27T11:00:00Z"), null],
    ]);
  });

  it("sums the Int64 column", async () => {
    const response = await client().query({
      query: `template_id > 0 | ${RANGE} | sum(attr.output_tokens) by bucket(1h)`,
    });
    const rows = response.aggregate ?? [];
    const first = rows.find(
      (r) => r.key[0] === "2026-07-27T10:00:00Z",
    );
    expect(first?.value).toBe(800);
  });

  it("keeps the count family unchanged next to typed columns", async () => {
    const response = await client().query({
      query: `template_id > 0 | ${RANGE} | count by attr.model, bucket(1h)`,
    });
    const { series } = toTimeSeriesData(response.aggregate ?? []);
    const fable = series.find((s) => s.name === "claude-fable-5");
    expect(fable?.values.map((v) => v[1])).toEqual([1, 1]);
  });
});

// The suite must never silently vanish from BOTH legs: on the untyped
// leg this placeholder documents the deliberate skip.
if (!typed) {
  describe("RFC0041.5 — wire-level typed sums", () => {
    it("is skipped on the declared-minimum (0.5.0) leg by design", () => {
      expect(process.env.TYPED_E2E).not.toBe("1");
    });
  });
}
