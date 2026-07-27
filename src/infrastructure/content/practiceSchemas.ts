import { z } from "zod";
import { countWritingWords } from "../../domain/writing/wordCount";
import { contentSourceSchema, practiceSetSchema } from "./schemas";

const rawHtmlPattern = /<\/?[a-z][^>]*>/iu;
const localAudioAssetPattern = /^\/(?:assets\/)?audio\/(?!.*\.\.)[a-z0-9._/-]+$/iu;

const safeReadingText = (minimumLength = 1) =>
  z
    .string()
    .trim()
    .min(minimumLength)
    .refine((value) => !rawHtmlPattern.test(value), {
      message: "raw HTMLは読解教材に使用できません。",
    });

const originalReadingSourceSchema = contentSourceSchema
  .extend({
    author: safeReadingText(),
    note: safeReadingText().optional(),
  })
  .strict();

export const readingSentenceSchema = z
  .object({
    id: z.string().trim().min(3),
    textEn: safeReadingText(),
  })
  .strict();

export const readingParagraphSchema = z
  .object({
    id: z.string().trim().min(3),
    roleJa: safeReadingText(),
    summaryJa: safeReadingText(),
    sentences: z.array(readingSentenceSchema).min(1).max(8),
  })
  .strict();

export const readingChoiceFeedbackSchema = z
  .object({
    choiceIndex: z.number().int().min(0),
    reasonJa: safeReadingText(),
  })
  .strict();

export const readingQuestionSchema = z
  .object({
    id: z.string().trim().min(3),
    promptJa: safeReadingText(),
    choices: z.array(safeReadingText()).min(2).max(5),
    correctChoiceIndex: z.number().int().min(0),
    evidenceSentenceIds: z.array(z.string().trim().min(3)).min(1),
    explanationJa: safeReadingText(),
    choiceFeedbackJa: z.array(readingChoiceFeedbackSchema).min(1),
  })
  .strict()
  .superRefine((question, context) => {
    if (question.correctChoiceIndex >= question.choices.length) {
      context.addIssue({
        code: "custom",
        path: ["correctChoiceIndex"],
        message: "正答indexが選択肢の範囲外です。",
      });
    }
    const feedbackIndexes = question.choiceFeedbackJa.map(
      (feedback) => feedback.choiceIndex,
    );
    if (new Set(feedbackIndexes).size !== feedbackIndexes.length) {
      context.addIssue({
        code: "custom",
        path: ["choiceFeedbackJa"],
        message: "誤答理由の選択肢indexが重複しています。",
      });
    }
    const expectedIndexes = question.choices
      .map((_, index) => index)
      .filter((index) => index !== question.correctChoiceIndex);
    if (
      feedbackIndexes.length !== expectedIndexes.length ||
      expectedIndexes.some((index) => !feedbackIndexes.includes(index))
    ) {
      context.addIssue({
        code: "custom",
        path: ["choiceFeedbackJa"],
        message: "正答以外のすべての選択肢に誤答理由が必要です。",
      });
    }
    if (
      new Set(question.evidenceSentenceIds).size !== question.evidenceSentenceIds.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["evidenceSentenceIds"],
        message: "根拠文IDが重複しています。",
      });
    }
  });

export const readingVocabularySchema = z
  .object({
    id: z.string().trim().min(3),
    headword: safeReadingText(),
    meaningJa: safeReadingText(),
    vocabularyItemId: z.string().trim().startsWith("vocab-"),
  })
  .strict();

export const readingPayloadSchema = z
  .object({
    passageTitleEn: safeReadingText(),
    introductionJa: safeReadingText(),
    paragraphs: z.array(readingParagraphSchema).min(2).max(8),
    questions: z.array(readingQuestionSchema).min(1).max(8),
    keyVocabulary: z.array(readingVocabularySchema).min(1).max(12),
  })
  .strict()
  .superRefine((payload, context) => {
    const paragraphIds = payload.paragraphs.map((paragraph) => paragraph.id);
    if (new Set(paragraphIds).size !== paragraphIds.length) {
      context.addIssue({
        code: "custom",
        path: ["paragraphs"],
        message: "段落IDが重複しています。",
      });
    }
    const sentenceIds = payload.paragraphs.flatMap((paragraph) =>
      paragraph.sentences.map((sentence) => sentence.id),
    );
    const sentenceIdSet = new Set(sentenceIds);
    if (sentenceIdSet.size !== sentenceIds.length) {
      context.addIssue({
        code: "custom",
        path: ["paragraphs"],
        message: "文IDは教材内で一意にしてください。",
      });
    }
    const questionIds = payload.questions.map((question) => question.id);
    if (new Set(questionIds).size !== questionIds.length) {
      context.addIssue({
        code: "custom",
        path: ["questions"],
        message: "設問IDが重複しています。",
      });
    }
    for (const [questionIndex, question] of payload.questions.entries()) {
      for (const evidenceId of question.evidenceSentenceIds) {
        if (!sentenceIdSet.has(evidenceId)) {
          context.addIssue({
            code: "custom",
            path: ["questions", questionIndex, "evidenceSentenceIds"],
            message: `根拠文 ${evidenceId} が本文にありません。`,
          });
        }
      }
    }
    const vocabularyIds = payload.keyVocabulary.map((item) => item.id);
    const vocabularyItemIds = payload.keyVocabulary.map(
      (item) => item.vocabularyItemId,
    );
    if (
      new Set(vocabularyIds).size !== vocabularyIds.length ||
      new Set(vocabularyItemIds).size !== vocabularyItemIds.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["keyVocabulary"],
        message: "重要語句のIDと単語項目IDは重複できません。",
      });
    }
  });

export const readingPracticeSetSchema = practiceSetSchema
  .extend({
    type: z.literal("reading"),
    titleJa: safeReadingText(),
    descriptionJa: safeReadingText(),
    payload: readingPayloadSchema,
    tags: z.array(safeReadingText()).default([]),
    source: originalReadingSourceSchema,
  })
  .strict();

export const listeningPlaybackRateSchema = z.union([
  z.literal(0.75),
  z.literal(1),
  z.literal(1.25),
]);

const listeningSentenceSchema = z
  .object({
    id: z.string().trim().min(1),
    speaker: z.string().trim().min(1),
    text: z.string().trim().min(1),
    audioAsset: z
      .string()
      .trim()
      .regex(
        localAudioAssetPattern,
        "音声assetはアプリ内の/audio/配下を指定してください。",
      )
      .optional(),
  })
  .strict();

const listeningChoiceSchema = z
  .object({
    id: z.string().trim().min(1),
    text: z.string().trim().min(1),
  })
  .strict();

export const listeningPayloadSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    script: z
      .object({
        sentences: z.array(listeningSentenceSchema).min(2),
      })
      .strict(),
    audio: z
      .object({
        strategy: z.enum(["asset", "webSpeech", "none"]),
        language: z.string().trim().min(2),
        assetUrl: z
          .string()
          .trim()
          .regex(
            localAudioAssetPattern,
            "音声assetはアプリ内の/audio/配下を指定してください。",
          )
          .optional(),
      })
      .strict(),
    question: z
      .object({
        promptJa: z.string().trim().min(1),
        choices: z.array(listeningChoiceSchema).min(3),
        correctChoiceId: z.string().trim().min(1),
        explanationJa: z.string().trim().min(1),
      })
      .strict(),
    repeatPolicy: z
      .object({
        examMaxPlays: z.literal(1),
        reviewUnlimited: z.literal(true),
        reviewRates: z
          .tuple([z.literal(0.75), z.literal(1), z.literal(1.25)])
          .readonly(),
      })
      .strict(),
    dictationSentenceId: z.string().trim().min(1),
    qualityNoticeJa: z.string().trim().min(1),
  })
  .strict()
  .superRefine((payload, context) => {
    if (payload.audio.strategy === "asset" && !payload.audio.assetUrl) {
      context.addIssue({
        code: "custom",
        path: ["audio", "assetUrl"],
        message: "asset音声を使う教材にはassetUrlが必要です。",
      });
    }
    const sentenceIds = payload.script.sentences.map((sentence) => sentence.id);
    if (new Set(sentenceIds).size !== sentenceIds.length) {
      context.addIssue({
        code: "custom",
        path: ["script", "sentences"],
        message: "リスニングscriptの文IDが重複しています。",
      });
    }
    if (!sentenceIds.includes(payload.dictationSentenceId)) {
      context.addIssue({
        code: "custom",
        path: ["dictationSentenceId"],
        message: "ディクテーション対象の文がscript内にありません。",
      });
    }
    const choiceIds = payload.question.choices.map((choice) => choice.id);
    if (new Set(choiceIds).size !== choiceIds.length) {
      context.addIssue({
        code: "custom",
        path: ["question", "choices"],
        message: "リスニング設問の選択肢IDが重複しています。",
      });
    }
    if (!choiceIds.includes(payload.question.correctChoiceId)) {
      context.addIssue({
        code: "custom",
        path: ["question", "correctChoiceId"],
        message: "正答IDが選択肢に含まれていません。",
      });
    }
    if (
      !payload.qualityNoticeJa.includes("環境") ||
      !payload.qualityNoticeJa.includes("公式") ||
      !payload.qualityNoticeJa.includes("ありません")
    ) {
      context.addIssue({
        code: "custom",
        path: ["qualityNoticeJa"],
        message: "音声品質が環境依存であり、公式音声ではないことを明記してください。",
      });
    }
  });

export const summaryPromptPayloadSchema = z
  .object({
    instructionsJa: z.string().trim().min(1),
    sourceText: z.string().trim().min(40),
    keyPoints: z.array(z.string().trim().min(1)).min(2),
    focusJa: z.string().trim().min(1),
    sampleAnswer: z.string().trim().min(40),
    targetWordMin: z.literal(45),
    targetWordMax: z.literal(55),
  })
  .strict()
  .superRefine((payload, context) => {
    const sampleWordCount = countWritingWords(payload.sampleAnswer);
    if (
      sampleWordCount < payload.targetWordMin ||
      sampleWordCount > payload.targetWordMax
    ) {
      context.addIssue({
        code: "custom",
        path: ["sampleAnswer"],
        message: "要約の回答例は45〜55語にしてください。",
      });
    }
  });

export const opinionPromptPayloadSchema = z
  .object({
    instructionsJa: z.string().trim().min(1),
    topic: z.string().trim().min(10),
    topicJa: z.string().trim().min(1),
    points: z.array(z.string().trim().min(1)).min(3),
    reasonExamples: z.array(z.string().trim().min(1)).min(2),
    sampleAnswer: z.string().trim().min(80),
    targetWordMin: z.literal(80),
    targetWordMax: z.literal(100),
  })
  .strict()
  .superRefine((payload, context) => {
    const sampleWordCount = countWritingWords(payload.sampleAnswer);
    if (
      sampleWordCount < payload.targetWordMin ||
      sampleWordCount > payload.targetWordMax
    ) {
      context.addIssue({
        code: "custom",
        path: ["sampleAnswer"],
        message: "意見英作文の回答例は80〜100語にしてください。",
      });
    }
  });

export const speakingPayloadSchema = z
  .object({
    passageTitle: z.string().trim().min(1),
    passage: z.string().trim().min(40),
    silentReadingSeconds: z.number().int().min(1).max(120),
    no1Question: z.string().trim().min(1),
    no1GuideJa: z.string().trim().min(1),
    no1EvidenceQuote: z.string().trim().min(8),
    narrationPreparationSeconds: z.number().int().min(1).max(120),
    scenes: z
      .array(
        z
          .object({
            id: z.string().trim().min(1),
            titleJa: z.string().trim().min(1),
            description: z.string().trim().min(1),
          })
          .strict(),
      )
      .length(3),
    no3Question: z.string().trim().min(1),
    no4Question: z.string().trim().min(1),
    sampleStructureJa: z.array(z.string().trim().min(1)).min(2),
  })
  .strict()
  .superRefine((payload, context) => {
    const sceneIds = payload.scenes.map((scene) => scene.id);
    if (new Set(sceneIds).size !== sceneIds.length) {
      context.addIssue({
        code: "custom",
        path: ["scenes"],
        message: "3場面のIDはセット内で一意にしてください。",
      });
    }
    if (!payload.passage.includes(payload.no1EvidenceQuote)) {
      context.addIssue({
        code: "custom",
        path: ["no1EvidenceQuote"],
        message: "No. 1の根拠引用は本文に含まれる文字列にしてください。",
      });
    }
  });

const mockQuestionSchema = z
  .object({
    id: z.string().trim().min(1),
    prompt: z.string().trim().min(1),
    choices: z.array(z.string().trim().min(1)).min(2),
    correctChoiceIndex: z.number().int().min(0),
    explanationJa: z.string().trim().min(1),
    reviewPath: z.string().regex(/^\/(?:[a-z0-9-]+\/?)+$/u),
  })
  .strict()
  .superRefine((question, context) => {
    if (question.correctChoiceIndex >= question.choices.length) {
      context.addIssue({
        code: "custom",
        path: ["correctChoiceIndex"],
        message: "正答番号が選択肢の範囲外です。",
      });
    }
  });

const mockStimulusSchema = z
  .object({
    kind: z.enum(["passage", "script"]),
    title: z.string().trim().min(1),
    text: z.string().trim().min(40),
  })
  .strict();

export const mockPayloadSchema = z
  .object({
    noticeJa: z.string().trim().min(1),
    sections: z
      .array(
        z
          .object({
            id: z.string().trim().min(1),
            titleJa: z.string().trim().min(1),
            skill: z.enum([
              "vocabulary",
              "grammar",
              "reading",
              "listening",
              "writing",
              "speaking",
            ]),
            timeLimitSeconds: z.number().int().min(30).max(3_600),
            instructionsJa: z.string().trim().min(1),
            stimulus: mockStimulusSchema.optional(),
            questions: z.array(mockQuestionSchema).min(1),
          })
          .strict(),
      )
      .min(2),
  })
  .strict()
  .superRefine((payload, context) => {
    const sectionIds = payload.sections.map((section) => section.id);
    if (new Set(sectionIds).size !== sectionIds.length) {
      context.addIssue({
        code: "custom",
        path: ["sections"],
        message: "模試セクションIDは一意にしてください。",
      });
    }
    const questionIds = payload.sections.flatMap((section) =>
      section.questions.map((question) => question.id),
    );
    if (new Set(questionIds).size !== questionIds.length) {
      context.addIssue({
        code: "custom",
        path: ["sections"],
        message: "模試の設問IDはセット内で一意にしてください。",
      });
    }
    const supportedReviewPaths = new Set([
      "/vocabulary",
      "/course/stage/stage-5",
      "/practice/reading",
      "/practice/listening",
      "/practice/writing",
      "/practice/speaking",
    ]);
    for (const [sectionIndex, section] of payload.sections.entries()) {
      for (const [questionIndex, question] of section.questions.entries()) {
        if (!supportedReviewPaths.has(question.reviewPath)) {
          context.addIssue({
            code: "custom",
            path: ["sections", sectionIndex, "questions", questionIndex, "reviewPath"],
            message: "模試の復習先は既存の技能ルートを指定してください。",
          });
        }
      }
    }
    if (
      !payload.noticeJa.includes("アプリ独自") ||
      !payload.noticeJa.includes("公式スコアではありません")
    ) {
      context.addIssue({
        code: "custom",
        path: ["noticeJa"],
        message:
          "アプリ独自の練習指標であり、公式スコアではないことを明記してください。",
      });
    }
  });
