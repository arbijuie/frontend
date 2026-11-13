import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { setTelegramSessionToken } from "../../api/config";
import { useMePreferences } from "../../hooks/useMePreferences";
import { useUpdateMePreferences } from "../../hooks/useUpdateMePreferences";
import WelcomeHint, { WELCOME_HINT_KEY } from "./WelcomeHint";

vi.mock("../../hooks/useMePreferences", () => ({
  useMePreferences: vi.fn(),
}));

vi.mock("../../hooks/useUpdateMePreferences", () => ({
  useUpdateMePreferences: vi.fn(),
}));

const mockedUseMePreferences = vi.mocked(useMePreferences);
const mockedUseUpdateMePreferences = vi.mocked(useUpdateMePreferences);

const renderHint = () =>
  render(
    <MemoryRouter>
      <WelcomeHint />
    </MemoryRouter>
  );

describe("WelcomeHint", () => {
  const mutate = vi.fn();

  beforeEach(() => {
    window.localStorage.clear();
    setTelegramSessionToken("test-session-token");
    mutate.mockReset();
    mockedUseMePreferences.mockReturnValue({
      data: {
        selected_preset: null,
        runbook_overrides: {},
        effective_runbook_values: {},
        runbook_config_fields: [],
        runbook_presets: {},
        tutorial: {
          welcome_hint_dismissed: false,
          welcome_completed: false,
          onboarding_completed: false,
        },
        updated_at: null,
      },
      error: null,
      loading: false,
      fetching: false,
      refetch: vi.fn(),
    });
    mockedUseUpdateMePreferences.mockReturnValue({
      mutate,
      isPending: false,
    } as never);
  });

  it("points new users to Getting started", () => {
    renderHint();
    expect(screen.getByRole("link", { name: "Getting started" }).getAttribute("href")).toBe(
      "/welcome"
    );
  });

  it("stays hidden after Got it", () => {
    const { unmount } = renderHint();
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(window.localStorage.getItem(WELCOME_HINT_KEY)).toBe("1");
    expect(mutate).toHaveBeenCalledWith(
      { tutorial: { welcome_hint_dismissed: true } },
      expect.any(Object)
    );
    unmount();
    renderHint();
    expect(screen.queryByRole("region", { name: "Welcome" })).toBeNull();
  });
});
