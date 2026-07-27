import type { PracticeSet } from "../../infrastructure/content/schemas";
import { ORIGINAL_CONTENT_SOURCE } from "./factories";

interface ListeningSeed {
  id: string;
  stage: 2 | 3 | 4 | 5 | 6;
  titleJa: string;
  descriptionJa: string;
  speakers: readonly {
    id: string;
    speaker: string;
    text: string;
  }[];
  questionJa: string;
  choices: readonly {
    id: string;
    text: string;
  }[];
  correctChoiceId: string;
  explanationJa: string;
  dictationSentenceId: string;
  tags: readonly string[];
}

const seeds: readonly ListeningSeed[] = [
  {
    id: "listening-library-closing",
    stage: 2,
    titleJa: "図書館の閉館時間",
    descriptionJa: "短い館内放送から、今日の利用時間を聞き取ります。",
    speakers: [
      {
        id: "announcement-1",
        speaker: "Staff",
        text: "Attention, library visitors.",
      },
      {
        id: "announcement-2",
        speaker: "Staff",
        text: "The library usually closes at eight o'clock.",
      },
      {
        id: "announcement-3",
        speaker: "Staff",
        text: "Today, we will close at six because of a staff meeting.",
      },
      {
        id: "announcement-4",
        speaker: "Staff",
        text: "Please bring your books to the front desk before then.",
      },
    ],
    questionJa: "図書館は今日、何時に閉まりますか。",
    choices: [
      { id: "five", text: "5時" },
      { id: "six", text: "6時" },
      { id: "eight", text: "8時" },
    ],
    correctChoiceId: "six",
    explanationJa: "通常は8時ですが、今日は職員会議のため6時に閉まると案内しています。",
    dictationSentenceId: "announcement-3",
    tags: ["announcement", "time"],
  },
  {
    id: "listening-lunch-plan",
    stage: 2,
    titleJa: "昼食の予定",
    descriptionJa: "友人同士の会話から、予定が変わった理由を聞き取ります。",
    speakers: [
      {
        id: "lunch-1",
        speaker: "Mika",
        text: "Shall we eat lunch in the park today?",
      },
      {
        id: "lunch-2",
        speaker: "Ken",
        text: "I wanted to, but the sky is getting dark.",
      },
      {
        id: "lunch-3",
        speaker: "Mika",
        text: "The weather report says it will rain soon.",
      },
      {
        id: "lunch-4",
        speaker: "Ken",
        text: "Then let's go to the cafe across from the station.",
      },
    ],
    questionJa: "2人はなぜ公園で昼食を食べませんか。",
    choices: [
      { id: "rain", text: "雨が降りそうだから" },
      { id: "closed", text: "公園が閉まっているから" },
      { id: "late", text: "友人が遅れているから" },
    ],
    correctChoiceId: "rain",
    explanationJa:
      "空が暗くなり、天気予報でもまもなく雨だと言っているため、カフェへ変更しました。",
    dictationSentenceId: "lunch-3",
    tags: ["conversation", "weather"],
  },
  {
    id: "listening-community-garden",
    stage: 3,
    titleJa: "地域の菜園",
    descriptionJa: "地域活動の説明から、参加者が最初にすることを聞き取ります。",
    speakers: [
      {
        id: "garden-1",
        speaker: "Coordinator",
        text: "Welcome to the Riverside Community Garden.",
      },
      {
        id: "garden-2",
        speaker: "Coordinator",
        text: "Before you begin planting, please write your name on the volunteer list.",
      },
      {
        id: "garden-3",
        speaker: "Coordinator",
        text: "Gloves and tools are in the small green building.",
      },
      {
        id: "garden-4",
        speaker: "Coordinator",
        text: "At noon, we will have tea together under the large tree.",
      },
    ],
    questionJa: "参加者が最初にすることは何ですか。",
    choices: [
      { id: "get-tools", text: "道具を取りに行く" },
      { id: "write-name", text: "名簿に名前を書く" },
      { id: "make-tea", text: "お茶を用意する" },
    ],
    correctChoiceId: "write-name",
    explanationJa: "植え始める前に、ボランティア名簿へ名前を書くよう案内しています。",
    dictationSentenceId: "garden-2",
    tags: ["community", "volunteering"],
  },
  {
    id: "listening-bike-repair",
    stage: 4,
    titleJa: "自転車修理の相談",
    descriptionJa: "店員との会話から、修理品の受け取り日を判断します。",
    speakers: [
      {
        id: "bike-1",
        speaker: "Customer",
        text: "Could you repair the back wheel of my bicycle?",
      },
      {
        id: "bike-2",
        speaker: "Clerk",
        text: "We can order the new part this afternoon.",
      },
      {
        id: "bike-3",
        speaker: "Clerk",
        text: "It should arrive on Thursday, and the repair will take one more day.",
      },
      {
        id: "bike-4",
        speaker: "Customer",
        text: "Great. I will come back after work on Friday.",
      },
    ],
    questionJa: "客はいつ自転車を受け取る予定ですか。",
    choices: [
      { id: "thursday", text: "木曜日" },
      { id: "friday", text: "金曜日" },
      { id: "saturday", text: "土曜日" },
    ],
    correctChoiceId: "friday",
    explanationJa:
      "部品は木曜日に届き、修理にさらに1日かかるため、客は金曜日に戻ると言っています。",
    dictationSentenceId: "bike-3",
    tags: ["shopping", "schedule"],
  },
  {
    id: "listening-office-energy",
    stage: 5,
    titleJa: "職場の節電提案",
    descriptionJa: "会議での提案から、中心となる改善策を聞き取ります。",
    speakers: [
      {
        id: "energy-1",
        speaker: "Aya",
        text: "Our office used more electricity this summer than last summer.",
      },
      {
        id: "energy-2",
        speaker: "Luis",
        text: "We could turn off the lights in empty meeting rooms.",
      },
      {
        id: "energy-3",
        speaker: "Aya",
        text: "That will help, but the air conditioners use much more power.",
      },
      {
        id: "energy-4",
        speaker: "Aya",
        text: "I suggest setting them two degrees higher after five o'clock.",
      },
      {
        id: "energy-5",
        speaker: "Luis",
        text: "Let's try that for one month and compare the bills.",
      },
    ],
    questionJa: "2人が1か月試すことにした対策は何ですか。",
    choices: [
      { id: "lights", text: "すべての照明を新しくする" },
      { id: "temperature", text: "夕方の冷房設定温度を上げる" },
      { id: "remote", text: "毎日、在宅勤務にする" },
    ],
    correctChoiceId: "temperature",
    explanationJa:
      "5時以降にエアコンの設定温度を2度上げ、その結果を電気料金で比べる提案に合意しました。",
    dictationSentenceId: "energy-4",
    tags: ["workplace", "environment"],
  },
  {
    id: "listening-museum-sensory-hours",
    stage: 6,
    titleJa: "博物館の静かな時間",
    descriptionJa: "施設案内から、新しい取り組みの目的を聞き取ります。",
    speakers: [
      {
        id: "museum-1",
        speaker: "Host",
        text: "The Harbor Museum will introduce quiet visiting hours next month.",
      },
      {
        id: "museum-2",
        speaker: "Host",
        text: "During these hours, fewer tickets will be sold and background music will be turned off.",
      },
      {
        id: "museum-3",
        speaker: "Host",
        text: "The lights will also be softer in several galleries.",
      },
      {
        id: "museum-4",
        speaker: "Host",
        text: "The program is designed for visitors who find busy spaces or strong sounds difficult.",
      },
      {
        id: "museum-5",
        speaker: "Host",
        text: "Other visitors may attend too, but advance booking is required.",
      },
    ],
    questionJa: "博物館が「静かな時間」を設ける主な目的は何ですか。",
    choices: [
      { id: "cleaning", text: "展示室を清掃しやすくするため" },
      { id: "comfort", text: "混雑や強い音が苦手な人も見学しやすくするため" },
      { id: "music", text: "新しい音楽を紹介するため" },
    ],
    correctChoiceId: "comfort",
    explanationJa:
      "人の多い場所や強い音を負担に感じる来館者が利用しやすい環境を作ることが目的です。",
    dictationSentenceId: "museum-4",
    tags: ["accessibility", "public-facility"],
  },
];

function createListeningPracticeSet(seed: ListeningSeed): PracticeSet {
  return {
    id: seed.id,
    schemaVersion: "1.0.0",
    contentRevision: 1,
    type: "listening",
    stage: seed.stage,
    titleJa: seed.titleJa,
    descriptionJa: seed.descriptionJa,
    estimatedMinutes: seed.stage >= 5 ? 7 : 5,
    payload: {
      schemaVersion: "1.0.0",
      script: {
        sentences: seed.speakers.map((sentence) => ({ ...sentence })),
      },
      audio: {
        strategy: "webSpeech",
        language: "en-US",
      },
      question: {
        promptJa: seed.questionJa,
        choices: seed.choices.map((choice) => ({ ...choice })),
        correctChoiceId: seed.correctChoiceId,
        explanationJa: seed.explanationJa,
      },
      repeatPolicy: {
        examMaxPlays: 1,
        reviewUnlimited: true,
        reviewRates: [0.75, 1, 1.25],
      },
      dictationSentenceId: seed.dictationSentenceId,
      qualityNoticeJa:
        "この教材は本アプリ独自作成です。Web Speechの音声品質は利用環境により異なり、公式試験音声ではありません。",
    },
    tags: ["original", "listening", ...seed.tags],
    source: ORIGINAL_CONTENT_SOURCE,
  };
}

/**
 * 公式問題・公式音声を使わず、本アプリ向けに作成したPilotリスニング教材。
 * 音声assetを同梱しないPilotでは、利用可能ならWeb Speechで読み上げる。
 */
export const pilotListeningPracticeSets: readonly PracticeSet[] = seeds.map(
  createListeningPracticeSet,
);
