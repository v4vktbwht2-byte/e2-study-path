import { createUnitContent, type UnitContentSeed } from "./factories";

const upperStageUnit3Seeds = [
  {
    stage: 2,
    unitId: "S2-U3",
    order: 3,
    titleJa: "比較して違いを伝える",
    descriptionJa: "比較級・最上級・as ... asを使い、人や物の違いを表します。",
    objectivesJa: [
      "比較級とthanを使って二つを比べられる",
      "最上級とas ... asの基本形を理解できる",
    ],
    explanationJa:
      "二つを比べるときは形容詞の比較級とthanを使います。三つ以上の中で一番を表すときは最上級を使い、同じ程度ならas ... asで挟みます。",
    examples: [
      { en: "This bag is lighter than mine.", ja: "このかばんは私のより軽いです。" },
      {
        en: "Ken is the tallest in his class.",
        ja: "ケンはクラスで一番背が高いです。",
      },
    ],
    recallJa:
      "身近な二つの物を選び、bigger thanまたはsmaller thanを使って一文を作りましょう。",
    summaryJa:
      "二つなら比較級＋than、一番ならthe＋最上級を使います。同じ程度はas＋形容詞＋asで表せます。",
    topicTags: ["comparison", "describing-differences"],
    prerequisiteUnitId: "S2-U2",
    exercises: [
      {
        prompt: "This bag is ___ than that one. の空所に入る語を選んでください。",
        choices: ["light", "lighter", "lightest", "more light"],
        answer: 1,
        explanation: "二つのかばんをthanで比べているので、比較級lighterを使います。",
        hint: "短い形容詞には-erを付けることが多いです。",
        targetSkills: ["grammar"],
        targetMasteryDimensions: ["recall", "context"],
      },
      {
        prompt: "Mt. Fuji is ___ mountain in Japan. の空所を選んでください。",
        choices: ["high", "higher", "the highest", "as high"],
        answer: 2,
        explanation: "日本の山の中で一番高いので、the highestを使います。",
        hint: "一番を表す形にはtheが付きます。",
        targetSkills: ["grammar", "reading"],
        targetMasteryDimensions: ["recall", "context"],
      },
      {
        prompt: "My room is as ___ as yours. の空所に入る語を選んでください。",
        choices: ["large", "larger", "largest", "more large"],
        answer: 0,
        explanation: "asとasの間には形容詞の基本形largeを置きます。",
        hint: "同じ程度を表すas ... asの形です。",
        targetSkills: ["grammar"],
        targetMasteryDimensions: ["recall", "context"],
      },
      {
        prompt: "goodの比較級を選んでください。",
        choices: ["gooder", "more good", "better", "best"],
        answer: 2,
        explanation: "goodの比較級は不規則に変化してbetterです。",
        hint: "bestは最上級です。",
        targetSkills: ["grammar", "vocabulary"],
        targetMasteryDimensions: ["recall"],
      },
      {
        prompt: "二つの町を正しく比べている文を選んでください。",
        choices: [
          "This town is quieter than the city.",
          "This town is quietest than the city.",
          "This town quieter the city.",
          "This town is as quieter as the city.",
        ],
        answer: 0,
        explanation: "quieter thanで「都市より静か」を正しく表しています。",
        hint: "比較級の後ろにthanがある文を探します。",
        targetSkills: ["grammar", "reading"],
        targetMasteryDimensions: ["recognition", "context"],
      },
    ],
  },
  {
    stage: 3,
    unitId: "S3-U3",
    order: 3,
    titleJa: "関係代名詞で説明を加える",
    descriptionJa: "who・which・thatを使い、人や物の説明を一文につなげます。",
    objectivesJa: [
      "人を説明するwhoと物を説明するwhichを選べる",
      "二つの短い文を関係代名詞でつなげられる",
    ],
    explanationJa:
      "関係代名詞は、直前の人や物へ説明を加えます。人にはwho、物にはwhichを使い、基本的な文ではどちらにもthatを使える場合があります。",
    examples: [
      {
        en: "I know a woman who speaks French.",
        ja: "私はフランス語を話す女性を知っています。",
      },
      {
        en: "This is the book which I bought yesterday.",
        ja: "これは私が昨日買った本です。",
      },
    ],
    recallJa:
      "身近な人を一人思い浮かべ、a person who ...の後ろにその人の行動を加えてみましょう。",
    summaryJa:
      "人の説明にはwho、物の説明にはwhichが基本です。関係代名詞の後ろに、追加したい説明を続けます。",
    topicTags: ["relative-clauses", "sentence-connection"],
    prerequisiteUnitId: "S3-U2",
    exercises: [
      {
        prompt: "The boy ___ is running is my brother. の空所を選んでください。",
        choices: ["who", "which", "where", "when"],
        answer: 0,
        explanation: "人であるthe boyを説明するのでwhoを使います。",
        hint: "人を説明する関係代名詞です。",
        targetSkills: ["grammar"],
        targetMasteryDimensions: ["recall", "context"],
      },
      {
        prompt: "This is a camera ___ was made in Japan. の空所を選んでください。",
        choices: ["who", "which", "when", "whose"],
        answer: 1,
        explanation: "物であるa cameraを説明するのでwhichを使います。",
        hint: "物を説明する関係代名詞です。",
        targetSkills: ["grammar"],
        targetMasteryDimensions: ["recall", "context"],
      },
      {
        prompt: "「私は大阪に住む友達がいます。」に合う英文を選んでください。",
        choices: [
          "I have a friend who lives in Osaka.",
          "I have a friend which live in Osaka.",
          "I who have a friend lives Osaka.",
          "I have who a friend in Osaka.",
        ],
        answer: 0,
        explanation: "a friendをwho lives in Osakaで説明する文が自然です。",
        hint: "人を表すfriendのすぐ後ろにwhoを置きます。",
        targetSkills: ["grammar", "reading"],
        targetMasteryDimensions: ["recall", "context"],
      },
      {
        prompt: "I read the book ___ you recommended. の空所に入る語を選んでください。",
        choices: ["that", "who", "where", "what"],
        answer: 0,
        explanation: "物であるthe bookに説明を加えるため、thatを使えます。",
        hint: "この文ではwhichの代わりにも使える語です。",
        targetSkills: ["grammar", "reading"],
        targetMasteryDimensions: ["context", "recall"],
      },
      {
        prompt: "関係代名詞を使って二つの内容をつないだ文を選んでください。",
        choices: [
          "The dog that has a red collar is mine.",
          "The dog has that a red collar is mine.",
          "That the dog a red collar mine.",
          "The dog which red collar has mine.",
        ],
        answer: 0,
        explanation: "that has a red collarがthe dogへ説明を加えています。",
        hint: "the dogの直後から説明が続く文を探します。",
        targetSkills: ["grammar", "reading"],
        targetMasteryDimensions: ["recognition", "context"],
      },
    ],
  },
  {
    stage: 4,
    unitId: "S4-U3",
    order: 3,
    titleJa: "不定詞と動名詞を使い分ける",
    descriptionJa: "to＋動詞と動詞の-ing形を、文の意味に合わせて選びます。",
    objectivesJa: [
      "目的を表すto不定詞を理解できる",
      "代表的な動詞の後ろで不定詞と動名詞を選べる",
    ],
    explanationJa:
      "to＋動詞の基本形は目的やこれからすることを表せます。動詞の-ing形は行動を名詞のように扱います。前の動詞によって、どちらを続けるかが決まる場合があります。",
    examples: [
      {
        en: "I went to the library to study.",
        ja: "私は勉強するため図書館へ行きました。",
      },
      { en: "She enjoys reading novels.", ja: "彼女は小説を読むことを楽しみます。" },
    ],
    recallJa: "今日する目的を一つ選び、I ... to ...の形で言ってみましょう。",
    summaryJa:
      "目的にはto＋動詞を使えます。wantやdecideの後ろはto不定詞、enjoyの後ろは動名詞が基本です。",
    topicTags: ["infinitives", "gerunds"],
    prerequisiteUnitId: "S4-U2",
    exercises: [
      {
        prompt: "I went to the store ___ some milk. の空所を選んでください。",
        choices: ["to buy", "buying", "bought", "buy"],
        answer: 0,
        explanation: "店へ行った目的を表すのでto buyを使います。",
        hint: "「買うために」という目的を表します。",
        targetSkills: ["grammar"],
        targetMasteryDimensions: ["recall", "context"],
      },
      {
        prompt: "She enjoys ___ music. の空所に入る形を選んでください。",
        choices: ["listen", "to listened", "listening to", "listens"],
        answer: 2,
        explanation: "enjoyの後ろには動名詞を置き、listenにはtoが必要です。",
        hint: "enjoy＋動詞の-ing形を使います。",
        targetSkills: ["grammar"],
        targetMasteryDimensions: ["recall", "context"],
      },
      {
        prompt: "We decided ___ early. の空所に入る形を選んでください。",
        choices: ["leave", "to leave", "leaving to", "left"],
        answer: 1,
        explanation: "decideの後ろにはto不定詞を続け、decided to leaveとします。",
        hint: "決めた内容をto＋動詞で続けます。",
        targetSkills: ["grammar"],
        targetMasteryDimensions: ["recall"],
      },
      {
        prompt: "「英語を話すことは楽しいです。」に合う英文を選んでください。",
        choices: [
          "Speaking English is fun.",
          "Speak English is fun.",
          "Spoke English to fun.",
          "Speaking English are fun.",
        ],
        answer: 0,
        explanation: "Speaking Englishを主語として「英語を話すこと」を表しています。",
        hint: "行動を主語にするときは-ing形を使えます。",
        targetSkills: ["grammar", "reading"],
        targetMasteryDimensions: ["recall", "context"],
      },
      {
        prompt: "to不定詞が目的を表している文を選んでください。",
        choices: [
          "Mika saved money to buy a bicycle.",
          "Mika wants a bicycle yesterday.",
          "Mika buying a bicycle is save.",
          "Mika was a bicycle to money.",
        ],
        answer: 0,
        explanation: "to buy a bicycleが、お金をためた目的を表しています。",
        hint: "「自転車を買うために」と読める文です。",
        targetSkills: ["grammar", "reading"],
        targetMasteryDimensions: ["recognition", "context"],
      },
    ],
  },
  {
    stage: 5,
    unitId: "S5-U3",
    order: 3,
    titleJa: "理由を添えて意見を組み立てる",
    descriptionJa: "主張・理由・具体例を順につなぎ、短い意見を分かりやすくします。",
    objectivesJa: ["意見と理由を接続表現でつなげられる", "主張を支える具体例を選べる"],
    explanationJa:
      "意見は、考えを述べるだけでなく理由を添えると伝わりやすくなります。主張、理由、具体例の順に並べ、becauseやfor exampleで関係を示します。",
    examples: [
      {
        en: "I think parks are important because people can relax there.",
        ja: "人々がくつろげるので、公園は重要だと思います。",
      },
      {
        en: "For example, children can play safely in local parks.",
        ja: "例えば、子どもは地域の公園で安全に遊べます。",
      },
    ],
    recallJa:
      "身近な場所を一つ選び、I think ... because ...の形で意見と理由を一文にしましょう。",
    summaryJa:
      "I thinkで主張し、becauseで理由、for exampleで具体例を加えます。同じ理由を繰り返さず、一つずつつなげます。",
    topicTags: ["opinion-writing", "reasons-examples"],
    prerequisiteUnitId: "S5-U2",
    exercises: [
      {
        prompt: "意見の後ろに理由を続ける接続語を選んでください。",
        choices: ["because", "although", "before", "unless"],
        answer: 0,
        explanation: "becauseは、意見や結果の理由を続けるときに使います。",
        hint: "「なぜなら」に当たる語です。",
        targetSkills: ["writing", "grammar"],
        targetMasteryDimensions: ["recall", "context"],
      },
      {
        prompt:
          "I think students should read every day. ___, reading helps them learn new words. の空所を選んでください。",
        choices: [
          "One reason is that",
          "On the other hand",
          "After that",
          "At the same time",
        ],
        answer: 0,
        explanation: "後ろの文が意見の理由なのでOne reason is thatが自然です。",
        hint: "理由を一つ示す表現を探します。",
        targetSkills: ["writing", "reading"],
        targetMasteryDimensions: ["context", "recall"],
      },
      {
        prompt: "「例えば」を表し、具体例を導く表現を選んでください。",
        choices: ["For example", "As a result", "However", "In conclusion"],
        answer: 0,
        explanation: "For exampleは、前の内容を支える具体例を示します。",
        hint: "exampleという語を含む表現です。",
        targetSkills: ["writing", "vocabulary"],
        targetMasteryDimensions: ["recall"],
      },
      {
        prompt: "「公共交通は便利だ」という意見を最もよく支える理由を選んでください。",
        choices: [
          "It allows many people to travel without driving.",
          "Some buses are painted blue.",
          "My friend has a red bicycle.",
          "The station clock is old.",
        ],
        answer: 0,
        explanation: "運転せず多くの人が移動できることは、便利さを直接支える理由です。",
        hint: "意見の「便利」と意味がつながる文を選びます。",
        targetSkills: ["writing", "reading"],
        targetMasteryDimensions: ["context", "recognition"],
      },
      {
        type: "readingQuestion",
        stimulus:
          "I think schools should have more trees. Trees give students shade on hot days. They also make the school grounds more pleasant.",
        prompt: "この短い意見の中心となる主張を選んでください。",
        choices: [
          "Schools should have more trees.",
          "All students should study trees every day.",
          "Hot days should be removed from the calendar.",
          "School grounds should be closed.",
        ],
        answer: 0,
        explanation: "最初の文が主張で、後ろの二文がその理由を説明しています。",
        hint: "I thinkの直後にある考えを確認します。",
        targetSkills: ["reading", "writing"],
        targetMasteryDimensions: ["context", "recognition"],
      },
    ],
  },
  {
    stage: 6,
    unitId: "S6-U3",
    order: 3,
    titleJa: "短い要約と意見を仕上げる",
    descriptionJa: "中心内容を残して短くまとめ、理由付きの意見へつなげます。",
    objectivesJa: [
      "段落の中心内容を短い一文にまとめられる",
      "要約と自分の意見を区別して整理できる",
    ],
    explanationJa:
      "要約では自分の考えを加えず、元の文章の中心内容を短くします。意見では立場を明確にし、文章と関係する理由を一つずつ添えます。",
    examples: [
      {
        en: "The article explains that shared bicycles can reduce short car trips.",
        ja: "その文章は、共有自転車が短距離の車移動を減らせると説明しています。",
      },
      {
        en: "I support the idea because it may reduce traffic.",
        ja: "交通量を減らす可能性があるため、私はその考えに賛成です。",
      },
    ],
    recallJa:
      "読んだ文章について「文章の中心」と「自分の意見」を一文ずつ分けて言ってみましょう。",
    summaryJa:
      "要約は元の文章の中心だけを保ちます。意見は立場、理由、必要なら具体例の順に整理します。",
    topicTags: ["summary", "opinion", "exam-preparation-original"],
    prerequisiteUnitId: "S6-U2",
    exercises: [
      {
        type: "readingQuestion",
        stimulus:
          "A town started a bicycle-sharing service near its station. More residents now use bicycles for short trips, and traffic around the station has decreased.",
        prompt: "本文の中心内容を最もよくまとめた文を選んでください。",
        choices: [
          "A bicycle-sharing service helped reduce traffic near the station.",
          "All residents stopped using the station.",
          "The town built a new station for cars.",
          "Bicycles made every trip longer.",
        ],
        answer: 0,
        explanation:
          "サービスの開始と交通量の減少という中心的な因果関係を保っています。",
        hint: "細部ではなく、起きた変化と結果をまとめます。",
        targetSkills: ["reading", "writing"],
        targetMasteryDimensions: ["context", "recognition"],
      },
      {
        prompt: "要約を書くときに最も大切な方針を選んでください。",
        choices: [
          "元の文章の中心内容を保つ",
          "元の文章にない数字を加える",
          "自分の経験だけを書く",
          "細部を一語ずつすべて写す",
        ],
        answer: 0,
        explanation: "要約は、元の文章の中心内容を短く正確に保つことが基本です。",
        hint: "情報を増やすのではなく、中心を残します。",
        targetSkills: ["writing", "reading"],
        targetMasteryDimensions: ["recognition", "context"],
      },
      {
        prompt:
          "The library extended its opening hours, so more workers can visit after work. の自然な言い換えを選んでください。",
        choices: [
          "Longer opening hours allow more workers to use the library.",
          "The library closed before workers finished work.",
          "Workers shortened all of the library's books.",
          "The library stopped serving working people.",
        ],
        answer: 0,
        explanation: "開館時間の延長により利用者が増えるという意味を保っています。",
        hint: "原因と結果が同じ文を探します。",
        targetSkills: ["reading", "vocabulary"],
        targetMasteryDimensions: ["context", "recall"],
      },
      {
        prompt: "意見と理由が自然につながっている文を選んでください。",
        choices: [
          "I support the plan because it gives students a quiet place to study.",
          "I support the plan, but quiet is a student because.",
          "The plan studies because I am a quiet place.",
          "Because the plan, students support quietly.",
        ],
        answer: 0,
        explanation: "立場を示した後、becauseで関係する理由を明確に続けています。",
        hint: "I supportとbecauseの内容が自然につながる文です。",
        targetSkills: ["writing", "grammar"],
        targetMasteryDimensions: ["context", "recognition"],
      },
      {
        type: "readingQuestion",
        stimulus:
          "Some companies let employees work from home several days a week. This can reduce commuting time. However, teams need clear ways to communicate online.",
        prompt: "本文を要約した文として最も適切なものを選んでください。",
        choices: [
          "Working from home can save travel time, but online communication is important.",
          "Every employee must work from home every day.",
          "Online communication always increases commuting time.",
          "Companies no longer need teams or communication.",
        ],
        answer: 0,
        explanation:
          "在宅勤務の利点と、オンライン連絡の必要性という両方の中心内容を保っています。",
        hint: "利点だけでなく、Howeverの後ろの注意点も含めます。",
        targetSkills: ["reading", "writing"],
        targetMasteryDimensions: ["context", "recognition"],
      },
    ],
  },
] satisfies readonly UnitContentSeed[];

const generatedUpperStageUnit3Content = upperStageUnit3Seeds.map(createUnitContent);

export const upperStageUnit3Lessons = generatedUpperStageUnit3Content.map(
  ({ lesson }) => lesson,
);
export const upperStageUnit3Exercises = generatedUpperStageUnit3Content.flatMap(
  ({ exercises }) => exercises,
);
