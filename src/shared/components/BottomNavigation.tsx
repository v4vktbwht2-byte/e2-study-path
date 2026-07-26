import type { HTMLAttributes, ReactNode } from "react";

import styles from "./BottomNavigation.module.css";

export interface BottomNavigationItem {
  id: string;
  label: string;
  href: string;
  icon?: ReactNode;
  isCurrent?: boolean;
  disabled?: boolean;
}

export interface BottomNavigationProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "children"
> {
  items: readonly BottomNavigationItem[];
  ariaLabel?: string;
}

export function BottomNavigation({
  items,
  ariaLabel = "メインナビゲーション",
  className,
  ...navProps
}: BottomNavigationProps) {
  return (
    <nav
      {...navProps}
      className={[styles.navigation, className ?? ""].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
    >
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id} className={styles.item}>
            {item.disabled ? (
              <span
                className={[styles.link, styles.disabled].join(" ")}
                aria-disabled="true"
              >
                {item.icon ? (
                  <span className={styles.icon} aria-hidden="true">
                    {item.icon}
                  </span>
                ) : null}
                <span className={styles.label}>{item.label}</span>
              </span>
            ) : (
              <a
                className={[styles.link, item.isCurrent ? styles.current : ""]
                  .filter(Boolean)
                  .join(" ")}
                href={item.href}
                aria-current={item.isCurrent ? "page" : undefined}
              >
                {item.icon ? (
                  <span className={styles.icon} aria-hidden="true">
                    {item.icon}
                  </span>
                ) : null}
                <span className={styles.label}>{item.label}</span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
