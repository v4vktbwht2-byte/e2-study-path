import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { UserProfile } from "../../domain/models";
import { AppDb, DB_VERSION } from "../../infrastructure/db/appDb";
import { DEFAULT_SETTINGS } from "../../infrastructure/db/repositories";
import { createDexieSettingsPort } from "./dexieSettingsPort";

const NOW = "2026-07-27T12:00:00.000Z";
let databaseSequence = 0;
let db: AppDb;

const profile: UserProfile = {
  id: "local-user",
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-20T00:00:00.000Z",
  goals: ["relearn"],
  dailyMinutes: 15,
  recommendedStage: 1,
  selectedStage: 1,
  onboardingCompleted: true,
};

beforeEach(() => {
  databaseSequence += 1;
  db = new AppDb(`settings-port-test-${databaseSequence}`, {
    indexedDB,
    IDBKeyRange,
  });
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("Dexie設定port", () => {
  it("プロフィール・設定・version情報を1つのsnapshotとして読む", async () => {
    await db.profiles.put(profile);
    await db.settings.put({
      ...DEFAULT_SETTINGS,
      theme: "dark",
      fontScale: 1.15,
    });
    await db.appMeta.put({
      key: "contentVersion",
      value: "0.6.0",
      updatedAt: NOW,
    });

    const snapshot = await createDexieSettingsPort(db).load();

    expect(snapshot.profileAvailable).toBe(true);
    expect(snapshot.preferences).toEqual({
      dailyMinutes: 15,
      appSettings: {
        ...DEFAULT_SETTINGS,
        theme: "dark",
        fontScale: 1.15,
      },
    });
    expect(snapshot.appInformation.appVersion).not.toBe("");
    expect(snapshot.appInformation).toMatchObject({
      contentVersion: "0.6.0",
      databaseVersion: DB_VERSION,
    });
  });

  it("学習時間と設定を同じtransactionで保存し、再読込後も維持する", async () => {
    await db.profiles.put(profile);
    await db.settings.put(DEFAULT_SETTINGS);
    const port = createDexieSettingsPort(db, () => NOW);
    const preferences = {
      dailyMinutes: 30,
      appSettings: {
        ...DEFAULT_SETTINGS,
        theme: "dark" as const,
        fontScale: 1.3,
        reducedMotion: true,
        dailyNewVocabularyLimit: 6,
        reviewIntensity: "strong" as const,
        speechRate: 0.75,
      },
    };

    await port.save(preferences);

    expect(await db.profiles.get("local-user")).toEqual({
      ...profile,
      dailyMinutes: 30,
      updatedAt: NOW,
    });
    expect(await db.settings.get("settings")).toEqual(preferences.appSettings);
    await expect(port.load()).resolves.toMatchObject({ preferences });
  });

  it("初回設定前はプロフィールを勝手に作らず表示設定だけ保存する", async () => {
    const port = createDexieSettingsPort(db, () => NOW);

    await port.save({
      dailyMinutes: 45,
      appSettings: {
        ...DEFAULT_SETTINGS,
        theme: "light",
      },
    });

    expect(await db.profiles.count()).toBe(0);
    expect(await db.settings.get("settings")).toEqual({
      ...DEFAULT_SETTINGS,
      theme: "light",
    });
    await expect(port.load()).resolves.toMatchObject({
      profileAvailable: false,
      preferences: { dailyMinutes: 15 },
    });
  });
});
