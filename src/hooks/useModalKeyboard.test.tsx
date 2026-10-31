import { fireEvent, render, screen } from "@testing-library/react";
import { useRef, type RefObject } from "react";
import { useModalKeyboard } from "./useModalKeyboard";

interface HarnessProps {
  onClose: () => void;
  useInitialRef?: boolean;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
}

function Harness({ onClose, useInitialRef = false, fallbackFocusRef }: HarnessProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const secondRef = useRef<HTMLButtonElement>(null);
  const { backdropProps } = useModalKeyboard({
    containerRef,
    onClose,
    initialFocusRef: useInitialRef ? secondRef : undefined,
    fallbackFocusRef,
  });
  return (
    <div data-testid="backdrop" {...backdropProps}>
      <div ref={containerRef} data-testid="container">
        <button type="button">First</button>
        <button type="button" ref={secondRef}>
          Second
        </button>
        <input aria-label="Field" />
        <button type="button" disabled>
          Disabled
        </button>
      </div>
    </div>
  );
}

function first() {
  return screen.getByRole("button", { name: "First" });
}

function field() {
  return screen.getByLabelText("Field");
}

describe("useModalKeyboard", () => {
  it("focuses the first focusable element by default", () => {
    render(<Harness onClose={vi.fn()} />);
    expect(document.activeElement).toBe(first());
  });

  it("focuses the initial focus target when one is given", () => {
    render(<Harness onClose={vi.fn()} useInitialRef />);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Second" }));
  });

  it("keeps Tab inside and skips disabled elements", () => {
    render(<Harness onClose={vi.fn()} />);
    field().focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first());
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(field());
  });

  it("brings Tab back into the container when the focus is outside it", () => {
    render(<Harness onClose={vi.fn()} />);
    (document.activeElement as HTMLElement).blur();
    expect(document.activeElement).toBe(document.body);
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first());
    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(field());
  });

  it("closes on Escape and ignores other keys", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.keyDown(document, { key: "a" });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("uses the latest onClose after a re-render without moving the focus", () => {
    const initial = vi.fn();
    const latest = vi.fn();
    const { rerender } = render(<Harness onClose={initial} />);
    field().focus();
    rerender(<Harness onClose={latest} />);
    expect(document.activeElement).toBe(field());
    fireEvent.keyDown(document, { key: "Escape" });
    expect(initial).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledTimes(1);
  });

  it("stops listening after unmount", () => {
    const onClose = vi.fn();
    const { unmount } = render(<Harness onClose={onClose} />);
    unmount();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("returns the focus to the element that opened it", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    const { unmount } = render(<Harness onClose={vi.fn()} />);
    expect(document.activeElement).not.toBe(opener);
    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it("uses the fallback when the opener is disabled", () => {
    const opener = document.createElement("button");
    const heading = document.createElement("h1");
    heading.tabIndex = -1;
    document.body.append(opener, heading);
    opener.focus();
    const { unmount } = render(
      <Harness onClose={vi.fn()} fallbackFocusRef={{ current: heading }} />
    );
    opener.disabled = true;
    unmount();
    expect(document.activeElement).toBe(heading);
    opener.remove();
    heading.remove();
  });

  it("uses the fallback when the opener is gone", () => {
    const opener = document.createElement("button");
    const heading = document.createElement("h1");
    heading.tabIndex = -1;
    document.body.append(opener, heading);
    opener.focus();
    const { unmount } = render(
      <Harness onClose={vi.fn()} fallbackFocusRef={{ current: heading }} />
    );
    opener.remove();
    unmount();
    expect(document.activeElement).toBe(heading);
    heading.remove();
  });

  it("uses the fallback when nothing was focused before it opened", () => {
    const heading = document.createElement("h1");
    heading.tabIndex = -1;
    document.body.appendChild(heading);
    (document.activeElement as HTMLElement).blur();
    const { unmount } = render(
      <Harness onClose={vi.fn()} fallbackFocusRef={{ current: heading }} />
    );
    unmount();
    expect(document.activeElement).toBe(heading);
    heading.remove();
  });

  it("does not fail when nothing was focused and there is no fallback", () => {
    (document.activeElement as HTMLElement).blur();
    const { unmount } = render(<Harness onClose={vi.fn()} />);
    expect(() => unmount()).not.toThrow();
  });

  it("closes when the backdrop is pressed and released", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const backdrop = screen.getByTestId("backdrop");
    fireEvent.mouseDown(backdrop);
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when a press starts inside and ends on the backdrop", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.mouseDown(screen.getByTestId("container"));
    fireEvent.click(screen.getByTestId("backdrop"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not close when the content is clicked", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.mouseDown(first());
    fireEvent.click(first());
    expect(onClose).not.toHaveBeenCalled();
  });
});
