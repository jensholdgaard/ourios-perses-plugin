import { ReactElement } from "react";
import { Box, Chip } from "@mui/material";

/**
 * The RFC0041.4 suggestion row: one chip per schema-derived token;
 * clicking appends the token to the query. Renders nothing when the
 * schema is unavailable.
 */
export function SchemaSuggestions({
  suggestions,
  onPick,
}: {
  suggestions: string[];
  onPick: (token: string) => void;
}): ReactElement | null {
  if (suggestions.length === 0) return null;
  return (
    <Box
      sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}
      data-testid="schema-suggestions"
    >
      {suggestions.map((token) => (
        <Chip
          key={token}
          label={token}
          size="small"
          variant="outlined"
          onClick={() => onPick(token)}
        />
      ))}
    </Box>
  );
}
