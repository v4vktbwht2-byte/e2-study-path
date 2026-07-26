import type { HTMLAttributes, ReactNode } from "react";

import styles from "./InlineAlert.module.css";

export type InlineAlertTone = "info" | "success" | "warning" | "danger";

export interface InlineAlertProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "role" | "title"
> {
  tone?: InlineAlertTone;
  title?: ReactNode;
  actions?: ReactNode;
  role?: "alert" | "status" | "note";
}

const toneMetadata: Record<
  InlineAlertTone,
  { symbol: string; accessibleLabel: string }
> = {
  info: { symbol: "i", accessibleLabel: "お知らせ" },
  success: { symbol: "✓", accessibleLabel: "完了" },
  warning: { symbol: "!", accessibleLabel: "注意" },
  danger: { symbol: "×", accessibleLabel: "エラー" },
};

export function InlineAlert({
  tone = "info",
  title,
  actions,
  role,
  className,
  children,
  ...alertProps
}: InlineAlertProps) {
  const metadata = toneMetadata[tone];
  const resolvedRole = role ?? (tone === "danger" ? "alert" : "status");

  return (
    <div
      {...alertProps}
      className={[styles.alert, styles[tone], className ?? ""]
        .filter(Boolean)
        .join(" ")}
      role={resolvedRole}
      aria-atomic="true"
    >
      <span className={styles.icon} aria-hidden="true">
        {metadata.symbol}
      </span>
      <div className={styles.body}>
        <span className={styles.srOnly}>{metadata.accessibleLabel}: </span>
        {title ? <div className={styles.title}>{title}</div> : null}
        <div className={styles.content}>{children}</div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </div>
  );
}
