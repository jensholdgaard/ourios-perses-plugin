import { HTTPSettingsEditor } from "@perses-dev/plugin-system";
import React, { ReactElement } from "react";
import { OuriosDatasourceSpec } from "./ourios-datasource-types";

export interface OuriosDatasourceEditorProps {
  value: OuriosDatasourceSpec;
  onChange: (next: OuriosDatasourceSpec) => void;
  isReadonly?: boolean;
}

export function OuriosDatasourceEditor(
  props: OuriosDatasourceEditorProps,
): ReactElement {
  const { value, onChange, isReadonly } = props;

  const initialSpecDirect: OuriosDatasourceSpec = {
    directUrl: "",
  };

  const initialSpecProxy: OuriosDatasourceSpec = {
    proxy: {
      kind: "HTTPProxy",
      spec: {
        allowedEndpoints: [
          // Adjust based on your API
          {
            endpointPattern: "/api/search",
            method: "GET",
          },
        ],
        url: "",
      },
    },
  };

  return (
    <HTTPSettingsEditor
      value={value}
      onChange={onChange}
      isReadonly={isReadonly}
      initialSpecDirect={initialSpecDirect}
      initialSpecProxy={initialSpecProxy}
    />
  );
}
