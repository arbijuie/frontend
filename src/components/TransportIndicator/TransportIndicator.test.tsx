import { fireEvent, render, screen } from "@testing-library/react";
import TransportIndicator from "./TransportIndicator";

describe("TransportIndicator", () => {
  it("shows transport reconnect attempts when auth state is ok", () => {
    render(
      <TransportIndicator
        state="reconnecting"
        reconnectAttempt={2}
        authRetryAttempt={1}
        authStatus="ok"
        authRetryAfterSeconds={null}
        authDetail={null}
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByText("reconnecting transport (attempt 2)...")).not.toBeNull();
  });

  it("shows auth ticket reissue attempts during auth retries", () => {
    render(
      <TransportIndicator
        state="reconnecting"
        reconnectAttempt={5}
        authRetryAttempt={2}
        authStatus="rate-limited"
        authRetryAfterSeconds={3}
        authDetail={null}
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByText("reissuing auth ticket (attempt 2)...")).not.toBeNull();
    expect(screen.getByText("ticket request rate-limited, retry in ~3s")).not.toBeNull();
  });

  it("includes safe-default hint when Retry-After is missing", () => {
    render(
      <TransportIndicator
        state="reconnecting"
        reconnectAttempt={1}
        authRetryAttempt={1}
        authStatus="rate-limited"
        authRetryAfterSeconds={5}
        authDetail="Retry-After missing or invalid; using safe default delay."
        onRetry={vi.fn()}
      />
    );

    expect(
      screen.getByText(
        "ticket request rate-limited, retry in ~5s (Retry-After missing or invalid; using safe default delay.)"
      )
    ).not.toBeNull();
  });

  it("shows retry button in polling fallback and calls handler", () => {
    const onRetry = vi.fn();

    render(
      <TransportIndicator
        state="polling-fallback"
        reconnectAttempt={0}
        authRetryAttempt={0}
        authStatus="auth-failed"
        authRetryAfterSeconds={null}
        authDetail="WS auth failed repeatedly; using polling fallback."
        onRetry={onRetry}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry live connection" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
