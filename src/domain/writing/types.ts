export const WRITING_TYPES = ["summary", "opinion"] as const;

export type WritingType = (typeof WRITING_TYPES)[number];

export const WRITING_RUBRIC_DIMENSIONS = [
  "content",
  "organization",
  "vocabulary",
  "grammar",
] as const;

export type WritingRubricDimension = (typeof WRITING_RUBRIC_DIMENSIONS)[number];

export type WritingRubricChecks = Readonly<Record<WritingRubricDimension, boolean>>;

export interface WritingWordRange {
  min: number;
  max: number;
}

export type WritingWordRangeStatus = "short" | "within" | "long";

export interface WritingWordCountGuide {
  count: number;
  range: WritingWordRange;
  status: WritingWordRangeStatus;
  difference: number;
}

export interface OpinionOutline {
  opinion: string;
  reason1: string;
  detail1: string;
  reason2: string;
  detail2: string;
  conclusion: string;
}
