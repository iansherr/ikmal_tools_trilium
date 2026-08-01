"""Record concise install and repair history in a hidden extension note."""

from __future__ import annotations

from datetime import datetime, timezone
from html import escape

from etapi import Etapi


MARKER = "extMigrationLog"


def ensure_log_note(api: Etapi) -> str:
    """Find or create the hidden note that stores extension migration history."""
    note_id = api.find_by_label(MARKER)
    if note_id:
        return note_id
    note_id = api.create_note(
        parent_note_id="_userHidden",
        title="Extension Migration Log",
        content="<h1>Extension Migration Log</h1>",
    )
    api.set_label(note_id, MARKER)
    api.set_label(note_id, "iconClass", "bx bx-history")
    return note_id


def _summary(output: str) -> list[str]:
    """Keep useful status lines while dropping noisy connection banners."""
    prefixes = (
        "created", "updated", "renamed", "wired", "repaired", "ensured",
        "removed", "layout", "preserved", "unchanged", "daily",
    )
    lines = []
    for line in output.splitlines():
        stripped = line.strip()
        if stripped and stripped.startswith(prefixes):
            lines.append(stripped)
    return lines or ["Appliers completed without reported changes."]


def record(api: Etapi, operation: str, version: str, output: str) -> None:
    """Append one timestamped, human-readable migration entry."""
    note_id = ensure_log_note(api)
    timestamp = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
    details = "\n".join(_summary(output))
    entry = (
        f"<section><h2>{escape(timestamp)} — {escape(operation)} "
        f"v{escape(version)}</h2><pre>{escape(details)}</pre></section>"
    )
    api.set_content(note_id, f"{api.get_content(note_id)}\n{entry}")
