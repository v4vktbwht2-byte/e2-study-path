import type { PracticeSet } from "../../infrastructure/content/schemas";
import { ORIGINAL_CONTENT_SOURCE } from "./factories";

export const pilotReadingPracticeSets = [
  {
    id: "practice-reading-evening-library",
    schemaVersion: "1.0.0",
    contentRevision: 1,
    type: "reading",
    stage: 2,
    titleJa: "夕方の小さな図書室",
    descriptionJa: "利用者の声から開館時間を変えた地域の図書室について読みます。",
    estimatedMinutes: 6,
    payload: {
      passageTitleEn: "A Library After Work",
      introductionJa: "段落ごとの役割を意識しながら読んでみましょう。",
      paragraphs: [
        {
          id: "erl-p1",
          roleJa: "問題",
          summaryJa: "働く人は平日の図書室を利用しにくかった。",
          sentences: [
            {
              id: "erl-s1",
              textEn: "Mina's town had a small library near the station.",
            },
            {
              id: "erl-s2",
              textEn:
                "It closed at five, so many people could not visit it after work.",
            },
          ],
        },
        {
          id: "erl-p2",
          roleJa: "取り組み",
          summaryJa: "週2日は開館時間を延長し、学生が手伝った。",
          sentences: [
            {
              id: "erl-s3",
              textEn:
                "The library tried staying open until eight on Tuesdays and Fridays.",
            },
            {
              id: "erl-s4",
              textEn:
                "Local college students helped workers put books back on the shelves.",
            },
          ],
        },
        {
          id: "erl-p3",
          roleJa: "結果",
          summaryJa: "新しい時間帯は働く人にも学生にも役立った。",
          sentences: [
            {
              id: "erl-s5",
              textEn:
                "After one month, evening visitors borrowed many books and used the study tables.",
            },
            {
              id: "erl-s6",
              textEn:
                "The students also said that they enjoyed meeting people in their community.",
            },
          ],
        },
      ],
      questions: [
        {
          id: "erl-q1",
          promptJa: "図書室が火曜日と金曜日に開館時間を延ばした主な理由は何ですか。",
          choices: [
            "働いたあとに来られない人が多かったから",
            "朝に本を並べる学生が足りなかったから",
            "駅の近くへ移転する必要があったから",
            "週末の利用者を減らしたかったから",
          ],
          correctChoiceIndex: 0,
          evidenceSentenceIds: ["erl-s2", "erl-s3"],
          explanationJa:
            "5時に閉まるため仕事後に利用できない人が多く、火曜と金曜の閉館時刻を8時へ延ばしました。",
          choiceFeedbackJa: [
            {
              choiceIndex: 1,
              reasonJa:
                "学生は夕方の本の整理を手伝っており、朝の人手不足は述べられていません。",
            },
            {
              choiceIndex: 2,
              reasonJa: "図書室は最初から駅の近くにあり、移転の話はありません。",
            },
            {
              choiceIndex: 3,
              reasonJa:
                "変更の目的は平日の仕事後の利用を助けることで、週末については述べられていません。",
            },
          ],
        },
        {
          id: "erl-q2",
          promptJa: "開館時間の変更後に起きたこととして最も合うものはどれですか。",
          choices: [
            "学生は地域の人との交流を楽しんだ",
            "利用者は本を借りなくなった",
            "勉強机は使えなくなった",
            "図書室は1か月で閉館した",
          ],
          correctChoiceIndex: 0,
          evidenceSentenceIds: ["erl-s5", "erl-s6"],
          explanationJa:
            "夕方の利用者は本や机を使い、手伝った学生も地域の人と会うことを楽しみました。",
          choiceFeedbackJa: [
            {
              choiceIndex: 1,
              reasonJa: "本文には夕方の利用者が多くの本を借りたとあります。",
            },
            {
              choiceIndex: 2,
              reasonJa: "勉強机は夕方の利用者に使われました。",
            },
            {
              choiceIndex: 3,
              reasonJa:
                "1か月後の利用状況が報告されただけで、閉館したとは書かれていません。",
            },
          ],
        },
      ],
      keyVocabulary: [
        {
          id: "erl-v1",
          headword: "book",
          meaningJa: "本",
          vocabularyItemId: "vocab-s0-book",
        },
        {
          id: "erl-v2",
          headword: "community",
          meaningJa: "地域社会",
          vocabularyItemId: "vocab-s3-community",
        },
      ],
    },
    tags: ["original", "reading", "community", "library"],
    source: ORIGINAL_CONTENT_SOURCE,
  },
  {
    id: "practice-reading-repair-table",
    schemaVersion: "1.0.0",
    contentRevision: 1,
    type: "reading",
    stage: 3,
    titleJa: "直して使う土曜日",
    descriptionJa: "壊れた物を地域で修理する小さな活動について読みます。",
    estimatedMinutes: 7,
    payload: {
      passageTitleEn: "The Saturday Repair Table",
      introductionJa: "原因、活動、変化の順番をつかみましょう。",
      paragraphs: [
        {
          id: "srt-p1",
          roleJa: "背景",
          summaryJa: "壊れた小物がすぐ捨てられていることに店主が気づいた。",
          sentences: [
            {
              id: "srt-s1",
              textEn: "Ken repaired bicycles in a quiet shopping street.",
            },
            {
              id: "srt-s2",
              textEn:
                "He noticed that people often threw away lamps, toys, and bags after one small part broke.",
            },
          ],
        },
        {
          id: "srt-p2",
          roleJa: "活動",
          summaryJa: "月1回、地域の人が修理方法を教える場を始めた。",
          sentences: [
            {
              id: "srt-s3",
              textEn: "Ken started a free repair table outside his shop once a month.",
            },
            {
              id: "srt-s4",
              textEn:
                "Neighbors with different skills showed visitors how to fix simple problems safely.",
            },
          ],
        },
        {
          id: "srt-p3",
          roleJa: "変化",
          summaryJa: "ごみが減り、参加者同士が知識を共有するようになった。",
          sentences: [
            {
              id: "srt-s5",
              textEn:
                "The table did not save every object, but it reduced the number of useful things in the trash.",
            },
            {
              id: "srt-s6",
              textEn: "Visitors also began sharing repair ideas with one another.",
            },
          ],
        },
      ],
      questions: [
        {
          id: "srt-q1",
          promptJa: "Kenが修理テーブルを始めるきっかけは何でしたか。",
          choices: [
            "小さな故障で物が捨てられることに気づいた",
            "自転車店を大きくする資金が必要だった",
            "毎週新しいおもちゃを売りたかった",
            "近所に安全な道路がなかった",
          ],
          correctChoiceIndex: 0,
          evidenceSentenceIds: ["srt-s2", "srt-s3"],
          explanationJa:
            "まだ使える物が小さな故障で捨てられる状況を見て、無料の修理テーブルを始めました。",
          choiceFeedbackJa: [
            {
              choiceIndex: 1,
              reasonJa: "活動は無料で、店を拡張する資金集めではありません。",
            },
            {
              choiceIndex: 2,
              reasonJa: "おもちゃを含む物を直す活動で、販売する計画ではありません。",
            },
            {
              choiceIndex: 3,
              reasonJa: "道路の安全については本文に書かれていません。",
            },
          ],
        },
        {
          id: "srt-q2",
          promptJa: "筆者が示す修理テーブルの成果はどれですか。",
          choices: [
            "ごみになる実用品が減り、修理の考えも共有された",
            "持ち込まれたすべての物を新品にできた",
            "近所の店がすべて修理店に変わった",
            "参加者は自分だけで作業するようになった",
          ],
          correctChoiceIndex: 0,
          evidenceSentenceIds: ["srt-s5", "srt-s6"],
          explanationJa:
            "すべてを直せたわけではありませんが、ごみを減らし、人同士の知識共有にもつながりました。",
          choiceFeedbackJa: [
            {
              choiceIndex: 1,
              reasonJa: "本文はすべての物を救えたわけではないと明記しています。",
            },
            {
              choiceIndex: 2,
              reasonJa:
                "活動場所はKenの店の外ですが、ほかの店が変わったとは述べていません。",
            },
            {
              choiceIndex: 3,
              reasonJa: "参加者は修理の考えを互いに共有しました。",
            },
          ],
        },
      ],
      keyVocabulary: [
        {
          id: "srt-v1",
          headword: "recycle",
          meaningJa: "再利用する",
          vocabularyItemId: "vocab-s3-recycle",
        },
        {
          id: "srt-v2",
          headword: "reduce",
          meaningJa: "減らす",
          vocabularyItemId: "vocab-s4-reduce",
        },
      ],
    },
    tags: ["original", "reading", "repair", "environment"],
    source: ORIGINAL_CONTENT_SOURCE,
  },
  {
    id: "practice-reading-quiet-bus-stop",
    schemaVersion: "1.0.0",
    contentRevision: 1,
    type: "reading",
    stage: 3,
    titleJa: "待ち時間を変えた掲示板",
    descriptionJa: "バス停の情報不足を住民が改善した例を読みます。",
    estimatedMinutes: 7,
    payload: {
      passageTitleEn: "A Better Wait for the Bus",
      introductionJa: "誰が、何を、なぜ変えたのかを整理しましょう。",
      paragraphs: [
        {
          id: "qbs-p1",
          roleJa: "困りごと",
          summaryJa: "遅延情報がなく、利用者は不安を感じていた。",
          sentences: [
            {
              id: "qbs-s1",
              textEn: "The bus to Green Hill sometimes arrived ten minutes late.",
            },
            {
              id: "qbs-s2",
              textEn:
                "There was no screen at the stop, so passengers did not know whether the bus was coming.",
            },
          ],
        },
        {
          id: "qbs-p2",
          roleJa: "工夫",
          summaryJa: "運転手と店主が簡単な更新掲示板を作った。",
          sentences: [
            {
              id: "qbs-s3",
              textEn: "A driver began sending delay messages to a nearby shop owner.",
            },
            {
              id: "qbs-s4",
              textEn:
                "The owner wrote each update on a board that people could see from the stop.",
            },
          ],
        },
        {
          id: "qbs-p3",
          roleJa: "効果",
          summaryJa: "低費用の方法で待つ人の判断がしやすくなった。",
          sentences: [
            {
              id: "qbs-s5",
              textEn:
                "The board was simple, but it helped passengers decide whether to wait or walk.",
            },
            {
              id: "qbs-s6",
              textEn:
                "The town is now studying a digital system, while keeping the board as an emergency choice.",
            },
          ],
        },
      ],
      questions: [
        {
          id: "qbs-q1",
          promptJa: "店主は遅延メッセージを受け取ったあと、何をしましたか。",
          choices: [
            "バス停から見える掲示板に情報を書いた",
            "すべての乗客へ電話をかけた",
            "店を閉めてバスを運転した",
            "新しい道路を作るよう依頼した",
          ],
          correctChoiceIndex: 0,
          evidenceSentenceIds: ["qbs-s3", "qbs-s4"],
          explanationJa:
            "運転手から届いた遅延情報を、店主がバス停から見える掲示板へ書きました。",
          choiceFeedbackJa: [
            {
              choiceIndex: 1,
              reasonJa: "個別に電話するのではなく、誰でも見られる掲示板を使いました。",
            },
            {
              choiceIndex: 2,
              reasonJa:
                "店主は情報を掲示したのであり、運転手になったとは書かれていません。",
            },
            {
              choiceIndex: 3,
              reasonJa: "道路工事については本文にありません。",
            },
          ],
        },
        {
          id: "qbs-q2",
          promptJa:
            "町がデジタル化後も掲示板を残す理由として最も合うものはどれですか。",
          choices: [
            "緊急時の別の情報手段になるから",
            "掲示板の方が必ず正確だから",
            "デジタル方式の研究を中止したから",
            "乗客が歩くことを禁止するため",
          ],
          correctChoiceIndex: 0,
          evidenceSentenceIds: ["qbs-s6"],
          explanationJa:
            "町はデジタル方式を検討しつつ、緊急時の選択肢として掲示板も維持する考えです。",
          choiceFeedbackJa: [
            {
              choiceIndex: 1,
              reasonJa: "掲示板が常にデジタル方式より正確だとは述べられていません。",
            },
            {
              choiceIndex: 2,
              reasonJa: "町は現在もデジタル方式を研究しています。",
            },
            {
              choiceIndex: 3,
              reasonJa: "掲示板は待つか歩くかを利用者が判断するためのものです。",
            },
          ],
        },
      ],
      keyVocabulary: [
        {
          id: "qbs-v1",
          headword: "provide",
          meaningJa: "提供する",
          vocabularyItemId: "vocab-s4-provide",
        },
        {
          id: "qbs-v2",
          headword: "improve",
          meaningJa: "改善する",
          vocabularyItemId: "vocab-s4-improve",
        },
      ],
    },
    tags: ["original", "reading", "transport", "information"],
    source: ORIGINAL_CONTENT_SOURCE,
  },
  {
    id: "practice-reading-reusable-market-boxes",
    schemaVersion: "1.0.0",
    contentRevision: 1,
    type: "reading",
    stage: 4,
    titleJa: "市場の再利用ボックス",
    descriptionJa: "包装ごみを減らすための預かり金方式について読みます。",
    estimatedMinutes: 8,
    payload: {
      passageTitleEn: "Boxes That Come Back",
      introductionJa: "仕組みの流れと、利用者・店側それぞれの反応を読み取りましょう。",
      paragraphs: [
        {
          id: "rmb-p1",
          roleJa: "提案",
          summaryJa: "市場は使い捨て包装を減らす実験を始めた。",
          sentences: [
            {
              id: "rmb-s1",
              textEn:
                "A weekend market wanted to reduce the paper and plastic used for takeout food.",
            },
            {
              id: "rmb-s2",
              textEn:
                "Five food stalls agreed to test strong reusable boxes for three months.",
            },
          ],
        },
        {
          id: "rmb-p2",
          roleJa: "仕組み",
          summaryJa: "客は預かり金を払い、返却時に受け取る。",
          sentences: [
            {
              id: "rmb-s3",
              textEn: "Customers paid a small deposit when they chose a box.",
            },
            {
              id: "rmb-s4",
              textEn:
                "They received the money back after returning the box to any participating stall.",
            },
          ],
        },
        {
          id: "rmb-p3",
          roleJa: "評価",
          summaryJa: "返却場所の自由が好評だったが、洗浄時間は課題になった。",
          sentences: [
            {
              id: "rmb-s5",
              textEn:
                "Most customers liked being able to return a box at a different stall.",
            },
            {
              id: "rmb-s6",
              textEn:
                "However, sellers said that washing and checking the boxes took more time than expected.",
            },
          ],
        },
      ],
      questions: [
        {
          id: "rmb-q1",
          promptJa: "客が預かり金を返してもらうには、何をする必要がありましたか。",
          choices: [
            "参加している店のどこかへ箱を返す",
            "同じ料理をもう一度買う",
            "3か月間ずっと箱を保管する",
            "自分で新しい箱を作る",
          ],
          correctChoiceIndex: 0,
          evidenceSentenceIds: ["rmb-s3", "rmb-s4"],
          explanationJa:
            "箱を選ぶときに預かり金を払い、参加店のいずれかへ返すと返金される仕組みでした。",
          choiceFeedbackJa: [
            {
              choiceIndex: 1,
              reasonJa: "返金条件は箱の返却で、追加購入ではありません。",
            },
            {
              choiceIndex: 2,
              reasonJa: "3か月は実験期間であり、客が箱を持つ期間ではありません。",
            },
            {
              choiceIndex: 3,
              reasonJa: "客は用意された再利用箱を返します。",
            },
          ],
        },
        {
          id: "rmb-q2",
          promptJa: "店側が予想より負担だと感じたことは何ですか。",
          choices: [
            "箱を洗って点検する時間",
            "客へ返金する場所の説明",
            "市場を毎日開くこと",
            "紙袋を新しく作ること",
          ],
          correctChoiceIndex: 0,
          evidenceSentenceIds: ["rmb-s6"],
          explanationJa:
            "販売者は箱の洗浄と点検に予想以上の時間がかかると報告しました。",
          choiceFeedbackJa: [
            {
              choiceIndex: 1,
              reasonJa:
                "返却場所の自由は客に好評でしたが、説明の負担は述べられていません。",
            },
            {
              choiceIndex: 2,
              reasonJa: "これは週末市場であり、毎日開く変更はありません。",
            },
            {
              choiceIndex: 3,
              reasonJa:
                "目的は紙やプラスチックを減らすことで、新しい紙袋作りではありません。",
            },
          ],
        },
      ],
      keyVocabulary: [
        {
          id: "rmb-v1",
          headword: "reduce",
          meaningJa: "減らす",
          vocabularyItemId: "vocab-s4-reduce",
        },
        {
          id: "rmb-v2",
          headword: "benefit",
          meaningJa: "利点",
          vocabularyItemId: "vocab-s5-benefit",
        },
      ],
    },
    tags: ["original", "reading", "market", "waste"],
    source: ORIGINAL_CONTENT_SOURCE,
  },
  {
    id: "practice-reading-cool-roof-study",
    schemaVersion: "1.0.0",
    contentRevision: 1,
    type: "reading",
    stage: 5,
    titleJa: "白い屋根の小さな実験",
    descriptionJa: "建物の暑さを抑える地域実験と、その限界について読みます。",
    estimatedMinutes: 9,
    payload: {
      passageTitleEn: "Testing Cooler Roofs",
      introductionJa: "研究結果と、そこからまだ断定できないことを区別しましょう。",
      paragraphs: [
        {
          id: "crs-p1",
          roleJa: "研究目的",
          summaryJa: "白い塗料が夏の室温を下げるかを調べた。",
          sentences: [
            {
              id: "crs-s1",
              textEn:
                "A neighborhood group wondered whether light-colored roofs could keep old homes cooler.",
            },
            {
              id: "crs-s2",
              textEn:
                "With the owners' permission, researchers painted the roofs of six similar buildings white.",
            },
          ],
        },
        {
          id: "crs-p2",
          roleJa: "結果",
          summaryJa: "晴天時は室温が少し低かったが、建物によって差があった。",
          sentences: [
            {
              id: "crs-s3",
              textEn:
                "On sunny afternoons, the painted buildings were usually one or two degrees cooler inside.",
            },
            {
              id: "crs-s4",
              textEn:
                "The amount of change differed because the buildings had different windows and insulation.",
            },
          ],
        },
        {
          id: "crs-p3",
          roleJa: "限界と次の調査",
          summaryJa: "結果は有望だが、冬の影響と長期費用を調べる必要がある。",
          sentences: [
            {
              id: "crs-s5",
              textEn:
                "The group called the early result useful but did not claim that paint alone could solve summer heat.",
            },
            {
              id: "crs-s6",
              textEn:
                "A longer study will examine winter heating and the cost of repainting.",
            },
          ],
        },
      ],
      questions: [
        {
          id: "crs-q1",
          promptJa: "建物ごとの温度変化が同じでなかった理由は何ですか。",
          choices: [
            "窓や断熱の条件が異なっていたから",
            "屋根を塗った曜日が異なっていたから",
            "所有者が室温を記録しなかったから",
            "一部の建物だけ冬に調査したから",
          ],
          correctChoiceIndex: 0,
          evidenceSentenceIds: ["crs-s3", "crs-s4"],
          explanationJa:
            "建物の窓や断熱条件が異なり、それが冷却効果の差に関係したと説明されています。",
          choiceFeedbackJa: [
            {
              choiceIndex: 1,
              reasonJa: "塗装した曜日と温度差の関係は本文にありません。",
            },
            {
              choiceIndex: 2,
              reasonJa:
                "記録不足ではなく、建物自体の条件差が理由として挙げられています。",
            },
            {
              choiceIndex: 3,
              reasonJa: "冬の影響は今後調べる項目です。",
            },
          ],
        },
        {
          id: "crs-q2",
          promptJa: "研究グループが結果について慎重な表現をしたのはなぜですか。",
          choices: [
            "塗料だけで暑さの問題を解決できるとはまだ言えないから",
            "白い屋根では室温が必ず上がったから",
            "研究対象の所有者から許可を得ていなかったから",
            "長期調査を行わないと決めたから",
          ],
          correctChoiceIndex: 0,
          evidenceSentenceIds: ["crs-s5", "crs-s6"],
          explanationJa:
            "初期結果を有用としつつ、塗料だけですべてを解決できるとは主張せず、長期影響を調べます。",
          choiceFeedbackJa: [
            {
              choiceIndex: 1,
              reasonJa:
                "晴れた午後には、塗装した建物の室温が通常1〜2度低くなりました。",
            },
            {
              choiceIndex: 2,
              reasonJa: "研究者は所有者の許可を得て屋根を塗りました。",
            },
            {
              choiceIndex: 3,
              reasonJa: "冬の暖房と再塗装費用を長期調査する予定です。",
            },
          ],
        },
      ],
      keyVocabulary: [
        {
          id: "crs-v1",
          headword: "technology",
          meaningJa: "技術",
          vocabularyItemId: "vocab-s5-technology",
        },
        {
          id: "crs-v2",
          headword: "research",
          meaningJa: "研究",
          vocabularyItemId: "vocab-s6-research",
        },
      ],
    },
    tags: ["original", "reading", "research", "environment"],
    source: ORIGINAL_CONTENT_SOURCE,
  },
  {
    id: "practice-reading-library-of-things",
    schemaVersion: "1.0.0",
    contentRevision: 1,
    type: "reading",
    stage: 6,
    titleJa: "物を借りる図書館",
    descriptionJa: "使用頻度の低い道具を共有するサービスの利点と課題を読みます。",
    estimatedMinutes: 10,
    payload: {
      passageTitleEn: "More Than Books to Borrow",
      introductionJa: "主張を支える根拠と、運営上の課題の両方を確認しましょう。",
      paragraphs: [
        {
          id: "lot-p1",
          roleJa: "サービスの概要",
          summaryJa: "地域センターが低頻度利用の道具を貸し出し始めた。",
          sentences: [
            {
              id: "lot-s1",
              textEn:
                "A community center created a lending service for tools such as drills, tents, and sewing machines.",
            },
            {
              id: "lot-s2",
              textEn:
                "Members paid a small yearly fee and could reserve each item online.",
            },
          ],
        },
        {
          id: "lot-p2",
          roleJa: "利点",
          summaryJa: "購入費と保管場所を減らし、初心者向け講習も提供した。",
          sentences: [
            {
              id: "lot-s3",
              textEn:
                "A survey found that many members joined because they lacked storage space or needed an expensive tool only once.",
            },
            {
              id: "lot-s4",
              textEn:
                "The center also offered short safety classes before people borrowed unfamiliar equipment.",
            },
          ],
        },
        {
          id: "lot-p3",
          roleJa: "課題と対応",
          summaryJa: "返却遅れを減らすため、罰金より通知改善を選んだ。",
          sentences: [
            {
              id: "lot-s5",
              textEn:
                "Late returns sometimes prevented the next member from using a reserved item.",
            },
            {
              id: "lot-s6",
              textEn:
                "Instead of raising fines, the center tested clearer reminders and an easier return box.",
            },
          ],
        },
      ],
      questions: [
        {
          id: "lot-q1",
          promptJa: "調査によると、多くの会員がサービスに参加した理由は何ですか。",
          choices: [
            "保管場所が少ないか、高価な道具を一度だけ必要としたから",
            "毎日同じ道具を仕事で使う必要があったから",
            "安全講習の講師として働きたかったから",
            "オンライン予約が禁止されていたから",
          ],
          correctChoiceIndex: 0,
          evidenceSentenceIds: ["lot-s3"],
          explanationJa:
            "調査では、収納場所が足りないことや、高価な道具を一度だけ使いたいことが主な参加理由でした。",
          choiceFeedbackJa: [
            {
              choiceIndex: 1,
              reasonJa: "本文は、特に一度だけ必要な高価な道具を例にしています。",
            },
            {
              choiceIndex: 2,
              reasonJa:
                "安全講習はセンターが利用者へ提供するもので、参加理由としての雇用ではありません。",
            },
            {
              choiceIndex: 3,
              reasonJa: "会員は各品物をオンラインで予約できました。",
            },
          ],
        },
        {
          id: "lot-q2",
          promptJa: "返却遅れに対してセンターが最初に試した対応はどれですか。",
          choices: [
            "分かりやすい通知と返しやすい返却箱",
            "年会費を大幅に上げること",
            "予約制度をすべて廃止すること",
            "遅れた人への罰金を高くすること",
          ],
          correctChoiceIndex: 0,
          evidenceSentenceIds: ["lot-s5", "lot-s6"],
          explanationJa:
            "罰金を上げるのではなく、通知を明確にし、返却しやすい箱を試しました。",
          choiceFeedbackJa: [
            {
              choiceIndex: 1,
              reasonJa: "年会費変更については述べられていません。",
            },
            {
              choiceIndex: 2,
              reasonJa:
                "予約利用者が困る問題への対応であり、予約制度をなくす案ではありません。",
            },
            {
              choiceIndex: 3,
              reasonJa: "センターは罰金を上げる代わりに、通知と返却箱を改善しました。",
            },
          ],
        },
      ],
      keyVocabulary: [
        {
          id: "lot-v1",
          headword: "resource",
          meaningJa: "資源",
          vocabularyItemId: "vocab-s6-resource",
        },
        {
          id: "lot-v2",
          headword: "available",
          meaningJa: "利用できる",
          vocabularyItemId: "vocab-s6-available",
        },
        {
          id: "lot-v3",
          headword: "evidence",
          meaningJa: "根拠",
          vocabularyItemId: "vocab-s6-evidence",
        },
      ],
    },
    tags: ["original", "reading", "community", "sharing"],
    source: ORIGINAL_CONTENT_SOURCE,
  },
] satisfies readonly PracticeSet[];
