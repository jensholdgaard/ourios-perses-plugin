import { useEffect, useState } from "react";
import { DatasourceSelector } from "@perses-dev/core";
import { useDatasourceClient } from "@perses-dev/plugin-system";
import {
  fetchQuerySchema,
  suggestionsFromSchema,
} from "../datasources/ourios-datasource/query-schema";
import { OuriosDatasourceClient } from "../datasources/ourios-datasource/ourios-datasource-types";

const DEFAULT_DATASOURCE = { kind: "OuriosDatasource" };

/**
 * RFC0041.4 — suggestion tokens for the query editors, derived at
 * runtime from the datasource's RFC 0032 `ourios://query-schema`
 * document. Empty while loading or when the deployment's MCP surface
 * is disabled — the editors degrade to a plain text field, never to
 * hardcoded names.
 */
export function useQuerySchemaSuggestions(
  datasource?: DatasourceSelector,
): string[] {
  const { data: client } = useDatasourceClient<OuriosDatasourceClient>(
    datasource ?? DEFAULT_DATASOURCE,
  );
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const datasourceUrl = client?.options.datasourceUrl;
  useEffect(() => {
    if (!datasourceUrl) return;
    let cancelled = false;
    fetchQuerySchema(datasourceUrl)
      .then((schema) => {
        if (!cancelled) setSuggestions(suggestionsFromSchema(schema));
      })
      .catch(() => {
        // MCP disabled or unreachable: suggestions stay empty; the
        // editor remains fully usable as a plain field.
        if (!cancelled) setSuggestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [datasourceUrl]);
  return suggestions;
}
