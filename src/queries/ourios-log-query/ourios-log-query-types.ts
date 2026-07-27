import { DatasourceSelector } from "@perses-dev/core";

export interface OuriosLogQuerySpec {
  datasource?: DatasourceSelector;
  /** An RFC 0002 logs-DSL statement. */
  query: string;
}
