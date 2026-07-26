import { useId, type HTMLAttributes, type ReactNode } from "react";

import styles from "./EmptyState.module.css";

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
}

export function EmptyState({
  title,
  description,
  icon,
  actions,
  className,
  ...sectionProps
}: EmptyStateProps) {
  const titleId = useId();

  return (
    <section
      {...sectionProps}
      className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
      aria-labelledby={titleId}
    >
      {icon ? (
        <div className={styles.icon} aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      {description ? <div className={styles.description}>{description}</div> : null}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </section>
  );
}
