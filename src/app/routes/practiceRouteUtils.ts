import type { PracticeSet } from "../../infrastructure/content/schemas";

export interface PracticePlanContext {
  planDate: string;
  blockId: string;
  itemKey: string;
}

export function readSetId(searchParams: URLSearchParams): string | undefined {
  const value = searchParams.get("setId")?.trim();
  return value === undefined || value === "" ? undefined : value;
}

export function readPlanContext(
  searchParams: URLSearchParams,
): PracticePlanContext | undefined {
  const planDate = searchParams.get("planDate")?.trim();
  const blockId = searchParams.get("blockId")?.trim();
  const itemKey = searchParams.get("itemKey")?.trim();
  return planDate === undefined ||
    planDate === "" ||
    blockId === undefined ||
    blockId === "" ||
    itemKey === undefined ||
    itemKey === ""
    ? undefined
    : { planDate, blockId, itemKey };
}

export function pathForPracticeType(type: PracticeSet["type"]): string {
  switch (type) {
    case "reading":
      return "/practice/reading";
    case "listening":
      return "/practice/listening";
    case "summary":
    case "opinion":
      return "/practice/writing";
    case "speaking":
      return "/practice/speaking";
    case "mock":
      return "/mock";
  }
}

export function searchWithSetId(
  setId: string,
  planContext?: PracticePlanContext,
): string {
  const params = new URLSearchParams({
    setId,
    ...(planContext ?? {}),
  });
  return `?${params.toString()}`;
}
