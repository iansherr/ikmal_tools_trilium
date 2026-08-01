#!/usr/bin/env python3
"""Export the installed extension as importable Trilium zips.

Trilium's own export format is the distribution mechanism -- no `trilium-pack`
dependency needed, and `!!!meta.json` carries the attributes, so the promoted
attribute schema on every template survives the round trip.

Export is per-subtree, so this writes one zip per container into dist/. Import
each from Trilium's note context menu (Import into note).

    python3 tools/export_package.py

Note that `install.py` remains the better path for anything you can point at
over ETAPI: it is idempotent, so it updates an existing install instead of
importing a second copy alongside it.
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import apply_skeleton
from etapi import Etapi, EtapiError
from version import EXTENSION_VERSION

DIST = Path(__file__).resolve().parents[1] / "dist"

# Only structural subtrees are packaged. Export is whole-subtree with no depth
# limit, so exporting a content container such as Tasks or Meetings would ship
# whatever notes happen to live in the instance it was exported from -- test
# fixtures included. Those containers hold no extension logic anyway: they are
# nine notes with a marker label each, recreated declaratively by
# apply_skeleton.py. The Journal is excluded for the same reason; a fresh
# install regenerates it from #calendarRoot and ~dateTemplate.
PACKAGE_MARKERS = ("templateRoot", "dashboardRoot", "scriptRoot")


def export_subtree(api: Etapi, note_id: str, destination: Path) -> int:
    """Download one subtree as a zip. Returns bytes written."""
    request = urllib.request.Request(
        f"{api.url}/etapi/notes/{note_id}/export?format=html",
        headers={"Authorization": api.token},
    )
    try:
        with urllib.request.urlopen(request) as response:
            payload = response.read()
    except urllib.error.HTTPError as error:
        raise EtapiError(f"export {note_id} -> {error.code}") from error

    destination.write_bytes(payload)
    return len(payload)


def main() -> int:
    try:
        api = Etapi.from_env()
        info = api.app_info()
        DIST.mkdir(exist_ok=True)

        manifest = {
            "exportedAt": datetime.now(timezone.utc).isoformat(),
            "triliumVersion": info["appVersion"],
            "extensionVersion": EXTENSION_VERSION,
            "subtrees": [],
            # A zip import cannot create the marker labels the scripts look up,
            # so record what a manual install still has to produce.
            "requiredContainers": [
                {"title": c.title, "label": c.marker}
                for c in apply_skeleton.CONTAINERS
                if c.marker not in PACKAGE_MARKERS
            ],
        }

        print(f"Trilium {info['appVersion']} -> {DIST}\n")
        for marker in PACKAGE_MARKERS:
            note_id = api.find_by_label(marker)
            if note_id is None:
                print(f"skipped   #{marker} (not installed)")
                continue

            title = api.get_note(note_id)["title"]
            filename = f"{title.lower().replace(' ', '-')}.zip"
            size = export_subtree(api, note_id, DIST / filename)
            manifest["subtrees"].append(
                {"marker": marker, "title": title, "file": filename}
            )
            print(f"exported  {title:15} {size:7}b  {filename}")

        (DIST / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        print(f"\nWrote {len(manifest['subtrees'])} zips + manifest.json")
    except EtapiError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
