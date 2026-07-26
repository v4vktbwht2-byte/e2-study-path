# 06. Design System

## 1. トーン

- 親しみやすいが幼児向けにしない
- 落ち着き、安心、前進を感じる
- 学習者を評価する教師口調ではなく、並走するガイドの口調
- 誤答を「失敗」ではなく「次に復習する手がかり」と表現

## 2. カラートークン案

実装時にコントラストを検証すること。

```css
:root {
  --color-bg: #f6f8fc;
  --color-surface: #ffffff;
  --color-surface-muted: #eef2f8;
  --color-text: #172033;
  --color-text-muted: #5d687b;
  --color-primary: #365fc7;
  --color-primary-strong: #2549a0;
  --color-accent: #d88412;
  --color-success: #257a57;
  --color-warning: #a76500;
  --color-danger: #b33a3a;
  --color-border: #d7deea;
  --focus-ring: #1e6fff;
}
```

ダークテーマはCSS変数を上書きする。色だけで状態を伝えない。

## 3. タイポグラフィ

フォントファイルを同梱せず、システムフォントを使う。

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  "Hiragino Sans",
  "Yu Gothic UI",
  "Noto Sans JP",
  sans-serif;
```

推奨:

- 本文: 16px以上
- 英文読解: 17〜19px切替
- 行高: 日本語1.7前後、英文1.6前後
- 小さな補足でも14px未満を多用しない

## 4. スペーシング

4px基準。

```text
4 / 8 / 12 / 16 / 24 / 32 / 48
```

## 5. 角丸・影

- カード: 14〜18px
- ボタン: 12〜14px
- 影は弱く、境界線を基本にする
- 学習カードの表裏で大きな3D回転を使わない。動き軽減に対応しやすいフェードを使う

## 6. コンポーネント

最低限:

- AppShell
- BottomNavigation
- TopBar
- Button variants
- IconButton
- Card
- ProgressBar
- Badge
- StatusPill
- SegmentedControl
- Dialog
- Toast / InlineAlert
- EmptyState
- ErrorState
- Skeleton
- FormField
- ChoiceList
- AnswerFeedback
- AudioControl
- Timer
- WordCount
- MasteryMeter

## 7. ボタン階層

- Primary: 画面内の主要行動1つ
- Secondary: 代替行動
- Tertiary: 補助リンク
- Danger: 削除等。確認を伴う

同一画面にPrimaryを乱立させない。

## 8. フォーカス・キーボード

- `:focus-visible` を明確にする
- EnterとSpaceの挙動をネイティブ要素に任せる
- divをボタン代わりにしない
- 選択肢はラジオまたはボタンとして意味を持たせる

## 9. アニメーション

- 150〜250ms程度
- 正答時の軽いフィードバックは許容
- 画面全体の派手な紙吹雪をデフォルトにしない
- `prefers-reduced-motion` とアプリ設定で無効化できる

## 10. 文言例

避ける:

- 「また間違えました」
- 「連続記録が途切れました」
- 「記憶力が低いです」

推奨:

- 「この単語は短い間隔でもう一度確認します」
- 「今日は5分コースでも十分です」
- 「戻ってきました。続きを始めましょう」
- 「見れば分かる状態です。次は自分で思い出す練習へ進みます」
