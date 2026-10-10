import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";
import * as session from "./api/telegram-session";

const providerMounted = vi.hoisted(() => vi.fn());

vi.mock("./api/config", () => ({ API_TOKEN: "" }));
vi.mock("./api/telegram-session", () => {
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
vi.mock("./components/OpportunitiesSocketProvider/OpportunitiesSocketProvider", () => ({
  default: ({ children }: { children: ReactNode }) => {
    providerMounted();
    return <>{children}</>;
  },
}));
vi.mock("./pages/StatusPage/StatusPage", () => ({
  default: () => <h1>Status page mock</h1>,
}));

function renderAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

describe("App operator bootstrap scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(session.hasTelegramWebAppContext).mockReturnValue(true);
  });

  it("renders a public page even when the Telegram bootstrap fails", async () => {
    vi.mocked(session.bootstrapTelegramSession).mockRejectedValue(new Error("boom"));

    renderAt("/product");

    expect(screen.getByRole("heading", { level: 1, name: "Product" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Public" })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(session.bootstrapTelegramSession).not.toHaveBeenCalled();
    expect(providerMounted).not.toHaveBeenCalled();
  });

  it("blocks operator pages with an alert when the Telegram bootstrap fails", async () => {
    vi.mocked(session.bootstrapTelegramSession).mockRejectedValue(new Error("boom"));

    renderAt("/status");

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Unable to bootstrap Telegram session."
    );
    expect(screen.queryByRole("heading", { level: 1, name: "Status page mock" })).toBeNull();
    expect(providerMounted).not.toHaveBeenCalled();
  });

  it("mounts the socket provider and renders operator pages after a successful bootstrap", async () => {
    vi.mocked(session.bootstrapTelegramSession).mockResolvedValue(undefined as never);

    renderAt("/status");

    expect(await screen.findByRole("heading", { level: 1, name: "Status page mock" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeTruthy();
    expect(providerMounted).toHaveBeenCalled();
  });
});
