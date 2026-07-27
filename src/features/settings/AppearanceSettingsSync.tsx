import { useEffect } from "react";
import type { AppSettings } from "../../domain/models";
import { DEFAULT_SETTINGS } from "../../infrastructure/db/repositories";
import { applyAppearanceSettings } from "./appearance";

export interface AppearanceSettingsSyncProps {
  readonly loadSettings?: () => Promise<AppSettings | undefined>;
}

async function loadStoredSettings(): Promise<AppSettings | undefined> {
  const { getAppDb } = await import("../../infrastructure/db/appDb");
  return getAppDb().settings.get(DEFAULT_SETTINGS.id);
}

/**
 * StartupGate完了後、保存済み外観をルート要素へ再適用する。
 */
export function AppearanceSettingsSync({
  loadSettings = loadStoredSettings,
}: AppearanceSettingsSyncProps) {
  useEffect(() => {
    let active = true;
    void loadSettings()
      .then((settings) => {
        if (active) {
          applyAppearanceSettings(settings ?? DEFAULT_SETTINGS);
        }
      })
      .catch(() => {
        if (active) {
          applyAppearanceSettings(DEFAULT_SETTINGS);
        }
      });
    return () => {
      active = false;
    };
  }, [loadSettings]);

  return null;
}
