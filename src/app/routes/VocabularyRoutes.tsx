import { useMemo } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ReviewPage } from "../../features/review";
import {
  createDexieVocabularyContentPort,
  createDexieVocabularyStudyStore,
  VocabularyHubPage,
  VocabularyListPage,
  VocabularySessionPage,
  WordDetailPage,
  type VocabularyQuestionLevel,
  type VocabularySessionMode,
} from "../../features/vocabulary";
import { getAppDb } from "../../infrastructure/db/appDb";
import { getDeviceTimeZone } from "../featureAdapters";

const SESSION_MODES = new Set<VocabularySessionMode>([
  "new",
  "due",
  "weak",
  "quickSort",
  "listening",
  "spelling",
  "context",
]);

function useVocabularyAdapters() {
  return useMemo(() => {
    const db = getAppDb();
    return {
      content: createDexieVocabularyContentPort(db),
      store: createDexieVocabularyStudyStore(db),
      timeZone: getDeviceTimeZone(),
    };
  }, []);
}

function parseMode(value: string | null): VocabularySessionMode {
  return value !== null && SESSION_MODES.has(value as VocabularySessionMode)
    ? (value as VocabularySessionMode)
    : "new";
}

function parseLimit(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 30 ? parsed : fallback;
}

function parseLevel(value: string | null): VocabularyQuestionLevel | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 7
    ? (parsed as VocabularyQuestionLevel)
    : undefined;
}

function parsePlanContext(searchParams: URLSearchParams) {
  const planDate = searchParams.get("planDate")?.trim();
  const blockId = searchParams.get("blockId")?.trim();
  const itemKey = searchParams.get("itemKey")?.trim();
  return planDate && blockId && itemKey ? { planDate, blockId, itemKey } : undefined;
}

function sessionPath(
  mode: VocabularySessionMode,
  limit = mode === "new" ? 5 : 10,
  level?: VocabularyQuestionLevel,
): string {
  const query = new URLSearchParams({
    mode,
    limit: String(limit),
  });
  if (level !== undefined) {
    query.set("level", String(level));
  }
  return `/vocabulary/session?${query.toString()}`;
}

export function VocabularyRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const adapters = useVocabularyAdapters();

  if (searchParams.get("view") === "list") {
    return (
      <VocabularyListPage
        {...adapters}
        onOpenWord={(wordId) => navigate(`/vocabulary/${wordId}`)}
        onBack={() => navigate("/vocabulary")}
      />
    );
  }

  return (
    <VocabularyHubPage
      {...adapters}
      onStart={(mode, options) =>
        navigate(
          sessionPath(
            mode,
            options?.limit ?? (mode === "new" ? 5 : 10),
            options?.level,
          ),
        )
      }
      onOpenList={() => navigate("/vocabulary?view=list")}
    />
  );
}

export function VocabularySessionRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const adapters = useVocabularyAdapters();
  const mode = parseMode(searchParams.get("mode"));
  const limit = parseLimit(searchParams.get("limit"), mode === "new" ? 5 : 10);
  const level = parseLevel(searchParams.get("level"));
  const planContext = parsePlanContext(searchParams);

  return (
    <VocabularySessionPage
      key={location.key}
      {...adapters}
      mode={mode}
      limit={limit}
      level={level}
      {...(planContext === undefined
        ? {}
        : {
            explicitItemKey: planContext.itemKey,
            planContext,
          })}
      onStart={(nextMode, options) =>
        navigate(
          sessionPath(nextMode, options?.limit ?? limit, options?.level ?? level),
        )
      }
      onOpenWord={(wordId) => navigate(`/vocabulary/${wordId}`)}
      onBack={() => navigate(planContext === undefined ? "/vocabulary" : "/")}
    />
  );
}

export function WordDetailRoute() {
  const navigate = useNavigate();
  const { wordId = "" } = useParams();
  const adapters = useVocabularyAdapters();

  return (
    <WordDetailPage
      {...adapters}
      wordId={wordId}
      onBack={() => navigate("/vocabulary?view=list")}
    />
  );
}

export function ReviewRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const adapters = useVocabularyAdapters();
  const limit = parseLimit(searchParams.get("limit"), 10);
  const level = parseLevel(searchParams.get("level"));
  const planContext = parsePlanContext(searchParams);

  return (
    <ReviewPage
      key={location.key}
      {...adapters}
      limit={limit}
      level={level}
      {...(planContext === undefined
        ? {}
        : {
            explicitItemKey: planContext.itemKey,
            planContext,
          })}
      onStart={(_mode, options) => {
        const query = new URLSearchParams({ limit: String(limit) });
        const nextLevel = options?.level ?? level;
        if (nextLevel !== undefined) {
          query.set("level", String(nextLevel));
        }
        void navigate(`/review?${query.toString()}`);
      }}
      onOpenWord={(wordId) => navigate(`/vocabulary/${wordId}`)}
      onBack={() => navigate(planContext === undefined ? "/vocabulary" : "/")}
    />
  );
}
