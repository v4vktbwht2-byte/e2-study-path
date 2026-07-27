import { z } from "zod";
import { DAILY_PLAN_MODES, LEARNING_SKILLS } from "../planning/types";
import { WRITING_TYPES } from "../writing/types";
import {
  BACKUP_SCHEMA_VERSION,
  BACKUP_SECTIONS,
  DEFAULT_BACKUP_SECTIONS,
  MAX_SPEAKING_RECORDING_BYTES,
  type BackupEnvelope,
  type JsonValue,
} from "./types";
import { BackupError } from "./errors";

const semverPattern = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const base64Pattern =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const audioMimePattern =
  /^audio\/(?:webm|ogg|mp4|mpeg|wav)(?:;\s*codecs=[A-Za-z0-9._,+-]+)?$/i;

const dateTimeSchema = z.string().datetime({ offset: true });
const studyDateSchema = z.string().regex(datePattern);
const semverSchema = z.string().regex(semverPattern);
const nonEmptyStringSchema = z.string().min(1);

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

const userProfileSchema = z
  .object({
    id: z.literal("local-user"),
    createdAt: dateTimeSchema,
    updatedAt: dateTimeSchema,
    goals: z.array(z.enum(["grade2", "relearn", "conversation", "vocabulary"])),
    dailyMinutes: z.number().int().min(1).max(240),
    targetExamDate: studyDateSchema.optional(),
    recommendedStage: z.number().int().min(0).max(6),
    selectedStage: z.number().int().min(0).max(6),
    onboardingCompleted: z.boolean(),
    diagnosticCompletedAt: dateTimeSchema.optional(),
  })
  .strict();

const settingsSchema = z
  .object({
    id: z.literal("settings"),
    theme: z.enum(["system", "light", "dark"]),
    fontScale: z.number().min(0.75).max(2),
    reducedMotion: z.boolean(),
    dailyNewVocabularyLimit: z.number().int().min(0).max(100),
    reviewIntensity: z.enum(["gentle", "standard", "strong"]),
    speechRate: z.number().min(0.5).max(2),
    autoPlayAudio: z.boolean(),
    showKanaPronunciationGuide: z.boolean(),
    speedAdjustmentEnabled: z.boolean(),
    studyDayStartHour: z.number().int().min(0).max(23),
  })
  .strict();

const reviewStateSchema = z
  .object({
    itemKey: nonEmptyStringSchema,
    status: z.enum(["new", "learning", "review", "relearning", "suspended"]),
    learningStep: z.number().int().min(0),
    intervalDays: z.number().min(0).max(180),
    easeBias: z.number().min(0.75).max(1.3),
    dueAt: dateTimeSchema,
    lastReviewedAt: dateTimeSchema.optional(),
    firstLearnedAt: dateTimeSchema.optional(),
    reviewCount: z.number().int().min(0),
    lapseCount: z.number().int().min(0),
    consecutiveSuccesses: z.number().int().min(0),
    predictedRetention: z.number().min(0).max(1).optional(),
    lastRating: z.enum(["again", "hard", "good", "easy"]).optional(),
    lastResponseTimeMs: z.number().int().min(0).optional(),
    suspendedReason: z.string().optional(),
    updatedAt: dateTimeSchema,
  })
  .strict();

const masterySchema = z
  .object({
    itemKey: nonEmptyStringSchema,
    recognition: z.number().min(0).max(100),
    recall: z.number().min(0).max(100),
    listening: z.number().min(0).max(100),
    spelling: z.number().min(0).max(100),
    context: z.number().min(0).max(100),
    lastUpdatedAt: dateTimeSchema,
  })
  .strict();

const vocabularyUserStateSchema = z
  .object({
    itemKey: nonEmptyStringSchema,
    favorite: z.boolean(),
    note: z.string(),
    suspended: z.boolean(),
    updatedAt: dateTimeSchema,
  })
  .strict();

const lessonProgressSchema = z
  .object({
    lessonId: nonEmptyStringSchema,
    status: z.enum(["notStarted", "inProgress", "completed", "skipped"]),
    currentSectionIndex: z.number().int().min(0),
    bestScore: z.number().min(0).max(1).optional(),
    completedAt: dateTimeSchema.optional(),
    reviewCheckpoint: z
      .object({
        planDate: studyDateSchema,
        blockId: nonEmptyStringSchema,
        currentSectionIndex: z.number().int().min(0),
        answeredExerciseIds: z.array(nonEmptyStringSchema),
        updatedAt: dateTimeSchema,
      })
      .strict()
      .optional(),
    updatedAt: dateTimeSchema,
  })
  .strict();

const attemptSchema = z
  .object({
    id: nonEmptyStringSchema,
    itemKey: nonEmptyStringSchema,
    exerciseId: nonEmptyStringSchema.optional(),
    sessionId: nonEmptyStringSchema,
    createdAt: dateTimeSchema,
    studyDate: studyDateSchema,
    mode: nonEmptyStringSchema,
    response: jsonValueSchema,
    correct: z.boolean().nullable(),
    score: z.number().min(0).max(1),
    responseTimeMs: z.number().int().min(0),
    hintCount: z.number().int().min(0),
    confidence: z.enum(["none", "low", "medium", "high"]).optional(),
    suggestedRating: z.enum(["again", "hard", "good", "easy"]).optional(),
    finalRating: z.enum(["again", "hard", "good", "easy"]).optional(),
    confusedWithItemKey: nonEmptyStringSchema.optional(),
  })
  .strict();

const studySessionSchema = z
  .object({
    id: nonEmptyStringSchema,
    type: z.enum(["daily", "lesson", "vocabulary", "review", "practice", "mock"]),
    startedAt: dateTimeSchema,
    endedAt: dateTimeSchema.optional(),
    studyDate: studyDateSchema,
    plannedMinutes: z.number().int().min(0).optional(),
    itemKeys: z.array(nonEmptyStringSchema),
    completedItemKeys: z.array(nonEmptyStringSchema),
    interrupted: z.boolean(),
  })
  .strict();

const dailyPlanBlockSchema = z
  .object({
    blockId: nonEmptyStringSchema,
    itemId: nonEmptyStringSchema,
    category: z.enum([
      "overdueReview",
      "dueReview",
      "weakItem",
      "currentLesson",
      "newVocabulary",
      "skillPractice",
    ]),
    estimatedSeconds: z.number().int().min(1),
    status: z.enum(["pending", "completed"]),
    skill: z.enum(LEARNING_SKILLS).optional(),
  })
  .strict();

const dailyPlanSchema = z
  .object({
    date: studyDateSchema,
    generatedAt: dateTimeSchema,
    targetMinutes: z.number().int().min(1),
    mode: z.enum(DAILY_PLAN_MODES),
    blocks: z.array(dailyPlanBlockSchema),
    completedBlockIds: z.array(nonEmptyStringSchema),
    sourceSnapshot: z
      .object({
        dueCount: z.number().int().min(0),
        overdueCount: z.number().int().min(0),
        newLimit: z.number().int().min(0),
      })
      .strict(),
    capacity: z
      .object({
        requestedMinutes: z.number().int().min(1),
        effectiveMinutes: z.number().int().min(0).nullable(),
        budgetSeconds: z.number().int().min(0).nullable(),
        estimatedReviewItemCapacity: z.number().int().min(0),
      })
      .strict(),
    plannedSeconds: z.number().int().min(0),
    remainingBudgetSeconds: z.number().int().min(0).nullable(),
  })
  .strict();

const opinionOutlineSchema = z
  .object({
    opinion: z.string(),
    reason1: z.string(),
    detail1: z.string(),
    reason2: z.string(),
    detail2: z.string(),
    conclusion: z.string(),
  })
  .strict();

const writingSubmissionSchema = z
  .object({
    id: nonEmptyStringSchema,
    promptId: nonEmptyStringSchema,
    type: z.enum(WRITING_TYPES),
    draft: z.string(),
    wordCount: z.number().int().min(0),
    checklist: z.record(z.string(), z.boolean()),
    summaryMemo: z.string(),
    opinionOutline: opinionOutlineSchema,
    createdAt: dateTimeSchema,
    updatedAt: dateTimeSchema,
    submittedAt: dateTimeSchema.optional(),
  })
  .strict();

function decodedBase64Size(value: string): number {
  if (value.length === 0) {
    return 0;
  }
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return (value.length / 4) * 3 - padding;
}

export const serializedSpeakingRecordingSchema = z
  .object({
    id: nonEmptyStringSchema,
    promptId: nonEmptyStringSchema,
    createdAt: dateTimeSchema,
    durationMs: z.number().int().min(0),
    mimeType: z.string().min(1).max(128).regex(audioMimePattern),
    sizeBytes: z.number().int().min(0).max(MAX_SPEAKING_RECORDING_BYTES),
    dataBase64: z.string().regex(base64Pattern),
    selfAssessment: z.record(
      z.string(),
      z.union([z.number().finite(), z.boolean(), z.string()]),
    ),
  })
  .strict()
  .superRefine((recording, context) => {
    if (decodedBase64Size(recording.dataBase64) !== recording.sizeBytes) {
      context.addIssue({
        code: "custom",
        path: ["dataBase64"],
        message: "録音の宣言サイズとBase64の復号サイズが一致しません。",
      });
    }
  });

const includedDataSchema = z
  .array(z.enum(BACKUP_SECTIONS))
  .min(DEFAULT_BACKUP_SECTIONS.length)
  .max(BACKUP_SECTIONS.length)
  .superRefine((sections, context) => {
    const unique = new Set(sections);
    if (unique.size !== sections.length) {
      context.addIssue({
        code: "custom",
        message: "includedDataに同じ対象を重複して指定できません。",
      });
    }
    for (const section of DEFAULT_BACKUP_SECTIONS) {
      if (!unique.has(section)) {
        context.addIssue({
          code: "custom",
          message: `includedDataに必須対象「${section}」がありません。`,
        });
      }
    }
  });

const backupDataSchema = z
  .object({
    profiles: z.array(userProfileSchema).max(1),
    settings: z.array(settingsSchema).length(1),
    reviewStates: z.array(reviewStateSchema),
    mastery: z.array(masterySchema),
    vocabularyUserStates: z.array(vocabularyUserStateSchema),
    lessonProgress: z.array(lessonProgressSchema),
    attempts: z.array(attemptSchema),
    sessions: z.array(studySessionSchema),
    dailyPlans: z.array(dailyPlanSchema),
    writingSubmissions: z.array(writingSubmissionSchema),
    speakingRecordings: z.array(serializedSpeakingRecordingSchema).optional(),
  })
  .strict();

const sectionKeys = {
  profiles: "id",
  settings: "id",
  reviewStates: "itemKey",
  mastery: "itemKey",
  vocabularyUserStates: "itemKey",
  lessonProgress: "lessonId",
  attempts: "id",
  sessions: "id",
  dailyPlans: "date",
  writingSubmissions: "id",
  speakingRecordings: "id",
} as const;

function reportDuplicateKeys(
  data: Record<string, unknown>,
  context: z.RefinementCtx,
): void {
  for (const [section, key] of Object.entries(sectionKeys)) {
    const records = data[section];
    if (!Array.isArray(records)) {
      continue;
    }
    const seen = new Set<unknown>();
    records.forEach((record, index) => {
      if (typeof record !== "object" || record === null) {
        return;
      }
      const value = (record as Record<string, unknown>)[key];
      if (seen.has(value)) {
        context.addIssue({
          code: "custom",
          path: ["data", section, index, key],
          message: `${section}の主キー「${String(value)}」が重複しています。`,
        });
      }
      seen.add(value);
    });
  }
}

export const backupEnvelopeSchema = z
  .object({
    schemaVersion: z.literal(BACKUP_SCHEMA_VERSION),
    exportedAt: dateTimeSchema,
    appVersion: semverSchema,
    contentVersions: z.record(nonEmptyStringSchema, semverSchema),
    includedData: includedDataSchema,
    data: backupDataSchema,
  })
  .strict()
  .superRefine((envelope, context) => {
    const includesRecordings = envelope.includedData.includes("speakingRecordings");
    if (includesRecordings !== (envelope.data.speakingRecordings !== undefined)) {
      context.addIssue({
        code: "custom",
        path: ["data", "speakingRecordings"],
        message: "speakingRecordingsはincludedDataへ指定した場合だけ含めてください。",
      });
    }
    reportDuplicateKeys(envelope.data, context);
  });

export function parseBackupEnvelope(value: unknown): BackupEnvelope {
  if (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    typeof value.schemaVersion === "string" &&
    value.schemaVersion !== BACKUP_SCHEMA_VERSION
  ) {
    throw new BackupError(
      "INCOMPATIBLE_VERSION",
      `schema version ${value.schemaVersion}には対応していません。`,
    );
  }
  const result = backupEnvelopeSchema.safeParse(value);
  if (!result.success) {
    throw new BackupError("INVALID_SCHEMA", "バックアップの形式が正しくありません。", {
      cause: result.error,
    });
  }
  return result.data;
}

export function assertCompatibleBackupVersion(envelope: {
  readonly schemaVersion: string;
}): void {
  if (envelope.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new BackupError(
      "INCOMPATIBLE_VERSION",
      `schema version ${envelope.schemaVersion}には対応していません。`,
    );
  }
}
