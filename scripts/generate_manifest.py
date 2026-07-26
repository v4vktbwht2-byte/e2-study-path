#!/usr/bin/env python3
"""Generate a deterministic manifest for the handoff package."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "PROJECT_MANIFEST.json"
EXCLUDED = {OUTPUT.resolve()}
EXCLUDED_DIRECTORY_NAMES = {
    ".git",
    ".vite",
    "coverage",
    "dist",
    "node_modules",
    "playwright-report",
    "test-results",
}


def is_excluded(path: Path) -> bool:
    """Return whether a path is generated state rather than repository source."""

    if path.resolve() in EXCLUDED:
        return True
    relative_parts = path.relative_to(ROOT).parts
    return any(part in EXCLUDED_DIRECTORY_NAMES for part in relative_parts)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    files = []
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file() or is_excluded(path):
            continue
        relative = path.relative_to(ROOT).as_posix()
        files.append(
            {
                "path": relative,
                "sizeBytes": path.stat().st_size,
                "sha256": sha256(path),
            }
        )

    payload = {
        "package": "E2 Study Path Codex Handoff Full Set",
        "packageVersion": "1.0.0",
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "manifestPolicy": (
            "The manifest tracks repository source files and excludes "
            "PROJECT_MANIFEST.json, Git metadata, dependencies, and generated artifacts."
        ),
        "fileCountExcludingManifest": len(files),
        "totalSizeBytesExcludingManifest": sum(item["sizeBytes"] for item in files),
        "files": files,
    }
    OUTPUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUTPUT.name}: {len(files)} files")


if __name__ == "__main__":
    main()
