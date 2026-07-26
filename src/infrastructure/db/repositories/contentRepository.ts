import type { ContentPackMeta } from "../../../domain/models";
import type { ContentPack } from "../../content/schemas";
import type { AppDb } from "../appDb";

export type ContentSeedResult = "installed" | "updated" | "unchanged";

export class DexieContentRepository {
  constructor(private readonly db: AppDb) {}

  async seedBundledPack(
    pack: ContentPack,
    installedAt: string,
  ): Promise<ContentSeedResult> {
    const existing = await this.db.contentPacks.get(pack.id);
    if (existing?.contentVersion === pack.contentVersion) {
      return "unchanged";
    }

    const meta: ContentPackMeta = {
      id: pack.id,
      schemaVersion: pack.schemaVersion,
      contentVersion: pack.contentVersion,
      title: pack.title,
      locale: pack.locale,
      installedAt,
      source: "bundled",
      enabled: true,
    };

    await this.db.transaction(
      "rw",
      [
        this.db.contentPacks,
        this.db.vocabulary,
        this.db.lessons,
        this.db.exercises,
        this.db.practiceSets,
      ],
      async () => {
        await this.db.contentPacks.put(meta);
        await this.db.vocabulary.bulkPut([...pack.vocabulary]);
        await this.db.lessons.bulkPut([...pack.lessons]);
        await this.db.exercises.bulkPut([...pack.exercises]);
        if (pack.practiceSets.length > 0) {
          await this.db.practiceSets.bulkPut([...pack.practiceSets]);
        }
      },
    );

    return existing ? "updated" : "installed";
  }
}
