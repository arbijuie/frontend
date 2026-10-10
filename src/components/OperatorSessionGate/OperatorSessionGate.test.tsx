import { fireEvent, render, screen } from "@testing-library/react";
import * as session from "../../api/telegram-session";
import OperatorSessionGate from "./OperatorSessionGate";

vi.mock("../../api/config", () => ({ API_TOKEN: "" }));
vi.mock("../../api/telegram-session", () => {
  class TelegramSessionBootstrapError extends Error {
    status = 0;
  }
  return {
    hasTelegramWebAppContext: vi.fn(),
    bootstrapTelegramSession: vi.fn(),
    formatTelegramBootstrapErrorForDisplay: (error: Error) => error.message,
    TelegramSessionBootstrapError,
  };
});

describe("OperatorSessionGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children right away when there is no Telegram context", () => {
    vi.mocked(session.hasTelegramWebAppContext).mockReturnValue(false);

    render(
      <OperatorSessionGate>
        <p>operator content</p>
      </OperatorSessionGate>
    );

    expect(screen.getByText("operator content")).toBeTruthy();
    expect(session.bootstrapTelegramSession).not.toHaveBeenCalled();
  });

  it("shows a status message while authorizing, then renders children", async () => {
    vi.mocked(session.hasTelegramWebAppContext).mockReturnValue(true);
    vi.mocked(session.bootstrapTelegramSession).mockResolvedValue(undefined as never);

    render(
      <OperatorSessionGate>
        <p>operator content</p>
      </OperatorSessionGate>
    );

    expect(screen.getByRole("status").textContent).toContain("Authorizing Telegram session");
    expect(await screen.findByText("operator content")).toBeTruthy();
  });

  it("shows an alert when bootstrap fails and recovers after Retry", async () => {
    vi.mocked(session.hasTelegramWebAppContext).mockReturnValue(true);
    vi.mocked(session.bootstrapTelegramSession)
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined as never);

    render(
      <OperatorSessionGate>
        <p>operator content</p>
      </OperatorSessionGate>
    );

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Unable to bootstrap Telegram session.");
    expect(screen.queryByText("operator content")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("operator content")).toBeTruthy();
    expect(session.bootstrapTelegramSession).toHaveBeenCalledTimes(2);
  });
});
