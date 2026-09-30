import { render, screen } from "@testing-library/react";
import StatusPage from "./StatusPage";
import { useStatus } from "../../hooks/useStatus";
import { useConfig } from "../../hooks/useConfig";
import { useNow } from "../../hooks/useNow";
import type { StatusResponse } from "../../api/types";

vi.mock("../../hooks/useStatus", () => ({
  useStatus: vi.fn(),
}));

vi.mock("../../hooks/useConfig", () => ({
  useConfig: vi.fn(),
}));

vi.mock("../../hooks/useNow", () => ({
  useNow: vi.fn(),
}));

vi.mock("../../components/StatusStatCards/StatusStatCards", () => ({
  default: () => <div>Status stats mock</div>,
}));

vi.mock("../../components/StatusDetailsList/StatusDetailsList", () => ({
  default: () => <div>Status details mock</div>,
}));

vi.mock("../../components/ExchangeHealthList/ExchangeHealthList", () => ({
  default: () => <div>Exchange health mock</div>,
}));

vi.mock("../../components/FloatingRefreshButton/FloatingRefreshButton", () => ({
  default: () => <button type="button">Refresh status</button>,
}));

vi.mock("../../components/RuntimeKnobsCard/RuntimeKnobsCard", () => ({
  default: () => <div>Runtime knobs mock</div>,
}));

vi.mock("../../components/PipelineDiagnosticsHint/PipelineDiagnosticsHint", () => ({
  default: () => <div>Pipeline diagnostics mock</div>,
}));

vi.mock("../../components/WsFeedReliabilityList/WsFeedReliabilityList", () => ({
  default: () => <div>WS reliability mock</div>,
}));

vi.mock("../../components/DeepPipelineDiagnostics/DeepPipelineDiagnostics", () => ({
  default: () => <div>Deep diagnostics mock</div>,
}));

vi.mock("../../components/WsTransportHealthCard/WsTransportHealthCard", () => ({
  default: () => <div>Transport health mock</div>,
}));

const mockedUseStatus = vi.mocked(useStatus);
const mockedUseConfig = vi.mocked(useConfig);
const mockedUseNow = vi.mocked(useNow);

function makeStatus(overrides: Partial<StatusResponse> = {}): StatusResponse {
  return {
    uptime_s: 10,
    started_at: "2026-01-01T00:00:00Z",
    last_updated_at: "2026-01-01T00:00:10Z",
    poll_count_total: 1,
    poll_count_success: 1,
    poll_count_failed: 0,
    exchange_last_ok: {
      hyperliquid: true,
      lighter: true,
    },
    ...overrides,
  } as StatusResponse;
}

describe("StatusPage", () => {
  beforeEach(() => {
    mockedUseNow.mockReturnValue(new Date("2026-01-01T00:00:20Z"));
    mockedUseConfig.mockReturnValue({
      data: null,
      error: null,
      loading: false,
      fetching: false,
      refetch: vi.fn(),
    });
    mockedUseStatus.mockReturnValue({
      data: makeStatus(),
      error: null,
      loading: false,
      fetching: false,
      refetch: vi.fn(),
      fetchedAt: Date.now(),
    });
  });

  it("renders Recovery Health section when status is loaded", () => {
    render(<StatusPage />);

    expect(screen.getByRole("heading", { level: 2, name: "Pipeline Diagnostics" })).toBeTruthy();
    expect(screen.getByText("Deep diagnostics mock")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Recovery Health" })).toBeTruthy();
    expect(screen.getByText("Startup Recovery")).toBeTruthy();
  });

  it("renders the Live Transport section", () => {
    render(<StatusPage />);

    expect(screen.getByRole("heading", { level: 2, name: "Live Transport" })).toBeTruthy();
    expect(screen.getByText("Transport health mock")).toBeTruthy();
  });

  it("shows default recovery result when continuity is missing", () => {
    mockedUseStatus.mockReturnValue({
      data: makeStatus({ snapshot_continuity: undefined }),
      error: null,
      loading: false,
      fetching: false,
      refetch: vi.fn(),
      fetchedAt: Date.now(),
    });

    render(<StatusPage />);

    expect(screen.getByText("not_attempted")).toBeTruthy();
  });
});
