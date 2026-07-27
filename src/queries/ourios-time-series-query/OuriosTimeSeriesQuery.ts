import { TimeSeriesQueryPlugin } from "@perses-dev/plugin-system";
import { OuriosTimeSeriesQuerySpec } from "./ourios-time-series-query-types";
import { getOuriosTimeSeriesData } from "./get-ourios-time-series-data";
import { OuriosTimeSeriesQueryEditor } from "./OuriosTimeSeriesQueryEditor";

export const OuriosTimeSeriesQuery: TimeSeriesQueryPlugin<OuriosTimeSeriesQuerySpec> =
  {
    getTimeSeriesData: getOuriosTimeSeriesData,
    OptionsEditorComponent: OuriosTimeSeriesQueryEditor,
    createInitialOptions: () => ({ query: "" }),
  };
