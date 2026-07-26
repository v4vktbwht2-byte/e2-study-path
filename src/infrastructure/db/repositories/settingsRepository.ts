import type {
  ProfileRepository,
  SettingsRepository,
} from "../../../domain/repositories";
import type { AppSettings, UserProfile } from "../../../domain/models";
import type { AppDb } from "../appDb";

export const DEFAULT_SETTINGS: AppSettings = {
  id: "settings",
  theme: "system",
  fontScale: 1,
  reducedMotion: false,
  dailyNewVocabularyLimit: 10,
  reviewIntensity: "standard",
  speechRate: 1,
  autoPlayAudio: false,
  showKanaPronunciationGuide: false,
  speedAdjustmentEnabled: true,
  studyDayStartHour: 4,
};

export class DexieProfileRepository implements ProfileRepository {
  constructor(private readonly db: AppDb) {}

  get() {
    return this.db.profiles.get("local-user");
  }

  async save(profile: UserProfile) {
    await this.db.profiles.put(profile);
  }
}

export class DexieSettingsRepository implements SettingsRepository {
  constructor(private readonly db: AppDb) {}

  get() {
    return this.db.settings.get("settings");
  }

  async save(settings: AppSettings) {
    await this.db.settings.put(settings);
  }

  async getOrCreate() {
    const existing = await this.get();
    if (existing) {
      return existing;
    }
    await this.save(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
}
