import { LogQueryPlugin } from "../log-query-plugin-interface";
import { OuriosLogQuerySpec } from "./ourios-log-query-types";
import { getOuriosLogData } from "./get-ourios-log-data";
import { OuriosLogQueryEditor } from "./OuriosLogQueryEditor";

export const OuriosLogQuery: LogQueryPlugin<OuriosLogQuerySpec> = {
  getLogData: getOuriosLogData,
  OptionsEditorComponent: OuriosLogQueryEditor,
  createInitialOptions: () => ({ query: "" }),
};
