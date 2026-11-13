import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as session from "../../api/telegram-session";
import OperatorSessionGate from "./OperatorSessionGate";

vi.mock("../../api/telegram-session", () => {
  class TelegramSessionBootstrapError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
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

  it("bootstraps Telegram session in Mini App context", async () => {
    vi.mocked(session.hasTelegramWebAppContext).mockReturnValue(true);
    vi.mocked(session.bootstrapTelegramSession).mockResolvedValue(undefined as never);

    render(
      <OperatorSessionGate>
        <p>operator content</p>
      </OperatorSessionGate>
    );

    expect(screen.getByRole("status").textContent).toContain("Authorizing Telegram session");
    expect(await screen.findByText("operator content")).toBeTruthy();
    expect(session.bootstrapTelegramSession).toHaveBeenCalledTimes(1);
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

    expect(await screen.findByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("operator content")).toBeTruthy();
    expect(session.bootstrapTelegramSession).toHaveBeenCalledTimes(2);
  });

  it("keeps the gate closed with a clear error when the session route answers 404", async () => {
    vi.mocked(session.hasTelegramWebAppContext).mockReturnValue(true);
    vi.mocked(session.bootstrapTelegramSession).mockRejectedValue(
      new session.TelegramSessionBootstrapError(404, "session route not found")
    );

    render(
      <OperatorSessionGate>
        <p>operator content</p>
      </OperatorSessionGate>
    );

    expect((await screen.findByRole("alert")).textContent).toContain("session route not found");
    expect(screen.queryByText("operator content")).toBeNull();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });

  it.each([401, 403, 429, 503])(
    "keeps the gate closed when the session route answers HTTP %i",
    async (status) => {
      vi.mocked(session.hasTelegramWebAppContext).mockReturnValue(true);
      vi.mocked(session.bootstrapTelegramSession).mockRejectedValue(
        new session.TelegramSessionBootstrapError(status, `HTTP ${status}`)
      );

      render(
        <OperatorSessionGate>
          <p>operator content</p>
        </OperatorSessionGate>
      );

      expect((await screen.findByRole("alert")).textContent).toContain(`HTTP ${status}`);
      expect(screen.queryByText("operator content")).toBeNull();
    }
  );
});
