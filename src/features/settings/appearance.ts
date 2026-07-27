import type { AppSettings } from "../../domain/models";

export type AppearanceSettings = Pick<
  AppSettings,
  "theme" | "fontScale" | "reducedMotion"
>;

const MINIMUM_FONT_SCALE = 0.75;
const MAXIMUM_FONT_SCALE = 2;

function normalizeFontScale(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.min(MAXIMUM_FONT_SCALE, Math.max(MINIMUM_FONT_SCALE, value));
}

/**
 * 外観設定をアプリ全体へ反映する。rootを受け取れるため、DOM以外へ依存せず検証できる。
 */
export function applyAppearanceSettings(
  settings: AppearanceSettings,
  root: HTMLElement = document.documentElement,
): void {
  const fontPercentage = Number(
    (normalizeFontScale(settings.fontScale) * 100).toFixed(2),
  );
  root.dataset.theme = settings.theme;
  root.dataset.reducedMotion = String(settings.reducedMotion);
  root.style.fontSize = `${fontPercentage}%`;
}
