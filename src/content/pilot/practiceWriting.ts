import type { PracticeSet } from "../../infrastructure/content/schemas";
import { ORIGINAL_CONTENT_SOURCE } from "./factories";

export const pilotWritingPracticeSets = [
  {
    id: "writing-summary-community-fridge",
    schemaVersion: "1.0.0",
    contentRevision: 2,
    type: "summary",
    stage: 5,
    titleJa: "地域の冷蔵庫と食品ロス",
    descriptionJa: "取り組みの目的、仕組み、課題を読み取り、中心内容をまとめます。",
    estimatedMinutes: 12,
    payload: {
      instructionsJa:
        "次の英文を読み、内容を45〜55語の英語でまとめてください。自分の意見は加えません。",
      sourceText:
        "A community center in Green Town placed a shared refrigerator near its entrance. Local shops put safe, unsold food in it at the end of the day, and residents can take what they need for free. The project has reduced food waste and helped some families save money. Volunteers check the food and clean the refrigerator every morning. However, the center sometimes receives more bread than people can use. It is now asking nearby farms and restaurants to share different kinds of food so that the service can provide a better balance.",
      keyPoints: [
        "店が売れ残った安全な食品を共有冷蔵庫へ入れる",
        "食品ロス削減と家計支援につながっている",
        "食品の種類の偏りを改善しようとしている",
      ],
      focusJa: "目的・効果・今後の改善を一つずつ拾いましょう。",
      sampleAnswer:
        "Green Town's community center uses a shared refrigerator where shops leave safe unsold food for residents. The project cuts food waste and helps families save money. Because too much bread is sometimes donated, the center is asking farms and restaurants to provide a wider variety of food.",
      targetWordMin: 45,
      targetWordMax: 55,
    },
    tags: ["writing", "summary", "community", "food-waste", "original"],
    source: ORIGINAL_CONTENT_SOURCE,
  },
  {
    id: "writing-summary-library-of-things",
    schemaVersion: "1.0.0",
    contentRevision: 2,
    type: "summary",
    stage: 5,
    titleJa: "道具も借りられる図書館",
    descriptionJa: "新しい貸し出しサービスの利点と運営上の工夫をまとめます。",
    estimatedMinutes: 12,
    payload: {
      instructionsJa:
        "次の英文を読み、内容を45〜55語の英語でまとめてください。細かな例をすべて写す必要はありません。",
      sourceText:
        "A city library has started lending tools and household items as well as books. Members can borrow a small drill, a sewing machine, or camping equipment for one week. The library hopes the service will save people money and reduce the number of rarely used products that are thrown away. Before borrowing an item, members watch a short safety video. The service is popular, but some items have long waiting lists. The library plans to use reservation data to decide what to add next year.",
      keyPoints: [
        "本以外の道具や生活用品を貸し出している",
        "節約と廃棄物削減が目的である",
        "安全説明と予約データを運営に活用している",
      ],
      focusJa: "サービスの内容・目的・課題への対応をまとめましょう。",
      sampleAnswer:
        "A city library now lends tools and household items as well as books, helping members save money and reduce waste. Borrowers watch a safety video before using an item. Because popular equipment has long waiting lists, the library will study reservation data before choosing what to add next year.",
      targetWordMin: 45,
      targetWordMax: 55,
    },
    tags: ["writing", "summary", "library", "sharing", "original"],
    source: ORIGINAL_CONTENT_SOURCE,
  },
  {
    id: "writing-summary-short-breaks",
    schemaVersion: "1.0.0",
    contentRevision: 2,
    type: "summary",
    stage: 6,
    titleJa: "仕事中の短い休憩",
    descriptionJa: "実験の方法、見られた変化、注意点を整理します。",
    estimatedMinutes: 12,
    payload: {
      instructionsJa:
        "次の英文を読み、内容を45〜55語の英語でまとめてください。結果だけでなく注意点も含めましょう。",
      sourceText:
        "A small design company tested a new break schedule for one month. Employees were encouraged to leave their screens for five minutes after every hour of focused work. Many workers said they felt less tired in the afternoon, and project leaders noticed fewer simple mistakes. The schedule did not reduce the amount of work completed. Still, some employees found fixed break times difficult when they were meeting clients. The company will keep the idea but allow teams to choose when each short break fits their work.",
      keyPoints: [
        "1時間の集中作業後に5分休む方法を試した",
        "疲労感と単純なミスが減り、仕事量は落ちなかった",
        "業務に合わせて休憩時刻を柔軟にする",
      ],
      focusJa: "実験・結果・柔軟な改善策の三つをつなげましょう。",
      sampleAnswer:
        "A design company encouraged employees to take five-minute screen breaks after each hour of focused work. Workers felt less tired, made fewer simple mistakes, and completed the same amount of work. Since fixed times were difficult during client meetings, teams will be allowed to schedule breaks more flexibly.",
      targetWordMin: 45,
      targetWordMax: 55,
    },
    tags: ["writing", "summary", "work", "well-being", "original"],
    source: ORIGINAL_CONTENT_SOURCE,
  },
  {
    id: "writing-summary-bus-information",
    schemaVersion: "1.0.0",
    contentRevision: 2,
    type: "summary",
    stage: 6,
    titleJa: "バス停のリアルタイム表示",
    descriptionJa: "交通情報表示の効果と、残された利用上の課題をまとめます。",
    estimatedMinutes: 12,
    payload: {
      instructionsJa:
        "次の英文を読み、内容を45〜55語の英語でまとめてください。主な利点と課題を両方含めます。",
      sourceText:
        "Riverside City installed electronic signs at twenty busy bus stops. The signs show how many minutes remain before each bus arrives. In a city survey, passengers said the information made waiting less stressful and helped them choose another route when a bus was delayed. The signs use solar power, so they can work without new electrical cables. However, smaller stops still have no signs, and not every passenger owns a smartphone. The city is studying lower-cost displays that could serve more neighborhoods.",
      keyPoints: [
        "到着までの時間を表示する電子案内を設置した",
        "待つ不安を減らし、遅延時の経路選択に役立つ",
        "小規模な停留所にも広げる方法を検討している",
      ],
      focusJa: "導入したもの・利用者への効果・今後の課題を残しましょう。",
      sampleAnswer:
        "Riverside City added solar-powered signs showing bus arrival times at twenty busy stops. Passengers said the information reduced stress and helped them change routes during delays. Because smaller stops still lack signs and some riders have no smartphone, the city is studying cheaper displays for more neighborhoods.",
      targetWordMin: 45,
      targetWordMax: 55,
    },
    tags: ["writing", "summary", "transport", "technology", "original"],
    source: ORIGINAL_CONTENT_SOURCE,
  },
  {
    id: "writing-opinion-digital-handouts",
    schemaVersion: "1.0.0",
    contentRevision: 2,
    type: "opinion",
    stage: 5,
    titleJa: "授業の資料はデジタル中心がよいか",
    descriptionJa: "学びやすさと環境・機器の面から意見を組み立てます。",
    estimatedMinutes: 15,
    payload: {
      instructionsJa:
        "TOPICについて、POINTSから二つを参考にしながら、あなたの意見と理由を80〜100語の英語で書いてください。",
      topic: "Should schools use mainly digital handouts in class?",
      topicJa: "学校の授業では、主にデジタル資料を使うべきでしょうか。",
      points: ["Cost", "Learning", "Environment"],
      reasonExamples: [
        "Digital files reduce paper use and are easy to update.",
        "Audio and larger text may support different learners.",
      ],
      sampleAnswer:
        "I think schools should use mainly digital handouts, but they should keep printed copies available. Digital materials can reduce paper use and are easy to update when teachers find a mistake. They can also include links, audio, and larger text, which may support different ways of learning. However, not every student has a reliable device or feels comfortable reading on a screen for a long time. Schools should lend devices and let students choose paper when necessary. This balanced approach protects access while gaining the main benefits of digital materials.",
      targetWordMin: 80,
      targetWordMax: 100,
    },
    tags: ["writing", "opinion", "education", "technology", "original"],
    source: ORIGINAL_CONTENT_SOURCE,
  },
  {
    id: "writing-opinion-volunteer-day",
    schemaVersion: "1.0.0",
    contentRevision: 2,
    type: "opinion",
    stage: 5,
    titleJa: "地域活動の日を設けるべきか",
    descriptionJa: "地域とのつながり、時間、経験を手がかりに考えます。",
    estimatedMinutes: 15,
    payload: {
      instructionsJa:
        "TOPICについて、POINTSから二つを参考にしながら、あなたの意見と理由を80〜100語の英語で書いてください。",
      topic: "Should companies give workers one volunteer day each year?",
      topicJa: "会社は従業員に、年1日の地域ボランティア休暇を与えるべきでしょうか。",
      points: ["Community", "Time", "Experience"],
      reasonExamples: [
        "A paid day lets workers help without losing weekend time.",
        "Volunteering with colleagues can improve teamwork.",
      ],
      sampleAnswer:
        "I think companies should give workers one volunteer day each year. First, employees could use their skills to support local groups that need extra help. This would strengthen the community without asking workers to give up their limited weekend time. Second, volunteering with colleagues can provide new experiences and improve teamwork. Some companies may worry about lost working hours, but one planned day is a small cost if employees return with stronger connections and motivation. The program should remain optional so each worker can choose a suitable activity.",
      targetWordMin: 80,
      targetWordMax: 100,
    },
    tags: ["writing", "opinion", "work", "community", "original"],
    source: ORIGINAL_CONTENT_SOURCE,
  },
  {
    id: "writing-opinion-more-parks",
    schemaVersion: "1.0.0",
    contentRevision: 2,
    type: "opinion",
    stage: 6,
    titleJa: "市街地に公園を増やすべきか",
    descriptionJa: "健康、費用、地域環境という異なる観点から理由を考えます。",
    estimatedMinutes: 15,
    payload: {
      instructionsJa:
        "TOPICについて、POINTSから二つを参考にしながら、あなたの意見と理由を80〜100語の英語で書いてください。",
      topic: "Should cities create more small parks in busy areas?",
      topicJa: "都市は人通りの多い地域に小さな公園を増やすべきでしょうか。",
      points: ["Health", "Cost", "Neighborhoods"],
      reasonExamples: [
        "Small parks give residents places to exercise and rest.",
        "Empty lots can be reused to control land costs.",
      ],
      sampleAnswer:
        "I believe cities should create more small parks in busy areas. Even a limited green space can give residents a safe place to rest, walk, or meet neighbors. This may support both physical health and stronger local relationships. Building parks costs money, especially where land is expensive, but cities do not need to create large spaces everywhere. They can reuse empty lots or add trees and seats to small public areas. Careful planning can keep costs reasonable while making crowded neighborhoods healthier and more welcoming.",
      targetWordMin: 80,
      targetWordMax: 100,
    },
    tags: ["writing", "opinion", "city", "health", "original"],
    source: ORIGINAL_CONTENT_SOURCE,
  },
  {
    id: "writing-opinion-secondhand",
    schemaVersion: "1.0.0",
    contentRevision: 2,
    type: "opinion",
    stage: 6,
    titleJa: "中古品の利用を広げるべきか",
    descriptionJa: "価格、品質、環境への影響を比べながら意見を述べます。",
    estimatedMinutes: 15,
    payload: {
      instructionsJa:
        "TOPICについて、POINTSから二つを参考にしながら、あなたの意見と理由を80〜100語の英語で書いてください。",
      topic: "Should people buy secondhand products more often?",
      topicJa: "人々は中古品をもっと積極的に買うべきでしょうか。",
      points: ["Price", "Quality", "Waste"],
      reasonExamples: [
        "Used products usually cost less.",
        "Reusing products reduces waste and demand for new goods.",
      ],
      sampleAnswer:
        "I think people should buy secondhand products more often when the items are safe and in good condition. Used furniture, clothing, and books usually cost less, so families can save money. Reusing products also keeps useful materials out of the trash and reduces the need to make new goods. Buyers should still check quality carefully because repairs can sometimes cost more than expected. Shops can help by describing damage clearly and offering simple return rules. With reliable information, secondhand shopping can be both economical and environmentally responsible.",
      targetWordMin: 80,
      targetWordMax: 100,
    },
    tags: ["writing", "opinion", "shopping", "environment", "original"],
    source: ORIGINAL_CONTENT_SOURCE,
  },
] satisfies readonly PracticeSet[];
