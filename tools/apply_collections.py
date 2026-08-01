#!/usr/bin/env python3
"""Create the collections and saved searches that replace the Dataview dashboards.

Two mechanisms, chosen per view:

* **Collections** — a container note rendered as a board/table/calendar of its
  own children. Used where the notes already live in one place.
* **Saved searches** — a ``search`` note whose results render in the same view
  types. Used for cross-cutting views, because a search is not limited to one
  subtree the way a collection is.

This is where ``#dueDate`` becomes first-class: Trilium has no due-date concept,
but the Calendar view reads whatever label ``#calendar:startDate`` points at.

Idempotent. Run apply_skeleton.py and apply_templates.py first.

    python3 tools/apply_collections.py
"""

from __future__ import annotations

import json
import re
import sys
from datetime import date
from dataclasses import dataclass, field

from etapi import Etapi, EtapiError
from apply_templates import DAILY_EMPTY_TASK_BLOCK, DAILY_NOTE_CONTENT

MARKER = "extView"

# Trilium stores Dashboard geometry in the native view-config attachment. A
# fresh install gets a readable starting layout; an existing user layout is
# never overwritten by a later installer run.
DEFAULT_DASHBOARD_LAYOUT = {
    "taskCalendar": {"x": 0, "y": 0, "w": 6, "h": 6},
    "meetingCalendar": {"x": 6, "y": 0, "w": 6, "h": 6},
    "dueSoon": {"x": 0, "y": 6, "w": 4, "h": 4},
    "openTasks": {"x": 4, "y": 6, "w": 4, "h": 5},
    "upcomingMeetings": {"x": 8, "y": 6, "w": 4, "h": 5},
    "openDrafts": {"x": 0, "y": 11, "w": 4, "h": 5},
    "openEmails": {"x": 4, "y": 11, "w": 4, "h": 5},
    "awaitingReplies": {"x": 8, "y": 11, "w": 4, "h": 5},
    "followUpsDue": {"x": 0, "y": 16, "w": 4, "h": 5},
    "activeProjects": {"x": 4, "y": 16, "w": 4, "h": 5},
    "highPriority": {"x": 8, "y": 16, "w": 4, "h": 5},
    "overdue": {"x": 0, "y": 21, "w": 4, "h": 5},
    "recentlyTouched": {"x": 4, "y": 21, "w": 8, "h": 5},
}

LEGACY_DASHBOARD_MARKERS = (
    "dueSoon", "taskCalendar", "meetingCalendar", "activeProjects",
    "openDrafts", "highPriority", "awaitingReplies", "followUpsDue",
)

OPEN_TASKS_PLACEHOLDER = "__OPEN_TASKS_VIEW__"
LEGACY_DAILY_WIDGET = (
    "<section class='daily-open-tasks-widget'><h2>Open Tasks</h2>"
    "<div class='daily-widget-body'>Loading…</div></section>"
)
LEGACY_DAILY_STYLE = (
    "<style>.daily-open-tasks-widget{border-top:1px solid var(--main-border-color);"
    "margin-top:1rem;padding-top:.75rem}.daily-open-tasks-widget h2{margin-top:0}"
    ".daily-open-tasks-widget table{width:100%}</style>"
)
DAILY_TASK_BLOCK_RE = re.compile(
    r"<h2>Tasks</h2><ul[^>]*class=['\"]todo-list['\"][\s\S]*?</ul>",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class Collection:
    """An existing container note re-rendered as a collection view."""

    marker_label: str
    labels: dict[str, str]
    definitions: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class SavedSearch:
    """A search note that renders its results in a collection view."""

    title: str
    marker: str
    search: str
    labels: dict[str, str] = field(default_factory=dict)


# Containers that become views over their own children.
COLLECTIONS: tuple[Collection, ...] = (
    Collection(
        marker_label="projectRoot",
        labels={"viewType": "table"},
        # Table columns are promoted-attribute definitions on the Collection
        # itself. The values already live on each Project Hub; these aliases
        # only expose the useful summary fields in the Projects directory.
        definitions={
            "label:currentRound": "promoted,alias=Latest round,single,number",
            "label:status": "promoted,alias=Status,single,text",
            "label:nextAction": "promoted,alias=Next action,single,text",
        },
    ),
    Collection(
        marker_label="peopleRoot",
        labels={"viewType": "table"},
    ),
    Collection(
        marker_label="orgRoot",
        labels={"viewType": "table"},
    ),
    Collection(
        marker_label="topicRoot",
        labels={"viewType": "table"},
    ),
)


SAVED_SEARCHES: tuple[SavedSearch, ...] = (
    SavedSearch(
        title="Due Soon",
        marker="dueSoon",
        # #!doneDate excludes finished work; this is the Task_Dashboard
        # "pending tasks" view expressed as a query rather than a scan.
        search="#extTask AND #dueDate <= TODAY+7 AND #!doneDate orderBy #dueDate",
        labels={"viewType": "table"},
    ),
    SavedSearch(
        title="Overdue",
        marker="overdue",
        search="#extTask AND #dueDate < TODAY AND #!doneDate orderBy #dueDate",
        labels={"viewType": "table"},
    ),
    SavedSearch(
        title="Recently Touched",
        marker="recentlyTouched",
        search="#noteType AND #!dateNote AND note.dateModified >= TODAY-7 orderBy note.dateModified desc",
        labels={"viewType": "table"},
    ),
    SavedSearch(
        title="Task Calendar",
        marker="taskCalendar",
        search="#extTask AND #dueDate AND #!doneDate",
        # The remap that makes a non-native field behave like a native one.
        labels={
            "viewType": "calendar",
            "calendar:startDate": "dueDate",
            "calendar:view": "dayGridMonth",
        },
    ),
    SavedSearch(
        title="Meeting Calendar",
        marker="meetingCalendar",
        # Meetings use the native #startDate. The template marker makes this
        # cross-project after meeting notes move under their hubs.
        search="#extMeeting AND #startDate",
        labels={"viewType": "calendar", "calendar:view": "dayGridMonth"},
    ),
    SavedSearch(
        title="Open Tasks",
        marker="openTasks",
        search="#extTask AND #!doneDate orderBy #dueDate",
        labels={"viewType": "table"},
    ),
    SavedSearch(
        title="Upcoming Meetings",
        marker="upcomingMeetings",
        search="#extMeeting AND #startDate orderBy #startDate",
        labels={"viewType": "table"},
    ),
    SavedSearch(
        title="Active Projects",
        marker="activeProjects",
        search="#kind AND #status = active AND #!projectArchive orderBy #startDate desc",
        labels={"viewType": "table"},
    ),
    SavedSearch(
        title="Drafts",
        marker="openDrafts",
        search="#extStoryDraft AND #!doneDate orderBy note.dateModified desc",
        labels={"viewType": "table"},
    ),
    SavedSearch(
        title="Emails",
        marker="openEmails",
        search="#extEmailDraft orderBy note.dateModified desc",
        labels={"viewType": "table"},
    ),
    SavedSearch(
        title="High Priority",
        marker="highPriority",
        search="#priority = high AND #!doneDate orderBy #dueDate",
        labels={"viewType": "table"},
    ),
    SavedSearch(
        title="Awaiting Replies",
        marker="awaitingReplies",
        search="#status = awaiting AND #!doneDate orderBy #followUpDate",
        labels={"viewType": "table"},
    ),
    SavedSearch(
        title="Follow-ups Due",
        marker="followUpsDue",
        search="#followUpDate <= TODAY+7 AND #!doneDate orderBy #followUpDate",
        labels={"viewType": "table"},
    ),
)


def apply_collection(api: Etapi, collection: Collection) -> str:
    """Turn an existing container into a collection view."""
    note_id = api.find_by_label(collection.marker_label)
    if note_id is None:
        return f"skipped   #{collection.marker_label} not found"

    note = api.get_note(note_id)
    if note["type"] != "book":
        api.set_type(note_id, "book")

    for name, value in collection.labels.items():
        api.set_label(note_id, name, value)

    for name, value in collection.definitions.items():
        api.set_label(note_id, name, value)
    for position, name in zip(
        range(30, 30 + 10 * len(collection.definitions), 10),
        collection.definitions,
    ):
        attribute = next(
            (
                attribute for attribute in api.get_note(note_id).get("attributes", [])
                if attribute.get("noteId") == note_id
                and attribute.get("type") == "label"
                and attribute.get("name") == name
            ),
            None,
        )
        if attribute is not None and attribute.get("position") != position:
            api.set_attribute_position(attribute["attributeId"], position)

    view = collection.labels.get("viewType", "?")
    return f"view      {note['title']:15} {view:9} {note_id}"


def dashboard_filter_clause(api: Etapi, dashboard_id: str) -> str:
    """Rebuild the saved-search filter suffix after an idempotent install."""
    dashboard = api.get_note(dashboard_id)
    owned = {
        attribute.get("name"): attribute.get("value", "")
        for attribute in dashboard.get("attributes", [])
        if attribute.get("noteId") == dashboard_id
        and attribute.get("type") == "label"
    }
    clauses = []
    if owned.get("dashboardFilterTime") in {"7", "30", "90"}:
        clauses.append(f"note.dateModified >= TODAY-{owned['dashboardFilterTime']}")

    def note_title(note_id: str) -> str:
        try:
            return api.get_note(note_id)["title"]
        except EtapiError:
            return ""

    def quote(value: str) -> str:
        return "'" + value.replace("'", "''") + "'"

    if owned.get("dashboardFilterProject"):
        title = note_title(owned["dashboardFilterProject"])
        if title:
            clauses.append(f"~project.title = {quote(title)}")
    if owned.get("dashboardFilterStatus"):
        clauses.append(f"#status = {quote(owned['dashboardFilterStatus'])}")
    if owned.get("dashboardFilterAssignment"):
        title = note_title(owned["dashboardFilterAssignment"])
        if title:
            clauses.append(f"~writer.title = {quote(title)}")
    if owned.get("dashboardFilterTopic"):
        title = note_title(owned["dashboardFilterTopic"])
        if title:
            value = quote(title)
            clauses.append(f"(~topic.title = {value} OR ~derivedTopic.title = {value})")
    return " AND ".join(clauses)


def apply_saved_search(api: Etapi, parent_id: str, saved: SavedSearch) -> str:
    """Ensure a saved-search note exists with its query and view."""
    note_id = find_view(api, parent_id, saved.marker)
    status = "unchanged"

    if note_id is None:
        note_id = api.create_note(
            parent_note_id=parent_id,
            title=saved.title,
            note_type="search",
        )
        api.set_label(note_id, MARKER, saved.marker)
        status = "created"
    elif api.get_note(note_id)["title"] != saved.title:
        api.set_title(note_id, saved.title)
        status = "renamed"

    suffix = dashboard_filter_clause(api, parent_id)
    api.set_label(
        note_id,
        "searchString",
        f"{saved.search} AND {suffix}" if suffix else saved.search,
    )
    # Keep an unfiltered copy so the Dashboard filter widget can compose
    # temporary clauses without losing the shipped query.
    api.set_label(note_id, "extBaseSearch", saved.search)
    for name, value in saved.labels.items():
        api.set_label(note_id, name, value)

    return f"{status:9} {saved.title:17} {saved.labels.get('viewType','list'):9} {note_id}"


def find_view(api: Etapi, parent_id: str, marker: str) -> str | None:
    """Find a dashboard child by marker, matching only attributes it owns.

    Same ownership rule as the template lookup: inherited attributes report the
    noteId they came from, so comparing against the child's own id is what keeps
    this from matching notes that merely inherit the marker.
    """
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


def seed_dashboard_layout(
    api: Etapi, dashboard_id: str, widget_ids: dict[str, str],
) -> str:
    """Create the native dashboard view config only when one is absent."""
    existing = [
        attachment for attachment in api.get_attachments(dashboard_id)
        if attachment.get("role") == "viewConfig"
        and attachment.get("title") == "dashboard.json"
    ]
    layout = {
        note_id: DEFAULT_DASHBOARD_LAYOUT[marker]
        for marker, note_id in widget_ids.items()
        if marker in DEFAULT_DASHBOARD_LAYOUT
    }
    serialized = json.dumps({"widgets": layout}, separators=(",", ":"))
    if not existing:
        api.create_attachment(dashboard_id, "dashboard.json", serialized)
        return "layout   seeded calendar-first Dashboard layout"

    # The first installer version let Trilium auto-place every widget at 4x3.
    # Migrate that exact untouched layout once; any other layout is user-owned.
    try:
        current = json.loads(api.get_attachment_content(existing[0]["attachmentId"]))
        current_widgets = current.get("widgets", {})
        legacy_ids = [widget_ids.get(marker) for marker in LEGACY_DASHBOARD_MARKERS]
        is_legacy = len(current_widgets) == len(legacy_ids) and all(
            note_id in current_widgets
            and current_widgets[note_id] == {
                "x": (index % 3) * 4,
                "y": (index // 3) * 3,
                "w": 4,
                "h": 3,
            }
            for index, note_id in enumerate(legacy_ids)
        )
    except (TypeError, ValueError, KeyError):
        is_legacy = False

    if is_legacy:
        api.set_attachment_content(existing[0]["attachmentId"], serialized)
        return "layout   migrated default to calendar-first Dashboard layout"

    # A clean uninstall removes extension widgets but intentionally preserves
    # the Dashboard container and its native layout attachment. On reinstall,
    # retain every surviving/user widget position, discard stale note ids, and
    # add any newly installed extension widgets at their shipped positions.
    merged = dict(current_widgets)
    for note_id in list(merged):
        try:
            api.get_note(note_id)
        except EtapiError:
            merged.pop(note_id, None)
    for marker, note_id in widget_ids.items():
        if note_id not in merged and marker in DEFAULT_DASHBOARD_LAYOUT:
            merged[note_id] = DEFAULT_DASHBOARD_LAYOUT[marker]
    if merged != current_widgets:
        api.set_attachment_content(
            existing[0]["attachmentId"],
            json.dumps({"widgets": merged}, separators=(",", ":")),
        )
        return "layout   preserved existing Dashboard layout and merged widgets"
    return "layout   preserved existing Dashboard layout"


def ensure_daily_open_tasks_include(api: Etapi, open_tasks_id: str) -> str:
    """Use Trilium's native interactive Saved Search include in Daily Notes."""
    include = (
        "<section class='include-note' data-extension-open-tasks='true' "
        f"data-note-id='{open_tasks_id}' data-box-size='expandable'>&nbsp;</section>"
    )
    template_root = api.find_by_label("templateRoot")
    daily_id = None
    if template_root:
        for child_id in api.get_note(template_root).get("childNoteIds", []):
            note = api.get_note(child_id)
            if any(
                attribute.get("noteId") == child_id
                and attribute.get("type") == "label"
                and attribute.get("name") == "extTemplate"
                and attribute.get("value") == "daily"
                for attribute in note.get("attributes", [])
            ):
                daily_id = child_id
                break

    updated = 0
    if daily_id:
        content = api.get_content(daily_id)
        if OPEN_TASKS_PLACEHOLDER in content:
            api.set_content(
                daily_id, content.replace(OPEN_TASKS_PLACEHOLDER, open_tasks_id)
            )
            updated += 1

    # Update untouched existing day notes, including the current note in a
    # reinstall test. Deliberately leave user-edited day notes alone.
    journal_id = api.find_by_label("calendarRoot")
    if journal_id:
        old_daily = (
            "<h2>Tasks</h2><ul class='todo-list'><li><label class='todo-list__label'>"
            "<input type='checkbox' disabled><span class='todo-list__label__description'></span>"
            "</label></li></ul><h2>Notes</h2><p></p><h2>Day start</h2><p></p>"
        )
        for result in api.search("#dateNote", ancestor_note_id=journal_id, include_archived=True):
            note_id = result["noteId"]
            content = api.get_content(note_id)
            modern = DAILY_NOTE_CONTENT.replace(OPEN_TASKS_PLACEHOLDER, open_tasks_id)
            if OPEN_TASKS_PLACEHOLDER in content:
                replacement = content.replace(OPEN_TASKS_PLACEHOLDER, open_tasks_id)
            elif "data-extension-open-tasks='true'" in content or 'data-extension-open-tasks="true"' in content:
                # The note may already have the modern scaffold but still
                # point at a saved-search note removed by uninstall. Refresh
                # only the extension-owned include target and preserve the
                # rest of the user's day-note content.
                replacement = re.sub(
                    r"(data-extension-open-tasks=['\"]true['\"][^>]*data-note-id=['\"])[^'\"]+",
                    rf"\g<1>{open_tasks_id}",
                    content,
                    count=1,
                    flags=re.IGNORECASE,
                )
            elif DAILY_TASK_BLOCK_RE.search(content) and (
                "include-note" in content or LEGACY_DAILY_WIDGET in content
            ):
                # Trilium normalizes HTML when a note is opened, so older
                # shipped bodies no longer match byte-for-byte. Remove only
                # the known empty checklist and legacy style, retaining any
                # text the user added elsewhere in the day note.
                migrated = DAILY_TASK_BLOCK_RE.sub("", content, count=1)
                migrated = migrated.replace(LEGACY_DAILY_STYLE, "")
                migrated = migrated.replace(LEGACY_DAILY_WIDGET, include)
                include_match = re.search(
                    r"<section[^>]*class=['\"]include-note['\"][^>]*>"
                    r"[\s\S]*?</section>",
                    migrated,
                    re.IGNORECASE,
                )
                if include_match and not re.search(
                    r"<h2>Open Tasks</h2>\s*$", migrated[:include_match.start()], re.IGNORECASE
                ):
                    migrated = (
                        migrated[:include_match.start()]
                        + "<h2>Open Tasks</h2>"
                        + migrated[include_match.start():]
                    )
                replacement = (
                    DAILY_NOTE_CONTENT.split("<div class='daily-note'>", 1)[0]
                    + "<div class='daily-note'>"
                    + migrated
                    + "</div>"
                )
            elif LEGACY_DAILY_WIDGET in content:
                replacement = content.replace(LEGACY_DAILY_WIDGET, include)
            elif (
                content.startswith(LEGACY_DAILY_STYLE + DAILY_EMPTY_TASK_BLOCK)
                and "data-extension-open-tasks='true'" in content
                and content.endswith(
                    "' data-box-size='expandable'>&nbsp;</section>"
                    "<h2>Notes</h2><p></p><h2>Day start</h2><p></p>"
                )
            ):
                # This is the untouched body shipped by the prior installer;
                # replace it wholesale so the stale checkbox and old spacing
                # cannot survive an upgrade. User-edited bodies do not match.
                replacement = modern
            elif content == old_daily:
                replacement = modern
            else:
                continue
            if replacement != content:
                api.set_content(note_id, replacement)
                updated += 1
    return f"daily Open Tasks include wired ({updated} note(s) updated)"


def restore_today_branches(
    api: Etapi, target_day_id: str | None = None, target_date: str | None = None,
) -> str:
    """Repair extension items which lost their Journal branch when a day was deleted.

    ``target_day_id`` and ``target_date`` are optional test/maintenance hooks;
    normal installs continue to discover today's native Journal note.
    """
    journal_id = api.find_by_label("calendarRoot")
    if not journal_id:
        return "daily branches skipped (Journal not found)"

    today = target_date or date.today().isoformat()
    day_id = target_day_id
    if day_id is None:
        for result in api.search("#dateNote", ancestor_note_id=journal_id, include_archived=True):
            note = api.get_note(result["noteId"])
            if any(
                attribute.get("noteId") == result["noteId"]
                and attribute.get("type") == "label"
                and attribute.get("name") == "dateNote"
                and attribute.get("value") == today
                for attribute in note.get("attributes", [])
            ):
                day_id = result["noteId"]
                break
    if not day_id:
        return f"daily branches skipped (no Journal note for {today})"

    candidates = {}
    for query in (
        "#extTask",
        "#extMeeting",
        "#extStoryDraft",
        "#extReportingNotes",
        "#extEmailDraft",
        "#extScratch",
        '#noteGroup="people"',
        '#noteGroup="organization"',
    ):
        for result in api.search(query):
            candidates[result["noteId"]] = result

    restored = 0
    for note_id, result in candidates.items():
        if str(result.get("dateCreated", ""))[:10] != today:
            continue
        if api.ensure_note_is_present_in_parent(note_id, day_id):
            restored += 1
    return f"daily branches repaired ({restored} branch(es) restored)"


def main() -> int:
    try:
        api = Etapi.from_env()
        print(f"Trilium {api.app_info()['appVersion']} at {api.url}\n")

        for collection in COLLECTIONS:
            print(apply_collection(api, collection))

        dashboards = api.find_by_label("dashboardRoot")
        if dashboards is None:
            dashboards = api.create_note(
                parent_note_id="root",
                title="Dashboards",
                content="",
                note_type="book",
            )
            api.set_label(dashboards, "dashboardRoot")
            print(f"\ncreated   Dashboards container          {dashboards}")
        else:
            print(f"\nunchanged Dashboards container          {dashboards}")

        # Trilium 0.104 introduced the beta Dashboard collection view. Keep
        # each saved search as a child widget, but render all of them together
        # on this parent instead of forcing the user to open eight notes.
        if api.get_note(dashboards)["type"] != "book":
            api.set_type(dashboards, "book")
        api.set_label(dashboards, "viewType", "dashboard")
        api.set_label(dashboards, "iconClass", "bx bx-dashboard")

        widget_ids = {}
        for saved in SAVED_SEARCHES:
            widget_id = find_view(api, dashboards, saved.marker)
            print(apply_saved_search(api, dashboards, saved))
            widget_ids[saved.marker] = widget_id or find_view(api, dashboards, saved.marker)

        print(seed_dashboard_layout(api, dashboards, widget_ids))
        print(ensure_daily_open_tasks_include(api, widget_ids["openTasks"]))
        print(restore_today_branches(api))
    except EtapiError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    print("\nCollections applied.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
