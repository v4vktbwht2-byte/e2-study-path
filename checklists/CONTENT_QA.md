# Content QA Checklist

Phase 10 Pilot batch result: 2026-07-27 release spot check Pass。schema／重複／参照／語数／出所は全件自動検証し、各Stage・各技能の代表項目を人間向けに読み合わせた。未チェック項目は代表確認のみで、全351教材の人手校正を完了したという意味ではない。対象ID、修正内容、分布は`docs/22_PILOT_RELEASE_AUDIT.md`に記録し、人間の英語校閲者による全件校正はPhase 11で行う。

## All content

- [x] stable unique ID
- [x] schemaVersion / contentVersion
- [x] stage and prerequisites
- [x] source.type = original
- [x] official question/audio/logoを使用していない
- [ ] spelling and grammar checked（代表spot checkはPass、全件人手校正はPhase 11）
- [ ] Japanese is natural（代表spot checkはPass、全件人手校正はPhase 11）
- [x] no unsafe raw HTML
- [ ] answer is unambiguous（代表spot checkはPass、全155演習の人手再判定はPhase 11）
- [ ] explanation actually explains why（代表spot checkはPass、全155演習の人手再判定はPhase 11）
- [ ] target skills and mastery dimensions are correct（schemaは全件Pass、意味上の全件再判定はPhase 11）

## Vocabulary

- [ ] lemma/headword correct（14語の代表spot checkはPass）
- [ ] part of speech correct（14語の代表spot checkはPass）
- [ ] meaning matches example（14語の代表spot checkはPass）
- [ ] example translation matches（14語の代表spot checkはPass）
- [ ] lower-stage example is not too difficult（Stage 0／1の代表spot checkはPass）
- [ ] collocation is natural（代表spot checkで修正済み、全件校正はPhase 11）
- [ ] sense is not overloaded（14語の代表spot checkはPass）
- [ ] confusion group is accurate（schema／参照はPass、意味上の全件再判定はPhase 11）
- [x] pronunciation data verified or omitted

## Multiple choice

- [x] exactly intended number of choices
- [x] answer index valid
- [x] no duplicate choices
- [ ] distractors are plausible but clearly wrong（各Stage代表はPass）
- [ ] no second valid answer（各Stage代表はPass）

## Reading

- [ ] passage structure is coherent（代表spot checkはPass、全件校正はPhase 11）
- [x] evidence reference exists（schema／参照検証は全件Pass）
- [ ] answer is supported by text（代表spot checkはPass、全件再判定はPhase 11）
- [ ] distractor explanations are valid（代表spot checkはPass、全件再判定はPhase 11）
- [ ] passage does not depend on unstable current facts without sourcing（代表spot checkはPass、全件再判定はPhase 11）

## Listening

- [x] script complete（schema検証は全件Pass）
- [x] speaker labels（schema検証は全件Pass）
- [ ] question can be answered from audio（代表spot checkはPass、全件再判定はPhase 11）
- [x] audio strategy defined（Web Speech／script fallbackを実装済み）
- [x] fallback works（自動テストはPass、対象端末の実機確認はPhase 11）

## Writing

- [ ] prompt allows more than one defensible answer（代表spot checkはPass、全件再判定はPhase 11）
- [x] summary key points defined（schema検証は全件Pass）
- [x] sample word count valid（schema検証は全件Pass）
- [ ] opinion points are optional hints, not forced answers（代表spot checkはPass、全件再判定はPhase 11）
- [x] rubric is present（schema検証は全件Pass）

## Speaking

- [ ] passage length appropriate（代表spot checkはPass、全件再判定はPhase 11）
- [x] No.1 evidence defined（schema検証は全件Pass）
- [ ] three scenes have clear sequence（代表spot checkはPass、全件再判定はPhase 11）
- [ ] opinion questions are answerable（代表spot checkはPass、全件再判定はPhase 11）
- [ ] sample responses are examples, not sole answers（代表spot checkはPass、全件再判定はPhase 11）

## Batch report

- [x] validation command pass
- [x] duplicate report
- [x] stage coverage report
- [x] human spot-check list
