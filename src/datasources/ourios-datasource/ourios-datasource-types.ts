import { HTTPProxy, RequestHeaders } from "@perses-dev/core";
import { DatasourceClient } from "@perses-dev/plugin-system";

export interface OuriosDatasourceSpec {
  directUrl?: string;
  proxy?: HTTPProxy;
  /** RFC 0026 tenant, sent as x-ourios-tenant on every query. */
  tenant?: string;
}

/** The body `POST /v1/query` accepts (RFC 0016): a DSL statement. */
export interface OuriosQueryRequest {
  query: string;
}

export interface OuriosRecord {
  time_unix_nano: number;
  severity_number: number;
  severity_text?: string;
  scope_name?: string;
  trace_id?: string;
  span_id?: string;
  template_id?: number;
  attributes?: Array<{ key: string; value?: Record<string, unknown> }>;
  resource_attributes?: Array<{ key: string; value?: Record<string, unknown> }>;
  body?: { kind?: string; line?: string; reconstruction?: string };
}

export interface OuriosAggregateRow {
  key: string[];
  count: number;
}

/** The shape `POST /v1/query` answers with. */
export interface OuriosQueryResponse {
  rows: number;
  stats?: Record<string, number>;
  records?: OuriosRecord[];
  aggregate?: OuriosAggregateRow[];
}

interface OuriosDatasourceClientOptions {
  datasourceUrl: string;
  tenant?: string;
  headers?: RequestHeaders;
}

export interface OuriosDatasourceClient extends DatasourceClient {
  options: OuriosDatasourceClientOptions;
  query(
    request: OuriosQueryRequest,
    headers?: RequestHeaders,
  ): Promise<OuriosQueryResponse>;
}
