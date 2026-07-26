# Phase 06 — Reading, Listening, Writing, Speaking, and Mock Practice

## Goal

語彙・文法以外の技能練習を実際に利用可能にし、上位ステージで英検2級の現行形式を参考にしたオリジナル演習へつなげる。

## Context

- FR-REA / FR-LIS / FR-WRI / FR-SPK / FR-MOCK
- `docs/03_CURRICULUM_MAP.md`
- `docs/05_SCREEN_SPECIFICATIONS.md`
- `docs/12_CONTENT_MODEL_AND_AUTHORING.md`
- `docs/21_SOURCE_NOTES.md`

## Tasks

### Reading

1. reading hub、set list、reader、questions、resultを実装する。
2. 段落番号、文字サイズ、回答時間、根拠文選択を実装する。
3. 回答後に正答根拠、誤答理由、段落要点、重要語句を表示する。
4. 重要語句を単語お気に入りへ追加できる。
5. 6セット以上のオリジナル読解を追加する。

### Listening

6. 本番風と復習モードを実装する。
7. 本番風では1回再生制御を実装する。
8. 復習では繰り返し、速度、一文、スクリプト、ディクテーションを実装する。
9. AudioServiceを抽象化し、asset audio / Web Speech / unsupportedを扱う。
10. Web Speech非対応・オフライン・音声なしの代替を実装する。
11. 6セット以上のオリジナルscriptと問題を追加する。

### Writing

12. summaryとopinionのprompt list、editor、draft autosave、historyを実装する。
13. Unicodeと英単語を考慮したword countを実装・テストする。
14. summaryは45〜55語の目安、opinionは80〜100語の目安を表示する。
15. 内容・構成・語彙・文法の自己評価rubricを実装する。
16. summary 4題、opinion 4題以上のオリジナル教材を追加する。

### Speaking

17. speaking hubと面接フローを実装する。
18. 20秒黙読、音読、No.1、20秒準備、3場面説明、No.3/4を実装する。
19. MediaRecorder capability detection、権限説明、録音・再生・削除を実装する。
20. 権限拒否・非対応時のtext response/self-practiceを実装する。
21. 4セット以上のオリジナル教材を追加する。3コマは自作SVGまたは3場面テキストカードで表現する。

### Mock

22. 短縮模試を1セット以上作る。
23. セクションタイマー、中断警告、結果、弱点へのリンクを実装する。
24. 結果を公式スコアと表示しない。

## Constraints

- 公式過去問・公式音声・公式イラストを使用しない。
- Web Speech音声を本番相当品質と断定しない。
- AI採点なしでも成立させる。
- 自由作文を自動で正誤判定しない。
- 録音権限を画面表示直後に要求しない。

## Done when

- 読解6、リスニング6、要約4、意見4、会話4、短縮模試1がvalidationを通る。
- 各技能で少なくとも1セットを完了し履歴保存できる。
- writing draftがreload後も残る。
- microphone deniedでもspeaking flowを完了できる。
- listening unsupportedでも代替学習ができる。

## Verification

```bash
npm run validate:content
npm run test -- wordCount
npm run test:e2e -- --grep "reading|listening|writing|speaking|mock"
npm run check
```

Phase 06を記録し、Phase 07へ進む。
