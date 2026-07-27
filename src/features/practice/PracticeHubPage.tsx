import { useEffect, useMemo, useState } from "react";
import type { PracticeSet } from "../../infrastructure/content/schemas";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  InlineAlert,
} from "../../shared/components";
import styles from "./PracticeHubPage.module.css";
import type { PracticeHubPageProps, PracticeModule } from "./types";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; sets: readonly PracticeSet[] }
  | { status: "error"; message: string };

interface ModuleDefinition {
  module: PracticeModule;
  title: string;
  description: string;
  types: readonly PracticeSet["type"][];
  action: string;
}

const MODULES: readonly ModuleDefinition[] = [
  {
    module: "reading",
    title: "読解",
    description: "段落の要点と根拠文を確認しながら、英文を丁寧に読みます。",
    types: ["reading"],
    action: "読解練習を選ぶ",
  },
  {
    module: "listening",
    title: "リスニング",
    description: "一回再生の本番風と、スクリプトを使う復習を切り替えます。",
    types: ["listening"],
    action: "聞き取り練習を選ぶ",
  },
  {
    module: "writing",
    title: "ライティング",
    description: "要約と意見英作文を下書き保存し、自分の言葉で振り返ります。",
    types: ["summary", "opinion"],
    action: "作文課題を選ぶ",
  },
  {
    module: "speaking",
    title: "スピーキング",
    description: "録音またはテキストで、音読・3場面説明・意見回答を練習します。",
    types: ["speaking"],
    action: "面接練習を選ぶ",
  },
  {
    module: "mock",
    title: "短縮模試",
    description: "複数技能を短時間で横断し、次に練習する技能を見つけます。",
    types: ["mock"],
    action: "短縮模試を確認",
  },
];

export function PracticeHubPage({ port, onOpen }: PracticeHubPageProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    void port
      .loadSets()
      .then((sets) => {
        if (active) {
          setState({ status: "ready", sets });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "技能練習を読み込めませんでした。",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [port, reloadKey]);

  const moduleCounts = useMemo(() => {
    if (state.status !== "ready") {
      return new Map<PracticeModule, number>();
    }
    return new Map(
      MODULES.map((definition) => [
        definition.module,
        state.sets.filter((set) => definition.types.includes(set.type)).length,
      ]),
    );
  }, [state]);

  if (state.status === "loading") {
    return (
      <section className={styles.page} aria-busy="true">
        <h1 tabIndex={-1}>技能練習を準備しています</h1>
        <p role="status">技能練習を読み込んでいます。</p>
      </section>
    );
  }
  if (state.status === "error") {
    return (
      <ErrorState
        title="技能練習を開けませんでした"
        description={state.message}
        headingLevel={1}
        onRetry={() => setReloadKey((current) => current + 1)}
      />
    );
  }
  if (state.sets.length === 0) {
    return (
      <EmptyState
        title="技能別の教材がありません"
        description="教材を端末へ読み込んでから、もう一度お試しください。"
        headingLevel={1}
      />
    );
  }

  return (
    <article className={styles.page} aria-labelledby="practice-title">
      <header className={styles.header}>
        <p className={styles.eyebrow}>Skill practice</p>
        <h1 id="practice-title" tabIndex={-1}>
          技能練習
        </h1>
        <p>
          伸ばしたい技能を1つ選びます。どの練習も端末内に結果を保存し、途中で通信が切れても利用できます。
        </p>
      </header>
      <InlineAlert tone="info">
        英検2級の学習目標を参考にしたプロジェクト独自教材です。公式問題・公式採点ではありません。
      </InlineAlert>
      <div className={styles.grid}>
        {MODULES.map((definition) => {
          const count = moduleCounts.get(definition.module) ?? 0;
          return (
            <Card key={definition.module} as="section" className={styles.moduleCard}>
              <div>
                <p className={styles.count}>{count}セット</p>
                <h2>{definition.title}</h2>
                <p>{definition.description}</p>
              </div>
              <Button
                variant={definition.module === "reading" ? "primary" : "secondary"}
                disabled={count === 0}
                onClick={() => onOpen(definition.module)}
              >
                {definition.action}
              </Button>
            </Card>
          );
        })}
      </div>
    </article>
  );
}
