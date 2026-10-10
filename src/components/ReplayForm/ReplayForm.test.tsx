import { render, screen, fireEvent } from "@testing-library/react";
import ReplayForm from "./ReplayForm";

describe("ReplayForm", () => {
  it("submits with default strategy id and parsed symbols", () => {
    const handleSubmit = vi.fn();
    render(<ReplayForm onSubmit={handleSubmit} submitting={false} />);

    fireEvent.change(screen.getByLabelText(/Symbols/i), {
      target: { value: "AERO, KAITO" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run replay/i }));

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ symbols: ["AERO", "KAITO"], strategy_id: "baseline-v1" })
    );
  });

  it("omits optional numeric fields when left blank", () => {
    const handleSubmit = vi.fn();
    render(<ReplayForm onSubmit={handleSubmit} submitting={false} />);

    fireEvent.click(screen.getByRole("button", { name: /run replay/i }));

    const request = handleSubmit.mock.calls[0][0];
    expect(request).not.toHaveProperty("entry_score_bps");
    expect(request).not.toHaveProperty("cycle_hours");
  });

  it("disables the submit button while submitting", () => {
    render(<ReplayForm onSubmit={vi.fn()} submitting />);
    const button = screen.getByRole("button", { name: /running/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("shows field-level validation errors", () => {
    render(
      <ReplayForm
        onSubmit={vi.fn()}
        submitting={false}
        fieldErrors={{ end: "end must be after start" }}
      />
    );
    expect(screen.getByText("end must be after start")).not.toBeNull();
  });

  it("links field errors to their inputs for assistive tech", () => {
    render(
      <ReplayForm
        onSubmit={vi.fn()}
        submitting={false}
        fieldErrors={{ entry_score_bps: "Must be greater than exit score." }}
      />
    );

    const input = screen.getByLabelText("Entry Score (bps)");
    expect(input.getAttribute("aria-invalid")).toBe("true");

    const error = screen.getByRole("alert");
    expect(error.textContent).toBe("Must be greater than exit score.");
    expect(input.getAttribute("aria-describedby")).toBe(error.id);

    expect(screen.getByLabelText("Exit Score (bps)").getAttribute("aria-invalid")).toBeNull();
  });
});
