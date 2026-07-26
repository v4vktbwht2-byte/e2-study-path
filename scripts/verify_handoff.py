#!/usr/bin/env python3
"""Validate the Codex handoff package itself.

This script intentionally uses only the Python standard library so it can run
before the JavaScript project is scaffolded.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    "START_HERE.md",
    "README.md",
    "AGENTS.md",
    "MASTER_PROMPT.md",
    "PLANS.md",
    "FILE_INDEX.md",
    "PROJECT_MANIFEST.json",
    "docs/00_PRODUCT_VISION.md",
    "docs/02_FUNCTIONAL_REQUIREMENTS.md",
    "docs/03_CURRICULUM_MAP.md",
    "docs/07_TECHNICAL_ARCHITECTURE.md",
    "docs/08_DATA_MODEL_AND_INDEXEDDB.md",
    "docs/09_REVIEW_ALGORITHM.md",
    "docs/10_VOCABULARY_MODE.md",
    "docs/12_CONTENT_MODEL_AND_AUTHORING.md",
    "docs/13_PWA_OFFLINE_INSTALL_UPDATE.md",
    "docs/15_TEST_STRATEGY.md",
    "docs/17_ACCEPTANCE_CRITERIA_TRACEABILITY.md",
    "docs/20_IMPLEMENTATION_STATUS.md",
    "prompts/00_PRE_FLIGHT.md",
    "prompts/01_SCAFFOLD_FOUNDATION.md",
    "prompts/02_DOMAIN_DB_CONTENT_PIPELINE.md",
    "prompts/03_ONBOARDING_CURRICULUM.md",
    "prompts/04_VOCABULARY_SRS.md",
    "prompts/05_DAILY_PLAN_LESSON_ENGINE.md",
    "prompts/06_SKILL_MODULES.md",
    "prompts/07_PWA_BACKUP_UPDATE.md",
    "prompts/08_PROGRESS_UX_ACCESSIBILITY.md",
    "prompts/09_TEST_CI_DEPLOY.md",
    "prompts/10_FINAL_AUDIT_RELEASE.md",
    "prompts/11_CONTENT_EXPANSION.md",
    "contracts/content-pack.schema.json",
    "contracts/vocabulary-item.schema.json",
    "contracts/exercise.schema.json",
    "contracts/lesson.schema.json",
    "contracts/review-state.schema.json",
    "contracts/backup.schema.json",
    "contracts/sample/content-pack.sample.json",
    "checklists/DEFINITION_OF_DONE.md",
    "checklists/FINAL_RELEASE_CHECKLIST.md",
]


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)


def main() -> int:
    errors: list[str] = []

    for relative in REQUIRED_FILES:
        path = ROOT / relative
        if not path.is_file():
            errors.append(f"Missing required file: {relative}")
        elif path.stat().st_size == 0:
            errors.append(f"Required file is empty: {relative}")

    json_files = sorted(ROOT.rglob("*.json"))
    for path in json_files:
        try:
            with path.open("r", encoding="utf-8") as handle:
                json.load(handle)
        except Exception as exc:  # noqa: BLE001 - CLI validation report
            errors.append(f"Invalid JSON: {path.relative_to(ROOT)}: {exc}")

    sample_pack_path = ROOT / "contracts/sample/content-pack.sample.json"
    if sample_pack_path.is_file():
        with sample_pack_path.open("r", encoding="utf-8") as handle:
            pack = json.load(handle)
        vocab_ids = {item.get("id") for item in pack.get("vocabulary", [])}
        lesson_ids = {item.get("id") for item in pack.get("lessons", [])}
        exercise_ids = {item.get("id") for item in pack.get("exercises", [])}

        if None in vocab_ids | lesson_ids | exercise_ids:
            errors.append("Sample content contains an item without an id")
        if len(vocab_ids) != len(pack.get("vocabulary", [])):
            errors.append("Duplicate vocabulary ids in sample content pack")
        if len(lesson_ids) != len(pack.get("lessons", [])):
            errors.append("Duplicate lesson ids in sample content pack")
        if len(exercise_ids) != len(pack.get("exercises", [])):
            errors.append("Duplicate exercise ids in sample content pack")

        for lesson in pack.get("lessons", []):
            for section in lesson.get("sections", []):
                for exercise_id in section.get("exerciseIds", []):
                    if exercise_id not in exercise_ids:
                        errors.append(
                            f"Sample lesson {lesson.get('id')} references missing exercise {exercise_id}"
                        )

    manifest_path = ROOT / "PROJECT_MANIFEST.json"
    if manifest_path.is_file():
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest_entries = manifest.get("files", [])
            listed_paths = {entry.get("path") for entry in manifest_entries}
            actual_paths = {
                path.relative_to(ROOT).as_posix()
                for path in ROOT.rglob("*")
                if path.is_file() and path != manifest_path
            }
            missing_from_manifest = actual_paths - listed_paths
            stale_manifest_entries = listed_paths - actual_paths
            if missing_from_manifest:
                errors.append(
                    "Files missing from manifest: "
                    + ", ".join(sorted(missing_from_manifest))
                )
            if stale_manifest_entries:
                errors.append(
                    "Stale manifest entries: "
                    + ", ".join(sorted(stale_manifest_entries))
                )
            for entry in manifest_entries:
                relative = entry.get("path")
                if not isinstance(relative, str):
                    errors.append("Manifest entry without a valid path")
                    continue
                path = ROOT / relative
                if not path.is_file():
                    continue
                digest = hashlib.sha256(path.read_bytes()).hexdigest()
                if digest != entry.get("sha256"):
                    errors.append(f"Manifest checksum mismatch: {relative}")
                if path.stat().st_size != entry.get("sizeBytes"):
                    errors.append(f"Manifest size mismatch: {relative}")
        except Exception as exc:  # noqa: BLE001 - CLI validation report
            errors.append(f"Invalid project manifest: {exc}")

    markdown_files = sorted(ROOT.rglob("*.md"))
    empty_headings = []
    for path in markdown_files:
        text = path.read_text(encoding="utf-8")
        if not text.lstrip().startswith("#"):
            empty_headings.append(str(path.relative_to(ROOT)))
    if empty_headings:
        errors.append("Markdown files without a top heading: " + ", ".join(empty_headings))

    if errors:
        for error in errors:
            fail(error)
        print(f"Handoff validation failed with {len(errors)} error(s).", file=sys.stderr)
        return 1

    print(
        "Handoff validation passed: "
        f"{len(REQUIRED_FILES)} required files, "
        f"{len(json_files)} JSON files, "
        f"{len(markdown_files)} Markdown files."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
