import { render, screen } from "@testing-library/react";
import ExchangeHealthList from "./ExchangeHealthList";

describe("ExchangeHealthList", () => {
  it("renders active screener exchanges when provided", () => {
    render(
      <ExchangeHealthList
        exchangeStatus={{ hyperliquid: true, lighter: true }}
        activeExchanges={["hyperliquid", "lighter", "binance", "bybit"]}
      />
    );

    expect(screen.getByText("hyperliquid")).toBeTruthy();
    expect(screen.getByText("lighter")).toBeTruthy();
    expect(screen.getByText("binance")).toBeTruthy();
    expect(screen.getByText("bybit")).toBeTruthy();
    expect(screen.queryByText("aster")).toBeNull();
  });

  it("uses exchangeStatus keys when active scope is absent", () => {
    render(<ExchangeHealthList exchangeStatus={{ hyperliquid: true, lighter: true }} />);

    expect(screen.getByText("hyperliquid")).toBeTruthy();
    expect(screen.getByText("lighter")).toBeTruthy();
    expect(screen.queryByText("aster")).toBeNull();
  });

  it("shows unknown state for exchanges missing in payload", () => {
    render(
      <ExchangeHealthList
        exchangeStatus={{ hyperliquid: true, lighter: true }}
        activeExchanges={["hyperliquid", "lighter", "binance"]}
      />
    );

    const unknownLabels = screen.getAllByText("unknown");
    expect(unknownLabels.length).toBeGreaterThan(0);
  });
});
