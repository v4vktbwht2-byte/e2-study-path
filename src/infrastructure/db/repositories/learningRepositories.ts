import type {
  DailyPlanRepository,
  LessonProgressRepository,
  MasteryRepository,
  ReviewStateRepository,
  StudySessionRepository,
  VocabularyUserStateRepository,
  WritingSubmissionRepository,
} from "../../../domain/repositories";
import type {
  DailyPlan,
  LessonProgress,
  MasteryProfile,
  StudySession,
  VocabularyUserState,
  WritingSubmission,
} from "../../../domain/models";
import type { ReviewState } from "../../../domain/review/types";
import type { AppDb } from "../appDb";

export class DexieReviewStateRepository implements ReviewStateRepository {
  constructor(private readonly db: AppDb) {}

  get(itemKey: string) {
    return this.db.reviewStates.get(itemKey);
  }

  listDue(dueAtOrBefore: string) {
    return this.db.reviewStates
      .where("dueAt")
      .belowOrEqual(dueAtOrBefore)
      .sortBy("dueAt");
  }

  async save(state: ReviewState) {
    await this.db.reviewStates.put(state);
  }
}

export class DexieMasteryRepository implements MasteryRepository {
  constructor(private readonly db: AppDb) {}

  get(itemKey: string) {
    return this.db.mastery.get(itemKey);
  }

  async save(profile: MasteryProfile) {
    await this.db.mastery.put(profile);
  }
}

export class DexieVocabularyUserStateRepository implements VocabularyUserStateRepository {
  constructor(private readonly db: AppDb) {}

  get(itemKey: string) {
    return this.db.vocabularyUserStates.get(itemKey);
  }

  async save(state: VocabularyUserState) {
    await this.db.vocabularyUserStates.put(state);
  }
}

export class DexieLessonProgressRepository implements LessonProgressRepository {
  constructor(private readonly db: AppDb) {}

  get(lessonId: string) {
    return this.db.lessonProgress.get(lessonId);
  }

  async save(progress: LessonProgress) {
    await this.db.lessonProgress.put(progress);
  }
}

export class DexieStudySessionRepository implements StudySessionRepository {
  constructor(private readonly db: AppDb) {}

  get(id: string) {
    return this.db.sessions.get(id);
  }

  async save(session: StudySession) {
    await this.db.sessions.put(session);
  }
}

export class DexieDailyPlanRepository implements DailyPlanRepository {
  constructor(private readonly db: AppDb) {}

  get(date: string) {
    return this.db.dailyPlans.get(date);
  }

  async save(plan: DailyPlan) {
    await this.db.dailyPlans.put(plan);
  }
}

export class DexieWritingSubmissionRepository implements WritingSubmissionRepository {
  constructor(private readonly db: AppDb) {}

  get(id: string) {
    return this.db.writingSubmissions.get(id);
  }

  async save(submission: WritingSubmission) {
    await this.db.writingSubmissions.put(submission);
  }

  listByPrompt(promptId: string) {
    return this.db.writingSubmissions.where("promptId").equals(promptId).toArray();
  }
}
