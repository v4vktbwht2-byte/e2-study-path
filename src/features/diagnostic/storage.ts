import { z } from "zod";

import { DIAGNOSTIC_AREAS, DIAGNOSTIC_STAGES } from "../../domain/diagnostic";
import { getAppDb, type AppDb } from "../../infrastructure/db/appDb";
import type {
  DiagnosticMode,
  DiagnosticSessionStore,
  SavedDiagnosticRun,
} from "./types";

const questionLevelSchema = z.enum(["foundation", "standard", "upper"]);
const responseSchema = z.enum(["correct", "incorrect", "unknown", "skipped"]);
const stageSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);
const finishReasonSchema = z.enum([
  "foundationDifficulty",
  "maxQuestions",
  "noEligibleQuestions",
  "completedByUser",
]);

const savedDiagnosticRunSchema = z
  .object({
    version: z.literal(1),
    mode: z.enum(["initial", "reassessment"]),
    session: z
      .object({
        answers: z.array(
          z
            .object({
              questionId: z.string().min(1),
              stage: stageSchema.refine((stage) => DIAGNOSTIC_STAGES.includes(stage)),
              area: z.enum(DIAGNOSTIC_AREAS),
              level: questionLevelSchema,
              response: responseSchema,
            })
            .strict(),
        ),
        maxQuestions: z.number().int().min(18).max(24),
        foundationSuppressionThreshold: z.number().int().min(2).max(3),
        foundationStopThreshold: z.number().int().min(3).max(4),
        consecutiveFoundationFailures: z.number().int().min(0),
        isComplete: z.boolean(),
        finishReason: finishReasonSchema.optional(),
      })
      .strict(),
    startedAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

const STORAGE_KEY_PREFIX = "diagnostic-session";

function storageKey(mode: DiagnosticMode) {
  return `${STORAGE_KEY_PREFIX}:${mode}`;
}

export class DiagnosticStorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DiagnosticStorageError";
  }
}

export class AppDbDiagnosticSessionStore implements DiagnosticSessionStore {
  constructor(private readonly db: AppDb = getAppDb()) {}

  async load(mode: DiagnosticMode): Promise<SavedDiagnosticRun | undefined> {
    const record = await this.db.appMeta.get(storageKey(mode));
    if (!record) {
      return undefined;
    }

    let value: unknown;
    try {
      value = JSON.parse(record.value);
    } catch (error) {
      throw new DiagnosticStorageError(
        "保存されている診断の途中状態を読み取れませんでした。",
        { cause: error },
      );
    }

    const parsed = savedDiagnosticRunSchema.safeParse(value);
    if (!parsed.success || parsed.data.mode !== mode) {
      throw new DiagnosticStorageError(
        "保存されている診断の形式が現在のアプリと一致しません。",
        { cause: parsed.error },
      );
    }

    return parsed.data;
  }

  async save(run: SavedDiagnosticRun): Promise<void> {
    const parsed = savedDiagnosticRunSchema.parse(run);
    await this.db.appMeta.put({
      key: storageKey(run.mode),
      value: JSON.stringify(parsed),
      updatedAt: run.updatedAt,
    });
  }

  async clear(mode: DiagnosticMode): Promise<void> {
    await this.db.appMeta.delete(storageKey(mode));
  }
}
