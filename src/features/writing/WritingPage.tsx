import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveStudyDay } from "../../domain/planning";
import {
  completedRubricCount,
  evaluateWritingWordCount,
  normalizeWritingRubric,
  WRITING_RUBRIC_DIMENSIONS,
  type OpinionOutline,
  type WritingRubricChecks,
  type WritingRubricDimension,
} from "../../domain/writing";
import { trackPendingUpdateWrite } from "../../infrastructure/pwa";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  InlineAlert,
} from "../../shared/components";
import {
  createWritingCommit,
  createWritingEditorSnapshot,
  describeWritingWordCount,
  hasWritingDraftContent,
  restoreWritingEditorSnapshot,
  toWritingSubmissionRecord,
} from "./model";
import { parseWritingPracticeSets, WritingContentValidationError } from "./schemas";
import styles from "./WritingPage.module.css";
import type {
  WritingEditorSnapshot,
  WritingPageProps,
  WritingPrompt,
  WritingSubmissionRecord,
} from "./types";

const SYSTEM_CLOCK = { now: () => new Date() };
const DEFAULT_AUTOSAVE_DELAY_MS = 400;
const DEFAULT_STUDY_DAY_RESOLVER = (now: Date) => resolveStudyDay(now);
const EMPTY_PROMPTS: WritingPrompt[] = [];

const RUBRIC_LABELS: Readonly<Record<WritingRubricDimension, string>> = {
  content: "内容",
  organization: "構成",
  vocabulary: "語彙",
  grammar: "文法",
};

const OUTLINE_FIELDS: ReadonlyArray<{
  key: keyof OpinionOutline;
  label: string;
  placeholder: string;
}> = [
  { key: "opinion", label: "意見", placeholder: "I think ... / I do not think ..." },
  { key: "reason1", label: "理由1", placeholder: "One reason is that ..." },
  { key: "detail1", label: "説明1", placeholder: "For example, ..." },
  { key: "reason2", label: "理由2", placeholder: "Another reason is that ..." },
  { key: "detail2", label: "説明2", placeholder: "This means that ..." },
  { key: "conclusion", label: "結論", placeholder: "For these reasons, ..." },
];

interface WritingSessionContext {
  id: string;
  startedAt: Date;
  studyDate: string;
}

interface ReadyData {
  prompt: WritingPrompt;
  editor: WritingEditorSnapshot;
  history: readonly WritingSubmissionRecord[];
  session: WritingSessionContext;
  submitted: boolean;
}

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: ReadyData }
  | { status: "error"; error: Error };

type SaveStatus = "idle" | "waiting" | "saving" | "saved" | "error";

type ParsedPromptResult =
  { status: "ready"; prompts: WritingPrompt[] } | { status: "error"; error: Error };

function toError(error: unknown, fallback: string): Error {
  return error instanceof Error ? error : new Error(fallback);
}

function newSubmissionId(promptId: string, now: Date): string {
  return `writing:${promptId}:${now.toISOString()}`;
}

function newSessionId(promptId: string, now: Date): string {
  return `writing-session:${promptId}:${now.toISOString()}`;
}

function formatSubmittedAt(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "日時不明";
  }
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function rubricHelp(prompt: WritingPrompt, dimension: WritingRubricDimension) {
  if (dimension === "content") {
    return prompt.type === "summary"
      ? "原文の中心内容を保ち、自分の意見を加えていない"
      : "自分の意見と、それを支える理由を二つ書いた";
  }
  if (dimension === "organization") {
    return prompt.type === "summary"
      ? "大切な情報を読みやすい順序でつないだ"
      : "意見・理由・説明・結論の流れを作った";
  }
  if (dimension === "vocabulary") {
    return "同じ語の繰り返しを確認し、意味に合う語を選んだ";
  }
  return "主語と動詞、時制、単数・複数を読み直した";
}

function PromptMaterial({ prompt }: { prompt: WritingPrompt }) {
  if (prompt.type === "summary") {
    return (
      <Card as="section" className={styles.material} aria-labelledby="source-title">
        <h2 id="source-title">原文</h2>
        <p className={styles.instructions}>{prompt.payload.instructionsJa}</p>
        <p className={styles.sourceText} lang="en">
          {prompt.payload.sourceText}
        </p>
        <details className={styles.guide}>
          <summary>書いた後の確認ポイント</summary>
          <p>{prompt.payload.focusJa}</p>
          <ul>
            {prompt.payload.keyPoints.map((keyPoint) => (
              <li key={keyPoint}>{keyPoint}</li>
            ))}
          </ul>
        </details>
      </Card>
    );
  }

  return (
    <Card as="section" className={styles.material} aria-labelledby="topic-title">
      <h2 id="topic-title">Topic</h2>
      <p className={styles.instructions}>{prompt.payload.instructionsJa}</p>
      <p className={styles.topic} lang="en">
        {prompt.payload.topic}
      </p>
      <p>{prompt.payload.topicJa}</p>
      <h3>Points</h3>
      <ul className={styles.points}>
        {prompt.payload.points.map((point) => (
          <li key={point} lang="en">
            {point}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function WritingPage({
  practiceSets,
  port,
  initialPromptId,
  planContext,
  clock = SYSTEM_CLOCK,
  studyDayResolver = DEFAULT_STUDY_DAY_RESOLVER,
  autosaveDelayMs = DEFAULT_AUTOSAVE_DELAY_MS,
  onReturnToToday,
}: WritingPageProps) {
  const parsedPrompts = useMemo<ParsedPromptResult>(() => {
    try {
      return {
        status: "ready",
        prompts: parseWritingPracticeSets(practiceSets),
      };
    } catch (error: unknown) {
      return {
        status: "error",
        error: toError(error, "作文課題を確認できませんでした。"),
      };
    }
  }, [practiceSets]);
  const prompts =
    parsedPrompts.status === "ready" ? parsedPrompts.prompts : EMPTY_PROMPTS;
  const defaultPromptId =
    prompts.find((prompt) => prompt.id === initialPromptId)?.id ?? prompts[0]?.id;
  const [selectedPromptId, setSelectedPromptId] = useState(defaultPromptId);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const [completionMessage, setCompletionMessage] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const revisionRef = useRef(0);
  const activeSubmissionIdRef = useRef<string | undefined>(undefined);
  const pendingDraftRef = useRef<
    | {
        editor: WritingEditorSnapshot;
        revision: number;
      }
    | undefined
  >(undefined);
  const editorHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusedPromptIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (
      selectedPromptId === undefined ||
      prompts.some((prompt) => prompt.id === selectedPromptId)
    ) {
      return;
    }
    setSelectedPromptId(prompts[0]?.id);
  }, [prompts, selectedPromptId]);

  useEffect(() => {
    const prompt = prompts.find((candidate) => candidate.id === selectedPromptId);
    if (prompt === undefined) {
      setLoadState({ status: "loading" });
      return;
    }
    let active = true;
    const sessionStartedAt = clock.now();
    setLoadState({ status: "loading" });
    setDirty(false);
    setSaveStatus("idle");
    setSaveError(undefined);
    setSubmitError(undefined);
    setCompletionMessage(undefined);
    revisionRef.current = 0;

    void Promise.all([
      port.listSubmissions(prompt.id),
      Promise.resolve(studyDayResolver(sessionStartedAt)),
    ])
      .then(([submissions, studyDay]) => {
        if (!active) {
          return;
        }
        const compatible = submissions.filter(
          (submission) =>
            submission.promptId === prompt.id && submission.type === prompt.type,
        );
        const activeDraft = compatible.find(
          (submission) => submission.submittedAt === undefined,
        );
        const editor =
          activeDraft === undefined
            ? createWritingEditorSnapshot({
                prompt,
                now: sessionStartedAt,
                submissionId: newSubmissionId(prompt.id, sessionStartedAt),
              })
            : restoreWritingEditorSnapshot(activeDraft);
        activeSubmissionIdRef.current = editor.submissionId;
        setLoadState({
          status: "ready",
          data: {
            prompt,
            editor,
            history: compatible.filter(
              (submission) => submission.submittedAt !== undefined,
            ),
            session: {
              id: newSessionId(prompt.id, sessionStartedAt),
              startedAt: sessionStartedAt,
              studyDate: studyDay.studyDate,
            },
            submitted: false,
          },
        });
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadState({
            status: "error",
            error: toError(error, "下書きと提出履歴を読み込めませんでした。"),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [clock, port, prompts, reloadKey, selectedPromptId, studyDayResolver]);

  useEffect(() => {
    if (loadState.status === "ready") {
      const loadedPromptId = loadState.data.prompt.id;
      if (focusedPromptIdRef.current === undefined) {
        focusedPromptIdRef.current = loadedPromptId;
      } else if (focusedPromptIdRef.current !== loadedPromptId) {
        focusedPromptIdRef.current = loadedPromptId;
        editorHeadingRef.current?.focus();
      }
    }
  }, [loadState]);

  const persistEditor = useCallback(
    async (editor: WritingEditorSnapshot, revision: number): Promise<boolean> => {
      if (!hasWritingDraftContent(editor)) {
        pendingDraftRef.current = undefined;
        setDirty(false);
        setSaveStatus("idle");
        return true;
      }
      const submissionId = editor.submissionId;
      setSaveStatus("saving");
      setSaveError(undefined);
      try {
        const record = toWritingSubmissionRecord(editor, clock.now());
        await trackPendingUpdateWrite(`writing-draft:${record.id}`, () =>
          port.saveDraft(record),
        );
        if (
          activeSubmissionIdRef.current === submissionId &&
          revisionRef.current === revision
        ) {
          pendingDraftRef.current = undefined;
          setDirty(false);
          setSaveStatus("saved");
          setLoadState((current) =>
            current.status !== "ready" ||
            current.data.editor.submissionId !== submissionId
              ? current
              : {
                  status: "ready",
                  data: {
                    ...current.data,
                    editor: {
                      ...current.data.editor,
                      updatedAt: record.updatedAt,
                    },
                  },
                },
          );
        }
        return true;
      } catch (error: unknown) {
        if (activeSubmissionIdRef.current === submissionId) {
          setSaveStatus("error");
          setSaveError(
            toError(
              error,
              "下書きを保存できませんでした。入力内容は画面に残っています。",
            ).message,
          );
        }
        return false;
      }
    },
    [clock, port],
  );

  const saveCurrentDraft = useCallback(async (): Promise<boolean> => {
    if (autosaveTimerRef.current !== undefined) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = undefined;
    }
    if (loadState.status !== "ready" || !dirty || loadState.data.submitted) {
      return true;
    }
    return persistEditor(loadState.data.editor, revisionRef.current);
  }, [dirty, loadState, persistEditor]);

  useEffect(() => {
    if (loadState.status !== "ready" || !dirty || loadState.data.submitted) {
      return;
    }
    const editor = loadState.data.editor;
    const revision = revisionRef.current;
    setSaveStatus("waiting");
    if (autosaveTimerRef.current !== undefined) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(
      () => {
        autosaveTimerRef.current = undefined;
        void persistEditor(editor, revision);
      },
      Math.max(0, autosaveDelayMs),
    );
    return () => {
      if (autosaveTimerRef.current !== undefined) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = undefined;
      }
    };
  }, [autosaveDelayMs, dirty, loadState, persistEditor]);

  useEffect(
    () => () => {
      const pending = pendingDraftRef.current;
      if (pending !== undefined && hasWritingDraftContent(pending.editor)) {
        const record = toWritingSubmissionRecord(pending.editor, clock.now());
        void trackPendingUpdateWrite(`writing-draft:${record.id}`, () =>
          port.saveDraft(record),
        ).catch((error: unknown) => {
          globalThis.console.error(
            "画面遷移時のライティング下書き保存に失敗しました。",
            error,
          );
        });
      }
    },
    [clock, port],
  );

  const updateEditor = useCallback(
    (update: (editor: WritingEditorSnapshot) => WritingEditorSnapshot) => {
      revisionRef.current += 1;
      const revision = revisionRef.current;
      setDirty(true);
      setSaveStatus("waiting");
      setSaveError(undefined);
      setSubmitError(undefined);
      setCompletionMessage(undefined);
      setLoadState((current) => {
        if (current.status !== "ready") {
          return current;
        }
        const editor = update(current.data.editor);
        pendingDraftRef.current = { editor, revision };
        return {
          status: "ready",
          data: {
            ...current.data,
            editor,
            submitted: false,
          },
        };
      });
    },
    [],
  );

  const selectPrompt = async (promptId: string) => {
    if (promptId === selectedPromptId) {
      return;
    }
    const saved = await saveCurrentDraft();
    if (saved) {
      setSelectedPromptId(promptId);
    }
  };

  const submit = async (data: ReadyData) => {
    if (data.editor.draft.trim() === "") {
      setSubmitError("英文を入力してから提出してください。");
      return;
    }
    if (autosaveTimerRef.current !== undefined) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = undefined;
    }
    revisionRef.current += 1;
    pendingDraftRef.current = undefined;
    setSubmitting(true);
    setSubmitError(undefined);
    setSaveError(undefined);
    try {
      const submittedAt = clock.now();
      const commit = createWritingCommit({
        prompt: data.prompt,
        snapshot: data.editor,
        sessionId: data.session.id,
        sessionStartedAt: data.session.startedAt,
        submittedAt,
        studyDate: data.session.studyDate,
        ...(planContext === undefined ? {} : { planContext }),
      });
      const result = await trackPendingUpdateWrite(
        `writing-draft:${data.editor.submissionId}`,
        () => port.commitSubmission(commit),
      );
      setDirty(false);
      setSaveStatus("saved");
      setLoadState({
        status: "ready",
        data: {
          ...data,
          editor: {
            ...data.editor,
            updatedAt: result.submission.updatedAt,
          },
          history: [
            result.submission,
            ...data.history.filter(
              (submission) => submission.id !== result.submission.id,
            ),
          ],
          submitted: true,
        },
      });
      setCompletionMessage(
        "作文と自己評価を端末内に保存しました。自由作文のため、自動で正誤は付けていません。",
      );
    } catch (error: unknown) {
      setSubmitError(
        toError(error, "提出を保存できませんでした。入力内容は画面に残っています。")
          .message,
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (parsedPrompts.status === "error") {
    const description =
      parsedPrompts.error instanceof WritingContentValidationError
        ? `${parsedPrompts.error.message} 教材データを確認してください。`
        : parsedPrompts.error.message;
    return (
      <section className={styles.page}>
        <ErrorState
          title="作文課題を開けませんでした"
          description={description}
          headingLevel={1}
        />
      </section>
    );
  }

  if (prompts.length === 0) {
    return (
      <section className={styles.page}>
        <EmptyState
          title="練習できる作文課題がまだありません"
          description="教材を追加すると、要約と意見英作文をここで練習できます。"
          icon="✎"
          headingLevel={1}
        />
      </section>
    );
  }

  if (loadState.status === "loading") {
    return (
      <section className={styles.page} aria-busy="true">
        <h1 tabIndex={-1}>ライティングを準備しています</h1>
        <p role="status">下書きと提出履歴を読み込んでいます…</p>
      </section>
    );
  }

  if (loadState.status === "error") {
    return (
      <section className={styles.page}>
        <ErrorState
          title="ライティングを開けませんでした"
          description={loadState.error.message}
          headingLevel={1}
          onRetry={() => {
            setReloadKey((current) => current + 1);
          }}
        />
      </section>
    );
  }

  const { data } = loadState;
  const wordGuide = evaluateWritingWordCount(data.prompt.type, data.editor.draft);

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>技能別練習・ライティング</p>
          <h1>英文要約と意見英作文</h1>
          <p>正解を一つに決めず、語数・構成メモ・自己評価を使って書き直せます。</p>
        </div>
        {onReturnToToday !== undefined ? (
          <Button
            variant="tertiary"
            onClick={() => {
              void saveCurrentDraft().then((saved) => {
                if (saved) {
                  onReturnToToday();
                }
              });
            }}
          >
            今日の学習へ戻る
          </Button>
        ) : null}
      </header>

      <nav className={styles.promptList} aria-label="作文課題">
        {prompts.map((prompt) => (
          <button
            key={prompt.id}
            type="button"
            className={
              prompt.id === data.prompt.id
                ? `${styles.promptButton} ${styles.promptButtonCurrent}`
                : styles.promptButton
            }
            aria-current={prompt.id === data.prompt.id ? "page" : undefined}
            onClick={() => {
              void selectPrompt(prompt.id);
            }}
          >
            <span>{prompt.type === "summary" ? "要約" : "意見"}</span>
            <strong>{prompt.titleJa}</strong>
            <small>約{prompt.estimatedMinutes}分</small>
          </button>
        ))}
      </nav>

      <article className={styles.workspace} aria-labelledby="writing-editor-title">
        <header className={styles.editorHeader}>
          <div>
            <p className={styles.kind}>
              {data.prompt.type === "summary" ? "英文要約" : "意見英作文"}
            </p>
            <h2 id="writing-editor-title" ref={editorHeadingRef} tabIndex={-1}>
              {data.prompt.titleJa}
            </h2>
            <p>{data.prompt.descriptionJa}</p>
          </div>
          <span className={styles.localBadge}>端末内に保存</span>
        </header>

        <PromptMaterial prompt={data.prompt} />

        {data.prompt.type === "summary" ? (
          <Card as="section" className={styles.notes}>
            <label htmlFor="summary-memo">要約メモ</label>
            <p id="summary-memo-help">
              中心内容を短い語句で整理します。メモは提出履歴にも残ります。
            </p>
            <textarea
              id="summary-memo"
              rows={4}
              value={data.editor.summaryMemo}
              aria-describedby="summary-memo-help"
              disabled={data.submitted || submitting}
              onChange={(event) => {
                const value = event.currentTarget.value;
                updateEditor((editor) => ({ ...editor, summaryMemo: value }));
              }}
              onBlur={() => {
                void saveCurrentDraft();
              }}
            />
          </Card>
        ) : (
          <Card as="section" className={styles.notes}>
            <fieldset disabled={data.submitted || submitting}>
              <legend>構成メモ</legend>
              <p>英文を書く前に、意見・二つの理由・説明・結論を短く整理できます。</p>
              <div className={styles.outlineGrid}>
                {OUTLINE_FIELDS.map((field) => (
                  <label key={field.key}>
                    <span>{field.label}</span>
                    <input
                      type="text"
                      value={data.editor.opinionOutline[field.key]}
                      placeholder={field.placeholder}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        updateEditor((editor) => ({
                          ...editor,
                          opinionOutline: {
                            ...editor.opinionOutline,
                            [field.key]: value,
                          },
                        }));
                      }}
                      onBlur={() => {
                        void saveCurrentDraft();
                      }}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          </Card>
        )}

        <Card as="section" className={styles.editorCard}>
          <label htmlFor="writing-draft">英文を書く</label>
          <p id="writing-range-help">
            {data.prompt.type === "summary"
              ? "45〜55語は練習の目安です。原文の中心内容を自分の英語でまとめます。"
              : "80〜100語は練習の目安です。意見と二つの理由をつなげます。"}
          </p>
          <textarea
            id="writing-draft"
            className={styles.draft}
            lang="en"
            rows={12}
            spellCheck
            value={data.editor.draft}
            aria-describedby="writing-range-help writing-word-count"
            disabled={data.submitted || submitting}
            onChange={(event) => {
              const value = event.currentTarget.value;
              updateEditor((editor) => ({ ...editor, draft: value }));
            }}
            onBlur={() => {
              void saveCurrentDraft();
            }}
          />
          <div
            id="writing-word-count"
            className={`${styles.wordCount} ${styles[wordGuide.status]}`}
            role="status"
            aria-live="polite"
          >
            {describeWritingWordCount(data.prompt, data.editor.draft)}
          </div>
        </Card>

        <Card as="section" className={styles.rubric}>
          <fieldset disabled={data.submitted || submitting}>
            <legend>書いた後の自己評価</legend>
            <p>当てはまるものを確認します。点数や正誤には変換されません。</p>
            <div className={styles.rubricGrid}>
              {WRITING_RUBRIC_DIMENSIONS.map((dimension) => (
                <label key={dimension}>
                  <input
                    type="checkbox"
                    checked={data.editor.rubric[dimension]}
                    onChange={(event) => {
                      const checked = event.currentTarget.checked;
                      updateEditor((editor) => ({
                        ...editor,
                        rubric: {
                          ...editor.rubric,
                          [dimension]: checked,
                        } satisfies WritingRubricChecks,
                      }));
                    }}
                    onBlur={() => {
                      void saveCurrentDraft();
                    }}
                  />
                  <span>
                    <strong>{RUBRIC_LABELS[dimension]}</strong>
                    {rubricHelp(data.prompt, dimension)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </Card>

        <div className={styles.saveArea}>
          <p className={styles.saveStatus} role="status" aria-live="polite">
            {saveStatus === "waiting"
              ? "入力が止まると下書きを保存します"
              : saveStatus === "saving"
                ? "下書きを保存しています…"
                : saveStatus === "saved"
                  ? "下書きを保存しました"
                  : "下書きはこの端末に保存されます"}
          </p>
          {saveError !== undefined ? (
            <InlineAlert
              tone="danger"
              actions={
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => {
                    void saveCurrentDraft();
                  }}
                >
                  保存を再試行
                </Button>
              }
            >
              {saveError}
            </InlineAlert>
          ) : null}
          {submitError !== undefined ? (
            <InlineAlert tone="danger">{submitError}</InlineAlert>
          ) : null}
          {completionMessage !== undefined ? (
            <InlineAlert tone="success">{completionMessage}</InlineAlert>
          ) : null}
          <div className={styles.actions}>
            {data.submitted ? (
              <>
                <Button
                  onClick={() => {
                    setReloadKey((current) => current + 1);
                  }}
                >
                  同じ課題でもう一度書く
                </Button>
                {onReturnToToday !== undefined ? (
                  <Button variant="secondary" onClick={onReturnToToday}>
                    今日の学習へ戻る
                  </Button>
                ) : null}
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  disabled={!dirty || submitting}
                  onClick={() => {
                    void saveCurrentDraft();
                  }}
                >
                  下書きを保存
                </Button>
                <Button
                  isLoading={submitting}
                  loadingLabel="提出を保存中"
                  onClick={() => {
                    void submit(data);
                  }}
                >
                  自己評価と一緒に提出
                </Button>
              </>
            )}
          </div>
        </div>
      </article>

      <section className={styles.history} aria-labelledby="writing-history-title">
        <div className={styles.historyHeader}>
          <h2 id="writing-history-title">この課題の提出履歴</h2>
          <span>{data.history.length}件</span>
        </div>
        {data.history.length === 0 ? (
          <EmptyState
            title="提出履歴はまだありません"
            description="最初の作文を提出すると、語数と自己評価をここで振り返れます。"
            icon="✓"
          />
        ) : (
          <ol className={styles.historyList}>
            {data.history.map((submission) => (
              <li key={submission.id}>
                <Card as="article" padding="small">
                  <div className={styles.historyMeta}>
                    <strong>
                      {formatSubmittedAt(
                        submission.submittedAt ?? submission.updatedAt,
                      )}
                    </strong>
                    <span>{submission.wordCount}語</span>
                    <span>
                      自己評価{" "}
                      {completedRubricCount(
                        normalizeWritingRubric(submission.checklist),
                      )}
                      /4
                    </span>
                  </div>
                  <p lang="en">{submission.draft}</p>
                  <p className={styles.noScore}>
                    自由作文のため、自動の正誤判定はありません。
                  </p>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}
