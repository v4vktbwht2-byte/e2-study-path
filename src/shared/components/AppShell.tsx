import type { HTMLAttributes, ReactNode } from "react";

import styles from "./AppShell.module.css";

export interface AppShellProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> {
  children: ReactNode;
  topBar?: ReactNode;
  bottomNavigation?: ReactNode;
  mainId?: string;
  mainAriaLabel?: string;
  skipLinkLabel?: string;
  showSkipLink?: boolean;
  contentClassName?: string;
}

export function AppShell({
  children,
  topBar,
  bottomNavigation,
  mainId = "main-content",
  mainAriaLabel,
  skipLinkLabel = "本文へ移動",
  showSkipLink = true,
  className,
  contentClassName,
  ...shellProps
}: AppShellProps) {
  return (
    <div
      {...shellProps}
      className={[styles.shell, className ?? ""].filter(Boolean).join(" ")}
    >
      {showSkipLink ? (
        <button
          className={styles.skipLink}
          type="button"
          onClick={() => document.getElementById(mainId)?.focus()}
        >
          {skipLinkLabel}
        </button>
      ) : null}
      {topBar}
      <main
        id={mainId}
        className={[styles.content, contentClassName ?? ""].filter(Boolean).join(" ")}
        aria-label={mainAriaLabel}
        tabIndex={-1}
      >
        {children}
      </main>
      {bottomNavigation}
    </div>
  );
}
