import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ClosePositionDialog from "./ClosePositionDialog";
import type { PositionSnapshotItem } from "../../api/types";

const position = {
  attempt_id: "att-1",
  symbol: "BTC",
  long_exchange: "binance",
  short_exchange: "hyperliquid",
} as unknown as PositionSnapshotItem;

function renderDialog(live = false, onConfirm = vi.fn(), onCancel = vi.fn()) {
  return render(
    <ClosePositionDialog
      position={position}
      live={live}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

function overlay(): HTMLElement {
  return screen.getByRole("dialog").parentElement as HTMLElement;
}

function describedText(): string {
  const ids = screen.getByRole("dialog").getAttribute("aria-describedby")?.split(" ") ?? [];
  return ids.map((id) => document.getElementById(id)?.textContent ?? "").join(" ");
}

describe("ClosePositionDialog", () => {
  it("names the symbol and both exchanges", () => {
    renderDialog();
    expect(screen.getByRole("dialog", { name: "Close BTC?" })).toBeTruthy();
    expect(screen.getByText(/binance and\s+hyperliquid/)).toBeTruthy();
  });

  it("mentions real money only in live mode", () => {
    const { unmount } = renderDialog(true);
    expect(screen.getByText(/use real money/)).toBeTruthy();
    unmount();
    renderDialog(false);
    expect(screen.queryByText(/use real money/)).toBeNull();
  });

  it("includes the real money note in the accessible description in live mode", () => {
    const { unmount } = renderDialog(true);
    expect(describedText()).toMatch(/use real money/);
    unmount();
    renderDialog(false);
    expect(describedText()).toMatch(/close both legs/);
    expect(describedText()).not.toMatch(/real money/);
  });

  it("confirms with Close both legs", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderDialog(false, onConfirm, onCancel);
    fireEvent.click(screen.getByRole("button", { name: "Close both legs" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("cancels with Keep open", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderDialog(false, onConfirm, onCancel);
    fireEvent.click(screen.getByRole("button", { name: "Keep open" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("cancels on Escape", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderDialog(false, onConfirm, onCancel);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("starts with the focus on Keep open", () => {
    renderDialog();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Keep open" }));
  });

  it("keeps Tab inside the dialog", () => {
    renderDialog();
    const keep = screen.getByRole("button", { name: "Keep open" });
    const confirm = screen.getByRole("button", { name: "Close both legs" });
    confirm.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(keep);
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(confirm);
  });

  it("brings Tab back into the dialog when the focus is outside it", () => {
    renderDialog();
    (document.activeElement as HTMLElement).blur();
    expect(document.activeElement).toBe(document.body);
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Keep open" }));
    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close both legs" }));
  });

  it("returns the focus to the button that opened it", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    const { unmount } = renderDialog();
    expect(document.activeElement).not.toBe(opener);
    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it("moves the focus to the fallback when the opener is disabled", () => {
    const opener = document.createElement("button");
    const heading = document.createElement("h1");
    heading.tabIndex = -1;
    document.body.append(opener, heading);
    opener.focus();
    const fallbackFocusRef = { current: heading };
    const { unmount } = render(
      <ClosePositionDialog
        position={position}
        live={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        fallbackFocusRef={fallbackFocusRef}
      />
    );
    opener.disabled = true;
    unmount();
    expect(document.activeElement).toBe(heading);
    opener.remove();
    heading.remove();
  });

  it("moves the focus to the fallback when the opener is gone", () => {
    const opener = document.createElement("button");
    const heading = document.createElement("h1");
    heading.tabIndex = -1;
    document.body.append(opener, heading);
    opener.focus();
    const fallbackFocusRef = { current: heading };
    const { unmount } = render(
      <ClosePositionDialog
        position={position}
        live={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        fallbackFocusRef={fallbackFocusRef}
      />
    );
    opener.remove();
    unmount();
    expect(document.activeElement).toBe(heading);
    heading.remove();
  });

  it("moves the focus to the fallback when nothing was focused before it opened", () => {
    const heading = document.createElement("h1");
    heading.tabIndex = -1;
    document.body.appendChild(heading);
    (document.activeElement as HTMLElement).blur();
    const fallbackFocusRef = { current: heading };
    const { unmount } = render(
      <ClosePositionDialog
        position={position}
        live={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        fallbackFocusRef={fallbackFocusRef}
      />
    );
    unmount();
    expect(document.activeElement).toBe(heading);
    heading.remove();
  });

  it("uses the latest onCancel after a re-render", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <ClosePositionDialog position={position} live={false} onConfirm={vi.fn()} onCancel={first} />
    );
    rerender(
      <ClosePositionDialog position={position} live={false} onConfirm={vi.fn()} onCancel={second} />
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("cancels when the backdrop is pressed and released", () => {
    const onCancel = vi.fn();
    renderDialog(false, vi.fn(), onCancel);
    fireEvent.mouseDown(overlay());
    fireEvent.click(overlay());
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("does not cancel when a press starts in the dialog and ends on the backdrop", () => {
    const onCancel = vi.fn();
    renderDialog(false, vi.fn(), onCancel);
    fireEvent.mouseDown(screen.getByText(/This sends orders/));
    fireEvent.click(overlay());
    expect(onCancel).not.toHaveBeenCalled();
  });
});
