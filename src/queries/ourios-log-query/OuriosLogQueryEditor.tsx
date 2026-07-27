import { ReactElement } from "react";
import { TextField } from "@mui/material";
import { OptionsEditorProps } from "@perses-dev/plugin-system";
import { OuriosLogQuerySpec } from "./ourios-log-query-types";

export function OuriosLogQueryEditor({
  value,
  onChange,
}: OptionsEditorProps<OuriosLogQuerySpec>): ReactElement {
  return (
    <TextField
      fullWidth
      multiline
      minRows={2}
      label="Logs DSL"
      placeholder="template_id == 14 | limit 100"
      value={value.query ?? ""}
      onChange={(e) => onChange({ ...value, query: e.target.value })}
    />
  );
}
