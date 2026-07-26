import type { CurriculumStageDefinition } from "./types";

export const CURRICULUM_STAGES: readonly CurriculumStageDefinition[] = [
  {
    stage: 0,
    titleJa: "はじめての英語",
    roleJa: "英語の文字・音・最小文",
    goalJa: "英語を怖がらず、短い表現を読める",
  },
  {
    stage: 1,
    titleJa: "1文を作る",
    roleJa: "中学英語の最初の土台",
    goalJa: "自己紹介や日常の基本文を作れる",
  },
  {
    stage: 2,
    titleJa: "日常を説明する",
    roleJa: "過去・未来・比較の基礎",
    goalJa: "昨日のことや予定を短く説明できる",
  },
  {
    stage: 3,
    titleJa: "中学英語を完成する",
    roleJa: "短い文章・メール・会話",
    goalJa: "身近な話題を文と段落で理解できる",
  },
  {
    stage: 4,
    titleJa: "高校英語の基礎",
    roleJa: "準2級への橋渡し",
    goalJa: "複文と段落を理解し、意見を述べられる",
  },
  {
    stage: 5,
    titleJa: "2級への橋渡し",
    roleJa: "社会的話題・要約・理由展開",
    goalJa: "少し長い内容を整理して伝えられる",
  },
  {
    stage: 6,
    titleJa: "英検2級対策",
    roleJa: "高校卒業程度を目安にした総合演習",
    goalJa: "現行形式を参考に、技能を組み合わせて練習できる",
  },
] as const;
