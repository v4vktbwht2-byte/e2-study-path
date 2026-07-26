import { useId, type HTMLAttributes, type ReactNode } from "react";

import { Button } from "./Button";
import styles from "./ErrorState.module.css";

export interface ErrorStateProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  actions?: ReactNode;
}

export function ErrorState({
  title = "読み込みに問題がありました",
  description = "少し待ってから、もう一度お試しください。",
  onRetry,
  retryLabel = "もう一度試す",
  actions,
  className,
  ...sectionProps
}: ErrorStateProps) {
  const titleId = useId();

  return (
    <section
      {...sectionProps}
      className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
      role="alert"
      aria-labelledby={titleId}
    >
      <span className={styles.icon} aria-hidden="true">
        !
      </span>
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      {description ? <div className={styles.description}>{description}</div> : null}
      {onRetry || actions ? (
        <div className={styles.actions}>
          {onRetry ? (
            <Button variant="secondary" onClick={onRetry}>
              {retryLabel}
            </Button>
          ) : null}
          {actions}
        </div>
      ) : null}
    </section>
  );
}
