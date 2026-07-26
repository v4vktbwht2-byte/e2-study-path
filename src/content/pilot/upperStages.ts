import { createUnitContent, type UnitContentSeed } from "./factories";
import { upperStageUnit3Exercises, upperStageUnit3Lessons } from "./upperStageUnit3";

const upperStageSeeds = [
  {
    stage: 2,
    unitId: "S2-U1",
    order: 1,
    titleJa: "過去の出来事を話す",
    descriptionJa: "be動詞と一般動詞の過去形で、昨日のことを表します。",
    objectivesJa: [
      "was・wereを主語に合わせて使える",
      "規則動詞と基本的な不規則動詞の過去形を使える",
    ],
    explanationJa:
      "過去のことには動詞の過去形を使います。be動詞はwasまたはwereになり、一般動詞には-edを付ける形と、wentのように変わる形があります。",
    examples: [
      { en: "I visited my aunt yesterday.", ja: "私は昨日おばを訪ねました。" },
      { en: "We went to the park.", ja: "私たちは公園へ行きました。" },
    ],
    recallJa:
      "yesterdayを使い、昨日したことを一文で言ってみましょう。動詞を過去形にできたか確認します。",
    summaryJa:
      "過去を表す語があるときは動詞の形を確認します。否定と疑問ではdidの後ろを基本形に戻します。",
    topicTags: ["past-tense", "daily-events"],
    prerequisiteUnitId: "S1-U8",
    exercises: [
      {
        prompt: "I ___ tennis yesterday. の空所に入る語を選んでください。",
        choices: ["play", "plays", "played", "playing"],
        answer: 2,
        explanation: "yesterdayがあるので、playの過去形playedを使います。",
        hint: "昨日の出来事なので-edの形を探します。",
        targetSkills: ["grammar"],
        targetMasteryDimensions: ["recall", "context"],
        diagnostic: { area: "pastFutureComparison", level: "standard" },
      },
      {
        prompt: "goの過去形を選んでください。",
        choices: ["goed", "went", "gone", "goes"],
        answer: 1,
        explanation: "goの過去形は不規則に変化してwentです。",
        hint: "goに-edを付ける形ではありません。",
        targetSkills: ["grammar", "vocabulary"],
        targetMasteryDimensions: ["recall"],
        diagnostic: { area: "pastFutureComparison", level: "standard" },
      },
      {
        prompt: "They ___ busy last week. の空所に入る語を選んでください。",
        choices: ["was", "were", "are", "did"],
        answer: 1,
        explanation: "theyに対応するbe動詞の過去形はwereです。",
        hint: "areの過去形を考えましょう。",
        targetSkills: ["grammar"],
        targetMasteryDimensions: ["recall", "context"],
      },
      {
        prompt: "「昨日、宿題をしましたか。」に合う英文を選んでください。",
        choices: [
          "Did you do your homework yesterday?",
          "Do you did your homework yesterday?",
          "Were you do your homework?",
          "Did you did your homework?",
        ],
        answer: 0,
        explanation: "過去の一般動詞の質問はDidで始め、後ろの動詞は基本形doにします。",
        hint: "Didの後ろでは動詞を基本形に戻します。",
        targetSkills: ["grammar", "reading"],
        targetMasteryDimensions: ["recall", "context"],
      },
      {
        prompt: "She did not ___ breakfast. の空所に入る語を選んでください。",
        choices: ["ate", "eats", "eat", "eating"],
        answer: 2,
        explanation: "did notの後ろには動詞の基本形eatを置きます。",
        hint: "didが過去を表すため、後ろは過去形にしません。",
        targetSkills: ["grammar"],
        targetMasteryDimensions: ["recall", "context"],
      },
    ],
  },
  {
    stage: 2,
    unitId: "S2-U2",
    order: 2,
    titleJa: "未来の予定を伝える",
    descriptionJa: "willとbe going toを使い、これからの予定や予測を表します。",
    objectivesJa: [
      "will＋動詞の基本形で未来を表せる",
      "be going toで決めている予定を伝えられる",
    ],
    explanationJa:
      "その場で決めたことや予測にはwill、すでに考えている予定にはbe going toをよく使います。どちらの後ろも動詞の基本形です。",
    examples: [
      { en: "I will call you tonight.", ja: "今夜あなたに電話します。" },
      { en: "We are going to visit Kyoto.", ja: "私たちは京都を訪れる予定です。" },
    ],
    recallJa:
      "明日することを一つ選び、I am going to ... tomorrow.の形で言ってみましょう。",
    summaryJa:
      "willとbe going toは未来を表します。willの後ろは動詞の基本形、going toの前には主語に合うbe動詞が必要です。",
    topicTags: ["future", "plans"],
    prerequisiteUnitId: "S2-U1",
    exercises: [
      {
        prompt: "I will ___ you tomorrow. の空所に入る語を選んでください。",
        choices: ["help", "helps", "helped", "helping"],
        answer: 0,
        explanation: "willの後ろには動詞の基本形helpを置きます。",
        hint: "willの後ろでは動詞の形を変えません。",
        targetSkills: ["grammar"],
        targetMasteryDimensions: ["recall", "context"],
        diagnostic: { area: "pastFutureComparison", level: "standard" },
      },
      {
        prompt: "She ___ going to study tonight. の空所に入る語を選んでください。",
        choices: ["am", "is", "are", "will"],
        answer: 1,
        explanation: "主語sheに合うbe動詞はisなので、She is going to ...とします。",
        hint: "going toの前のbe動詞を選びます。",
        targetSkills: ["grammar"],
        targetMasteryDimensions: ["recall", "context"],
      },
      {
        prompt: "「私たちは来週旅行する予定です。」に合う英文を選んでください。",
        choices: [
          "We going travel next week.",
          "We are going to travel next week.",
          "We will traveling next week.",
          "We are travel to next week.",
        ],
        answer: 1,
        explanation: "決めている予定はWe are going to travel next week.と表せます。",
        hint: "are going toの後ろにtravelを置きます。",
        targetSkills: ["grammar", "reading"],
        targetMasteryDimensions: ["recall", "context"],
      },
      {
        prompt: "It ___ rain this afternoon. の空所に入る未来表現を選んでください。",
        choices: ["will", "did", "was", "has"],
        answer: 0,
        explanation: "これからの天気の予測なのでwillを使えます。",
        hint: "未来の予測を表す助動詞です。",
        targetSkills: ["grammar"],
        targetMasteryDimensions: ["context"],
      },
      {
        prompt: "Are you going to cook dinner? への肯定の返事を選んでください。",
        choices: ["Yes, I am.", "Yes, I do.", "Yes, I will going.", "Yes, you are."],
        answer: 0,
        explanation: "Are you going to ...?への肯定の返事はYes, I am.です。",
        hint: "質問のbe動詞areに対応してamで答えます。",
        targetSkills: ["grammar", "speaking"],
        targetMasteryDimensions: ["context", "recall"],
      },
    ],
  },
  {
    stage: 3,
    unitId: "S3-U1",
    order: 1,
    titleJa: "現在完了で経験と継続を表す",
    descriptionJa: "have・has＋過去分詞で、過去と現在をつなぎます。",
    objectivesJa: [
      "現在完了の基本形を作れる",
      "経験と継続の代表的な表現を見分けられる",
    ],
    explanationJa:
      "現在完了はhaveまたはhasと過去分詞を使います。過去の経験、今まで続く状態、完了したことを現在とのつながりとして表します。",
    examples: [
      { en: "I have visited Nara twice.", ja: "私は奈良を2回訪れたことがあります。" },
      {
        en: "She has lived here for five years.",
        ja: "彼女はここに5年間住んでいます。",
      },
    ],
    recallJa:
      "行ったことのある場所を一つ選び、I have visited ...の形で言ってみましょう。",
    summaryJa:
      "現在完了はhave・has＋過去分詞です。ever、never、for、sinceなどが意味を見分ける手掛かりになります。",
    topicTags: ["present-perfect", "experience-duration"],
    prerequisiteUnitId: "S2-U3",
    exercises: [
      {
        prompt: "I ___ seen this movie before. の空所に入る語を選んでください。",
        choices: ["have", "has", "am", "did"],
        answer: 0,
        explanation: "主語Iの現在完了はhave＋過去分詞seenで作ります。",
        hint: "seenの前に置く助動詞を考えましょう。",
        targetSkills: ["grammar"],
        targetMasteryDimensions: ["recall", "context"],
        diagnostic: { area: "presentPerfect", level: "standard" },
      },
      {
        prompt: "She ___ lived in Sendai for three years. の空所を選んでください。",
        choices: ["have", "has", "is", "does"],
        answer: 1,
        explanation: "主語sheの現在完了はhas＋過去分詞で作ります。",
        hint: "he・sheにはhasを使います。",
        targetSkills: ["grammar"],
        targetMasteryDimensions: ["recall", "context"],
        diagnostic: { area: "presentPerfect", level: "standard" },
      },
      {
        prompt:
          "「あなたは北海道へ行ったことがありますか。」に合う英文を選んでください。",
        choices: [
          "Did you ever went to Hokkaido?",
          "Have you ever been to Hokkaido?",
          "Are you been to Hokkaido?",
          "Do you have go Hokkaido?",
        ],
        answer: 1,
        explanation: "経験を尋ねる現在完了はHave you ever been to ...?の形を使えます。",
        hint: "Have you everで始まる文を探します。",
        targetSkills: ["grammar", "reading"],
        targetMasteryDimensions: ["recall", "context"],
      },
      {
        prompt: "I have lived here ___ 2020. の空所に入る語を選んでください。",
        choices: ["for", "since", "during", "from"],
        answer: 1,
        explanation: "2020という開始時点の前にはsinceを使います。",
        hint: "期間ではなく、始まった時点を示しています。",
        targetSkills: ["grammar"],
        targetMasteryDimensions: ["context"],
      },
      {
        prompt:
          "He has not finished his homework ___. の空所に入る語を選んでください。",
        choices: ["yet", "ever", "since", "twice"],
        answer: 0,
        explanation: "否定文のyetは「まだ」という意味で、文末によく置きます。",
        hint: "まだ終えていないことを表します。",
        targetSkills: ["grammar", "vocabulary"],
        targetMasteryDimensions: ["context", "recall"],
      },
    ],
  },
  {
    stage: 3,
    unitId: "S3-U2",
    order: 2,
    titleJa: "受動態で出来事を中心に伝える",
    descriptionJa: "be動詞＋過去分詞で「〜される」を表します。",
    objectivesJa: [
      "受動態の基本形を作れる",
      "動作を受ける物を主語にした文を理解できる",
    ],
    explanationJa:
      "受動態は、だれがしたかより、何がどうされたかを伝えたいときに使います。主語に合うbe動詞と過去分詞を組み合わせます。",
    examples: [
      { en: "This bridge was built in 1990.", ja: "この橋は1990年に建てられました。" },
      {
        en: "English is spoken in many countries.",
        ja: "英語は多くの国で話されています。",
      },
    ],
    recallJa:
      "This book is read by many students.を、be動詞と過去分詞に分けて確認しましょう。",
    summaryJa:
      "受動態はbe動詞＋過去分詞です。時制はbe動詞の形で示し、動作主は必要ならbyで加えます。",
    topicTags: ["passive-voice", "events"],
    prerequisiteUnitId: "S3-U1",
    exercises: [
      {
        prompt: "This room ___ cleaned every day. の空所に入る語を選んでください。",
        choices: ["is", "does", "has", "was being"],
        answer: 0,
        explanation: "毎日の習慣を表す受動態なのでis cleanedを使います。",
        hint: "一つの部屋に合う現在形のbe動詞です。",
        targetSkills: ["grammar"],
        targetMasteryDimensions: ["recall", "context"],
        diagnostic: { area: "passive", level: "standard" },
      },
      {
        prompt: "The letter was ___ by Mika. の空所に入る語を選んでください。",
        choices: ["write", "wrote", "written", "writing"],
        answer: 2,
        explanation: "受動態ではbe動詞wasの後ろに過去分詞writtenを置きます。",
        hint: "writeの過去分詞を選びます。",
        targetSkills: ["grammar"],
        targetMasteryDimensions: ["recall"],
      },
      {
        prompt: "「この歌は世界中で愛されています。」に合う英文を選んでください。",
        choices: [
          "This song loves around the world.",
          "This song is loved around the world.",
          "People is love this song world.",
          "This song has loving the world.",
        ],
        answer: 1,
        explanation: "歌が愛される側なので、受動態is lovedを使います。",
        hint: "be動詞＋過去分詞の形を探します。",
        targetSkills: ["grammar", "reading"],
        targetMasteryDimensions: ["context", "recall"],
      },
      {
        prompt: "The windows ___ opened this morning. の空所を選んでください。",
        choices: ["was", "were", "are been", "did"],
        answer: 1,
        explanation: "windowsは複数で過去の出来事なのでwere openedです。",
        hint: "複数に合うbe動詞の過去形です。",
        targetSkills: ["grammar"],
        targetMasteryDimensions: ["context", "recall"],
      },
      {
        prompt: "受動態の文を選んでください。",
        choices: [
          "Aki made this cake.",
          "This cake was made by Aki.",
          "Aki is making a cake.",
          "Aki makes cakes on Sundays.",
        ],
        answer: 1,
        explanation:
          "This cake was made by Aki.は、ケーキを主語にしたbe動詞＋過去分詞の受動態です。",
        hint: "was＋過去分詞の形を探します。",
        targetSkills: ["grammar", "reading"],
        targetMasteryDimensions: ["recognition", "context"],
      },
    ],
  },
  {
    stage: 4,
    unitId: "S4-U1",
    order: 1,
    titleJa: "分詞で人や物を説明する",
    descriptionJa: "現在分詞と過去分詞を使い、名詞や感情を詳しく表します。",
    objectivesJa: [
      "-ingと-edの形が表す向きの違いを理解できる",
      "分詞を使って名詞を短く説明できる",
    ],
    explanationJa:
      "現在分詞は「〜している」、過去分詞は「〜された」の意味で名詞を説明できます。感情では、原因に-ing、人の気持ちに-edを使うことが多いです。",
    examples: [
      {
        en: "The smiling child waved at me.",
        ja: "ほほえんでいる子どもが私に手を振りました。",
      },
      { en: "I was surprised by the news.", ja: "私はその知らせに驚きました。" },
    ],
    recallJa:
      "interestingとinterestedの違いを、「興味を起こさせる物」と「興味を持つ人」に分けて説明してみましょう。",
    summaryJa:
      "動作をしている側は-ing、動作を受けた側は過去分詞が基本です。感情表現では主語との関係を確認します。",
    topicTags: ["participles", "emotion-adjectives"],
    prerequisiteUnitId: "S3-U3",
    exercises: [
      {
        prompt:
          "The movie was very ___. の空所に「おもしろかった」を表す語を選んでください。",
        choices: ["interested", "interesting", "interest", "interests"],
        answer: 1,
        explanation: "映画は興味を起こさせる側なのでinterestingを使います。",
        hint: "物が感情の原因になる場合は-ing形です。",
        targetSkills: ["grammar", "vocabulary"],
        targetMasteryDimensions: ["context", "recall"],
        diagnostic: { area: "upperGrammar", level: "upper" },
      },
      {
        prompt: "I am ___ in science. の空所に入る語を選んでください。",
        choices: ["interesting", "interested", "interest", "to interest"],
        answer: 1,
        explanation: "人が興味を持っている状態にはinterestedを使います。",
        hint: "人の気持ちを表す-ed形です。",
        targetSkills: ["grammar", "vocabulary"],
        targetMasteryDimensions: ["context"],
      },
      {
        prompt: "「窓のそばで眠っている猫」に合う表現を選んでください。",
        choices: [
          "the sleeping cat by the window",
          "the slept cat by the window",
          "the cat sleep by window",
          "the cat was window sleeping",
        ],
        answer: 0,
        explanation: "猫が眠っている側なので、現在分詞sleepingでcatを説明します。",
        hint: "「〜している猫」は-ing形を名詞の前に置けます。",
        targetSkills: ["grammar", "reading"],
        targetMasteryDimensions: ["recall", "context"],
      },
      {
        prompt:
          "The bike ___ in Japan is popular. の空所に「日本で作られた」を表す語を選んでください。",
        choices: ["making", "made", "makes", "to make"],
        answer: 1,
        explanation: "自転車は作られる側なので過去分詞madeを使います。",
        hint: "動作を受けた物を説明します。",
        targetSkills: ["grammar", "reading"],
        targetMasteryDimensions: ["context"],
      },
      {
        prompt: "正しい感情表現を選んでください。",
        choices: [
          "The long meeting was tiring.",
          "The long meeting was tired.",
          "I was tiring after the meeting.",
          "The meeting tired was long.",
        ],
        answer: 0,
        explanation: "会議が人を疲れさせる原因なのでtiringが自然です。",
        hint: "感情の原因には-ing形を使います。",
        targetSkills: ["grammar", "reading"],
        targetMasteryDimensions: ["context", "recognition"],
      },
    ],
  },
  {
    stage: 4,
    unitId: "S4-U2",
    order: 2,
    titleJa: "ifで条件と仮定を表す",
    descriptionJa: "現実的な条件と、今の事実と異なる仮定を区別します。",
    objectivesJa: [
      "if節を使って条件と結果をつなげられる",
      "仮定法過去の基本的な形を理解できる",
    ],
    explanationJa:
      "実現しそうな条件ではif節に現在形を使います。今の事実と異なる想像では、if節を過去形にしてwouldと組み合わせます。",
    examples: [
      { en: "If it rains, I will stay home.", ja: "雨が降れば、私は家にいます。" },
      {
        en: "If I had more time, I would read more.",
        ja: "もっと時間があれば、もっと読むのに。",
      },
    ],
    recallJa:
      "明日の現実的な条件をIf ...で一文、今とは違う願いをIf I had ...で一文考えてみましょう。",
    summaryJa:
      "現実的な未来条件はif＋現在形、結果にwillを使えます。事実と異なる仮定では過去形とwouldが目印です。",
    topicTags: ["conditionals", "if-clauses"],
    prerequisiteUnitId: "S4-U1",
    exercises: [
      {
        prompt: "If it ___ sunny tomorrow, we will go hiking. の空所を選んでください。",
        choices: ["is", "will be", "was", "be"],
        answer: 0,
        explanation: "未来の条件でもif節の中は現在形isを使います。",
        hint: "willは結果を表す節にあります。",
        targetSkills: ["grammar"],
        targetMasteryDimensions: ["recall", "context"],
        diagnostic: { area: "upperGrammar", level: "upper" },
      },
      {
        prompt: "「時間があれば、あなたを手伝います。」に合う英文を選んでください。",
        choices: [
          "If I have time, I will help you.",
          "If I will have time, I help you.",
          "I if have time will you help.",
          "If I had time yesterday, I help you tomorrow.",
        ],
        answer: 0,
        explanation: "現実的な条件はIf I have time、結果はI will help youと表せます。",
        hint: "if節は現在形、結果の節はwillです。",
        targetSkills: ["grammar", "reading"],
        targetMasteryDimensions: ["context", "recall"],
      },
      {
        prompt:
          "If I ___ a bird, I would fly around the world. の空所を選んでください。",
        choices: ["am", "were", "will be", "have been"],
        answer: 1,
        explanation: "現実と異なる仮定では、be動詞にwereを使う形が一般的です。",
        hint: "wouldが仮定法の手掛かりです。",
        targetSkills: ["grammar"],
        targetMasteryDimensions: ["recall", "context"],
      },
      {
        prompt: "今の事実と異なる仮定を表す文を選んでください。",
        choices: [
          "If I knew the answer, I would tell you.",
          "If I know the answer tomorrow, I will tell you.",
          "I know the answer, so I tell you.",
          "When I knew the answer yesterday, I told you.",
        ],
        answer: 0,
        explanation:
          "過去形knewとwould tellの組み合わせが、今の事実と異なる仮定を表します。",
        hint: "過去形とwouldの組を探します。",
        targetSkills: ["grammar", "reading"],
        targetMasteryDimensions: ["recognition", "context"],
      },
      {
        prompt: "If you heat ice, it ___. の空所に入る語を選んでください。",
        choices: ["melts", "will melted", "would melting", "melted always"],
        answer: 0,
        explanation: "いつも成り立つ事実では、if節も結果の節も現在形を使います。",
        hint: "氷を温めるといつも起こることです。",
        targetSkills: ["grammar"],
        targetMasteryDimensions: ["context"],
      },
    ],
  },
  {
    stage: 5,
    unitId: "S5-U1",
    order: 1,
    titleJa: "社会的な話題の基本語を使う",
    descriptionJa: "教育・環境・技術・健康について、意見文で使える語を学びます。",
    objectivesJa: [
      "社会的な話題の基本語を文脈から選べる",
      "よく使う語の組み合わせを理解できる",
    ],
    explanationJa:
      "社会的な話題では、単語だけでなくreduce wasteやonline educationのような組み合わせで覚えると、読解と作文の両方で使いやすくなります。",
    examples: [
      { en: "We should reduce food waste.", ja: "私たちは食品廃棄を減らすべきです。" },
      {
        en: "Technology can improve access to education.",
        ja: "技術は教育へのアクセスを改善できます。",
      },
    ],
    recallJa:
      "education、environment、technology、healthから一つ選び、その語を使う短い意見文を作りましょう。",
    summaryJa:
      "社会的な語彙は、動詞や形容詞との組み合わせで覚えます。文脈に合う意味を一つずつ確実にします。",
    topicTags: ["social-vocabulary", "education-environment"],
    prerequisiteUnitId: "S4-U3",
    exercises: [
      {
        prompt:
          "Many schools use online tools to improve ___. の空所に最も合う語を選んでください。",
        choices: ["education", "pollution", "medicine", "traffic"],
        answer: 0,
        explanation:
          "schoolsとonline toolsの文脈では、学びを表すeducationが最も自然です。",
        hint: "学校の主な役割に関係する語です。",
        targetSkills: ["vocabulary", "reading"],
        targetMasteryDimensions: ["context", "recall"],
        diagnostic: { area: "upperVocabulary", level: "upper" },
      },
      {
        prompt: "「ごみを減らす」に合う英語の組み合わせを選んでください。",
        choices: ["reduce waste", "grow waste", "borrow waste", "arrive waste"],
        answer: 0,
        explanation: "reduce wasteは「ごみを減らす」というよく使う組み合わせです。",
        hint: "reduceは「減らす」です。",
        targetSkills: ["vocabulary"],
        targetMasteryDimensions: ["recall", "context"],
      },
      {
        prompt:
          "Regular exercise is important for our ___. の空所に合う語を選んでください。",
        choices: ["health", "machine", "climate", "screen"],
        answer: 0,
        explanation: "運動は健康に重要なのでhealthが合います。",
        hint: "体や心のよい状態を表す語です。",
        targetSkills: ["vocabulary", "reading"],
        targetMasteryDimensions: ["context"],
      },
      {
        prompt: "renewable energyの意味として最も近いものを選んでください。",
        choices: [
          "繰り返し利用できるエネルギー",
          "一度しか使えない紙",
          "古い交通規則",
          "高価な教科書",
        ],
        answer: 0,
        explanation:
          "renewable energyは、太陽光や風力など再生可能なエネルギーを指します。",
        hint: "renewableには「再び利用できる」という考えがあります。",
        targetSkills: ["vocabulary"],
        targetMasteryDimensions: ["recognition", "context"],
      },
      {
        prompt:
          "Technology has changed the way people ___. の空所に最も自然な語を選んでください。",
        choices: ["communicate", "communication", "communicative", "communicatedly"],
        answer: 0,
        explanation:
          "the way peopleの後ろには動詞communicateが入り、「人々が意思疎通する方法」となります。",
        hint: "peopleを主語にする動詞を選びます。",
        targetSkills: ["vocabulary", "grammar"],
        targetMasteryDimensions: ["context", "recall"],
      },
    ],
  },
  {
    stage: 5,
    unitId: "S5-U2",
    order: 2,
    titleJa: "同じ内容を別の表現で言い換える",
    descriptionJa: "要約や読解に役立つ、意味を保った言い換えを練習します。",
    objectivesJa: [
      "短い文の意味を保った言い換えを選べる",
      "具体表現を短い上位概念にまとめられる",
    ],
    explanationJa:
      "言い換えでは、単語を機械的に交換するのではなく、文全体で同じ内容を保ちます。主語や文の形が変わっても意味を比べます。",
    examples: [
      {
        en: "The bus was too crowded, so I walked.",
        ja: "バスが混みすぎていたので、私は歩きました。",
      },
      {
        en: "I walked because there were too many people on the bus.",
        ja: "バスに人が多すぎたため、私は歩きました。",
      },
    ],
    recallJa: "becauseを使う文を一つ考え、soを使って同じ内容に言い換えてみましょう。",
    summaryJa:
      "言い換えは中心の意味、原因と結果、だれが何をしたかを保ちます。要約では細部をまとめる語も役立ちます。",
    topicTags: ["paraphrasing", "summary-preparation"],
    prerequisiteUnitId: "S5-U1",
    exercises: [
      {
        prompt:
          "Many people prefer trains because they are convenient. と最も近い意味の文を選んでください。",
        choices: [
          "Trains are convenient, so many people prefer them.",
          "Many people avoid all convenient trains.",
          "Trains are preferred because people are trains.",
          "Convenient people travel without trains.",
        ],
        answer: 0,
        explanation:
          "becauseで示した理由を先に置き、soで結果をつなげても中心の意味は同じです。",
        hint: "便利であることが理由、好むことが結果です。",
        targetSkills: ["reading", "vocabulary"],
        targetMasteryDimensions: ["context", "recall"],
        diagnostic: { area: "upperReading", level: "upper" },
      },
      {
        prompt: "The shop is closed today. と最も近い意味の文を選んでください。",
        choices: [
          "The shop is not open today.",
          "The shop opens twice today.",
          "The shop was crowded yesterday.",
          "Today is sold at the shop.",
        ],
        answer: 0,
        explanation: "closedは、この文脈ではnot openと言い換えられます。",
        hint: "openの反対の状態を考えます。",
        targetSkills: ["reading", "vocabulary"],
        targetMasteryDimensions: ["context"],
      },
      {
        prompt:
          "cars, buses, and trains をまとめる語として最も適切なものを選んでください。",
        choices: ["transportation", "education", "communication", "information"],
        answer: 0,
        explanation:
          "cars、buses、trainsはいずれも移動手段なのでtransportationでまとめられます。",
        hint: "人や物を運ぶ方法の総称です。",
        targetSkills: ["vocabulary", "reading"],
        targetMasteryDimensions: ["recognition", "context"],
      },
      {
        prompt:
          "It is necessary to save water. のnecessaryに最も近い語を選んでください。",
        choices: ["important", "impossible", "unusual", "expensive"],
        answer: 0,
        explanation:
          "necessaryは「必要な」で、この文脈ではimportantが最も近い意味です。",
        hint: "行うべき大切なことを表します。",
        targetSkills: ["vocabulary"],
        targetMasteryDimensions: ["recognition", "context"],
      },
      {
        type: "readingQuestion",
        stimulus:
          "Mina takes a reusable bottle to work every day. This helps her avoid buying plastic bottles.",
        prompt: "本文の内容を最も短く言い換えた文を選んでください。",
        choices: [
          "Mina reduces plastic use by carrying her own bottle.",
          "Mina buys a new plastic bottle at work every day.",
          "Mina does not drink anything while she works.",
          "Mina sells reusable bottles to her coworkers.",
        ],
        answer: 0,
        explanation:
          "自分のボトルを持参してプラスチック利用を減らす、という中心内容を保っています。",
        hint: "行動と、その結果の二点をまとめた文を探します。",
        targetSkills: ["reading"],
        targetMasteryDimensions: ["context", "recall"],
      },
    ],
  },
  {
    stage: 6,
    unitId: "S6-U1",
    order: 1,
    titleJa: "短文の文脈から語句を選ぶ",
    descriptionJa: "文法だけでなく、前後の意味に合う語や熟語を選びます。",
    objectivesJa: [
      "文全体の意味から適切な語句を選べる",
      "品詞とよく使う組み合わせを手掛かりにできる",
    ],
    explanationJa:
      "空所の前後だけで決めず、文全体が何を伝えるかを確認します。必要な品詞、時制、語の組み合わせの順に候補を絞ります。",
    examples: [
      {
        en: "The event was canceled because of heavy rain.",
        ja: "大雨のため、その行事は中止されました。",
      },
      { en: "Please take part in the discussion.", ja: "話し合いに参加してください。" },
    ],
    recallJa:
      "空所問題を解くときの手順を「意味・品詞・組み合わせ」の三つに分けて説明してみましょう。",
    summaryJa:
      "まず文全体の意味を取り、次に空所へ必要な品詞を確認します。最後に自然な語の組み合わせかを確かめます。",
    topicTags: ["context-cloze", "exam-style-original"],
    prerequisiteUnitId: "S5-U3",
    exercises: [
      {
        prompt: "Aya was tired, but she ___ working until the report was finished.",
        choices: ["continued", "borrowed", "discovered", "invited"],
        answer: 0,
        explanation:
          "疲れていたが報告書が終わるまで働き続けた、という流れなのでcontinuedが適切です。",
        hint: "butの後ろで、仕事をやめなかったことを表します。",
        targetSkills: ["vocabulary", "reading"],
        targetMasteryDimensions: ["context", "recall"],
        diagnostic: { area: "upperVocabulary", level: "upper" },
      },
      {
        prompt: "The city plans to ___ more trees along busy streets.",
        choices: ["plant", "solve", "lend", "translate"],
        answer: 0,
        explanation: "treesと自然に組み合わさり「木を植える」を表すplantが適切です。",
        hint: "木を増やすために行う動作です。",
        targetSkills: ["vocabulary", "reading"],
        targetMasteryDimensions: ["context"],
      },
      {
        prompt: "Please ___ attention to the safety instructions.",
        choices: ["pay", "make", "bring", "catch"],
        answer: 0,
        explanation: "pay attention toは「〜に注意を払う」という決まった表現です。",
        hint: "attentionとよく組み合わさる動詞です。",
        targetSkills: ["vocabulary"],
        targetMasteryDimensions: ["recall", "context"],
      },
      {
        prompt: "The new library is easily ___ by bus or bicycle.",
        choices: ["accessible", "responsible", "possible", "traditional"],
        answer: 0,
        explanation: "バスや自転車で容易に行ける、という意味にはaccessibleが合います。",
        hint: "場所へ到達しやすいことを表す形容詞です。",
        targetSkills: ["vocabulary", "reading"],
        targetMasteryDimensions: ["context", "recall"],
      },
      {
        prompt: "We had to put ___ the picnic because of the storm.",
        choices: ["off", "out", "up", "away"],
        answer: 0,
        explanation:
          "put offは「延期する」という熟語で、嵐のためピクニックを延期した文になります。",
        hint: "予定を後の日へ移す意味の熟語です。",
        targetSkills: ["vocabulary"],
        targetMasteryDimensions: ["recall", "context"],
      },
    ],
  },
  {
    stage: 6,
    unitId: "S6-U2",
    order: 2,
    titleJa: "段落の流れから空所を考える",
    descriptionJa: "接続語や指示語を手掛かりに、段落全体のつながりを読みます。",
    objectivesJa: [
      "原因・結果・対比を示す接続語を選べる",
      "前後の文を結ぶ指示語の内容を確認できる",
    ],
    explanationJa:
      "長めの空所では、一文だけでなく段落の役割を見ます。前後が同じ方向か、反対か、原因と結果かを整理して接続語を選びます。",
    examples: [
      {
        en: "The task was difficult. However, the team did not give up.",
        ja: "課題は難しかったです。しかし、チームは諦めませんでした。",
      },
      {
        en: "The path was icy. Therefore, we walked slowly.",
        ja: "道が凍っていました。そのため、私たちはゆっくり歩きました。",
      },
    ],
    recallJa:
      "however、therefore、for exampleの役割を、それぞれ「対比・結果・具体例」と結び付けて言ってみましょう。",
    summaryJa:
      "接続語は文と文の関係を示します。空所の前後を要約してから、対比・結果・例のどれかを判断します。",
    topicTags: ["paragraph-cloze", "cohesion", "exam-style-original"],
    prerequisiteUnitId: "S6-U1",
    exercises: [
      {
        type: "readingQuestion",
        stimulus:
          "Some people think learning online is lonely. ___, online classes can include group discussions and shared projects.",
        prompt: "空所に最も合う語を選んでください。",
        choices: ["However", "Therefore", "For example", "Similarly"],
        answer: 0,
        explanation:
          "孤独だという考えに対し、交流できるという反対の内容を示すのでHoweverが適切です。",
        hint: "前後の内容が反対方向です。",
        targetSkills: ["reading", "vocabulary"],
        targetMasteryDimensions: ["context", "recall"],
        diagnostic: { area: "upperReading", level: "upper" },
      },
      {
        type: "readingQuestion",
        stimulus:
          "The local river became cleaner after volunteers removed trash every month. ___, more birds returned to the area.",
        prompt: "空所に最も合う語を選んでください。",
        choices: ["As a result", "In contrast", "At first", "For instance"],
        answer: 0,
        explanation:
          "川がきれいになった結果として鳥が戻ったのでAs a resultが適切です。",
        hint: "後ろの文は前の行動による結果です。",
        targetSkills: ["reading", "vocabulary"],
        targetMasteryDimensions: ["context"],
      },
      {
        type: "readingQuestion",
        stimulus:
          "There are several ways to save electricity at home. ___, turning off unused lights is simple and effective.",
        prompt: "空所に最も合う語を選んでください。",
        choices: ["For example", "Nevertheless", "Instead", "Otherwise"],
        answer: 0,
        explanation:
          "節電方法の具体例として消灯を挙げているのでFor exampleが適切です。",
        hint: "後ろの文が具体的な一例になっています。",
        targetSkills: ["reading", "vocabulary"],
        targetMasteryDimensions: ["context"],
      },
      {
        type: "readingQuestion",
        stimulus:
          "The town opened a free study room near the station. This made it easier for students to study after school.",
        prompt: "Thisが指す内容として最も適切なものを選んでください。",
        choices: [
          "町が無料の学習室を開いたこと",
          "生徒が駅を建てたこと",
          "放課後の時間が短くなったこと",
          "学習室が有料になったこと",
        ],
        answer: 0,
        explanation: "Thisは直前の「町が無料の学習室を開いたこと」全体を指しています。",
        hint: "直前の文で起きた出来事を確認します。",
        targetSkills: ["reading"],
        targetMasteryDimensions: ["context", "recall"],
      },
      {
        type: "readingQuestion",
        stimulus:
          "Mika first tested her idea with a small group. The results were positive. ___, she decided to invite more people.",
        prompt: "空所に最も合う語を選んでください。",
        choices: ["Therefore", "Although", "Meanwhile", "For example"],
        answer: 0,
        explanation:
          "良い結果を受けて参加者を増やす決定をしたので、結果を示すThereforeが適切です。",
        hint: "前の結果が次の判断の理由になっています。",
        targetSkills: ["reading", "vocabulary"],
        targetMasteryDimensions: ["context", "recall"],
      },
    ],
  },
] satisfies readonly UnitContentSeed[];

const generatedUpperStageContent = upperStageSeeds.map(createUnitContent);

const baseUpperStageLessons = generatedUpperStageContent.map(({ lesson }) => lesson);
const baseUpperStageExercises = generatedUpperStageContent.flatMap(
  ({ exercises }) => exercises,
);

export const upperStageLessons = [
  ...baseUpperStageLessons,
  ...upperStageUnit3Lessons,
].sort((left, right) => left.stage - right.stage || left.order - right.order);

export const upperStageExercises = [
  ...baseUpperStageExercises,
  ...upperStageUnit3Exercises,
].sort((left, right) => left.stage - right.stage || left.id.localeCompare(right.id));
