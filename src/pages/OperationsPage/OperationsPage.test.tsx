import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OperationsPage from "./OperationsPage";
import { OPERATIONS_TABS, isOperationsTab } from "../../lib/operations";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

vi.mock("./panels/ExecutionActionsPanel", () => ({ default: () => <div>Actions panel</div> }));
vi.mock("./panels/PositionsPanel", () => ({ default: () => <div>Positions panel</div> }));
vi.mock("./panels/GuardrailsPanel", () => ({ default: () => <div>Guardrails panel</div> }));
vi.mock("./panels/ContinuityPanel", () => ({ default: () => <div>Continuity panel</div> }));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <OperationsPage />
    </MemoryRouter>
  );
}

describe("OperationsPage", () => {
  it("renders the Actions tab by default with one heading and the tab list", () => {
    renderAt("/operations");

    expect(screen.getByRole("heading", { level: 1, name: "Operations" })).toBeTruthy();
    expect(screen.getByText("Actions panel")).toBeTruthy();
    expect(screen.getByRole("tablist", { name: "Operations sections" })).toBeTruthy();
    expect(screen.getAllByRole("tab")).toHaveLength(OPERATIONS_TABS.length);
    expect(document.title).toBe("Operations · Arbijuie");
  });

  it("opens the tab named in the URL and ignores unknown tabs", () => {
    renderAt("/operations?tab=guardrails");
    expect(screen.getByText("Guardrails panel")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Guardrails" }).getAttribute("aria-selected")).toBe(
      "true"
    );

    expect(isOperationsTab("nope")).toBe(false);
    expect(isOperationsTab(null)).toBe(false);
    expect(isOperationsTab("parity")).toBe(false);
  });

  it("switches panels when a tab is clicked", () => {
    renderAt("/operations");

    fireEvent.click(screen.getByRole("tab", { name: "Positions" }));
    expect(screen.getByText("Positions panel")).toBeTruthy();
    expect(screen.queryByText("Actions panel")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Continuity" }));
    expect(screen.getByText("Continuity panel")).toBeTruthy();
    expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toContain("continuity");
  });
});
