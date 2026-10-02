import { fireEvent, render, screen } from "@testing-library/react";
import ConfigDiffPreview from "./ConfigDiffPreview";

describe("ConfigDiffPreview", () => {
  it("renders old and new values for each changed field", () => {
    render(
      <ConfigDiffPreview
        rows={[{ field: "min_score_bps", oldValue: 5, newValue: 9 }]}
        persist={true}
        fieldLabels={{ min_score_bps: "Min Score (bps)" }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        submitting={false}
      />
    );

    expect(screen.getByText("Min Score (bps)")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("9")).toBeTruthy();
  });

  it("formats boolean values as true/false text", () => {
    render(
      <ConfigDiffPreview
        rows={[{ field: "require_isolated_margin", oldValue: true, newValue: false }]}
        persist={true}
        fieldLabels={{ require_isolated_margin: "Require Isolated Margin" }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        submitting={false}
      />
    );

    expect(screen.getByText("true")).toBeTruthy();
    expect(screen.getByText("false")).toBeTruthy();
  });

  it("calls onConfirm and onCancel from their respective buttons", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfigDiffPreview
        rows={[]}
        persist={true}
        fieldLabels={{}}
        onConfirm={onConfirm}
        onCancel={onCancel}
        submitting={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /confirm & save/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables both buttons while submitting", () => {
    render(
      <ConfigDiffPreview
        rows={[]}
        persist={true}
        fieldLabels={{}}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        submitting={true}
      />
    );

    expect((screen.getByRole("button", { name: /cancel/i }) as HTMLButtonElement).disabled).toBe(
      true
    );
    expect((screen.getByRole("button", { name: /saving/i }) as HTMLButtonElement).disabled).toBe(
      true
    );
  });
});
