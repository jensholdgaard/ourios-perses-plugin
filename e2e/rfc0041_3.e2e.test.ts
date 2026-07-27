/**
 * RFC0041.3 (wire half) — `count by bucket(1h)` against the released
 * server: bucket keys arrive as RFC 3339 window starts and chart as
 * millisecond timestamps; the fixture spans two windows including a
 * record exactly on the second window's boundary instant. Scalar sums
 * over typed columns join the matrix under a post-RFC-0042 server tag
 * (RFC0041.5).
 */
import { OuriosDatasource } from "../src/datasources/ourios-datasource";
import { getOuriosTimeSeriesData } from "../src/queries/ourios-time-series-query/get-ourios-time-series-data";
import type { OuriosDatasourceClient } from "../src/datasources/ourios-datasource/ourios-datasource-types";

import { requireEnv } from "./env";

const OPEN_URL = requireEnv("OPEN_QUERY_URL");
const TENANT = "e2e-tenant";
const START = new Date("2026-07-27T09:00:00.000Z");
const END = new Date("2026-07-27T12:00:00.000Z");

function client(): OuriosDatasourceClient {
  return OuriosDatasource.createClient(
    { directUrl: OPEN_URL, tenant: TENANT },
    { proxyUrl: undefined },
  );
}

const context = {
  timeRange: { start: START, end: END },
  variableState: {},
  datasourceStore: { getDatasourceClient: async () => client() },
};

it("charts count by bucket(1h) with window-start timestamps", async () => {
  const data = await getOuriosTimeSeriesData(
    { query: "severity >= trace | count by bucket(1h)" },
    context as never,
  );
  expect(data.series).toHaveLength(1);
  expect(data.series[0]!.values).toEqual([
    [Date.parse("2026-07-27T10:00:00Z"), 1],
    [Date.parse("2026-07-27T11:00:00Z"), 1],
  ]);
  expect(data.stepMs).toBe(3_600_000);
});

it("splits series on a group key alongside the bucket", async () => {
  const data = await getOuriosTimeSeriesData(
    { query: "template_id > 0 | count by attr.model, bucket(1h)" },
    context as never,
  );
  const fable = data.series.find((s) => s.name === "claude-fable-5");
  expect(fable).toBeDefined();
  expect(fable!.values.map(([, v]) => v)).toEqual([1, 1]);
});
