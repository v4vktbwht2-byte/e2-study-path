# 17. Acceptance Criteria and Traceability

## 1. Release-level acceptance

### AC-REL-001 First-run

Given 新規端末状態
When アプリを起動しオンボーディングを完了する
Then 目標、学習時間、開始ステージが保存され、今日画面へ移動する。

### AC-REL-002 Diagnostic

Given 診断を選択したユーザー
When 基礎問題へ回答する
Then 難しすぎる問題の連続を避け、できている項目と推奨ステージを表示する。

### AC-REL-003 Lesson

Given ステージ0または1のレッスン
When 説明、例文、確認、想起を完了する
Then 進捗と復習項目が保存され、再読込後も完了状態が残る。

### AC-REL-004 Vocabulary new

Given 新規単語セッション
When 5語を学習する
Then 各項目にReviewStateとMasteryProfileが作成される。

### AC-REL-005 Adaptive review

Given review状態の単語
When Again、Hard、Good、Easyをそれぞれ選ぶ
Then `09_REVIEW_ALGORITHM.md` に従う異なる状態・dueAt・intervalが得られる。

### AC-REL-006 Backlog rescue

Given 80件以上の期限超過
When 今日画面を開く
Then 軽め・標準・しっかり・すべてが表示され、軽めでは優先項目だけが選ばれる。

### AC-REL-007 Mastery dimensions

Given 英→日四択に正解
Then recognitionは更新されるがspellingは更新されない。

Given スペル入力に正解
Then spellingとrecallが設定された割合で更新される。

### AC-REL-008 Offline

Given オンラインで一度起動しstarter contentを開いた
When ネットワークを切り再読み込みする
Then アプリシェル、今日、単語、保存済み教材が利用でき、回答を保存できる。

### AC-REL-009 Backup

Given 学習履歴がある
When JSONをexportし、別の空状態へrestoreする
Thenprofile、review、mastery、progressが復元される。

### AC-REL-010 Accessibility

Given キーボードのみ
When オンボーディングから単語1問を完了する
Then マウスなしで完了でき、フォーカスが見える。

### AC-REL-011 Mobile

Given 320px幅
When 今日→単語セッション→完了
Then 横スクロールや隠れた主要ボタンなしで完了する。

### AC-REL-012 Content legality

Given bundled content
Then source metadataがoriginalで、公式問題・公式音源・公式ロゴが含まれない。

## 2. Requirement traceability summary

| Requirement area | Detailed spec | Primary phase | Primary tests |
|---|---|---:|---|
| FR-ONB | 02, 05 | 03 | E2E-001 |
| FR-DIA | 02, 03 | 03 | unit diagnostic + E2E-001 |
| FR-CUR/LES | 03, 11 | 03/05 | lesson component + AC-REL-003 |
| FR-DLY | 09 + planning docs | 05 | daily plan unit + E2E-004 |
| FR-VOC | 10 | 04 | vocabulary components + E2E-002 |
| FR-REV | 09 | 04 | scheduler unit + E2E-003 |
| FR-REA/LIS/WRI/SPK | 05, 11, 12 | 06 | E2E-007/008 + components |
| FR-PRO | 08 | 08 | aggregation unit |
| FR-DAT | 08, 14 | 07 | E2E-005 |
| FR-PWA | 13 | 07/09 | E2E-006 |
| NFR-A11Y | 06, 14 | 08/09 | axe + manual |
| NFR-PRIV | 14 | all | review checklist |

## 3. Phase gates

### Phase 01

- App boots
- responsive shell
- scripts work
- no TypeScript errors

### Phase 02

- DB opens
- schemas validate
- domain tests pass
- sample content seeds

### Phase 03

- onboarding and diagnostic work end-to-end
- stage map and at least one lesson work

### Phase 04

- vocabulary sessions and review scheduler work
- reload persists state

### Phase 05

- daily plan and lesson completion work
- backlog handling works

### Phase 06

- all skill module shells are functional with real sample content

### Phase 07

- install/offline/update/backup work

### Phase 08

- progress/settings/a11y polish complete

### Phase 09

- CI, full tests, deployment build

### Phase 10

- no critical known bug
- all release-level acceptance criteria reviewed
- documentation current
