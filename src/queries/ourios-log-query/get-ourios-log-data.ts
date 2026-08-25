import { replaceVariables } from "@perses-dev/plugin-system";
import { LogEntry, LogData } from "@perses-dev/core";
import { ATTR_OTEL_SCOPE_NAME } from "@opentelemetry/semantic-conventions";
import { OURIOS_TEMPLATE_ID } from "../../generated/semconv";
import {
  OuriosDatasourceClient,
  OuriosRecord,
} from "../../datasources/ourios-datasource/ourios-datasource-types";
import { LogQueryPlugin } from "../log-query-plugin-interface";
import { withRange } from "../dsl-range";
import { OuriosLogQuerySpec } from "./ourios-log-query-types";

const DEFAULT_DATASOURCE = { kind: "OuriosDatasource" };

/**
 * The OTLP SeverityNumber bands (§3.2: `severity_text`, else the band).
 * 0 is "unspecified" per the OTel logs data model — a value real sources
 * emit (RFC0002.21), never to be guessed into a level.
 */
export function severityBand(n: number): string {
  if (n >= 1 && n <= 4) return "trace";
  if (n >= 5 && n <= 8) return "debug";
  if (n >= 9 && n <= 12) return "info";
  if (n >= 13 && n <= 16) return "warn";
  if (n >= 17 && n <= 20) return "error";
  if (n >= 21 && n <= 24) return "fatal";
  return "unspecified";
}

/** Flatten an OTLP AnyValue to the string labels Perses expects. */
function anyValue(v?: Record<string, unknown>): string {
  if (!v) return "";
  const k = Object.keys(v)[0];
  return k === undefined ? "" : String(v[k]);
}

export function labelsOf(rec: OuriosRecord): Record<string, string> {
  const out: Record<string, string> = {};
  for (const kv of rec.resource_attributes ?? [])
    out[kv.key] = anyValue(kv.value);
  for (const kv of rec.attributes ?? []) out[kv.key] = anyValue(kv.value);
  // A labels map is an attribute-keyed namespace, so record fields we
  // derive into it carry their attribute-context names: the scope name
  // under the spec's non-OTLP mapping key, the template id under the
  // Ourios registry key. Injected after the attribute loops: these are
  // the record's own identity, so they win over a producer attribute
  // squatting on a reserved (otel.* / ourios.*) key. severity and
  // trace_id stay bare — the label spellings log UIs expect and link
  // on. §3.2: severity_text when the source set one, else the OTLP
  // band.
  out["severity"] = rec.severity_text ?? severityBand(rec.severity_number);
  if (rec.scope_name) out[ATTR_OTEL_SCOPE_NAME] = rec.scope_name;
  if (rec.template_id !== undefined)
    out[OURIOS_TEMPLATE_ID] = String(rec.template_id);
  if (rec.trace_id) out["trace_id"] = rec.trace_id;
  return out;
}

export function toLogData(
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

export { withRange } from "../dsl-range";

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
