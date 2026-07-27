import { useId, useMemo, useState } from "react";
import { Button, InlineAlert } from "../../shared/components";
import { contentTextLanguage, segmentContentText } from "../../shared/textLanguage";
import styles from "./Lesson.module.css";
import { gradeExerciseResponse } from "./lessonModel";
import type { Exercise, LessonExerciseResult } from "./types";

export interface ExerciseRendererProps {
  exercise: Exercise;
  onResult?: (result: LessonExerciseResult) => void | Promise<void>;
}

function stringChoices(exercise: Exercise): readonly string[] {
  const choices = exercise.payload.choices;
  return Array.isArray(choices) && choices.every((value) => typeof value === "string")
    ? choices
    : [];
}

function isChoiceExercise(exercise: Exercise): boolean {
  return (
    exercise.type === "multipleChoice" ||
    exercise.type === "listenAndChoose" ||
    exercise.type === "readingQuestion"
  );
}

function isOpenResponseExercise(exercise: Exercise): boolean {
  return (
    exercise.type === "selfRecall" ||
    exercise.type === "writingPrompt" ||
    exercise.type === "speakingPrompt"
  );
}

function payloadText(exercise: Exercise, key: string): string | undefined {
  const value = exercise.payload[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function supportsSpeechSynthesis(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.speechSynthesis?.speak === "function" &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

export function ExerciseRenderer({ exercise, onResult }: ExerciseRendererProps) {
  const groupName = useId();
  const choices = useMemo(() => stringChoices(exercise), [exercise]);
  const speechSynthesisSupported = useMemo(supportsSpeechSynthesis, []);
  const readingPassage = payloadText(exercise, "passage");
  const speechText = payloadText(exercise, "speechText");
  const [singleChoice, setSingleChoice] = useState<number | undefined>();
  const [multiChoices, setMultiChoices] = useState<Set<number>>(() => new Set());
  const [textResponse, setTextResponse] = useState("");
  const [visibleHintCount, setVisibleHintCount] = useState(0);
  const [result, setResult] = useState<boolean | null | undefined>();
  const [validationMessage, setValidationMessage] = useState<string>();
  const [saveError, setSaveError] = useState<string>();
  const [audioError, setAudioError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const revealNextHint = () => {
    setVisibleHintCount((current) => Math.min(exercise.hints.length, current + 1));
  };

  const responseForExercise = (): unknown => {
    if (isChoiceExercise(exercise)) {
      return singleChoice;
    }
    if (exercise.type === "trueFalse") {
      return singleChoice === undefined ? undefined : singleChoice === 0;
    }
    if (exercise.type === "multiSelect") {
      return [...multiChoices].sort((left, right) => left - right);
    }
    return textResponse;
  };

  const playSpeech = () => {
    if (speechText === undefined || !speechSynthesisSupported) {
      return;
    }
    try {
      setAudioError(undefined);
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    } catch {
      setAudioError("音声を再生できませんでした。下の英文を読んで回答してください。");
    }
  };

  const submit = async () => {
    const response = responseForExercise();
    const isMissing =
      response === undefined ||
      (typeof response === "string" &&
        response.trim() === "" &&
        !isOpenResponseExercise(exercise)) ||
      (Array.isArray(response) && response.length === 0);
    if (isMissing) {
      setValidationMessage("答えを選ぶか入力してから確認してください。");
      return;
    }
    const graded = gradeExerciseResponse(exercise, response);
    setValidationMessage(undefined);
    setSaveError(undefined);
    setSaving(true);
    try {
      await onResult?.({
        exerciseId: exercise.id,
        correct: graded,
        response,
        hintCount: visibleHintCount,
      });
      // 保存が成功してから解説を表示し、未保存回答を確定扱いにしない。
      setResult(graded);
    } catch (error: unknown) {
      const detail =
        error instanceof Error && error.message.trim().length > 0
          ? ` ${error.message}`
          : "";
      setSaveError(`回答を保存できませんでした。もう一度お試しください。${detail}`);
    } finally {
      setSaving(false);
    }
  };

  const resetAnswer = () => {
    setResult(undefined);
    setValidationMessage(undefined);
    setSaveError(undefined);
    setSingleChoice(undefined);
    setMultiChoices(new Set());
    setTextResponse("");
  };

  return (
    <section className={styles.exercise} aria-labelledby={`${groupName}-prompt`}>
      <h3 id={`${groupName}-prompt`} lang={contentTextLanguage(exercise.prompt)}>
        {segmentContentText(exercise.prompt).map((segment, index) => (
          <span key={`${segment.text}-${index}`} lang={segment.language}>
            {segment.text}
          </span>
        ))}
      </h3>
      {exercise.instructionsJa !== undefined ? (
        <p className={styles.instructions}>{exercise.instructionsJa}</p>
      ) : null}

      {exercise.type === "readingQuestion" ? (
        readingPassage !== undefined ? (
          <section className={styles.sourceMaterial} aria-label="読解本文">
            <p lang="en">{readingPassage}</p>
          </section>
        ) : (
          <InlineAlert tone="warning">
            読解問題の本文を読み込めませんでした。
          </InlineAlert>
        )
      ) : null}

      {exercise.type === "listenAndChoose" ? (
        speechText === undefined ? (
          <InlineAlert tone="warning">
            リスニング問題の英文を読み込めませんでした。
          </InlineAlert>
        ) : speechSynthesisSupported ? (
          <>
            <Button variant="secondary" onClick={playSpeech} disabled={saving}>
              英文を聞く
            </Button>
            {audioError !== undefined ? (
              <InlineAlert tone="warning" role="alert">
                {audioError}
                <span className={styles.fallbackSpeech} lang="en">
                  {speechText}
                </span>
              </InlineAlert>
            ) : null}
          </>
        ) : (
          <InlineAlert tone="info" title="音声の代わりに英文を表示します">
            <span className={styles.fallbackSpeech} lang="en">
              {speechText}
            </span>
          </InlineAlert>
        )
      ) : null}

      {isChoiceExercise(exercise) ? (
        choices.length > 0 ? (
          <fieldset className={styles.choiceGroup}>
            <legend className={styles.srOnly}>答えを1つ選んでください</legend>
            {choices.map((choice, index) => (
              <label key={`${choice}-${index}`} className={styles.choice}>
                <input
                  type="radio"
                  name={groupName}
                  value={index}
                  checked={singleChoice === index}
                  disabled={saving}
                  onChange={() => {
                    setSingleChoice(index);
                    setValidationMessage(undefined);
                    setSaveError(undefined);
                  }}
                />
                <span lang={contentTextLanguage(choice)}>
                  {segmentContentText(choice).map((segment, segmentIndex) => (
                    <span
                      key={`${segment.text}-${segmentIndex}`}
                      lang={segment.language}
                    >
                      {segment.text}
                    </span>
                  ))}
                </span>
              </label>
            ))}
          </fieldset>
        ) : (
          <InlineAlert tone="warning">
            この問題の選択肢を読み込めませんでした。
          </InlineAlert>
        )
      ) : null}

      {exercise.type === "trueFalse" ? (
        <fieldset className={styles.choiceGroup}>
          <legend className={styles.srOnly}>正しいか違うかを選んでください</legend>
          {["正しい", "違う"].map((choice, index) => (
            <label key={choice} className={styles.choice}>
              <input
                type="radio"
                name={groupName}
                checked={singleChoice === index}
                disabled={saving}
                onChange={() => {
                  setSingleChoice(index);
                  setValidationMessage(undefined);
                  setSaveError(undefined);
                }}
              />
              <span>{choice}</span>
            </label>
          ))}
        </fieldset>
      ) : null}

      {exercise.type === "multiSelect" ? (
        <fieldset className={styles.choiceGroup}>
          <legend className={styles.srOnly}>
            当てはまる答えをすべて選んでください
          </legend>
          {choices.map((choice, index) => (
            <label key={`${choice}-${index}`} className={styles.choice}>
              <input
                type="checkbox"
                checked={multiChoices.has(index)}
                disabled={saving}
                onChange={(event) => {
                  setMultiChoices((current) => {
                    const next = new Set(current);
                    if (event.target.checked) {
                      next.add(index);
                    } else {
                      next.delete(index);
                    }
                    return next;
                  });
                  setValidationMessage(undefined);
                  setSaveError(undefined);
                }}
              />
              <span lang={contentTextLanguage(choice)}>
                {segmentContentText(choice).map((segment, segmentIndex) => (
                  <span key={`${segment.text}-${segmentIndex}`} lang={segment.language}>
                    {segment.text}
                  </span>
                ))}
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}

      {!isChoiceExercise(exercise) &&
      exercise.type !== "trueFalse" &&
      exercise.type !== "multiSelect" ? (
        <label className={styles.answerField}>
          <span>
            {isOpenResponseExercise(exercise)
              ? "考えたことを書いてみましょう（任意）"
              : "答え"}
          </span>
          {isOpenResponseExercise(exercise) ? (
            <textarea
              lang="en"
              rows={4}
              value={textResponse}
              disabled={saving}
              onChange={(event) => {
                setTextResponse(event.target.value);
                setSaveError(undefined);
              }}
            />
          ) : (
            <input
              lang="en"
              value={textResponse}
              autoComplete="off"
              disabled={saving}
              onChange={(event) => {
                setTextResponse(event.target.value);
                setValidationMessage(undefined);
                setSaveError(undefined);
              }}
            />
          )}
        </label>
      ) : null}

      {visibleHintCount > 0 ? (
        <div className={styles.hints} aria-live="polite">
          <p className={styles.hintTitle}>ヒント</p>
          <ol>
            {exercise.hints.slice(0, visibleHintCount).map((hint, index) => (
              <li key={`${hint}-${index}`}>{hint}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {validationMessage !== undefined ? (
        <InlineAlert tone="warning" role="alert">
          {validationMessage}
        </InlineAlert>
      ) : null}

      {saveError !== undefined ? (
        <InlineAlert tone="danger" role="alert">
          {saveError}
        </InlineAlert>
      ) : null}

      {result !== undefined ? (
        <InlineAlert
          tone={result === false ? "warning" : "success"}
          title={
            result === true
              ? "確認できました"
              : result === false
                ? "ここをもう一度見てみましょう"
                : "回答例を確認しましょう"
          }
        >
          <p>{exercise.explanation}</p>
        </InlineAlert>
      ) : null}

      <div className={styles.exerciseActions}>
        {exercise.hints.length > 0 && visibleHintCount < exercise.hints.length ? (
          <Button variant="tertiary" onClick={revealNextHint} disabled={saving}>
            ヒントを見る
          </Button>
        ) : null}
        {result === undefined ? (
          <Button
            onClick={() => {
              void submit();
            }}
            disabled={isChoiceExercise(exercise) && choices.length === 0}
            isLoading={saving}
            loadingLabel="回答を保存中"
          >
            {isOpenResponseExercise(exercise) ? "回答例を確認" : "答えを確認"}
          </Button>
        ) : result === false ? (
          <Button variant="secondary" onClick={resetAnswer}>
            もう一度
          </Button>
        ) : null}
      </div>
    </section>
  );
}
