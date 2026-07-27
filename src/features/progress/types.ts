import type { ProgressPeriodDays, ProgressSnapshot } from "../../domain/progress";

export interface ProgressDataPort {
  load(periodDays: ProgressPeriodDays): Promise<ProgressSnapshot>;
}

export interface ProgressClock {
  now(): Date;
  timeZone(): string;
}
