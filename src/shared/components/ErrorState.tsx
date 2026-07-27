import { useId, type HTMLAttributes, type ReactNode } from "react";

import { Button } from "./Button";
import styles from "./ErrorState.module.css";

export interface ErrorStateProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  headingLevel?: 1 | 2;
  onRetry?: () => void;
  retryLabel?: string;
  actions?: ReactNode;
}

export function ErrorState({
  title = "読み込みに問題がありました",
  description = "少し待ってから、もう一度お試しください。",
  headingLevel = 2,
  onRetry,
  retryLabel = "もう一度試す",
  actions,
  className,
  ...sectionProps
}: ErrorStateProps) {
  const titleId = useId();
  const Heading = headingLevel === 1 ? "h1" : "h2";

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
      <Heading id={titleId} className={styles.title}>
        {title}
      </Heading>
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
