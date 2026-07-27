import {
  replaceVariables,
  TimeSeriesQueryPlugin,
} from "@perses-dev/plugin-system";
import { TimeSeries, TimeSeriesData } from "@perses-dev/core";
import {
  OuriosAggregateRow,
  OuriosDatasourceClient,
} from "../../datasources/ourios-datasource/ourios-datasource-types";
import { withRange } from "../dsl-range";
import { OuriosTimeSeriesQuerySpec } from "./ourios-time-series-query-types";

const DEFAULT_DATASOURCE = { kind: "OuriosDatasource" };

/**
 * A `bucket(w)` group key: the RFC 3339 UTC start of the half-open
 * window `[k·w, (k+1)·w)` (RFC 0002 §6.3). Everything else the DSL can
 * put in `key[]` is a stored string form that never looks like this.
 */
const RFC3339 =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * The index of the `bucket(w)` dimension in the group keys: the
 * position that is an RFC 3339 timestamp on every row. Undefined when
 * no position qualifies — the query has no bucket term, so it is not a
 * time series (§3.2: "aggregate[] with other keys → table").
 */
export function bucketIndex(rows: OuriosAggregateRow[]): number | undefined {
  const width = rows[0]?.key.length ?? 0;
  for (let i = 0; i < width; i++) {
    if (rows.every((row) => RFC3339.test(row.key[i] ?? ""))) return i;
  }
  return undefined;
}

/**
 * RFC0041.3 — the aggregate rows as Perses time series: bucket keys
 * become millisecond timestamps, the remaining group keys become the
 * series identity, and a `null` scalar (an all-NULL group,
 * RFC 0042 §3.5) stays `null` — Perses's gap value — **never** a zero.
 * Rows without a scalar (the bare `count` family) chart their count.
 */
export function toTimeSeriesData(rows: OuriosAggregateRow[]): TimeSeriesData {
  const bucket = bucketIndex(rows);
  if (bucket === undefined) {
    return { series: [] };
  }
  const byGroup = new Map<string, TimeSeries>();
  for (const row of rows) {
    const groupParts = row.key.filter((_, i) => i !== bucket);
    const name = groupParts.length > 0 ? groupParts.join(", ") : "value";
    let series = byGroup.get(name);
    if (series === undefined) {
      const labels: Record<string, string> = {};
      groupParts.forEach((part, i) => {
        labels[`group_${i}`] = part;
      });
      series = { name, values: [], labels };
      byGroup.set(name, series);
    }
    const timestampMs = Date.parse(row.key[bucket]!);
    series.values.push([
      timestampMs,
      row.value === undefined ? row.count : row.value,
    ]);
  }
  const series = [...byGroup.values()];
  for (const s of series) {
    s.values.sort((a, b) => a[0] - b[0]);
  }
  // The bucket width, when two points exist to infer it from.
  let stepMs: number | undefined;
  for (const s of series) {
    for (let i = 1; i < s.values.length; i++) {
      const delta = s.values[i]![0] - s.values[i - 1]![0];
      if (delta > 0 && (stepMs === undefined || delta < stepMs)) stepMs = delta;
    }
  }
  return { series, stepMs };
}

export const getOuriosTimeSeriesData: TimeSeriesQueryPlugin<OuriosTimeSeriesQuerySpec>["getTimeSeriesData"] =
  async (spec, context) => {
    const { start, end } = context.timeRange;
    if (!spec.query) {
      return { series: [], timeRange: { start, end } };
    }
    const dsl = withRange(
      replaceVariables(spec.query, context.variableState),
      start,
      end,
    );
    const client =
      (await context.datasourceStore.getDatasourceClient<OuriosDatasourceClient>(
        spec.datasource ?? DEFAULT_DATASOURCE,
      )) as OuriosDatasourceClient;
    const response = await client.query({ query: dsl });
    return {
      ...toTimeSeriesData(response.aggregate ?? []),
      timeRange: { start, end },
      metadata: { executedQueryString: dsl },
    };
  };
