/**
 * RFC0041.4 (wire half) — the query-schema document read off the
 * released server's MCP surface, and the suggestions derived from it.
 */
import {
  fetchQuerySchema,
  suggestionsFromSchema,
} from "../src/datasources/ourios-datasource/query-schema";

const OPEN_URL = process.env.OPEN_QUERY_URL!;

it("derives editor suggestions from the deployment's schema document", async () => {
  const schema = await fetchQuerySchema(OPEN_URL);
  const suggestions = suggestionsFromSchema(schema);
  // The §7 fields and severity bands come from the server, and the
  // promoted set reflects THIS deployment's config (model, bare class).
  expect(suggestions).toContain("template_id");
  expect(suggestions).toContain("severity >= error");
  expect(suggestions).toContain("attr.model");
  expect(suggestions).toContain("resource.service.name");
});
