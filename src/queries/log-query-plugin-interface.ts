// LogQueryPlugin lives in @perses-dev/plugin-system's dist/model/log-queries
// but is NOT re-exported from the package index, and the package declares no
// "exports" map allowing a deep import. So the interface has to be restated
// here — which is exactly what the bundled Loki plugin does. Remove this file
// once upstream re-exports it.
import { LogData, AbsoluteTimeRange, UnknownSpec } from "@perses-dev/core";
import {
  DatasourceStore,
  Plugin,
  VariableStateMap,
} from "@perses-dev/plugin-system";

export interface LogQueryResult {
  logs: LogData;
  timeRange: AbsoluteTimeRange;
  metadata?: { executedQueryString: string };
}

export interface LogQueryContext {
  timeRange: AbsoluteTimeRange;
  variableState: VariableStateMap;
  datasourceStore: DatasourceStore;
  refreshKey: string;
}

export interface LogQueryPlugin<Spec = UnknownSpec> extends Plugin<Spec> {
  getLogData: (
    spec: Spec,
    ctx: LogQueryContext,
    abortSignal?: AbortSignal,
  ) => Promise<LogQueryResult>;
  dependsOn?: (spec: Spec, ctx: LogQueryContext) => { variables?: string[] };
}
