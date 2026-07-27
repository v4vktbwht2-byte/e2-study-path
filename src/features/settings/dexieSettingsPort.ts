import { APP_VERSION } from "../../shared/appMetadata";
import { DB_VERSION, getAppDb, type AppDb } from "../../infrastructure/db/appDb";
import { DEFAULT_SETTINGS } from "../../infrastructure/db/repositories";
import type { SettingsPort, SettingsPreferences, SettingsSnapshot } from "./types";

const DEFAULT_DAILY_MINUTES = 15;

function resolveContentVersion(
  appMetaVersion: string | undefined,
  enabledContentVersions: readonly string[],
): string {
  if (appMetaVersion?.trim()) {
    return appMetaVersion;
  }
  return enabledContentVersions.at(-1) ?? "未確認";
}

export function createDexieSettingsPort(
  db: AppDb = getAppDb(),
  now: () => string = () => new Date().toISOString(),
): SettingsPort {
  return {
    async load(): Promise<SettingsSnapshot> {
      return db.transaction(
        "r",
        [db.profiles, db.settings, db.appMeta, db.contentPacks],
        async () => {
          const [profile, settings, contentVersionMeta, contentPacks] =
            await Promise.all([
              db.profiles.get("local-user"),
              db.settings.get(DEFAULT_SETTINGS.id),
              db.appMeta.get("contentVersion"),
              db.contentPacks.toArray(),
            ]);
          const enabledContentPacks = contentPacks
            .filter((pack) => pack.enabled)
            .sort((left, right) => left.installedAt.localeCompare(right.installedAt));

          return {
            preferences: {
              dailyMinutes: profile?.dailyMinutes ?? DEFAULT_DAILY_MINUTES,
              appSettings: settings ?? { ...DEFAULT_SETTINGS },
            },
            profileAvailable: profile !== undefined,
            appInformation: {
              appVersion: APP_VERSION,
              contentVersion: resolveContentVersion(
                contentVersionMeta?.value,
                enabledContentPacks.map((pack) => pack.contentVersion),
              ),
              databaseVersion: DB_VERSION,
            },
          };
        },
      );
    },

    async save(preferences: SettingsPreferences): Promise<void> {
      await db.transaction("rw", [db.profiles, db.settings], async () => {
        const profile = await db.profiles.get("local-user");
        if (profile !== undefined) {
          await db.profiles.put({
            ...profile,
            dailyMinutes: preferences.dailyMinutes,
            updatedAt: now(),
          });
        }
        await db.settings.put(preferences.appSettings);
      });
    },
  };
}
