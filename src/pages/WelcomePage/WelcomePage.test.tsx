import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import WelcomePage from "./WelcomePage";
import { useUpdateMePreferences } from "../../hooks/useUpdateMePreferences";
import { setTelegramSessionToken } from "../../api/config";
import { WELCOME_HINT_KEY } from "../../components/WelcomeHint/WelcomeHint";

vi.mock("../../hooks/useUpdateMePreferences", () => ({
  useUpdateMePreferences: vi.fn(),
}));

const mockedUseUpdateMePreferences = vi.mocked(useUpdateMePreferences);

function renderGuide() {
  return render(
    <MemoryRouter initialEntries={["/welcome"]}>
      <Routes>
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/" element={<div>Deals screen</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("WelcomePage", () => {
  const mutate = vi.fn();

  beforeEach(() => {
    window.localStorage.clear();
    setTelegramSessionToken("test-session-token");
    mutate.mockReset();
    mockedUseUpdateMePreferences.mockReturnValue({
      mutate,
      isPending: false,
    } as never);
  });

  it("walks through four steps and ends on the deals screen", () => {
    renderGuide();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Earn from the difference between exchanges"
    );
    for (let i = 0; i < 3; i += 1) fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Start in practice mode");
    expect(screen.getByText("You can lose money")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Show me the deals" }));
    expect(screen.getByText("Deals screen")).toBeTruthy();
    expect(window.localStorage.getItem(WELCOME_HINT_KEY)).toBe("1");
    expect(mutate).toHaveBeenCalledWith({
      tutorial: {
        welcome_hint_dismissed: true,
        welcome_completed: true,
      },
    });
  });

  it("explains the 20% wrong-coin rule", () => {
    renderGuide();
    fireEvent.click(screen.getByRole("button", { name: "Step 3: Deal status" }));
    expect(screen.getByText(/differ by more than 20%/)).toBeTruthy();
  });

  it("goes back and lets the trader skip", () => {
    renderGuide();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Earn from");
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(screen.getByText("Deals screen")).toBeTruthy();
  });
});
