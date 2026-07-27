import { ReactElement } from "react";
import { TextField } from "@mui/material";
import { OptionsEditorProps } from "@perses-dev/plugin-system";
import { OuriosTimeSeriesQuerySpec } from "./ourios-time-series-query-types";

export function OuriosTimeSeriesQueryEditor({
  value,
  onChange,
}: OptionsEditorProps<OuriosTimeSeriesQuerySpec>): ReactElement {
  return (
    <TextField
      fullWidth
      multiline
      minRows={2}
      label="Logs DSL (aggregation with bucket)"
      placeholder="template_id == 9 | sum(attr.cost_usd) by attr.model, bucket(1h)"
      value={value.query ?? ""}
      onChange={(e) => onChange({ ...value, query: e.target.value })}
    />
  );
}
