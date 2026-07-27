import { ReactElement } from "react";
import { TextField } from "@mui/material";
import { OptionsEditorProps } from "@perses-dev/plugin-system";
import { useQuerySchemaSuggestions } from "../use-query-schema-suggestions";
import { SchemaSuggestions } from "../SchemaSuggestions";
import { OuriosTimeSeriesQuerySpec } from "./ourios-time-series-query-types";

export function OuriosTimeSeriesQueryEditor({
  value,
  onChange,
}: OptionsEditorProps<OuriosTimeSeriesQuerySpec>): ReactElement {
  const suggestions = useQuerySchemaSuggestions(value.datasource);
  return (
    <>
      <TextField
        fullWidth
        multiline
        minRows={2}
        label="Logs DSL (aggregation with bucket)"
        placeholder="template_id == 9 | sum(attr.cost_usd) by attr.model, bucket(1h)"
        value={value.query ?? ""}
        onChange={(e) => onChange({ ...value, query: e.target.value })}
      />
      <SchemaSuggestions
        suggestions={suggestions}
        onPick={(token) =>
          onChange({
            ...value,
            query: value.query ? `${value.query} ${token}` : token,
          })
        }
      />
    </>
  );
}
