import { ReactElement } from "react";
import { TextField } from "@mui/material";
import { OptionsEditorProps } from "@perses-dev/plugin-system";
import { useQuerySchemaSuggestions } from "../use-query-schema-suggestions";
import { SchemaSuggestions } from "../SchemaSuggestions";
import { OuriosLogQuerySpec } from "./ourios-log-query-types";

export function OuriosLogQueryEditor({
  value,
  onChange,
}: OptionsEditorProps<OuriosLogQuerySpec>): ReactElement {
  const suggestions = useQuerySchemaSuggestions(value.datasource);
  return (
    <>
      <TextField
        fullWidth
        multiline
        minRows={2}
        label="Logs DSL"
        placeholder="template_id == 14 | limit 100"
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
