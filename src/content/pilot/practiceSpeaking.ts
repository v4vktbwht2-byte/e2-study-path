import type { PracticeSet } from "../../infrastructure/content/schemas";
import { ORIGINAL_CONTENT_SOURCE } from "./factories";

interface SpeakingSeed {
  id: string;
  stage: number;
  titleJa: string;
  topicJa: string;
  passageTitle: string;
  passage: string;
  no1Question: string;
  no1GuideJa: string;
  no1EvidenceQuote: string;
  scenes: readonly [string, string, string];
  no3Question: string;
  no4Question: string;
}

function createSpeakingSet(seed: SpeakingSeed): PracticeSet {
  return {
    id: seed.id,
    schemaVersion: "1.0.0",
    contentRevision: 1,
    type: "speaking",
    stage: seed.stage,
    titleJa: seed.titleJa,
    descriptionJa: `${seed.topicJa}について、音読・内容質問・3場面説明・意見質問を練習します。`,
    estimatedMinutes: 8,
    payload: {
      passageTitle: seed.passageTitle,
      passage: seed.passage,
      silentReadingSeconds: 20,
      no1Question: seed.no1Question,
      no1GuideJa: seed.no1GuideJa,
      no1EvidenceQuote: seed.no1EvidenceQuote,
      narrationPreparationSeconds: 20,
      scenes: seed.scenes.map((description, index) => ({
        id: `scene-${index + 1}`,
        titleJa: `場面${index + 1}`,
        description,
      })),
      no3Question: seed.no3Question,
      no4Question: seed.no4Question,
      sampleStructureJa: [
        "最初に結論を短く言います。",
        "becauseを使って理由を一つ加えます。",
        "自分の経験や具体例を一文添えます。",
      ],
    },
    tags: ["original", "speaking", `stage-${seed.stage}`],
    source: ORIGINAL_CONTENT_SOURCE,
  };
}

const SPEAKING_SEEDS: readonly SpeakingSeed[] = [
  {
    id: "speaking-community-garden",
    stage: 4,
    titleJa: "町の小さな菜園",
    topicJa: "地域の活動",
    passageTitle: "A Garden for Everyone",
    passage:
      "Mika's town had an empty space beside the library. Local people turned it into a small garden. Children now learn how vegetables grow, and older people share useful ideas with them. The garden also gives some fresh food to a nearby community kitchen. On Saturday mornings, anyone can join the work and meet new neighbors there.",
    no1Question: "How does the garden help children?",
    no1GuideJa: "子どもが何を学ぶかを本文から一文で答えます。",
    no1EvidenceQuote: "Children now learn how vegetables grow",
    scenes: [
      "A student notices that the garden needs more water during a hot week.",
      "She asks neighbors to bring unused bottles and makes simple watering tools.",
      "The plants recover, and the group shares vegetables at a weekend lunch.",
    ],
    no3Question: "Do you think community gardens are useful for towns?",
    no4Question:
      "What activity would help people in your neighborhood meet each other?",
  },
  {
    id: "speaking-school-repair",
    stage: 5,
    titleJa: "直して使うクラブ",
    topicJa: "物を長く使う工夫",
    passageTitle: "The Repair Club",
    passage:
      "At West Hill School, students started a repair club after seeing many broken lamps and small machines in the trash. A science teacher shows them how to check each item safely. The students cannot repair everything, but they learn useful skills and reduce waste. Once a month, families may bring one simple item to the club.",
    no1Question: "Why did the students start the repair club?",
    no1GuideJa: "ごみの中で見たものと、始めた理由を結び付けます。",
    no1EvidenceQuote:
      "students started a repair club after seeing many broken lamps and small machines in the trash",
    scenes: [
      "A family brings a desk lamp that no longer turns on.",
      "Two students check the cable and find a loose part with their teacher.",
      "The lamp works again, and the family donates supplies to the club.",
    ],
    no3Question: "Should schools teach students how to repair simple things?",
    no4Question: "How can people reduce waste in daily life?",
  },
  {
    id: "speaking-library-delivery",
    stage: 5,
    titleJa: "本を届ける図書館",
    topicJa: "公共サービス",
    passageTitle: "Books on the Move",
    passage:
      "Some people in Lake Town live far from the public library. To help them, the library sends a small bus to four areas every week. The bus carries books, magazines, and tablets with downloaded learning materials. Visitors can return old books and ask staff for suggestions. The service is especially popular with families and people who cannot drive.",
    no1Question: "What can visitors do on the library bus?",
    no1GuideJa: "本文にある行動から二つを選んで答えます。",
    no1EvidenceQuote: "Visitors can return old books and ask staff for suggestions.",
    scenes: [
      "A boy wants a book about stars, but the bus does not have one that day.",
      "A staff member checks the catalog and reserves a suitable book for him.",
      "The next week, the boy receives the book and shows his project to the staff.",
    ],
    no3Question: "Should towns spend money on mobile library services?",
    no4Question: "What public service is important for older people?",
  },
  {
    id: "speaking-energy-monitor",
    stage: 6,
    titleJa: "教室の電力を見える化",
    topicJa: "エネルギー利用",
    passageTitle: "Watching Our Energy Use",
    passage:
      "A high school installed simple energy monitors in its classrooms. The screens show how much electricity each room is using. Student teams compare the numbers and suggest small changes, such as turning off extra lights and adjusting air conditioners. During the first three months, the school used less electricity. Teachers say the project makes environmental choices easier to understand.",
    no1Question: "How do student teams use the information from the monitors?",
    no1GuideJa: "数値を比べた後に何をするかを答えます。",
    no1EvidenceQuote: "Student teams compare the numbers and suggest small changes",
    scenes: [
      "One class sees that its electricity use remains high after lunch.",
      "Students discover that computers are left on when the room is empty.",
      "They create reminder cards, and the next month's number becomes lower.",
    ],
    no3Question: "Is showing energy use a good way to change people's behavior?",
    no4Question: "What can schools do to protect the environment?",
  },
];

export const speakingPracticeSets: readonly PracticeSet[] =
  SPEAKING_SEEDS.map(createSpeakingSet);
