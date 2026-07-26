import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import type { UserProfile } from "../../domain/models";
import type { ProfileRepository } from "../../domain/repositories";
import { Card, ErrorState } from "../../shared/components";
import { createPhase03FeatureAdapters } from "../featureAdapters";
import styles from "./TodayEntryRoute.module.css";

export interface TodayEntryRouteProps {
  profileRepository?: ProfileRepository;
}

type LoadState =
  | { status: "loading" }
  | { status: "ready"; profile?: UserProfile }
  | { status: "error"; message: string };

export function TodayEntryRoute({
  profileRepository,
}: TodayEntryRouteProps = {}) {
  const defaultRepository = useMemo(
    () => createPhase03FeatureAdapters().profileRepository,
    [],
  );
  const repository = profileRepository ?? defaultRepository;
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const headingRef = useRef<HTMLHeadingElement>(null);

  const load = useCallback(() => {
    let active = true;
    setState({ status: "loading" });
    void repository
      .get()
      .then((profile) => {
        if (active) {
          setState({ status: "ready", profile });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "学習設定を読み込めませんでした。",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [repository]);

  useEffect(load, [load]);

  useEffect(() => {
    if (state.status === "ready" && state.profile?.onboardingCompleted) {
      headingRef.current?.focus();
    }
  }, [state]);

  if (state.status === "loading") {
    return (
      <section className={styles.page} aria-busy="true" aria-live="polite">
        <Card as="section">
          <p role="status">今日の学習を準備しています…</p>
        </Card>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className={styles.page}>
        <h1>今日の学習</h1>
        <ErrorState
          title="学習設定を読み込めませんでした"
          description={state.message}
          onRetry={load}
        />
      </section>
    );
  }

  if (!state.profile?.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <article className={styles.page} aria-labelledby="today-title">
      <header className={styles.header}>
        <p className={styles.eyebrow}>おかえりなさい</p>
        <h1 ref={headingRef} id="today-title" tabIndex={-1}>
          今日の学習
        </h1>
        <p>
          1日{state.profile.dailyMinutes}分を目安に、ステージ
          {state.profile.selectedStage}から少しずつ進めましょう。
        </p>
      </header>

      <Card as="section" padding="large" className={styles.card}>
        <p className={styles.eyebrow}>次のおすすめ</p>
        <h2>コースから短いレッスンを始める</h2>
        <p>途中で閉じても、次回は保存した位置から続けられます。</p>
        <div className={styles.actions}>
          <a className={styles.link} href="#/course">
            コースを開く
          </a>
          <a
            className={`${styles.link} ${styles.secondary}`}
            href="#/diagnostic"
          >
            診断をやり直す
          </a>
        </div>
      </Card>
    </article>
  );
}
