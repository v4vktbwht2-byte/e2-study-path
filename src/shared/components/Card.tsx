import type { HTMLAttributes } from "react";

import styles from "./Card.module.css";

export type CardElement = "div" | "section" | "article" | "aside" | "nav";
export type CardPadding = "none" | "small" | "medium" | "large";
export type CardTone = "default" | "muted";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: CardElement;
  padding?: CardPadding;
  tone?: CardTone;
}

export function Card({
  as: Component = "div",
  padding = "medium",
  tone = "default",
  className,
  children,
  ...cardProps
}: CardProps) {
  const classes = [styles.card, styles[padding], styles[tone], className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <Component {...cardProps} className={classes}>
      {children}
    </Component>
  );
}
