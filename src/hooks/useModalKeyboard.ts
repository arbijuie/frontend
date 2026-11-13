import { useCallback, useEffect, useRef, type MouseEvent, type RefObject } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface UseModalKeyboardOptions {
  containerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
}

export function useModalKeyboard({
  containerRef,
  onClose,
  initialFocusRef,
  fallbackFocusRef,
}: UseModalKeyboardOptions) {
  const onCloseRef = useRef(onClose);
  const pressStartedOnBackdrop = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const fallbackTarget = fallbackFocusRef?.current;
    const focusables = () => {
      const container = containerRef.current;
      return container ? Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
    };

    (initialFocusRef?.current ?? focusables()[0])?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const container = containerRef.current;
      if (!container) return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!container.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const canReturn =
        previous !== null &&
        previous !== document.body &&
        previous.isConnected &&
        !previous.hasAttribute("disabled");
      const target = canReturn ? previous : fallbackTarget;
      target?.focus?.();
    };
  }, [containerRef, initialFocusRef, fallbackFocusRef]);

  const onBackdropMouseDown = useCallback((event: MouseEvent<HTMLElement>) => {
    pressStartedOnBackdrop.current = event.target === event.currentTarget;
  }, []);

  const onBackdropClick = useCallback((event: MouseEvent<HTMLElement>) => {
    const startedOnBackdrop = pressStartedOnBackdrop.current;
    pressStartedOnBackdrop.current = false;
    if (startedOnBackdrop && event.target === event.currentTarget) onCloseRef.current();
  }, []);

  return {
    backdropProps: { onMouseDown: onBackdropMouseDown, onClick: onBackdropClick },
  };
}
