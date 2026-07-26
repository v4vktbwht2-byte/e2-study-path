# AGENTS.md

## Mission

Build and maintain the repository described by `docs/`. The product is a mobile-first, offline-first English self-study PWA for Japanese beginners progressing toward Eiken Grade 2 level. It is not an official Eiken product.

## Source of truth

Read in this order before making architectural changes:

1. `docs/00_PRODUCT_VISION.md`
2. `docs/01_SCOPE_AND_RELEASES.md`
3. `docs/02_FUNCTIONAL_REQUIREMENTS.md`
4. Relevant detailed documents under `docs/`
5. Current `PLANS.md`
6. `docs/20_IMPLEMENTATION_STATUS.md`

When documents conflict, prefer the more specific document. Record unresolved conflicts in `docs/19_DECISIONS_AND_OPEN_POINTS.md` before implementing.

## Working agreements

- Plan before coding for multi-file or architectural work.
- Continue autonomously through the current phase unless blocked by credentials, destructive action, or a true product contradiction.
- Do not ask the user to choose routine implementation details already resolved in `docs/`.
- Keep domain rules in pure TypeScript modules with no React or IndexedDB dependency.
- Keep persistence behind repository interfaces.
- Validate all content at runtime and in CI using Zod or an equivalent schema derived from `contracts/`.
- Use stable package versions; do not use prerelease dependencies.
- Commit a lockfile.
- Avoid adding a backend or paid API to the core release.
- Never place secrets or AI API keys in browser code.
- Do not copy official exam questions, official audio, official logos, or proprietary textbook content.
- Any generated educational content must be marked original and pass content validation.
- Use Japanese UI text that is encouraging, plain, and suitable for adult beginners.
- Do not shame users for missed days or low scores.

## Expected scripts

After Phase 01, maintain these scripts:

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:coverage`
- `npm run test:e2e`
- `npm run validate:content`
- `npm run check`

`npm run check` must run lint, typecheck, unit tests, content validation, and build. E2E may remain separate if runtime cost is high, but must run in CI.

## Definition of done for every phase

- Requirements for the phase are implemented, not merely scaffolded.
- Empty screens, fake buttons, silent failures, and unexplained TODOs are not acceptable.
- Tests cover domain rules and critical user flows.
- Loading, empty, offline, permission-denied, and error states are handled where applicable.
- Mobile layout works at 320 CSS pixels and common modern phone widths.
- Interactive controls are keyboard operable and have accessible names.
- `docs/20_IMPLEMENTATION_STATUS.md` is updated.
- `PLANS.md` is updated with decisions, verification commands, and remaining work.
- Relevant checks are executed and results are reported honestly.

## Review behavior

Before declaring a phase complete:

1. Review the diff for regressions and duplicate abstractions.
2. Run the phase quality gate.
3. Confirm acceptance criteria in `docs/17_ACCEPTANCE_CRITERIA_TRACEABILITY.md`.
4. Record known limitations rather than hiding them.

See `checklists/CODE_REVIEW.md` and `checklists/DEFINITION_OF_DONE.md`.
