import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";

import { Button } from "./Button";
import styles from "./Dialog.module.css";

export interface DialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
  closeLabel?: string;
  closeOnBackdrop?: boolean;
  initialFocusRef?: RefObject<HTMLElement>;
  className?: string;
}

const focusableSelector = [
  "[autofocus]",
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function Dialog({
  open,
  title,
  description,
  children,
  actions,
  onClose,
  closeLabel = "ダイアログを閉じる",
  closeOnBackdrop = false,
  initialFocusRef,
  className,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open) {
      if (!wasOpenRef.current && document.activeElement instanceof HTMLElement) {
        returnFocusRef.current = document.activeElement;
      }

      if (!dialog.open) {
        if (typeof dialog.showModal === "function") {
          dialog.showModal();
        } else {
          dialog.setAttribute("open", "");
        }
      }

      const focusInitialElement = () => {
        const initialElement =
          initialFocusRef?.current ??
          dialog.querySelector<HTMLElement>(focusableSelector);
        initialElement?.focus();
      };

      if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(focusInitialElement);
      } else {
        focusInitialElement();
      }
    } else if (dialog.open) {
      if (typeof dialog.close === "function") {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
      }
    }

    if (!open && wasOpenRef.current) {
      const returnTarget = returnFocusRef.current;
      if (returnTarget?.isConnected) {
        returnTarget.focus();
      }
      returnFocusRef.current = null;
    }

    wasOpenRef.current = open;
  }, [initialFocusRef, open]);

  useEffect(
    () => () => {
      const returnTarget = returnFocusRef.current;
      if (returnTarget?.isConnected) {
        returnTarget.focus();
      }
    },
    [],
  );

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (closeOnBackdrop && event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={[styles.dialog, className ?? ""].filter(Boolean).join(" ")}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={handleBackdropClick}
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <Button
            variant="tertiary"
            size="small"
            className={styles.close}
            aria-label={closeLabel}
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </Button>
        </header>
        {description ? (
          <div id={descriptionId} className={styles.description}>
            {description}
          </div>
        ) : null}
        {children ? <div className={styles.content}>{children}</div> : null}
        {actions ? <footer className={styles.actions}>{actions}</footer> : null}
      </div>
    </dialog>
  );
}
