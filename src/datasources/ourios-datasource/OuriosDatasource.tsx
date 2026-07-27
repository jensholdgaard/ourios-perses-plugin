import { fetch } from "@perses-dev/core";
import { DatasourcePlugin } from "@perses-dev/plugin-system";
import {
  OuriosDatasourceSpec,
  OuriosDatasourceClient,
  OuriosQueryRequest,
  OuriosQueryResponse,
} from "./ourios-datasource-types";
import { OuriosDatasourceEditor } from "./OuriosDatasourceEditor";

const createClient: DatasourcePlugin<
  OuriosDatasourceSpec,
  OuriosDatasourceClient
>["createClient"] = (spec, options) => {
  const { directUrl, proxy, tenant } = spec;
  const { proxyUrl } = options;

  const datasourceUrl = directUrl ?? proxyUrl;
  if (datasourceUrl === undefined) {
    throw new Error(
      "No URL specified for OuriosDatasource client. Set directUrl in the spec to configure it.",
    );
  }

  const specHeaders = proxy?.spec.headers;

  return {
    options: { datasourceUrl, tenant },
    query: async (
      request: OuriosQueryRequest,
      headers,
    ): Promise<OuriosQueryResponse> => {
      // RFC 0016: a POST with the DSL statement as JSON. Every read path is
      // tenant-scoped (RFC 0026), so the tenant header is not optional.
      const response = await fetch(`${datasourceUrl}/v1/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(tenant ? { "x-ourios-tenant": tenant } : {}),
          ...(headers ?? specHeaders),
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(
          `Ourios returned ${response.status}: ${await response.text()}`,
        );
      }
      return (await response.json()) as OuriosQueryResponse;
    },
  };
};

export const OuriosDatasource: DatasourcePlugin<
  OuriosDatasourceSpec,
  OuriosDatasourceClient
> = {
  createClient,
  OptionsEditorComponent: OuriosDatasourceEditor,
  createInitialOptions: () => ({ directUrl: "", tenant: "" }),
};
