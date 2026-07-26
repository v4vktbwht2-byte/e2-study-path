# Phase 02 — Domain Model, IndexedDB, and Content Pipeline

## Goal

復習・習熟度・診断・日次プランの純粋ドメイン基盤、Dexie永続化、コンテンツ検証とseed処理を実装する。

## Context

- `docs/07_TECHNICAL_ARCHITECTURE.md`
- `docs/08_DATA_MODEL_AND_INDEXEDDB.md`
- `docs/09_REVIEW_ALGORITHM.md`
- `docs/11_LESSON_AND_EXERCISE_ENGINE.md`
- `docs/12_CONTENT_MODEL_AND_AUTHORING.md`
- `contracts/`

## Tasks

1. domain typesとrepository interfacesを作る。
2. Review schedulerを純粋関数として実装する。
3. Review queue priorityを実装する。
4. Mastery 5軸更新を実装する。
5. Daily plan容量計算の基礎を実装する。
6. Diagnostic placementの基礎ルールを実装する。
7. Dexie DBとversion 1 schemaを実装する。
8. repository実装を作り、UIがDexieを直接参照しないようにする。
9. Attempt、ReviewState、Mastery、Session更新を同一transactionで行うapplication serviceを作る。
10. Zod等でcontent schemasを実装し、`contracts/` と整合させる。
11. bundled content pack loader、validation、seed、version updateを実装する。
12. `contracts/sample/` をアプリ内starter contentへ取り込めるようにする。
13. `npm run validate:content` でID重複、参照切れ、正答、語数、source metadata等を検証する。
14. 起動時にDB・contentを初期化し、失敗時に復旧画面を表示する。
15. fake-indexeddbでrepositoryとmigrationのテストを作る。
16. Review schedulerの分岐テストを網羅する。

## Constraints

- `Date.now()` をdomain内部で直接多用せず、現在時刻を引数にする。
- ReviewStateをUIの都合で変形しない。
- schema validationをTypeScript型だけで済ませない。
- content parse失敗を握りつぶさない。

## Done when

- sample contentがDBへseedされる。
- 同じcontentVersionで重複seedされない。
- 1回答がattempt/review/mastery/sessionへ原子的に反映される。
- review計算のAgain/Hard/Good/Easyが仕様どおり。
- `npm run validate:content` が実データを検査する。
- DB reload後もデータが残る統合テストがある。

## Verification

```bash
npm run lint
npm run typecheck
npm run test -- review
npm run test -- db
npm run validate:content
npm run build
```

## Status update

Phase 02の結果を記録し、そのままPhase 03へ進む。
