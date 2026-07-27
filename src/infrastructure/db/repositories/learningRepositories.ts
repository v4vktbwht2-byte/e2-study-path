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
    await this.db.runUserDataWrite(`review-state:${state.itemKey}`, () =>
      this.db.reviewStates.put(state).then(() => undefined),
    );
  }
}

export class DexieMasteryRepository implements MasteryRepository {
  constructor(private readonly db: AppDb) {}

  get(itemKey: string) {
    return this.db.mastery.get(itemKey);
  }

  async save(profile: MasteryProfile) {
    await this.db.runUserDataWrite(`mastery:${profile.itemKey}`, () =>
      this.db.mastery.put(profile).then(() => undefined),
    );
  }
}

export class DexieVocabularyUserStateRepository implements VocabularyUserStateRepository {
  constructor(private readonly db: AppDb) {}

  get(itemKey: string) {
    return this.db.vocabularyUserStates.get(itemKey);
  }

  async save(state: VocabularyUserState) {
    await this.db.runUserDataWrite(`vocabulary-user-state:${state.itemKey}`, () =>
      this.db.vocabularyUserStates.put(state).then(() => undefined),
    );
  }
}

export class DexieLessonProgressRepository implements LessonProgressRepository {
  constructor(private readonly db: AppDb) {}

  get(lessonId: string) {
    return this.db.lessonProgress.get(lessonId);
  }

  async save(progress: LessonProgress) {
    await this.db.runUserDataWrite(`lesson-progress:${progress.lessonId}`, () =>
      this.db.lessonProgress.put(progress).then(() => undefined),
    );
  }
}

export class DexieStudySessionRepository implements StudySessionRepository {
  constructor(private readonly db: AppDb) {}

  get(id: string) {
    return this.db.sessions.get(id);
  }

  async save(session: StudySession) {
    await this.db.runUserDataWrite(`study-session:${session.id}`, () =>
      this.db.sessions.put(session).then(() => undefined),
    );
  }
}

export class DexieDailyPlanRepository implements DailyPlanRepository {
  constructor(private readonly db: AppDb) {}

  get(date: string) {
    return this.db.dailyPlans.get(date);
  }

  async save(plan: DailyPlan) {
    await this.db.runUserDataWrite(`daily-plan:${plan.date}`, () =>
      this.db.dailyPlans.put(plan).then(() => undefined),
    );
  }
}

export class DexieWritingSubmissionRepository implements WritingSubmissionRepository {
  constructor(private readonly db: AppDb) {}

  get(id: string) {
    return this.db.writingSubmissions.get(id);
  }

  async save(submission: WritingSubmission) {
    await this.db.runUserDataWrite(`writing-submission:${submission.id}`, () =>
      this.db.writingSubmissions.put(submission).then(() => undefined),
    );
  }

  listByPrompt(promptId: string) {
    return this.db.writingSubmissions.where("promptId").equals(promptId).toArray();
  }
}
