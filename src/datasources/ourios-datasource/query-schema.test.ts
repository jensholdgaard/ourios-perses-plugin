/**
 * RFC0041.4 (unit half) — SSE/JSON body parsing and the pure
 * schema→suggestions derivation. The container e2e reads the real
 * resource off the released server's MCP surface.
 */
import {
  parseMcpBody,
  suggestionsFromSchema,
  OuriosQuerySchema,
} from "./query-schema";

describe("parseMcpBody", () => {
  it("parses an SSE-framed payload", () => {
    expect(
      parseMcpBody(
        'data: \nid: 0\nretry: 3000\n\ndata: {"jsonrpc":"2.0","id":1,"result":{"ok":true}}\n',
      ),
    ).toEqual({ jsonrpc: "2.0", id: 1, result: { ok: true } });
  });

  it("parses SSE data lines with no or extra whitespace after the colon", () => {
    expect(parseMcpBody('data:{"id":1}\n')).toEqual({ id: 1 });
    expect(parseMcpBody('data:   {"id":2}\n')).toEqual({ id: 2 });
  });

  it("parses a plain JSON payload", () => {
    expect(parseMcpBody('{"jsonrpc":"2.0","id":2,"result":{}}')).toEqual({
      jsonrpc: "2.0",
      id: 2,
      result: {},
    });
  });

  it("throws on a payload with no JSON", () => {
    expect(() => parseMcpBody("retry: 3000\n")).toThrow(/no JSON payload/);
  });
});

describe("suggestionsFromSchema (RFC0041.4 derivation)", () => {
  it("derives fields, severity bands, and promoted paths — nothing hardcoded", () => {
    const schema: OuriosQuerySchema = {
      fields: [
        { name: "template_id", type: "integer" },
        { name: "body", type: "string" },
      ],
      severity: {
        names: [
          { name: "info", floor: 9, ceil: 12 },
          { name: "error", floor: 17, ceil: 20 },
        ],
      },
      promoted_attributes: {
        resource: ["service.name"],
        log: ["model", "cost_usd"],
      },
    };
    expect(suggestionsFromSchema(schema)).toEqual([
      "template_id",
      "body",
      "severity >= info",
      "severity >= error",
      "resource.service.name",
      "attr.model",
      "attr.cost_usd",
    ]);
  });

  it("degrades to empty on an empty document", () => {
    expect(suggestionsFromSchema({})).toEqual([]);
  });
});
