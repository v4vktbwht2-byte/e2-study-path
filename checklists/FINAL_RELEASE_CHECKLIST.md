# Final Release Checklist

Phase 10 local Pilot repository result: 2026-07-27 environment-limited Pass。未チェック項目は最終競合修正後の動的ゲート、外部実機・実配信・人手校正であり、再現手順とfallbackを`docs/22_PILOT_RELEASE_AUDIT.md`へ記録した。実公開前のHigh gateと、Phase 11で継続するMedium／Low項目を混同しない。

## Product

- [x] onboarding
- [x] diagnostic
- [x] course map
- [x] beginner lessons
- [x] daily plan
- [x] vocabulary modes
- [x] adaptive review
- [x] backlog rescue
- [x] reading
- [x] listening
- [x] writing
- [x] speaking
- [x] mock
- [x] progress
- [x] settings
- [x] backup/restore

## Quality

- [x] clean npm ci
- [x] lint
- [x] typecheck
- [x] unit/component tests
- [x] coverage reviewed
- [x] content validation
- [x] build
- [x] E2E
- [x] dependency audit reviewed（offline 0件、最新registryは実公開前の外部ゲート）
- [ ] 最終write coordination追加後のunit／coverage／root・subpath build／artifact／E2E再実行（High、環境制限）

## PWA

- [x] manifest
- [x] install UI／案内
- [x] offline
- [x] update safety
- [x] base path
- [ ] mobile real-device check

## Accessibility

- [x] keyboard
- [x] focus
- [x] labels
- [x] zoom／reflow automated proxy
- [x] reduced motion
- [x] contrast
- [ ] screen reader spot check

## Content and branding

- [x] unofficial notice
- [x] no official logo
- [x] no copied official questions/audio
- [x] original source metadata
- [x] minimum content counts
- [x] content QA spot check

## Documentation

- [x] README start/test/deploy
- [x] PWA install help
- [x] backup/restore help
- [x] troubleshooting
- [x] versions
- [x] changelog
- [x] implementation status
- [x] known limitations

## External pre-publication and Phase 11 checks

- [ ] 公開ライセンス／配布権利の確定（High、実公開前）
- [ ] latest registry `npm audit`／`npm audit --omit=dev`（High、実公開前）
- [ ] remote GitHub Actions／Pages（Medium、実repository）
- [ ] waiting Service Worker差替え（Medium、旧版・新版の実配信）
- [ ] iOS／Android PWA（Medium、実機）
- [ ] NVDA／VoiceOver（Medium、実支援技術）
- [ ] 実ブラウザー200% zoom／forced colors（Medium）
- [ ] MediaRecorder／権限拒否（Medium、実機）
- [ ] Web Speechの声質・発音（Low、実機）
- [ ] 人間の英語校閲者による全教材校正（Medium、Phase 11 batch QA）
