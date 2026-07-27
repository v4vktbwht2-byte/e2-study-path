import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../../infrastructure/db/repositories";
import { AppearanceSettingsSync } from "./AppearanceSettingsSync";
import { applyAppearanceSettings } from "./appearance";

const originalRootFontSize = document.documentElement.style.fontSize;
const originalTheme = document.documentElement.dataset.theme;
const originalReducedMotion = document.documentElement.dataset.reducedMotion;

afterEach(() => {
  document.documentElement.style.fontSize = originalRootFontSize;
  if (originalTheme === undefined) {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = originalTheme;
  }
  if (originalReducedMotion === undefined) {
    delete document.documentElement.dataset.reducedMotion;
  } else {
    document.documentElement.dataset.reducedMotion = originalReducedMotion;
  }
});

describe("外観設定", () => {
  it("テーマ・文字倍率・動きの軽減をルート要素へ反映する", () => {
    const root = document.createElement("div");

    applyAppearanceSettings(
      {
        theme: "dark",
        fontScale: 1.3,
        reducedMotion: true,
      },
      root,
    );

    expect(root).toHaveAttribute("data-theme", "dark");
    expect(root).toHaveAttribute("data-reduced-motion", "true");
    expect(root.style.fontSize).toBe("130%");
  });

  it("保存済み設定を起動時に再適用する", async () => {
    const loadSettings = vi.fn().mockResolvedValue({
      ...DEFAULT_SETTINGS,
      theme: "dark",
      fontScale: 1.15,
      reducedMotion: true,
    });

    render(<AppearanceSettingsSync loadSettings={loadSettings} />);

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    });
    expect(document.documentElement).toHaveAttribute("data-reduced-motion", "true");
    expect(loadSettings).toHaveBeenCalledOnce();
  });

  it("読込に失敗しても安全な既定外観へ戻す", async () => {
    render(
      <AppearanceSettingsSync
        loadSettings={vi.fn().mockRejectedValue(new Error("読込失敗"))}
      />,
    );

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("data-theme", "system");
    });
    expect(document.documentElement).toHaveAttribute("data-reduced-motion", "false");
    expect(document.documentElement.style.fontSize).toBe("100%");
  });
});
