#!/usr/bin/env python3
"""Remove extension-owned runtime notes without touching user content.

The uninstall is intentionally conservative. It removes implementation notes,
the extension's launchbar entries, saved-search widgets, Config, and empty
extension containers. It never deletes
the Journal, Projects, People, Organizations, project hubs, or the imported
archive. Containers that contain user notes are left in place.

    python3 tools/uninstall.py
"""

from __future__ import annotations

import sys

import apply_collections
import apply_scripts
import apply_templates
from etapi import Etapi, EtapiError


def owned_label(note: dict, name: str, value: str | None = None) -> bool:
    return any(
        attribute.get("noteId") == note["noteId"]
        and attribute.get("type") == "label"
        and attribute.get("name") == name
        and (value is None or attribute.get("value") == value)
        for attribute in note.get("attributes", [])
    )


def delete_note(api: Etapi, note_id: str, title: str) -> None:
    api.delete_note(note_id)
    print(f"removed   {title:32} {note_id}")


def remove_implementation_tree(api: Etapi, marker: str) -> int:
    root_id = api.find_by_label(marker)
    if root_id is None:
        return 0

    removed = 0
    if marker == "templateRoot":
        root = api.get_note(root_id)
        for template in apply_templates.TEMPLATES:
            note_id = apply_templates.find_template(api, root_id, template.marker)
            if note_id:
                delete_note(api, note_id, template.title)
                removed += 1
    elif marker == "scriptRoot":
        parents = {"": root_id}
        script_ids: list[tuple[str, str]] = []
        for script in apply_scripts.SCRIPTS:
            parent_id = parents.get(script.parent_marker or "")
            if parent_id is None:
                continue
            note_id = apply_scripts.find_script(api, parent_id, script.marker)
            if note_id:
                parents[script.marker] = note_id
                script_ids.append((note_id, script.title))
        for note_id, title in reversed(script_ids):
            delete_note(api, note_id, title)
            removed += 1
    elif marker == "dashboardRoot":
        for note_id in list(api.get_note(root_id).get("childNoteIds", [])):
            note = api.get_note(note_id)
            if owned_label(note, "extView"):
                delete_note(api, note_id, note["title"])
                removed += 1

    root = api.get_note(root_id)
    if not root.get("childNoteIds"):
        delete_note(api, root_id, root["title"])
        removed += 1
    else:
        print(f"preserved  {root['title']:31} contains user-owned children")
    return removed


def remove_project_dashboards(api: Etapi) -> int:
    project_root = api.find_by_label("projectRoot")
    if project_root is None:
        return 0

    removed = 0
    pending = [project_root]
    seen: set[str] = set()
    while pending:
        parent_id = pending.pop()
        if parent_id in seen:
            continue
        seen.add(parent_id)
        for child_id in list(api.get_note(parent_id).get("childNoteIds", [])):
            child = api.get_note(child_id)
            if owned_label(child, "extHubDashboard", "projectHub"):
                delete_note(api, child_id, child["title"])
                removed += 1
                continue
            pending.append(child_id)
    return removed


def remove_launchbar_entries(api: Etapi) -> int:
    """Remove extension launchers while leaving native launchers untouched."""
    titles = {script.title for script in apply_scripts.SCRIPTS if script.marker.startswith("launcher")}
    titles.update({"New Meeting", "New Story", "New Edit", "New Scratch", "New Email", "New Task", "New Project Hub", "New Person", "New Organization", "New Topic"})
    removed = 0
    for root_id in ("_lbVisibleLaunchers", "_lbAvailableLaunchers"):
        try:
            root = api.get_note(root_id)
        except EtapiError:
            continue
        for child_id in list(root.get("childNoteIds", [])):
            child = api.get_note(child_id)
            if child.get("type") == "launcher" and (
                child_id in {f"al_{launcher_id}" for launcher_id in apply_scripts.LAUNCHER_SCRIPT_MARKERS}
                or child.get("title") in titles
            ):
                delete_note(api, child_id, f"launchbar: {child['title']}")
                removed += 1
    return removed


def remove_empty_container(api: Etapi, marker: str) -> int:
    note_id = api.find_by_label(marker)
    if note_id is None:
        return 0
    note = api.get_note(note_id)
    if note.get("childNoteIds"):
        print(f"preserved  {note['title']:31} contains user-owned children")
        return 0
    delete_note(api, note_id, note["title"])
    return 1


def main() -> int:
    try:
        api = Etapi.from_env()
        print(f"Trilium {api.app_info()['appVersion']} at {api.url}\n")

        removed = 0
        removed += remove_launchbar_entries(api)
        for marker in ("templateRoot", "scriptRoot", "dashboardRoot", "extMigrationLog", "extConfig"):
            removed += remove_implementation_tree(api, marker)

        removed += remove_project_dashboards(api)

        # These are extension-owned storage/view roots. Delete only when empty;
        # any notes created by a user make the container content-bearing.
        for marker in (
            "meetingRoot", "taskRoot", "storyDraftRoot", "emailRoot", "unassignedRoot",
            "activeProjectRoot", "archiveProjectRoot", "topicRoot",
            "todayRoot",
        ):
            removed += remove_empty_container(api, marker)

        print(f"\nUninstall complete. Removed {removed} extension-owned notes.")
        print("Journal, Projects, People, Organizations, and archive content were preserved.")
    except EtapiError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
