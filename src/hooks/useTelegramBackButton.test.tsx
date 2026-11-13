import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate, type InitialEntry } from "react-router-dom";
import HistoryPositionProvider from "../components/HistoryPositionProvider/HistoryPositionProvider";
import { useTelegramBackButton } from "./useTelegramBackButton";

interface FakeBackButton {
  show: ReturnType<typeof vi.fn>;
  hide: ReturnType<typeof vi.fn>;
  onClick: ReturnType<typeof vi.fn>;
  offClick: ReturnType<typeof vi.fn>;
}

function installTelegram(version = "7.0"): FakeBackButton {
  const backButton: FakeBackButton = {
    show: vi.fn(),
    hide: vi.fn(),
    onClick: vi.fn(),
    offClick: vi.fn(),
  };
  (window as unknown as { Telegram: unknown }).Telegram = {
    WebApp: {
      BackButton: backButton,
      isVersionAtLeast: (required: string) => Number(version) >= Number(required),
    },
  };
  return backButton;
}

function setup(entries: InitialEntry[] = ["/"]) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={entries}>
      <HistoryPositionProvider>{children}</HistoryPositionProvider>
    </MemoryRouter>
  );
  return renderHook(
    () => {
      useTelegramBackButton();
      return { navigate: useNavigate(), location: useLocation() };
    },
    { wrapper }
  );
}

const lastHandler = (backButton: FakeBackButton) =>
  backButton.onClick.mock.calls[backButton.onClick.mock.calls.length - 1][0] as () => void;

describe("useTelegramBackButton", () => {
  afterEach(() => {
    delete (window as unknown as { Telegram?: unknown }).Telegram;
  });

  it("hides the button on Deals with no earlier entry", () => {
    const backButton = installTelegram();
    setup(["/"]);
    expect(backButton.hide).toHaveBeenCalled();
    expect(backButton.show).not.toHaveBeenCalled();
    expect(backButton.onClick).not.toHaveBeenCalled();
  });

  it("shows the button on another page and goes back through the history", () => {
    const backButton = installTelegram();
    const { result } = setup(["/"]);
    act(() => result.current.navigate("/status"));
    expect(backButton.show).toHaveBeenCalled();

    act(() => lastHandler(backButton)());
    expect(result.current.location.pathname).toBe("/");
  });

  it("shows the button on Deals after a filter change and returns to the previous filter", () => {
    const backButton = installTelegram();
    const { result } = setup(["/"]);
    act(() => result.current.navigate("/?status=ready"));
    expect(backButton.show).toHaveBeenCalled();

    act(() => lastHandler(backButton)());
    expect(result.current.location.search).toBe("");
  });

  it("falls back to state.from on a deep link", () => {
    const backButton = installTelegram();
    const { result } = setup([{ pathname: "/positions", state: { from: "/more" } }]);
    act(() => lastHandler(backButton)());
    expect(result.current.location.pathname).toBe("/more");
  });

  it("falls back to Deals on a deep link without state", () => {
    const backButton = installTelegram();
    const { result } = setup(["/positions"]);
    act(() => lastHandler(backButton)());
    expect(result.current.location.pathname).toBe("/");
  });

  it("does not touch the BackButton on clients older than 6.1", () => {
    const backButton = installTelegram("6.0");
    setup(["/positions"]);
    expect(backButton.show).not.toHaveBeenCalled();
    expect(backButton.hide).not.toHaveBeenCalled();
    expect(backButton.onClick).not.toHaveBeenCalled();
  });

  it("does nothing outside Telegram", () => {
    expect(() => setup(["/positions"])).not.toThrow();
  });

  it("removes the handler and hides the button on unmount", () => {
    const backButton = installTelegram();
    const { unmount } = setup(["/positions"]);
    unmount();
    expect(backButton.offClick).toHaveBeenCalled();
    expect(backButton.hide).toHaveBeenCalled();
  });
});
