import type { PracticeSet } from "../../infrastructure/content/schemas";
import { ORIGINAL_CONTENT_SOURCE } from "./factories";

export const mockPracticeSets: readonly PracticeSet[] = [
  {
    id: "mock-green-town-project",
    schemaVersion: "1.0.0",
    contentRevision: 1,
    type: "mock",
    stage: 6,
    titleJa: "短縮模試・みどりの町プロジェクト",
    descriptionJa:
      "語彙・読解・リスニングを約10分で横断する、プロジェクト独自の短縮演習です。",
    estimatedMinutes: 10,
    payload: {
      noticeJa:
        "英検2級の学習目標を参考にしたオリジナル短縮演習です。結果はアプリ独自の練習指標であり、公式スコアではありません。公式問題・公式音声も使用していません。",
      sections: [
        {
          id: "language",
          titleJa: "語彙・文法",
          skill: "vocabulary",
          timeLimitSeconds: 150,
          instructionsJa: "文の意味に最も合う選択肢を1つ選んでください。",
          questions: [
            {
              id: "mock-language-1",
              prompt:
                "The city will (     ) reusable bottles to volunteers at the event.",
              choices: ["provide", "avoid", "borrow", "hide"],
              correctChoiceIndex: 0,
              explanationJa: "provide A to Bで「BにAを提供する」という意味です。",
              reviewPath: "/vocabulary",
            },
            {
              id: "mock-language-2",
              prompt: "If more residents joined the project, the park (     ) cleaner.",
              choices: ["became", "will become", "would become", "becoming"],
              correctChoiceIndex: 2,
              explanationJa:
                "実際とは異なる仮定を表すため、If節の過去形にwouldを組み合わせます。",
              reviewPath: "/course/stage/stage-5",
            },
          ],
        },
        {
          id: "reading",
          titleJa: "読解",
          skill: "reading",
          timeLimitSeconds: 240,
          instructionsJa: "英文を読み、本文の内容に最も合う選択肢を1つ選んでください。",
          stimulus: {
            kind: "passage",
            title: "A Different Kind of Bus Stop",
            text: "Residents of North Lake wanted more shade at bus stops, but the town could not build expensive roofs everywhere. A local college suggested placing large planters beside three busy stops. The plants provide some shade, collect rainwater, and make the streets more pleasant. Students visit twice a month to measure plant growth and check how much water is stored. After six months, the town will ask passengers about the project before deciding whether to expand it.",
          },
          questions: [
            {
              id: "mock-reading-1",
              prompt: "Why did the college suggest using planters?",
              choices: [
                "The town needed a less expensive way to add shade.",
                "Students wanted to sell plants to passengers.",
                "Bus drivers asked for more parking spaces.",
                "The town planned to close three bus stops.",
              ],
              correctChoiceIndex: 0,
              explanationJa:
                "高価な屋根を全てに設置できないため、日陰を作る別の方法として提案されました。",
              reviewPath: "/practice/reading",
            },
            {
              id: "mock-reading-2",
              prompt: "What will the town do before expanding the project?",
              choices: [
                "Build a new college",
                "Ask passengers for their opinions",
                "Replace all local buses",
                "Move the planters indoors",
              ],
              correctChoiceIndex: 1,
              explanationJa: "最終文のask passengers about the projectが根拠です。",
              reviewPath: "/practice/reading",
            },
          ],
        },
        {
          id: "listening",
          titleJa: "リスニング",
          skill: "listening",
          timeLimitSeconds: 180,
          instructionsJa:
            "この短縮版では端末の読み上げに頼らず、会話スクリプトを一度だけ開いて内容を確認します。",
          stimulus: {
            kind: "script",
            title: "Community Center Conversation",
            text: "Woman: Are you still collecting old phones at the community center? Man: Yes, but only until Friday. A recycling company will pick them up on Saturday morning. Woman: I have two at home. Can I bring them tomorrow evening? Man: The center closes at six tomorrow, so please come before then. Remember to remove your personal data first.",
          },
          questions: [
            {
              id: "mock-listening-1",
              prompt: "When will the recycling company collect the phones?",
              choices: [
                "Thursday evening",
                "Friday morning",
                "Saturday morning",
                "Saturday evening",
              ],
              correctChoiceIndex: 2,
              explanationJa: "男性はSaturday morningに会社が回収すると話しています。",
              reviewPath: "/practice/listening",
            },
            {
              id: "mock-listening-2",
              prompt: "What should the woman do before bringing her phones?",
              choices: [
                "Charge their batteries",
                "Remove her personal data",
                "Call the recycling company",
                "Buy a new phone",
              ],
              correctChoiceIndex: 1,
              explanationJa:
                "最後のRemember to remove your personal data first.が答えです。",
              reviewPath: "/practice/listening",
            },
          ],
        },
      ],
    },
    tags: ["original", "mock", "stage-6", "shortened"],
    source: ORIGINAL_CONTENT_SOURCE,
  },
];
