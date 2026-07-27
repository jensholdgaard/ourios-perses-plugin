/**
 * RFC0041.3 (unit half) — the aggregate→series mapping: bucket keys as
 * timestamps, group keys as series identity, and NULL aggregates as
 * gaps, never zeros (RFC 0042 §3.5 shown, not re-derived). The
 * container e2e drives `count by bucket(w)` over the wire; scalar sums
 * ride the RFC0041.5 matrix once a typed-promotion server release
 * exists to pin.
 */
import { OuriosAggregateRow } from "../../datasources/ourios-datasource/ourios-datasource-types";
import { bucketIndex, toTimeSeriesData } from "./get-ourios-time-series-data";

const B1 = "2026-07-27T10:00:00Z"; // bucket starts (RFC 3339, window start)
const B2 = "2026-07-27T11:00:00Z";
const B1_MS = Date.parse(B1);
const B2_MS = Date.parse(B2);

describe("bucketIndex", () => {
  it("finds the RFC 3339 position regardless of key order", () => {
    expect(bucketIndex([{ key: [B1, "opus"], count: 1 }])).toBe(0);
    expect(bucketIndex([{ key: ["opus", B1], count: 1 }])).toBe(1);
  });

  it("is undefined when no position is a timestamp on every row", () => {
    expect(bucketIndex([{ key: ["opus"], count: 1 }])).toBeUndefined();
    expect(
      bucketIndex([
        { key: [B1], count: 1 },
        { key: ["not-a-time"], count: 1 },
      ]),
    ).toBeUndefined();
  });
});

describe("toTimeSeriesData (RFC0041.3)", () => {
  it("maps buckets to ms timestamps and groups to series", () => {
    const rows: OuriosAggregateRow[] = [
      { key: ["opus", B1], count: 2, value: 1.5 },
      { key: ["opus", B2], count: 3, value: 2.5 },
      { key: ["haiku", B1], count: 1, value: 0.25 },
    ];
    const data = toTimeSeriesData(rows);
    expect(data.series).toHaveLength(2);
    const opus = data.series.find((s) => s.name === "opus")!;
    expect(opus.values).toEqual([
      [B1_MS, 1.5],
      [B2_MS, 2.5],
    ]);
    expect(opus.labels).toEqual({ group_0: "opus" });
    expect(data.stepMs).toBe(B2_MS - B1_MS);
  });

  it("a NULL aggregate is a gap — null, never zero", () => {
    const rows: OuriosAggregateRow[] = [
      { key: [B1], count: 4, value: 1.0 },
      // The all-NULL group (RFC0002.18 / RFC 0042 §3.5): rows counted,
      // no numeric contribution.
      { key: [B2], count: 4, value: null },
    ];
    const data = toTimeSeriesData(rows);
    expect(data.series[0]!.values).toEqual([
      [B1_MS, 1.0],
      [B2_MS, null],
    ]);
  });

  it("the bare count family charts counts", () => {
    const rows: OuriosAggregateRow[] = [
      { key: [B1], count: 7 },
      { key: [B2], count: 9 },
    ];
    const data = toTimeSeriesData(rows);
    expect(data.series[0]!.name).toBe("value");
    expect(data.series[0]!.values).toEqual([
      [B1_MS, 7],
      [B2_MS, 9],
    ]);
  });

  it("group values containing the display delimiter stay distinct series", () => {
    const rows: OuriosAggregateRow[] = [
      { key: ["a, b", B1], count: 1 },
      { key: ["a", B1], count: 2 },
      { key: ["b", B1], count: 3 },
    ];
    // ["a, b"] renders the same NAME as ["a","b"] would, but identity
    // is collision-free, so three one-part groups stay three series.
    expect(toTimeSeriesData(rows).series).toHaveLength(3);
  });

  it("sorts points by time within a series", () => {
    const rows: OuriosAggregateRow[] = [
      { key: [B2], count: 2 },
      { key: [B1], count: 1 },
    ];
    expect(toTimeSeriesData(rows).series[0]!.values).toEqual([
      [B1_MS, 1],
      [B2_MS, 2],
    ]);
  });

  it("no bucket dimension -> no series (a table, not a time series)", () => {
    expect(
      toTimeSeriesData([{ key: ["opus"], count: 1, value: 3 }]).series,
    ).toHaveLength(0);
  });
});
