#!/usr/bin/env python3
"""Create the extension's root containers in a Trilium instance.

Each container carries a marker label (``#projectRoot``, ``#calendarRoot``, …).
Creation scripts locate their destination by that label rather than by title or
position, so the tree can be renamed or reorganised without breaking anything.

Idempotent: re-running converges on the same tree instead of duplicating it.

    python3 tools/apply_skeleton.py
"""

from __future__ import annotations

import sys
from dataclasses import dataclass, field

from etapi import Etapi, EtapiError
INTERNAL_ROOTS = {
    "templateRoot",
    "extConfig",
    # These are compatibility/fallback containers. New working notes go under
    # a Project Hub or Projects/Unassigned, so they should not compete with
    # the user's working tree.
    "storyDraftRoot",
    "emailRoot",
}


@dataclass(frozen=True)
class Container:
    """A top-level note the extension creates and later writes into."""

    title: str
    marker: str
    purpose: str
    labels: dict[str, str] = field(default_factory=dict)
    inheritable_labels: dict[str, str] = field(default_factory=dict)
    parent_marker: str | None = None
    note_type: str | None = None


# The Journal date pattern mirrors the vault's existing filename convention
# (ISO date) while adding the weekday the Obsidian daily notes never carried.
CONTAINERS: tuple[Container, ...] = (
    Container(
        title="Journal",
        marker="calendarRoot",
        purpose="Day notes. Trilium generates year/month/day notes here automatically.",
        labels={"datePattern": "{isoDate} - {weekDay}", "iconClass": "bx bx-calendar"},
    ),
    Container(
        title="Today",
        marker="todayRoot",
        purpose="Stable entry point for the current Journal note.",
        note_type="render",
        labels={"iconClass": "bx bx-sun"},
    ),
    Container(
        title="Projects",
        marker="projectRoot",
        purpose="Project and edit hubs. Notes are cloned in from their type container.",
        labels={"iconClass": "bx bx-book"},
    ),
    Container(
        title="Active",
        marker="activeProjectRoot",
        purpose="Active project and edit hubs.",
        parent_marker="projectRoot",
        note_type="book",
        labels={"iconClass": "bx bx-folder-open"},
        inheritable_labels={"projectArea": "active"},
    ),
    Container(
        title="Archive",
        marker="archiveProjectRoot",
        purpose="Completed or intentionally archived project and edit hubs.",
        parent_marker="projectRoot",
        note_type="book",
        labels={"iconClass": "bx bx-archive"},
        inheritable_labels={"projectArea": "archive", "projectArchive": ""},
    ),
    Container(
        title="Meetings",
        marker="meetingRoot",
        purpose="Cross-project meeting view. Meeting notes are stored under Project Hubs or Unassigned.",
        note_type="search",
        labels={
            "iconClass": "bx bx-calendar-event",
            "searchString": "#extMeeting AND #startDate orderBy #startDate",
            "viewType": "calendar",
            "calendar:startDate": "startDate",
            "calendar:view": "dayGridMonth",
        },
    ),
    Container(
        title="Drafts",
        marker="storyDraftRoot",
        purpose="Compatibility fallback for story drafts. New drafts belong under a Project Hub or Projects/Unassigned.",
        note_type="book",
        labels={"iconClass": "bx bx-file"},
    ),
    Container(
        title="Emails",
        marker="emailRoot",
        purpose="Compatibility fallback for email drafts. New emails belong under a Project Hub or Projects/Unassigned.",
        note_type="book",
        labels={"iconClass": "bx bx-envelope"},
    ),
    Container(
        title="Tasks",
        marker="taskRoot",
        purpose="Cross-project task view. Task notes are stored under Project Hubs or Unassigned.",
        note_type="search",
        labels={
            "iconClass": "bx bx-check-square",
            "searchString": "#extTask AND #!doneDate orderBy #dueDate",
            "viewType": "board",
            "board:groupBy": "status",
        },
    ),
    Container(
        title="Unassigned",
        marker="unassignedRoot",
        purpose="Quick-capture notes that are not assigned to a Project Hub yet.",
        parent_marker="projectRoot",
        note_type="book",
        labels={"iconClass": "bx bx-inbox"},
    ),
    Container(
        title="People",
        marker="peopleRoot",
        purpose="People. Related to organizations via relations.",
        labels={"iconClass": "bx bx-group"},
    ),
    Container(
        title="Organizations",
        marker="orgRoot",
        purpose="Companies and organizations.",
        labels={"iconClass": "bx bx-buildings"},
    ),
    Container(
        title="Topics",
        marker="topicRoot",
        purpose="Optional cross-categories. Topic notes are related to notes through the multi-value Topics field.",
        note_type="book",
        labels={"iconClass": "bx bx-purchase-tag"},
    ),
    Container(
        title="Templates",
        marker="templateRoot",
        purpose="Note templates, each labelled #template.",
        labels={"iconClass": "bx bx-copy"},
    ),
    Container(
        title="Config",
        marker="extConfig",
        # Instance-specific secrets live here precisely because this container is
        # never packaged by export_package.py. Keeping them on the script notes
        # would ship them inside the distributable zip, and every install from
        # that zip would then share one secret.
        purpose="Instance-local configuration. Not exported; never share this note.",
        labels={"iconClass": "bx bx-cog"},
    ),
)


def apply_container(api: Etapi, container: Container) -> str:
    """Ensure one container exists with its marker and labels. Returns status."""
    note_id = api.find_by_label(container.marker)
    status = "unchanged"
    if container.parent_marker:
        parent_id = api.find_by_label(container.parent_marker)
        if parent_id is None:
            raise EtapiError(
                f"missing parent #{container.parent_marker} for #{container.marker}"
            )
    else:
        parent_id = "_userHidden" if container.marker in INTERNAL_ROOTS else "root"

    if note_id is None:
        note_id = api.create_note(
            parent_note_id=parent_id,
            title=container.title,
            content=f"<p>{container.purpose}</p>",
            note_type=container.note_type or "text",
        )
        api.set_label(note_id, container.marker)
        status = "created"
    else:
        note = api.get_note(note_id)
        if note["title"] != container.title:
            api.set_title(note_id, container.title)
            status = "renamed"
        if container.note_type and note["type"] != container.note_type:
            api.set_type(note_id, container.note_type)
            status = "updated"

    if container.marker in INTERNAL_ROOTS:
        api.move_note(note_id, "_userHidden")
    elif container.parent_marker:
        api.move_note(note_id, parent_id)

    for name, value in container.labels.items():
        api.set_label(note_id, name, value)
    for name, value in container.inheritable_labels.items():
        api.set_label(note_id, name, value, inheritable=True)

    # Remove archive labels from an earlier implementation. The User Hidden
    # subtree provides stronger protection without affecting search or
    # template inheritance.
    if container.marker in INTERNAL_ROOTS:
        for attribute in api.get_note(note_id).get("attributes", []):
            if (
                attribute.get("noteId") == note_id
                and attribute.get("type") == "label"
                and attribute.get("name") == "archived"
            ):
                api.delete_attribute(attribute["attributeId"])
    if container.marker == "templateRoot":
        api.set_label(note_id, "subtreeHidden")

    return f"{status:9} {container.title:15} #{container.marker:14} {note_id}"


def main() -> int:
    try:
        api = Etapi.from_env()
        info = api.app_info()
        print(f"Trilium {info['appVersion']} at {api.url}\n")
        for container in CONTAINERS:
            print(apply_container(api, container))
    except EtapiError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    print("\nSkeleton applied.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
