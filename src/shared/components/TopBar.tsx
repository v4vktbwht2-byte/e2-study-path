import type { HTMLAttributes, ReactNode } from "react";

import styles from "./TopBar.module.css";

export interface TopBarProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  actions?: ReactNode;
  headingLevel?: 1 | 2 | "none";
}

export function TopBar({
  title,
  subtitle,
  leading,
  actions,
  headingLevel = 1,
  className,
  ...headerProps
}: TopBarProps) {
  const Heading = headingLevel === "none" ? "div" : headingLevel === 1 ? "h1" : "h2";

  return (
    <header
      {...headerProps}
      className={[styles.topBar, className ?? ""].filter(Boolean).join(" ")}
    >
      <div className={styles.inner}>
        {leading ? <div className={styles.leading}>{leading}</div> : null}
        <div className={styles.heading}>
          <Heading className={styles.title}>{title}</Heading>
          {subtitle ? <div className={styles.subtitle}>{subtitle}</div> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </header>
  );
}
