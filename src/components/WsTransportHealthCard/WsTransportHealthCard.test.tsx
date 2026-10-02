import { fireEvent, render, screen } from "@testing-library/react";
import WsTransportHealthCard from "./WsTransportHealthCard";
import { useOpportunitiesTransport } from "../../hooks/useOpportunitiesTransport";
import { makeTransport } from "../../test-utils/transport-fixture";

vi.mock("../../hooks/useOpportunitiesTransport", () => ({
  useOpportunitiesTransport: vi.fn(),
}));

vi.mock("../../hooks/useNow", () => ({
  useNow: () => new Date("2026-09-28T10:00:10Z"),
}));

const mockedUseTransport = vi.mocked(useOpportunitiesTransport);

describe("WsTransportHealthCard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders the connected state without a banner", () => {
    mockedUseTransport.mockReturnValue(
      makeTransport({
        transportState: "connected",
        lastMessageAtMs: Date.parse("2026-09-28T10:00:05Z"),
      })
    );

    render(<WsTransportHealthCard />);

    expect(screen.getByText("connected")).not.toBeNull();
    expect(screen.getByText("5s ago")).not.toBeNull();
    expect(screen.getByText("standby")).not.toBeNull();
    expect(screen.queryByText(/live updates are unavailable/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /retry live connection/i })).toBeNull();
  });

  it("renders the reconnecting state with an operator hint", () => {
    mockedUseTransport.mockReturnValue(
      makeTransport({ transportState: "reconnecting", reconnectAttempt: 2 })
    );

    render(<WsTransportHealthCard />);

    expect(screen.getByText("reconnecting")).not.toBeNull();
    expect(screen.getByText("RECONNECTING")).not.toBeNull();
    expect(screen.getByText(/being re-established/i)).not.toBeNull();
    expect(screen.queryByRole("button", { name: /retry live connection/i })).toBeNull();
  });

  it("renders the degraded state with a banner, polling-scope wording, and a working Retry button", () => {
    const retryNow = vi.fn();
    mockedUseTransport.mockReturnValue(
      makeTransport({ transportState: "polling-fallback", retryNow })
    );

    render(<WsTransportHealthCard />);

    expect(screen.getByText("degraded")).not.toBeNull();
    expect(screen.getByText("DEGRADED")).not.toBeNull();
    expect(screen.getByText(/live updates are unavailable/i)).not.toBeNull();
    expect(screen.getByText(/opportunities page polls every/i)).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /retry live connection/i }));
    expect(retryNow).toHaveBeenCalledTimes(1);
  });

  it("shows the auth detail in the banner when auth is failing", () => {
    mockedUseTransport.mockReturnValue(
      makeTransport({
        transportState: "reconnecting",
        authStatus: "ticket-rejected",
        authDetail: "WS auth ticket expired; requesting a new ticket.",
      })
    );

    render(<WsTransportHealthCard />);

    expect(screen.getByText("WS auth ticket expired; requesting a new ticket.")).not.toBeNull();
  });

  it("lists recent transitions, newest first", () => {
    mockedUseTransport.mockReturnValue(
      makeTransport({
        transitions: [
          { state: "connecting", atMs: Date.parse("2026-09-28T10:00:01Z") },
          { state: "connected", atMs: Date.parse("2026-09-28T10:00:03Z") },
        ],
      })
    );

    render(<WsTransportHealthCard />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain("connected (live)");
    expect(items[1].textContent).toContain("connecting");
  });
});
