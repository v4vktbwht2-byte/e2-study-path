import { getAppDb, type AppDb, DB_VERSION } from "../../infrastructure/db/appDb";
import {
  DexieContentRepository,
  DexieSettingsRepository,
  type ContentSeedResult,
} from "../../infrastructure/db/repositories";
import { loadStarterPack } from "../../infrastructure/content/starterPack";

export interface StartupSnapshot {
  readonly contentSeedResult: ContentSeedResult;
  readonly contentVersion: string;
  readonly dbVersion: number;
  readonly incompleteSessionCount: number;
}

export class StartupError extends Error {
  constructor(
    readonly code: "DB_OPEN_FAILED" | "CONTENT_INITIALIZATION_FAILED",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "StartupError";
  }
}

export async function initializeApplication(
  now: Date = new Date(),
  db: AppDb = getAppDb(),
): Promise<StartupSnapshot> {
  try {
    await db.runUserDataWrite("startup:database-open", () => db.open());
  } catch (error) {
    throw new StartupError(
      "DB_OPEN_FAILED",
      "端末内の学習データベースを開けませんでした。",
      { cause: error },
    );
  }

  try {
    const pack = await loadStarterPack();
    const contentSeedResult = await new DexieContentRepository(db).seedBundledPack(
      pack,
      now.toISOString(),
    );
    await new DexieSettingsRepository(db).getOrCreate();
    await db.appMeta.bulkPut([
      {
        key: "dbVersion",
        value: String(DB_VERSION),
        updatedAt: now.toISOString(),
      },
      {
        key: "contentVersion",
        value: pack.contentVersion,
        updatedAt: now.toISOString(),
      },
    ]);

    const incompleteSessionCount = await db.sessions
      .filter((session) => session.endedAt === undefined)
      .count();

    return {
      contentSeedResult,
      contentVersion: pack.contentVersion,
      dbVersion: DB_VERSION,
      incompleteSessionCount,
    };
  } catch (error) {
    throw new StartupError(
      "CONTENT_INITIALIZATION_FAILED",
      "基本教材を準備できませんでした。学習データは変更されていません。",
      { cause: error },
    );
  }
}
