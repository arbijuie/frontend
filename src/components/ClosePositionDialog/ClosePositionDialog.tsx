import { useId, useRef, type RefObject } from "react";
import styles from "./ClosePositionDialog.module.scss";
import type { PositionSnapshotItem } from "../../api/types";
import { useModalKeyboard } from "../../hooks/useModalKeyboard";

interface ClosePositionDialogProps {
  position: PositionSnapshotItem;
  live: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
}

export default function ClosePositionDialog({
  position,
  live,
  onConfirm,
  onCancel,
  fallbackFocusRef,
}: ClosePositionDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const liveNoteId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const keepOpenRef = useRef<HTMLButtonElement>(null);
  const { backdropProps } = useModalKeyboard({
    containerRef: dialogRef,
    onClose: onCancel,
    initialFocusRef: keepOpenRef,
    fallbackFocusRef,
  });

  return (
    <div className={styles.overlay} {...backdropProps}>
      <div
        className={styles.dialog}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={live ? `${descriptionId} ${liveNoteId}` : descriptionId}
      >
        <h2 id={titleId} className={styles.title}>
          Close {position.symbol}?
        </h2>
        <p id={descriptionId} className={styles.text}>
          This sends orders to close both legs of the position on {position.long_exchange} and{" "}
          {position.short_exchange}.
        </p>
        {live && (
          <p id={liveNoteId} className={styles.liveNote}>
            These orders use real money from your exchange accounts.
          </p>
        )}
        <div className={styles.actions}>
          <button type="button" className={styles.keepButton} ref={keepOpenRef} onClick={onCancel}>
            Keep open
          </button>
          <button type="button" className={styles.confirmButton} onClick={onConfirm}>
            Close both legs
          </button>
        </div>
      </div>
    </div>
  );
}
