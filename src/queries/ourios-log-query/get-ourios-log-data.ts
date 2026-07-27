import { replaceVariables } from "@perses-dev/plugin-system";
import { LogEntry, LogData } from "@perses-dev/core";
import {
  OuriosDatasourceClient,
  OuriosRecord,
} from "../../datasources/ourios-datasource/ourios-datasource-types";
import { LogQueryPlugin } from "../log-query-plugin-interface";
import { OuriosLogQuerySpec } from "./ourios-log-query-types";

const DEFAULT_DATASOURCE = { kind: "OuriosDatasource" };

/** Flatten an OTLP AnyValue to the string labels Perses expects. */
function anyValue(v?: Record<string, unknown>): string {
  if (!v) return "";
  const k = Object.keys(v)[0];
  return k === undefined ? "" : String(v[k]);
}

function labelsOf(rec: OuriosRecord): Record<string, string> {
  const out: Record<string, string> = {};
  for (const kv of rec.resource_attributes ?? [])
    out[kv.key] = anyValue(kv.value);
  for (const kv of rec.attributes ?? []) out[kv.key] = anyValue(kv.value);
  if (rec.severity_text) out["severity"] = rec.severity_text;
  if (rec.scope_name) out["scope.name"] = rec.scope_name;
  if (rec.template_id !== undefined)
    out["template_id"] = String(rec.template_id);
  if (rec.trace_id) out["trace_id"] = rec.trace_id;
  return out;
}

function toLogData(
  records: OuriosRecord[],
  stats?: Record<string, number>,
): LogData {
  const entries: LogEntry[] = records.map((rec) => ({
    // Perses takes SECONDS here (Loki divides its nanoseconds by 1e9);
    // Ourios stores nanoseconds, so the same divisor applies.
    timestamp: rec.time_unix_nano / 1_000_000_000,
    line: rec.body?.line ?? "",
    labels: labelsOf(rec),
  }));
  return {
    entries,
    totalCount: entries.length,
    // Ourios reports what the scan actually touched (RFC 0016); Perses has a
    // first-class slot for it, so the pruning win is visible in the UI.
    metadata: stats
      ? { stats: { bytesExamined: stats.bytes_read } }
      : undefined,
  };
}

/**
 * Perses supplies an absolute range; the DSL takes RFC 3339 bounds, so the
 * panel range becomes a `range(...)` stage. A hand-written range wins, so the
 * editor never lies about what ran.
 */
export function withRange(dsl: string, start: Date, end: Date): string {
  if (/\brange\s*\(/.test(dsl)) return dsl;
  const [head, ...rest] = dsl.split("|");
  return [
    head!.trim(),
    `range(${start.toISOString()}, ${end.toISOString()})`,
    ...rest.map((s) => s.trim()),
  ].join(" | ");
}

export const getOuriosLogData: LogQueryPlugin<OuriosLogQuerySpec>["getLogData"] =
  async (spec, context) => {
    const { start, end } = context.timeRange;
    if (!spec.query) {
      return {
        logs: { entries: [], totalCount: 0 },
        timeRange: { start, end },
      };
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
      logs: toLogData(response.records ?? [], response.stats),
      timeRange: { start, end },
      metadata: { executedQueryString: dsl },
    };
  };
