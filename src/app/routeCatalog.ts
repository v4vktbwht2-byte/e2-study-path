export type FoundationRouteId =
  | "today"
  | "onboarding"
  | "diagnostic"
  | "course"
  | "stage"
  | "lesson"
  | "vocabulary"
  | "vocabulary-session"
  | "word"
  | "review"
  | "practice"
  | "reading"
  | "listening"
  | "writing"
  | "speaking"
  | "mock"
  | "progress"
  | "settings"
  | "data"
  | "help";

export interface RelatedRoute {
  readonly label: string;
  readonly to: string;
  readonly description: string;
}

export interface FoundationRouteDefinition {
  readonly id: FoundationRouteId;
  readonly path: string;
  readonly title: string;
  readonly phase: `Phase ${number}`;
  readonly purpose: string;
  readonly plannedFeatures: readonly string[];
  readonly relatedRoutes: readonly RelatedRoute[];
}

const mainRoutes = {
  today: {
    label: "今日の学習",
    to: "/",
    description: "毎日のおすすめメニューへ戻ります。",
  },
  course: {
    label: "コース",
    to: "/course",
    description: "ステージ0〜6の学習順を確認します。",
  },
  vocabulary: {
    label: "単語",
    to: "/vocabulary",
    description: "目的に合う単語学習を選びます。",
  },
  practice: {
    label: "練習",
    to: "/practice",
    description: "技能別の練習を選びます。",
  },
  progress: {
    label: "記録",
    to: "/progress",
    description: "学習の積み重ねを振り返ります。",
  },
} as const satisfies Record<string, RelatedRoute>;

export const foundationRoutes = [
  {
    id: "today",
    path: "/",
    title: "今日の学習",
    phase: "Phase 05",
    purpose:
      "設定した学習時間と復習状況をもとに、その日に無理なく進められる学習メニューを案内します。",
    plannedFeatures: [
      "期限を迎えた復習を優先した今日のプラン",
      "軽め・標準・しっかりの時間コース",
      "途中から再開できる学習導線",
    ],
    relatedRoutes: [
      {
        label: "初回設定",
        to: "/onboarding",
        description: "目標と1日の学習時間を設定します。",
      },
      {
        label: "初期診断",
        to: "/diagnostic",
        description: "無理のない開始ステージを確認します。",
      },
      mainRoutes.course,
      {
        label: "復習",
        to: "/review",
        description: "期限を迎えた項目を優先して復習します。",
      },
    ],
  },
  {
    id: "onboarding",
    path: "/onboarding",
    title: "初回設定",
    phase: "Phase 03",
    purpose:
      "アプリの位置づけと端末内保存を確認し、学習目標と1日の学習時間を設定します。",
    plannedFeatures: [
      "初心者から始められることの案内",
      "目標・学習時間・任意の受験予定日の設定",
      "初期診断を受けるか、あとで始めるかの選択",
    ],
    relatedRoutes: [
      {
        label: "初期診断",
        to: "/diagnostic",
        description: "短い問題でおすすめ開始地点を確認します。",
      },
      mainRoutes.today,
      {
        label: "設定",
        to: "/settings",
        description: "あとから学習設定を変更します。",
      },
    ],
  },
  {
    id: "diagnostic",
    path: "/diagnostic",
    title: "初期診断",
    phase: "Phase 03",
    purpose:
      "英語の基礎を短時間で確認し、難しすぎない開始ステージを提案します。診断はスキップできます。",
    plannedFeatures: [
      "アルファベットから短文読解までの段階的な確認",
      "難しい問題を続けない適応的な終了",
      "できていることと最初の3レッスンの提案",
    ],
    relatedRoutes: [
      {
        label: "初回設定",
        to: "/onboarding",
        description: "診断前の目標と学習時間を設定します。",
      },
      mainRoutes.course,
      mainRoutes.today,
    ],
  },
  {
    id: "course",
    path: "/course",
    title: "コース",
    phase: "Phase 03",
    purpose:
      "ステージ0から6までの道筋と現在地を確認し、次に学ぶ短いレッスンを選びます。",
    plannedFeatures: [
      "各ステージの概要・進捗・次のレッスン",
      "前提レッスンに沿ったおすすめ順",
      "学習済み内容をスキップする選択肢",
    ],
    relatedRoutes: [
      {
        label: "ステージ0",
        to: "/course/stage/stage-0",
        description: "はじめての英語のレッスン一覧を確認します。",
      },
      {
        label: "最初のレッスン",
        to: "/lesson/lesson-s0-u1",
        description: "説明、例文、確認、想起を実際に学びます。",
      },
      mainRoutes.today,
    ],
  },
  {
    id: "stage",
    path: "/course/stage/:stageId",
    title: "ステージ詳細",
    phase: "Phase 03",
    purpose:
      "選択したステージの目標、レッスン一覧、進み具合と次のおすすめを確認します。",
    plannedFeatures: [
      "ステージの到達目標と前提知識",
      "レッスンごとの完了・進行中・未開始状態",
      "次に進むレッスンの案内",
    ],
    relatedRoutes: [
      mainRoutes.course,
      {
        label: "最初のレッスン",
        to: "/lesson/lesson-s0-u1",
        description: "選択したレッスンを開いて学習します。",
      },
      mainRoutes.today,
    ],
  },
  {
    id: "lesson",
    path: "/lesson/:lessonId",
    title: "レッスン",
    phase: "Phase 03",
    purpose:
      "1テーマずつ説明、例文、ガイド付き問題、思い出す問題、ミニ確認へ進みます。",
    plannedFeatures: [
      "初心者向けの短い説明と例文",
      "ヒント利用を記録する練習",
      "中断位置の保存と復習登録",
    ],
    relatedRoutes: [
      mainRoutes.course,
      {
        label: "ステージ0",
        to: "/course/stage/stage-0",
        description: "レッスンが属するステージの一覧へ戻ります。",
      },
      mainRoutes.today,
    ],
  },
  {
    id: "vocabulary",
    path: "/vocabulary",
    title: "単語",
    phase: "Phase 04",
    purpose:
      "新規、期限復習、苦手、聞き取り、スペルなど、今の目的に合う単語学習を選びます。",
    plannedFeatures: [
      "今日の復習件数と学習時間の見積もり",
      "新規・苦手・高速仕分けなど8つの入口",
      "ステージ・品詞・学習状態による絞り込み",
    ],
    relatedRoutes: [
      {
        label: "単語セッション",
        to: "/vocabulary/session",
        description: "答えを隠して思い出す学習フローを確認します。",
      },
      {
        label: "単語詳細の準備画面",
        to: "/vocabulary/word-sample",
        description: "動的な単語詳細ルートを確認します。",
      },
      {
        label: "復習",
        to: "/review",
        description: "期限を迎えた学習項目をまとめて確認します。",
      },
    ],
  },
  {
    id: "vocabulary-session",
    path: "/vocabulary/session",
    title: "単語セッション",
    phase: "Phase 04",
    purpose:
      "答えを見る前に思い出し、回答後に4段階で感触を記録して次回の復習へつなげます。",
    plannedFeatures: [
      "閲覧モードとテストモードの明確な区別",
      "認識・想起・聞き取り・スペル・文脈の段階的出題",
      "Again・Hard・Good・Easyによる復習予定の更新",
    ],
    relatedRoutes: [
      mainRoutes.vocabulary,
      {
        label: "単語詳細の準備画面",
        to: "/vocabulary/word-sample",
        description: "例文や5軸の習熟度を確認する画面へ進みます。",
      },
      {
        label: "復習",
        to: "/review",
        description: "期限復習のセッション入口へ進みます。",
      },
    ],
  },
  {
    id: "word",
    path: "/vocabulary/:wordId",
    title: "単語詳細",
    phase: "Phase 04",
    purpose:
      "選択した単語の意味、例文、関連表現、5軸の習熟度、次回復習日と回答履歴を確認します。",
    plannedFeatures: [
      "意味・品詞・例文・発音手段",
      "混同語と関連表現",
      "自分のメモ、復習の一時停止・再開",
    ],
    relatedRoutes: [
      mainRoutes.vocabulary,
      {
        label: "単語セッション",
        to: "/vocabulary/session",
        description: "単語を実際に思い出す練習へ進みます。",
      },
      {
        label: "復習",
        to: "/review",
        description: "復習予定の項目をまとめて確認します。",
      },
    ],
  },
  {
    id: "review",
    path: "/review",
    title: "復習",
    phase: "Phase 04",
    purpose: "期限と忘れやすさを考慮した順番で、必要な項目を短い時間から復習します。",
    plannedFeatures: [
      "期限超過・当日分を優先する復習キュー",
      "同じセッション内での再出題",
      "復習が多い日の5〜30分コース",
    ],
    relatedRoutes: [
      mainRoutes.vocabulary,
      {
        label: "単語セッション",
        to: "/vocabulary/session",
        description: "単語形式の出題画面を確認します。",
      },
      mainRoutes.today,
    ],
  },
  {
    id: "practice",
    path: "/practice",
    title: "技能練習",
    phase: "Phase 06",
    purpose:
      "読解、リスニング、ライティング、スピーキングから、伸ばしたい技能を選びます。",
    plannedFeatures: [
      "技能ごとのおすすめ練習",
      "短時間で始められる問題セット",
      "学習記録へつながる結果と振り返り",
    ],
    relatedRoutes: [
      {
        label: "読解",
        to: "/practice/reading",
        description: "本文の根拠を確認する読解練習です。",
      },
      {
        label: "リスニング",
        to: "/practice/listening",
        description: "本番風と復習用を分けた聞き取り練習です。",
      },
      {
        label: "ライティング",
        to: "/practice/writing",
        description: "要約と意見英作文の練習です。",
      },
      {
        label: "スピーキング",
        to: "/practice/speaking",
        description: "録音またはテキストで答える練習です。",
      },
      {
        label: "模擬演習",
        to: "/mock",
        description: "オリジナルの短縮版で複数技能を確認します。",
      },
    ],
  },
  {
    id: "reading",
    path: "/practice/reading",
    title: "読解",
    phase: "Phase 06",
    purpose:
      "英文を段落ごとに読み、答えだけでなく根拠となる文と段落の要点を確認します。",
    plannedFeatures: [
      "文字サイズを調整できる英文表示",
      "回答後の根拠選択と解説",
      "重要語句を単語学習へ追加する導線",
    ],
    relatedRoutes: [mainRoutes.practice, mainRoutes.vocabulary, mainRoutes.progress],
  },
  {
    id: "listening",
    path: "/practice/listening",
    title: "リスニング",
    phase: "Phase 06",
    purpose:
      "一回再生の本番風モードと、速度・スクリプトを使える復習モードを切り替えて練習します。",
    plannedFeatures: [
      "本番風と復習モード",
      "速度変更・一文再生・ディクテーション",
      "音声非対応時のスクリプト学習への切り替え",
    ],
    relatedRoutes: [mainRoutes.practice, mainRoutes.vocabulary, mainRoutes.progress],
  },
  {
    id: "writing",
    path: "/practice/writing",
    title: "ライティング",
    phase: "Phase 06",
    purpose:
      "英文要約と意見英作文を、構成メモ、語数の目安、自己確認を使って練習します。",
    plannedFeatures: [
      "45〜55語を目安にした英文要約",
      "80〜100語を目安にした意見英作文",
      "端末内への下書き保存と自己評価",
    ],
    relatedRoutes: [mainRoutes.practice, mainRoutes.vocabulary, mainRoutes.progress],
  },
  {
    id: "speaking",
    path: "/practice/speaking",
    title: "スピーキング",
    phase: "Phase 06",
    purpose:
      "オリジナル問題へ声または文章で答え、録音を聞き直しながら自分で振り返ります。",
    plannedFeatures: [
      "録音対応状況とマイク権限の説明",
      "録音・再生・タイマー・自己評価",
      "権限拒否や非対応時のテキスト回答",
    ],
    relatedRoutes: [
      mainRoutes.practice,
      mainRoutes.progress,
      {
        label: "ヘルプ",
        to: "/help",
        description: "権限や代替操作の説明を確認します。",
      },
    ],
  },
  {
    id: "mock",
    path: "/mock",
    title: "模擬演習",
    phase: "Phase 06",
    purpose:
      "英検2級形式を参考にしたオリジナル短縮問題で、複数技能を横断して現在地を確認します。",
    plannedFeatures: [
      "公式問題を複製しない短縮版セット",
      "技能ごとの結果と復習候補",
      "途中終了と再開を考慮した演習フロー",
    ],
    relatedRoutes: [mainRoutes.practice, mainRoutes.progress, mainRoutes.today],
  },
  {
    id: "progress",
    path: "/progress",
    title: "学習記録",
    phase: "Phase 08",
    purpose:
      "学習時間、復習、新規項目、技能別の傾向を、数字と分かりやすい文章で振り返ります。",
    plannedFeatures: [
      "7日・30日の学習記録切り替え",
      "ステージ進行と苦手上位",
      "グラフと同じ内容を伝えるテキスト要約",
    ],
    relatedRoutes: [
      mainRoutes.today,
      mainRoutes.course,
      { label: "設定", to: "/settings", description: "学習量や表示を調整します。" },
    ],
  },
  {
    id: "settings",
    path: "/settings",
    title: "設定",
    phase: "Phase 08",
    purpose:
      "学習量、音声、見た目、動きの軽減などを、自分が続けやすい状態へ調整します。",
    plannedFeatures: [
      "1日の学習時間と新規単語上限",
      "テーマ・文字サイズ・動きの軽減",
      "音声速度とアプリ情報",
    ],
    relatedRoutes: [
      {
        label: "データ管理",
        to: "/settings/data",
        description: "バックアップ、復元、保存容量を確認します。",
      },
      {
        label: "初期診断",
        to: "/diagnostic",
        description: "履歴を残したまま診断をやり直します。",
      },
      {
        label: "ヘルプ",
        to: "/help",
        description: "操作やデータ保存について確認します。",
      },
      mainRoutes.today,
    ],
  },
  {
    id: "data",
    path: "/settings/data",
    title: "データ管理",
    phase: "Phase 07",
    purpose:
      "端末内の学習データをバックアップ・復元し、保存容量と音声キャッシュを管理します。",
    plannedFeatures: [
      "バージョン付きJSONの書き出しと復元",
      "保存容量と音声キャッシュの確認",
      "確認を伴うキャッシュ・全データ削除",
    ],
    relatedRoutes: [
      {
        label: "設定",
        to: "/settings",
        description: "学習・表示設定へ戻ります。",
      },
      {
        label: "ヘルプ",
        to: "/help",
        description: "バックアップ方法と注意点を確認します。",
      },
      mainRoutes.today,
    ],
  },
  {
    id: "help",
    path: "/help",
    title: "ヘルプ",
    phase: "Phase 08",
    purpose:
      "学習の進め方、端末内保存、オフライン利用、音声・マイクの代替操作を確認します。",
    plannedFeatures: [
      "初めて使う人向けの学習案内",
      "データ保存とバックアップの説明",
      "オフライン・権限拒否・非対応機能の案内",
    ],
    relatedRoutes: [
      {
        label: "設定",
        to: "/settings",
        description: "アプリの動作と表示を調整します。",
      },
      {
        label: "データ管理",
        to: "/settings/data",
        description: "バックアップと保存容量を確認します。",
      },
      mainRoutes.today,
    ],
  },
] as const satisfies readonly FoundationRouteDefinition[];

export function getFoundationRoute(id: FoundationRouteId): FoundationRouteDefinition {
  const route = foundationRoutes.find((candidate) => candidate.id === id);

  if (!route) {
    throw new Error(`Unknown foundation route: ${String(id)}`);
  }

  return route;
}
