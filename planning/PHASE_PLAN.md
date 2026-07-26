# Phase Plan

| Phase | Primary output | Depends on | Gate |
|---:|---|---|---|
| 00 | Audit and execution plan | Handoff docs | verify_handoff |
| 01 | React/Vite shell and design foundation | 00 | lint/type/test/build |
| 02 | Domain, DB, content validation | 01 | domain + DB tests |
| 03 | Onboarding, diagnostic, curriculum | 02 | first-run E2E |
| 04 | Vocabulary and review | 02/03 | vocab/review E2E |
| 05 | Daily plan and lesson integration | 03/04 | backlog E2E |
| 06 | Reading/listening/writing/speaking/mock | 02/05 | skill E2E |
| 07 | PWA/offline/backup | 02/06 | offline/backup E2E |
| 08 | Progress/settings/a11y | all UI | axe/mobile E2E |
| 09 | CI/deploy/full tests | 01-08 | clean install full suite |
| 10 | Final audit | 00-09 | release checklist |
| 11 | Content expansion | Pilot release | per-batch QA |
