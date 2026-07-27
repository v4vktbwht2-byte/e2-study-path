import {
  WRITING_RUBRIC_DIMENSIONS,
  type OpinionOutline,
  type WritingRubricChecks,
} from "./types";

export const EMPTY_WRITING_RUBRIC: WritingRubricChecks = {
  content: false,
  organization: false,
  vocabulary: false,
  grammar: false,
};

export const EMPTY_OPINION_OUTLINE: OpinionOutline = {
  opinion: "",
  reason1: "",
  detail1: "",
  reason2: "",
  detail2: "",
  conclusion: "",
};

export function normalizeWritingRubric(
  checklist: Readonly<Record<string, boolean>>,
): WritingRubricChecks {
  return {
    content: checklist.content === true,
    organization: checklist.organization === true,
    vocabulary: checklist.vocabulary === true,
    grammar: checklist.grammar === true,
  };
}

export function completedRubricCount(rubric: WritingRubricChecks): number {
  return WRITING_RUBRIC_DIMENSIONS.filter((dimension) => rubric[dimension]).length;
}

export function hasOpinionOutlineContent(outline: OpinionOutline): boolean {
  return (
    outline.opinion.trim().length > 0 ||
    outline.reason1.trim().length > 0 ||
    outline.detail1.trim().length > 0 ||
    outline.reason2.trim().length > 0 ||
    outline.detail2.trim().length > 0 ||
    outline.conclusion.trim().length > 0
  );
}
