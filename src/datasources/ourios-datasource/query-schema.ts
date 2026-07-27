/**
 * RFC0041.4 — the RFC 0032 `ourios://query-schema` resource, read over
 * the MCP surface (`POST /mcp`, streamable HTTP) so the query editors
 * can derive their suggestions from the deployment instead of
 * hardcoding names. Wire shape verified against a live server: an
 * `initialize` (capturing the `mcp-session-id` response header), the
 * `notifications/initialized` note, then `resources/read` — responses
 * arriving SSE-framed (`data: {...}` lines) or as plain JSON.
 */

export interface OuriosQuerySchema {
  fields?: Array<{ name: string; type: string }>;
  severity?: { names?: Array<{ name: string; floor: number; ceil: number }> };
  promoted_attributes?: { resource?: string[]; log?: string[] };
}

/** The first JSON payload of an SSE body, or the body as plain JSON. */
export function parseMcpBody(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  for (const line of trimmed.split("\n")) {
    // SSE allows any amount of whitespace (or none) after `data:`.
    const match = /^data:\s*(\{.*)$/.exec(line);
    if (match) return JSON.parse(match[1]!);
  }
  throw new Error(
    `MCP response carried no JSON payload: ${trimmed.slice(0, 120)}`,
  );
}

interface JsonRpcResponse {
  result?: unknown;
  error?: { message?: string };
}

async function rpc(
  mcpUrl: string,
  sessionId: string | undefined,
  body: Record<string, unknown>,
): Promise<{ payload: JsonRpcResponse | undefined; sessionId?: string }> {
  const response = await globalThis.fetch(mcpUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...(sessionId ? { "mcp-session-id": sessionId } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", ...body }),
  });
  if (!response.ok) {
    throw new Error(`MCP endpoint returned ${response.status}`);
  }
  const newSession = response.headers.get("mcp-session-id") ?? undefined;
  const text = await response.text();
  const payload =
    text.trim().length > 0
      ? (parseMcpBody(text) as JsonRpcResponse)
      : undefined;
  return { payload, sessionId: newSession };
}

/**
 * Fetch and parse the deployment's query-schema document from the MCP
 * surface at `<datasourceUrl>/mcp`.
 */
export async function fetchQuerySchema(
  datasourceUrl: string,
): Promise<OuriosQuerySchema> {
  const mcpUrl = `${datasourceUrl}/mcp`;
  const init = await rpc(mcpUrl, undefined, {
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "ourios-perses-plugin", version: "0.1.0" },
    },
  });
  const session = init.sessionId;
  await rpc(mcpUrl, session, { method: "notifications/initialized" });
  const read = await rpc(mcpUrl, session, {
    id: 2,
    method: "resources/read",
    params: { uri: "ourios://query-schema" },
  });
  if (read.payload?.error) {
    throw new Error(
      `query-schema read failed: ${read.payload.error.message ?? "unknown"}`,
    );
  }
  const contents = (
    read.payload?.result as { contents?: Array<{ text?: string }> } | undefined
  )?.contents;
  const text = contents?.[0]?.text;
  if (!text) {
    throw new Error("query-schema resource carried no content");
  }
  return JSON.parse(text) as OuriosQuerySchema;
}

/**
 * The editor suggestion set, derived purely from the schema document
 * (RFC0041.4: never hardcoded names): the §7 fields, the severity band
 * names, and the deployment's promoted attribute paths.
 */
export function suggestionsFromSchema(schema: OuriosQuerySchema): string[] {
  const fields = (schema.fields ?? []).map((field) => field.name);
  const severities = (schema.severity?.names ?? []).map(
    (band) => `severity >= ${band.name}`,
  );
  const resource = (schema.promoted_attributes?.resource ?? []).map(
    (key) => `resource.${key}`,
  );
  const attrs = (schema.promoted_attributes?.log ?? []).map(
    (key) => `attr.${key}`,
  );
  return [...fields, ...severities, ...resource, ...attrs];
}
