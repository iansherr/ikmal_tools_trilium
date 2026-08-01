#!/usr/bin/env python3
"""Install the script notes from src/ into a Trilium instance.

Script bodies live as real files under ``src/`` rather than embedded in Python,
so they can be linted and diffed like ordinary source -- and so the eventual
trilium-pack build can consume the same files.

Idempotent: re-running updates the content of the existing script notes.

    python3 tools/apply_scripts.py
"""

from __future__ import annotations

import os
import secrets
import sys
import json
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

from etapi import DEV_ENV, Etapi, EtapiError
from version import EXTENSION_VERSION

SRC = Path(__file__).resolve().parents[1] / "src"
MARKER = "extScript"

BACKEND_MIME = "application/javascript;env=backend"
FRONTEND_MIME = "application/javascript;env=frontend"


@dataclass(frozen=True)
class ScriptNote:
    """A code note whose body is a file in src/."""

    title: str
    marker: str
    filename: str
    mime: str
    labels: dict[str, str] = field(default_factory=dict)
    parent_marker: str | None = None


SCRIPTS: tuple[ScriptNote, ...] = (
    ScriptNote(
        title="Today Dashboard Markup",
        marker="todayDashboardMarkup",
        filename="today-dashboard.html",
        mime="text/html",
    ),
    ScriptNote(
        title="Today Dashboard",
        marker="todayDashboardScript",
        filename="today-dashboard.frontend.js",
        mime=FRONTEND_MIME,
        labels={"run": "frontendStartup"},
        parent_marker="todayDashboardMarkup",
    ),
    ScriptNote(
        title="Project Hub Dashboard Markup",
        marker="hubDashboardMarkup",
        filename="project-hub-dashboard.html",
        mime="text/html",
    ),
    ScriptNote(
        title="Project Hub Dashboard",
        marker="hubDashboardScript",
        filename="project-hub-dashboard.frontend.js",
        mime=FRONTEND_MIME,
        labels={"run": "frontendStartup"},
        parent_marker="hubDashboardMarkup",
    ),
    ScriptNote(
        title="Dashboard Filters Markup",
        marker="dashboardFiltersMarkup",
        filename="dashboard-filters.html",
        mime="text/html",
    ),
    ScriptNote(
        title="Dashboard Filters",
        marker="dashboardFiltersScript",
        filename="dashboard-filters.frontend.js",
        mime=FRONTEND_MIME,
        labels={"run": "frontendStartup"},
        parent_marker="dashboardFiltersMarkup",
    ),
    ScriptNote(
        title="Topic Controls",
        marker="topicControls",
        filename="topics.frontend.js",
        mime=FRONTEND_MIME,
        labels={"run": "frontendStartup"},
    ),
    ScriptNote(
        title="Topic Index",
        marker="topicIndex",
        filename="topic-index.frontend.js",
        mime=FRONTEND_MIME,
        labels={"run": "frontendStartup"},
    ),
    ScriptNote(
        title="Create Note API",
        marker="createNoteApi",
        filename="create-note-api.backend.js",
        mime=BACKEND_MIME,
        # Exposes POST /custom/create-note so the buttons and the tests share
        # one implementation.
        labels={"customRequestHandler": "create-note"},
    ),
    ScriptNote(
        title="Daily Note Repair",
        marker="dailyNoteRepair",
        filename="daily-note-repair.backend.js",
        mime=BACKEND_MIME,
    ),
    ScriptNote(
        title="Project Metadata Sync",
        marker="projectMetadataSync",
        filename="project-metadata-sync.backend.js",
        mime=BACKEND_MIME,
    ),
    ScriptNote(
        title="Topic Association Sync",
        marker="topicAssociationSync",
        filename="topic-association-sync.backend.js",
        mime=BACKEND_MIME,
    ),
    ScriptNote(
        title="Note Creation Buttons",
        marker="noteButtons",
        filename="note-buttons.frontend.js",
        mime=FRONTEND_MIME,
        labels={"run": "frontendStartup"},
    ),
    ScriptNote(
        title="New Meeting Launcher",
        marker="launcherMeeting",
        filename="note-launcher.frontend.js",
        mime=FRONTEND_MIME,
        labels={"extLauncherType": "meeting", "extLauncherLabel": "New Meeting"},
    ),
    ScriptNote(
        title="New Story Launcher",
        marker="launcherStory",
        filename="note-launcher.frontend.js",
        mime=FRONTEND_MIME,
        labels={"extLauncherType": "story", "extLauncherLabel": "New Story"},
    ),
    ScriptNote(
        title="New Edit Launcher",
        marker="launcherEdit",
        filename="note-launcher.frontend.js",
        mime=FRONTEND_MIME,
        labels={"extLauncherType": "edit", "extLauncherLabel": "New Edit"},
    ),
    ScriptNote(
        title="New Scratch Launcher",
        marker="launcherScratch",
        filename="note-launcher.frontend.js",
        mime=FRONTEND_MIME,
        labels={"extLauncherType": "scratch", "extLauncherLabel": "New Scratch"},
    ),
    ScriptNote(
        title="New Email Launcher",
        marker="launcherEmail",
        filename="note-launcher.frontend.js",
        mime=FRONTEND_MIME,
        labels={"extLauncherType": "email", "extLauncherLabel": "New Email"},
    ),
    ScriptNote(
        title="New Task Launcher",
        marker="launcherTask",
        filename="note-launcher.frontend.js",
        mime=FRONTEND_MIME,
        labels={"extLauncherType": "task", "extLauncherLabel": "New Task"},
    ),
    ScriptNote(
        title="New Project Hub Launcher",
        marker="launcherProjectHub",
        filename="note-launcher.frontend.js",
        mime=FRONTEND_MIME,
        labels={"extLauncherType": "projectHub", "extLauncherLabel": "New Project Hub"},
    ),
    ScriptNote(
        title="New Person Launcher",
        marker="launcherPerson",
        filename="note-launcher.frontend.js",
        mime=FRONTEND_MIME,
        labels={"extLauncherType": "person", "extLauncherLabel": "New Person"},
    ),
    ScriptNote(
        title="New Organization Launcher",
        marker="launcherOrganization",
        filename="note-launcher.frontend.js",
        mime=FRONTEND_MIME,
        labels={"extLauncherType": "organization", "extLauncherLabel": "New Organization"},
    ),
    ScriptNote(
        title="New Topic Launcher",
        marker="launcherTopic",
        filename="note-launcher.frontend.js",
        mime=FRONTEND_MIME,
        labels={"extLauncherType": "topic", "extLauncherLabel": "New Topic"},
    ),
)

LAUNCHER_SCRIPT_MARKERS = {
    "newProjectHub": "launcherProjectHub",
    "newScratch": "launcherScratch",
    "newMeeting": "launcherMeeting",
    "newTask": "launcherTask",
    "newStory": "launcherStory",
    "newEdit": "launcherEdit",
    "newEmail": "launcherEmail",
    "newPerson": "launcherPerson",
    "newOrganization": "launcherOrganization",
    "newTopic": "launcherTopic",
}


def find_script(api: Etapi, parent_id: str, marker: str) -> str | None:
    """Find a script note by the marker it owns (see apply_templates)."""
    for child_id in api.get_note(parent_id).get("childNoteIds", []):
        for attribute in api.get_note(child_id).get("attributes", []):
            if (
                attribute["noteId"] == child_id
                and attribute["type"] == "label"
                and attribute["name"] == MARKER
                and attribute.get("value") == marker
            ):
                return child_id
    return None


def apply_script(
    api: Etapi,
    scripts_root: str,
    script: ScriptNote,
    parents: dict[str, str],
) -> str:
    """Ensure a script note exists and matches the file on disk."""
    source = (SRC / script.filename).read_text()
    parent_id = parents.get(script.parent_marker or "", scripts_root)
    note_id = find_script(api, parent_id, script.marker)
    status = "unchanged"

    if note_id is None:
        note_id = api.create_note(
            parent_note_id=parent_id,
            title=script.title,
            content=source,
            note_type="code",
            mime=script.mime,
        )
        api.set_label(note_id, MARKER, script.marker)
        status = "created"
    elif api.get_content(note_id) != source:
        api.set_content(note_id, source)
        status = "updated"

    for name, value in script.labels.items():
        api.set_label(note_id, name, value)

    parents[script.marker] = note_id
    return f"{status:9} {script.title:32} {len(source):5}b  {note_id}"


def ensure_project_hub_dashboards(
    api: Etapi, dashboard_markup_id: str,
) -> int:
    """Give every existing project hub one render-note dashboard."""
    project_root = api.find_by_label("projectRoot")
    templates_root = api.find_by_label("templateRoot")
    if not project_root or not templates_root:
        return 0

    # Avoid importing the template applier here: this function is also useful
    # on an instance where the script applier is run on its own.
    project_template = None
    for child_id in api.get_note(templates_root).get("childNoteIds", []):
        child = api.get_note(child_id)
        if any(
            a.get("noteId") == child_id
            and a.get("type") == "label"
            and a.get("name") == "extTemplate"
            and a.get("value") == "projectHub"
            for a in child.get("attributes", [])
        ):
            project_template = child_id
            break
    if not project_template:
        return 0

    def descendants(root_id: str) -> list[str]:
        pending = [root_id]
        seen: set[str] = set()
        result: list[str] = []
        while pending:
            note_id = pending.pop()
            if note_id in seen:
                continue
            seen.add(note_id)
            result.append(note_id)
            pending.extend(api.get_note(note_id).get("childNoteIds", []))
        return result

    created = 0
    for hub_id in descendants(project_root):
        if hub_id == project_root:
            continue
        hub = api.get_note(hub_id)
        is_hub = any(
            a.get("noteId") == hub_id
            and a.get("type") == "relation"
            and a.get("name") == "template"
            and a.get("value") == project_template
            for a in hub.get("attributes", [])
        ) or any(
            a.get("noteId") == hub_id
            and a.get("name") == "noteType"
            and a.get("value") == "projectHub"
            for a in hub.get("attributes", [])
        )
        if not is_hub:
            continue

        dashboard_id = None
        for child_id in hub.get("childNoteIds", []):
            child = api.get_note(child_id)
            if any(
                a.get("noteId") == child_id
                and a.get("type") == "label"
                and a.get("name") == "extHubDashboard"
                for a in child.get("attributes", [])
            ):
                dashboard_id = child_id
                break
        if dashboard_id:
            continue

        dashboard_id = api.create_note(
            parent_note_id=hub_id,
            title="Project Dashboard",
            note_type="render",
        )
        api.set_relation(dashboard_id, "renderNote", dashboard_markup_id)
        api.set_label(dashboard_id, "extHubDashboard", "projectHub")
        created += 1
    return created


def ensure_today_dashboard(api: Etapi, dashboard_markup_id: str) -> bool:
    """Attach the stable Today render note to its live markup."""
    today_id = api.find_by_label("todayRoot")
    if not today_id:
        return False
    api.set_relation(today_id, "renderNote", dashboard_markup_id)
    api.set_label(today_id, "extTodayDashboard", "today")
    return True


def ensure_dashboard_filters(api: Etapi, dashboard_markup_id: str) -> bool:
    """Add the filter control as a widget on the native Dashboard."""
    dashboard_id = api.find_by_label("dashboardRoot")
    if not dashboard_id:
        return False
    existing = None
    for child_id in api.get_note(dashboard_id).get("childNoteIds", []):
        note = api.get_note(child_id)
        if any(
            attribute.get("noteId") == child_id
            and attribute.get("type") == "label"
            and attribute.get("name") == "extDashboardFilters"
            for attribute in note.get("attributes", [])
        ):
            existing = child_id
            break
    if existing is None:
        existing = api.create_note(
            parent_note_id=dashboard_id,
            title="Dashboard Filters",
            note_type="render",
        )
        api.set_label(existing, "extDashboardFilters", "dashboard")
    api.set_relation(existing, "renderNote", dashboard_markup_id)
    ensure_dashboard_filter_layout(api, dashboard_id, existing)
    return True


def ensure_dashboard_filter_layout(api: Etapi, dashboard_id: str, filter_id: str) -> bool:
    """Add a newly installed filter widget without rewriting user geometry."""
    attachment = next(
        (
            candidate for candidate in api.get_attachments(dashboard_id)
            if candidate.get("role") == "viewConfig"
            and candidate.get("title") == "dashboard.json"
        ),
        None,
    )
    if not attachment:
        return False
    try:
        layout = json.loads(api.get_attachment_content(attachment["attachmentId"]))
    except (TypeError, ValueError, KeyError):
        return False
    widgets = layout.get("widgets")
    if not isinstance(widgets, dict) or filter_id in widgets:
        return False
    bottom = 0
    for geometry in widgets.values():
        if not isinstance(geometry, dict):
            continue
        y = geometry.get("y")
        height = geometry.get("h")
        if isinstance(y, (int, float)) and isinstance(height, (int, float)):
            bottom = max(bottom, y + height)
    widgets[filter_id] = {"x": 0, "y": bottom, "w": 12, "h": 3}
    layout["widgets"] = widgets
    api.set_attachment_content(
        attachment["attachmentId"],
        json.dumps(layout, separators=(",", ":")),
    )
    return True


def ensure_daily_note_repair(api: Etapi, script_id: str) -> bool:
    """Run repair as Journal-subtree notes are created and initialized."""
    journal_id = api.find_by_label("calendarRoot")
    if not journal_id:
        return False
    desired = {"runOnNoteCreation", "runOnNoteChange"}
    for attribute in api.get_note(journal_id).get("attributes", []):
        if (
            attribute.get("noteId") == journal_id
            and attribute.get("type") == "relation"
            and attribute.get("name") in {"runOnChildNoteCreation", *desired}
            and (
                attribute.get("name") not in desired
                or attribute.get("value") != script_id
                or not attribute.get("isInheritable", False)
            )
        ):
            api.delete_attribute(attribute["attributeId"])
    for name in desired:
        api.set_relation(journal_id, name, script_id, inheritable=True)
    return True


def ensure_project_metadata_sync(api: Etapi, script_id: str) -> bool:
    """Inherit guarded relation-attribute sync events through Projects."""
    project_root = api.find_by_label("projectRoot")
    if not project_root:
        return False
    desired = {
        "runOnAttributeCreation", "runOnAttributeChange", "runOnNoteChange",
    }
    for attribute in api.get_note(project_root).get("attributes", []):
        if (
            attribute.get("noteId") == project_root
            and attribute.get("type") == "relation"
            and attribute.get("name") in {
                *desired, "runOnNoteCreation", "runOnNoteChange",
            }
        ):
            owned_sync = False
            try:
                target = api.get_note(attribute.get("value"))
                owned_sync = any(
                    item.get("noteId") == target.get("noteId")
                    and item.get("name") == "extScript"
                    and item.get("value") == "projectMetadataSync"
                    for item in target.get("attributes", [])
                )
            except EtapiError:
                owned_sync = attribute.get("value") == script_id
            if owned_sync:
                api.delete_attribute(attribute["attributeId"])
    for name in desired:
        if not any(
            attribute.get("noteId") == project_root
            and attribute.get("type") == "relation"
            and attribute.get("name") == name
            and attribute.get("value") == script_id
            and attribute.get("isInheritable", False)
            for attribute in api.get_note(project_root).get("attributes", [])
        ):
            api.set_relation(project_root, name, script_id, inheritable=True)
    return True


def ensure_topic_association_sync(api: Etapi, script_id: str) -> int:
    """Inherit derived-topic recomputation through all visible work roots."""
    roots = (
        "meetingRoot", "taskRoot", "storyDraftRoot",
        "emailRoot", "unassignedRoot", "peopleRoot", "orgRoot", "topicRoot",
    )
    desired = {
        "runOnAttributeCreation", "runOnAttributeChange", "runOnNoteCreation",
        "runOnNoteChange",
    }
    wired = 0
    for marker in roots:
        root_id = api.find_by_label(marker)
        if not root_id:
            continue
        note = api.get_note(root_id)
        for attribute in note.get("attributes", []):
            if (
                attribute.get("noteId") == root_id
                and attribute.get("type") == "relation"
                and attribute.get("name") in desired
                and attribute.get("value") == script_id
            ):
                api.delete_attribute(attribute["attributeId"])
        for name in desired:
            api.set_relation(root_id, name, script_id, inheritable=True)
        wired += 1
    return wired


def repair_existing_launchers(
    api: Etapi, script_ids: dict[str, str],
) -> int:
    """Repair launchbar entries created without their ~script relation."""
    repaired = 0
    for launcher_id, marker in LAUNCHER_SCRIPT_MARKERS.items():
        script_id = script_ids.get(marker)
        if not script_id:
            continue
        try:
            launcher = api.get_note(f"al_{launcher_id}")
        except EtapiError:
            continue
        if any(
            attribute.get("noteId") == launcher["noteId"]
            and attribute.get("type") == "relation"
            and attribute.get("name") == "script"
            and attribute.get("value") == script_id
            for attribute in launcher.get("attributes", [])
        ):
            continue
        api.set_relation(launcher["noteId"], "script", script_id)
        repaired += 1
    return repaired


def order_live_launchers(api: Etapi) -> None:
    """Place extension launchers in the documented capture order."""
    root = api.get_note("_lbVisibleLaunchers")
    extension_ids = [f"al_{launcher_id}" for launcher_id in LAUNCHER_SCRIPT_MARKERS]
    extension_set = set(extension_ids)
    branches = []
    for child_id in root.get("childNoteIds", []):
        note = api.get_note(child_id)
        branch_id = next(
            (
                branch_id for branch_id in note.get("parentBranchIds", [])
                if api.get_branch(branch_id).get("parentNoteId") == "_lbVisibleLaunchers"
            ),
            None,
        )
        if branch_id:
            branches.append((child_id, branch_id, api.get_branch(branch_id).get("notePosition", 0)))

    native_max = max(
        (position for note_id, _branch_id, position in branches if note_id not in extension_set),
        default=0,
    )
    for index, launcher_id in enumerate(extension_ids, start=1):
        branch = next((branch_id for note_id, branch_id, _position in branches if note_id == launcher_id), None)
        if branch:
            api.set_branch_position(branch, native_max + index * 10)
    api.refresh_note_ordering("_lbVisibleLaunchers")


def ensure_live_launchers(api: Etapi, secret: str) -> int:
    """Create/update all fixed launchbar entries through the backend handler."""
    request = urllib.request.Request(
        f"{api.url}/custom/create-note",
        data=json.dumps({"action": "ensureLaunchers"}).encode(),
        method="POST",
        headers={
            "Authorization": api.token,
            "Content-Type": "application/json",
            "x-extension-secret": secret,
        },
    )
    try:
        with urllib.request.urlopen(request) as response:
            payload = json.loads(response.read() or b"{}")
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")
        raise EtapiError(f"POST /custom/create-note -> {error.code}: {detail}") from error
    except urllib.error.URLError as error:
        raise EtapiError(f"POST /custom/create-note -> unreachable: {error.reason}") from error
    if payload.get("error"):
        raise EtapiError(f"POST /custom/create-note -> {payload['error']}")
    return len(payload.get("launcherIds", []))


def ensure_secret(api: Etapi, note_ids: list[str]) -> str:
    """Return the shared secret guarding the custom request handler.

    Trilium does not authenticate #customRequestHandler endpoints, so the
    handler enforces its own. Reuse an existing secret if one is already
    deployed, otherwise mint one and persist it to dev/.env for the tests.
    """
    for note_id in note_ids:
        for attribute in api.get_note(note_id).get("attributes", []):
            if (
                attribute["noteId"] == note_id
                and attribute["type"] == "label"
                and attribute["name"] == "createNoteSecret"
                and attribute.get("value")
            ):
                return attribute["value"]

    secret = os.environ.get("EXTENSION_SECRET") or secrets.token_urlsafe(32)
    if not os.environ.get("EXTENSION_SECRET") and DEV_ENV.exists():
        with DEV_ENV.open("a") as handle:
            handle.write(f"EXTENSION_SECRET={secret}\n")
        print(f"minted a handler secret and appended it to {DEV_ENV}")
    return secret


def main() -> int:
    try:
        api = Etapi.from_env()
        print(f"Trilium {api.app_info()['appVersion']} at {api.url}\n")

        scripts_root = api.find_by_label("scriptRoot")
        if scripts_root is None:
            scripts_root = api.create_note(
                parent_note_id="_userHidden",
                title="Scripts",
                content="<p>Extension script notes. Bodies are managed from src/.</p>",
            )
            api.set_label(scripts_root, "scriptRoot")
            print(f"created   Scripts container              {scripts_root}\n")
        api.move_note(scripts_root, "_userHidden")

        # The script notes are implementation details, not working content.
        # Hide their children from the note tree without archiving them: code
        # notes remain live and can still be opened through search or links.
        api.set_label(scripts_root, "subtreeHidden")

        applied = []
        parents: dict[str, str] = {}
        for script in SCRIPTS:
            line = apply_script(api, scripts_root, script, parents)
            applied.append(line.split()[-1])
            print(line)

        repaired_launchers = repair_existing_launchers(api, parents)
        if repaired_launchers:
            print(f"repaired  {repaired_launchers} existing launchbar script targets")

        dashboard_count = ensure_project_hub_dashboards(
            api, parents["hubDashboardMarkup"]
        )
        if dashboard_count:
            print(f"created   {dashboard_count} existing project hub dashboard(s)")

        if ensure_today_dashboard(api, parents["todayDashboardMarkup"]):
            print("wired     Today -> current Journal note dashboard")
        if ensure_dashboard_filters(api, parents["dashboardFiltersMarkup"]):
            print("wired     Dashboard -> filter controls")
        if ensure_daily_note_repair(api, parents["dailyNoteRepair"]):
            print("wired     Journal subtree -> Daily Note Repair on creation/change")
        if ensure_project_metadata_sync(api, parents["projectMetadataSync"]):
            print("wired     Projects subtree -> Project Metadata Sync on metadata/title changes")
        topic_roots = ensure_topic_association_sync(api, parents["topicAssociationSync"])
        if topic_roots:
            print(f"wired     Topic Association Sync through {topic_roots} visible root(s)")

        # The secret goes on the #extConfig note, never on the script notes:
        # those are packaged for distribution, and a shared secret in a public
        # zip is no secret at all.
        config = api.find_by_label("extConfig")
        if config is None:
            print("error: #extConfig not found — run apply_skeleton.py", file=sys.stderr)
            return 1
        secret = ensure_secret(api, [config])
        api.set_label(config, "createNoteSecret", secret)
        api.set_label(config, "extensionVersion", EXTENSION_VERSION)
        ensured_launchers = ensure_live_launchers(api, secret)
        order_live_launchers(api)
        print(f"ensured   {ensured_launchers} launchbar script targets")

        # Clear any secret left on the script notes by an earlier version.
        for note_id in applied:
            for attribute in api.get_note(note_id).get("attributes", []):
                if (attribute["noteId"] == note_id
                        and attribute["name"] == "createNoteSecret"):
                    api.delete_attribute(attribute["attributeId"])
                    print(f"removed stale secret label from {note_id}")
    except EtapiError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    print("\nScripts applied. Backend handler is live immediately;")
    print("frontend buttons appear after a browser reload.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
