# 21. Source Notes

Accessed: 2026-07-27

This document records authoritative references used to set time-sensitive product assumptions. The application must still label itself unofficial and must not reproduce source content.

## OpenAI Codex workflow

- OpenAI Codex best practices: https://developers.openai.com/codex/learn/best-practices
- AGENTS.md guidance: https://developers.openai.com/codex/agent-configuration/agents-md
- Codex CLI: https://developers.openai.com/codex/cli

Relevant design decisions:

- Complex work should be planned before implementation.
- Prompts should state goal, context, constraints, and done conditions.
- Durable repository guidance belongs in `AGENTS.md`.
- Tests and review should be part of completion.

## Current Eiken Grade 2 structure

- Grade 2 official overview: https://www.eiken.or.jp/eiken/exam/grade_2/
- Grade 2 test format: https://www.eiken.or.jp/eiken/exam/grade_2/solutions.html
- 2026-1 official question PDF used only to confirm public format constraints: https://www.eiken.or.jp/eiken/exam/kakomon/2026-1-1ji-2kyu.pdf

Format assumptions recorded in the specification:

- Reading/Writing: 85 minutes
- Listening: approximately 25 minutes
- Reading: 17 short vocabulary/phrase items, 6 passage gap-fill items, 8 content questions
- Writing: one English summary and one opinion essay
- Listening: 15 conversation questions and 15 passage questions, played once
- Summary target: 45–55 words in the 2026-1 booklet
- Opinion essay target: 80–100 words in the 2026-1 booklet
- Speaking interview: approximately 7 minutes, passage of approximately 60 words, passage question, three-panel narration, and two opinion questions

Do not copy the official questions or audio into the application.

## PWA

- MDN Progressive Web Apps: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps
- Web Application Manifest: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest
- Service worker tutorial: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Tutorials/CycleTracker/Service_workers
- IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- MediaRecorder: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder

## Learning and forgetting

- Murre, J. M. J. & Dros, J. (2015), “Replication and Analysis of Ebbinghaus’ Forgetting Curve,” PLOS ONE: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0120644

The product uses the broad pattern of rapid early forgetting and slower later decay as a design principle. It does not claim that a fixed percentage applies to every learner or item.
