import { useId, type HTMLAttributes, type ReactNode } from "react";

import styles from "./EmptyState.module.css";

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  headingLevel?: 1 | 2;
  actions?: ReactNode;
}

export function EmptyState({
  title,
  description,
  icon,
  headingLevel = 2,
  actions,
  className,
  ...sectionProps
}: EmptyStateProps) {
  const titleId = useId();
  const Heading = headingLevel === 1 ? "h1" : "h2";

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
      <Heading id={titleId} className={styles.title}>
        {title}
      </Heading>
      {description ? <div className={styles.description}>{description}</div> : null}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </section>
  );
}
