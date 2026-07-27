import { render, screen, fireEvent } from "@testing-library/react";
import { SchemaSuggestions } from "./SchemaSuggestions";

describe("SchemaSuggestions", () => {
  it("renders one chip per schema-derived token and appends on click", () => {
    const picked: string[] = [];
    render(
      <SchemaSuggestions
        suggestions={["attr.model", "severity >= error"]}
        onPick={(token) => picked.push(token)}
      />,
    );
    fireEvent.click(screen.getByText("attr.model"));
    expect(picked).toEqual(["attr.model"]);
    expect(screen.getByText("severity >= error")).toBeInTheDocument();
  });

  it("renders nothing when the schema is unavailable", () => {
    const { container } = render(
      <SchemaSuggestions suggestions={[]} onPick={() => undefined} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
