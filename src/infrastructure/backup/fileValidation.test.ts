import { describe, expect, it, vi } from "vitest";
import {
  BACKUP_SCHEMA_VERSION,
  DEFAULT_BACKUP_SECTIONS,
  MAX_BACKUP_FILE_BYTES,
} from "../../domain/backup";
import { DEFAULT_SETTINGS } from "../db/repositories";
import { parseBackupFile, parseBackupText } from "./fileValidation";

function validText(): string {
  return JSON.stringify({
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: "2026-07-27T00:00:00.000Z",
    appVersion: "0.1.0",
    contentVersions: {},
    includedData: DEFAULT_BACKUP_SECTIONS,
    data: {
      profiles: [],
      settings: [DEFAULT_SETTINGS],
      reviewStates: [],
      mastery: [],
      vocabularyUserStates: [],
      lessonProgress: [],
      attempts: [],
      sessions: [],
      dailyPlans: [],
      writingSubmissions: [],
    },
  });
}

describe("backup file validation", () => {
  it("20 MiB超過を本文読込前に拒否する", async () => {
    const text = vi.fn(() => Promise.resolve(validText()));
    await expect(
      parseBackupFile({ size: MAX_BACKUP_FILE_BYTES + 1, text }),
    ).rejects.toMatchObject({ code: "FILE_TOO_LARGE" });
    expect(text).not.toHaveBeenCalled();
  });

  it.each([
    ["負数", -1],
    ["小数", 1.5],
    ["非数", Number.NaN],
  ])("不正な宣言size（%s）を本文読込前に拒否する", async (_label, size) => {
    const text = vi.fn(() => Promise.resolve(validText()));
    await expect(parseBackupFile({ size, text })).rejects.toMatchObject({
      code: "FILE_TOO_LARGE",
    });
    expect(text).not.toHaveBeenCalled();
  });

  it("破損JSONと未知fieldを拒否する", () => {
    expect(() => parseBackupText("{")).toThrowError(
      expect.objectContaining({ code: "INVALID_JSON" }),
    );
    const unknown = JSON.parse(validText()) as Record<string, unknown>;
    unknown.extra = true;
    expect(() => parseBackupText(JSON.stringify(unknown))).toThrowError(
      expect.objectContaining({ code: "INVALID_SCHEMA" }),
    );
  });

  it("JSONとして読めてもroot型・日時・必須sectionが壊れたbackupを拒否する", () => {
    expect(() => parseBackupText("[]")).toThrowError(
      expect.objectContaining({ code: "INVALID_SCHEMA" }),
    );

    const invalidDate = JSON.parse(validText()) as Record<string, unknown>;
    invalidDate.exportedAt = "2026年7月27日";
    expect(() => parseBackupText(JSON.stringify(invalidDate))).toThrowError(
      expect.objectContaining({ code: "INVALID_SCHEMA" }),
    );

    const missingSection = JSON.parse(validText()) as Record<string, unknown>;
    delete (missingSection.data as Record<string, unknown>).attempts;
    expect(() => parseBackupText(JSON.stringify(missingSection))).toThrowError(
      expect.objectContaining({ code: "INVALID_SCHEMA" }),
    );
  });
});
