import { forwardRef, type ButtonHTMLAttributes } from "react";

import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger";
export type ButtonSize = "small" | "medium" | "large";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  loadingLabel?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "medium",
    fullWidth = false,
    isLoading = false,
    loadingLabel = "処理中",
    disabled,
    type = "button",
    className,
    children,
    ...buttonProps
  },
  ref,
) {
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...buttonProps}
      ref={ref}
      className={classes}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
    >
      {isLoading ? (
        <>
          <span className={styles.spinner} aria-hidden="true" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
});
