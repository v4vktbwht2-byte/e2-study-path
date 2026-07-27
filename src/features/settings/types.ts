import type { AppSettings } from "../../domain/models";

export interface SettingsPreferences {
  readonly dailyMinutes: number;
  readonly appSettings: AppSettings;
}

export interface SettingsAppInformation {
  readonly appVersion: string;
  readonly contentVersion: string;
  readonly databaseVersion: number;
}

export interface SettingsSnapshot {
  readonly preferences: SettingsPreferences;
  readonly profileAvailable: boolean;
  readonly appInformation: SettingsAppInformation;
}

export interface SettingsPort {
  load(): Promise<SettingsSnapshot>;
  save(preferences: SettingsPreferences): Promise<void>;
}
