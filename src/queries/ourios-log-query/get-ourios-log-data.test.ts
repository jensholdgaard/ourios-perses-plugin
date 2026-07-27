/**
 * RFC0041.2 (unit half) — the §3.2 response mapping and the range
 * injection rules. The container e2e drives the same mapping against a
 * real `ourios-server`.
 */
import { OuriosRecord } from "../../datasources/ourios-datasource/ourios-datasource-types";
import {
  withRange,
  severityBand,
  labelsOf,
  toLogData,
} from "./get-ourios-log-data";

const START = new Date("2026-07-27T08:00:00.000Z");
const END = new Date("2026-07-27T09:00:00.000Z");

describe("withRange", () => {
  it("injects the panel range as a stage after the predicate head", () => {
    expect(withRange("template_id == 1 | count", START, END)).toBe(
      "template_id == 1 | range(2026-07-27T08:00:00.000Z, 2026-07-27T09:00:00.000Z) | count",
    );
  });

  it("a hand-written range wins — the editor never lies about what ran", () => {
    const dsl =
      "template_id == 1 | range(2026-01-01T00:00:00Z, 2026-01-02T00:00:00Z) | count";
    expect(withRange(dsl, START, END)).toBe(dsl);
  });

  it("handles a bare predicate with no stages", () => {
    expect(withRange("severity >= error", START, END)).toBe(
      "severity >= error | range(2026-07-27T08:00:00.000Z, 2026-07-27T09:00:00.000Z)",
    );
  });
});

describe("severityBand (§3.2 fallback)", () => {
  it("maps the OTLP bands", () => {
    expect(severityBand(1)).toBe("trace");
    expect(severityBand(8)).toBe("debug");
    expect(severityBand(9)).toBe("info");
    expect(severityBand(16)).toBe("warn");
    expect(severityBand(17)).toBe("error");
    expect(severityBand(24)).toBe("fatal");
  });

  it("0 is unspecified, never guessed into a level (RFC0002.21)", () => {
    expect(severityBand(0)).toBe("unspecified");
  });
});

function rec(overrides: Partial<OuriosRecord>): OuriosRecord {
  return {
    time_unix_nano: 1_785_000_000_000_000_000,
    severity_number: 9,
    ...overrides,
  };
}

describe("labelsOf / toLogData (§3.2 mapping)", () => {
  it("prefers severity_text, falls back to the band", () => {
    expect(labelsOf(rec({ severity_text: "INFO" })).severity).toBe("INFO");
    expect(labelsOf(rec({ severity_number: 0 })).severity).toBe("unspecified");
  });

  it("flattens AnyValue attribute variants to strings", () => {
    const labels = labelsOf(
      rec({
        attributes: [
          { key: "model", value: { stringValue: "claude-fable-5" } },
          { key: "input_tokens", value: { intValue: "2" } },
          { key: "cost_usd", value: { doubleValue: 0.188796 } },
        ],
      }),
    );
    expect(labels.model).toBe("claude-fable-5");
    expect(labels.input_tokens).toBe("2");
    expect(labels.cost_usd).toBe("0.188796");
  });

  it("converts nanoseconds to the seconds Perses expects", () => {
    const data = toLogData([rec({ body: { line: "hello" } })]);
    expect(data.entries?.[0]?.timestamp).toBe(1_785_000_000);
    expect(data.entries?.[0]?.line).toBe("hello");
  });

  it("surfaces the pruning stats as bytesExamined", () => {
    const data = toLogData([rec({})], { bytes_read: 1087 });
    expect(data.metadata?.stats?.bytesExamined).toBe(1087);
  });
});
