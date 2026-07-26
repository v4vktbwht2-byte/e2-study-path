import { useId } from "react";

import styles from "./ProgressBar.module.css";

export interface ProgressBarProps {
  value: number;
  max?: number;
  label: string;
  valueText?: string;
  showValue?: boolean;
  className?: string;
}

function toFiniteNumber(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  valueText,
  showValue = true,
  className,
}: ProgressBarProps) {
  const labelId = useId();
  const safeMax = Math.max(toFiniteNumber(max, 100), 1);
  const safeValue = Math.min(Math.max(toFiniteNumber(value, 0), 0), safeMax);
  const percentage = (safeValue / safeMax) * 100;
  const resolvedValueText =
    valueText ??
    (safeMax === 100 ? `${Math.round(percentage)}%` : `${safeValue} / ${safeMax}`);

  return (
    <div className={[styles.root, className ?? ""].filter(Boolean).join(" ")}>
      <div className={styles.header}>
        <span id={labelId} className={styles.label}>
          {label}
        </span>
        {showValue ? (
          <span className={styles.value} aria-hidden="true">
            {resolvedValueText}
          </span>
        ) : null}
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        aria-valuetext={resolvedValueText}
      >
        <span
          className={styles.fill}
          style={{ width: `${percentage}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
