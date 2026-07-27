import { DatasourceSelector } from "@perses-dev/core";

export interface OuriosTimeSeriesQuerySpec {
  datasource?: DatasourceSelector;
  /**
   * An RFC 0002 logs-DSL statement whose terminal stage is an
   * aggregation with a `bucket(w)` term, e.g.
   * `template_id == 9 | sum(attr.cost_usd) by attr.model, bucket(1h)`.
   */
  query: string;
}
