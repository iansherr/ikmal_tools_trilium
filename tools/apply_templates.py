#!/usr/bin/env python3
"""Create the note templates in a Trilium instance.

Each template is a note labelled ``#template`` under the Templates container,
carrying promoted attribute definitions. A note created from a template
inherits those definitions, so what was YAML frontmatter in Obsidian becomes a
typed form at the top of the note. Definitions are deliberately not inheritable
to descendants: a Story Draft under a Project Hub must not also inherit the
Project Hub form.

Where Trilium already understands a label, we use its name rather than
inventing one:

* ``#startDate`` / ``#startTime`` / ``#endDate`` are read natively by the
  Calendar collection view, so meetings land on a calendar for free.
* ``#dueDate`` is *not* native — Trilium has no due-date concept — but the
  Calendar view can be pointed at any label via ``#calendar:startDate``, so
  tasks get the same treatment without a bespoke widget.

Idempotent: re-running converges. Run apply_skeleton.py first.

    python3 tools/apply_templates.py
"""

from __future__ import annotations

import sys
from dataclasses import dataclass, field

from etapi import Etapi, EtapiError

# Marker label used to find templates across runs, independent of their title.
MARKER = "extTemplate"


def find_template(api: Etapi, templates_root: str, marker: str) -> str | None:
    """Find a template note by marker, ignoring notes created from it.

    A ``~template`` relation makes an instance inherit the template's
    attributes -- ``#extTemplate`` and ``#template`` included -- so *any*
    attribute search goes ambiguous the moment real notes exist. Ownership is
    the only reliable discriminator: an inherited attribute reports the noteId
    of the note it came from, not of the note carrying it. So scan the
    Templates container's own children and match only attributes they own.
    """
    for child_id in api.get_note(templates_root).get("childNoteIds", []):
        for attribute in api.get_note(child_id).get("attributes", []):
            if (
                attribute["noteId"] == child_id
                and attribute["type"] == "label"
                and attribute["name"] == MARKER
                and attribute.get("value") == marker
            ):
                return child_id
    return None

# Reused definitions. Keeping them in one place means the task-shaped fields
# mean the same thing on a standalone task, a project task, and a hub.
DUE_DATE = {"label:dueDate": "promoted,alias=Due,single,date"}
PRIORITY = {"label:priority": "promoted,alias=Priority,single,text"}
DURATION = {"label:duration": "promoted,alias=Duration,single,text"}
COMPLEXITY = {"label:complexity": "promoted,alias=Complexity,single,text"}
STATUS = {"label:status": "promoted,alias=Status,single,text"}
DONE_DATE = {"label:doneDate": "promoted,alias=Done,single,date"}
CLIENT = {"relation:client": "promoted,alias=Client,single"}
ON_BEHALF = {"relation:companyOnBehalf": "promoted,alias=On behalf of,single"}
PROJECT_REL = {"relation:project": "promoted,alias=Project,single"}
TOPICS = {"relation:topic": "promoted,alias=Topics,multi"}
TOPIC_ALIAS = {"relation:aliasOf": "promoted,alias=Canonical topic,single"}
RELATED_HUBS = {"relation:relatedHub": "promoted,alias=Related Hubs,multi"}
WRITER = {"relation:writer": "promoted,alias=Writer,single"}
CURRENT_ROUND = {"label:currentRound": "promoted,alias=Current round,single,number"}
NEXT_ACTION = {"label:nextAction": "promoted,alias=Next action,single,text"}

EDIT_ROUND_CONTENT = (
    "<h2>LINKS</h2><ul><li></li></ul>"
    "<h2>OPEN QUESTIONS</h2><ul><li></li></ul>"
    "<h2>EDITORIAL NOTES</h2><p></p>"
    "<h2>REQUESTED CHANGES</h2><ul><li></li></ul>"
    "<h2>HED</h2><ul><li></li><li></li><li></li></ul>"
    "<h2>BYLINE</h2><p>By Ian Sherr (+1 415.347.6397)</p>"
    "<h2>STORYBODY</h2><p></p><p>--ENDIT--</p>"
    "<h2>WRITER RESPONSE</h2><p></p>"
)

STORY_DRAFT_CONTENT = (
    "<h2>HED</h2><ul><li></li><li></li><li></li></ul>"
    "<h2>BYLINE</h2><p>By Ian Sherr (+1 415.347.6397)</p>"
    "<h2>STORYBODY</h2><p></p><p>--ENDIT--</p>"
 )

REPORTING_NOTES_CONTENT = (
    "<h2>LINKS</h2><ul><li></li></ul>"
    "<h2>OPEN QUESTIONS</h2><ul><li></li></ul>"
    "<h2>IDEA / ANGLE</h2><p></p>"
    "<h2>REPORTING NOTES</h2><p></p>"
    "<div class='reporting-note-actions-placeholder' "
    "data-reporting-note-actions='true'></div>"
)


def reporting_notes_title(project_title: str) -> str:
    """Give each project's reporting companion a useful, stable tree title."""
    return f"{project_title} — Reporting Notes"

NOTE_GROUPS = {
    "task": "task",
    "projectTask": "task",
    "meeting": "meeting",
    "meetingPrep": "meeting",
    "storyDraft": "draft",
    "reportingNotes": "reporting",
    "emailDraft": "email",
    "person": "people",
    "organization": "organization",
    "projectHub": "project",
    "topic": "topic",
}

NOTE_MARKERS = {
    "task": "extTask",
    "projectTask": "extTask",
    "meeting": "extMeeting",
    "meetingPrep": "extMeeting",
    "storyDraft": "extStoryDraft",
    "reportingNotes": "extReportingNotes",
    "emailDraft": "extEmailDraft",
    "topic": "extTopic",
}

# Older installs represented these two entity fields as text labels. Keep the
# migration explicit so a reinstall removes the old inherited schema and gives
# existing working notes a real relation where an Organization already exists.
LEGACY_ENTITY_LABELS = {
    "client": ("client", "clientOverride"),
    "companyOnBehalf": ("companyOnBehalf", "companyOnBehalfOverride"),
}
REMOVED_TEMPLATE_DEFINITIONS = (
    "label:client", "label:companyOnBehalf",
    "label:clientOverride", "label:companyOnBehalfOverride",
    "label:filed", "label:waitingOn", "label:followUpDate", "label:lastSentDate",
)

DAILY_EMPTY_TASK_BLOCK = (
    "<h2>Tasks</h2>"
    "<ul class='todo-list'><li><label class='todo-list__label'>"
    "<input type='checkbox' disabled><span class='todo-list__label__description'>"
    "</span></label></li></ul>"
)
DAILY_NOTE_CONTENT = (
    "<style>.daily-note h2{margin:1.5rem 0 .55rem}.daily-note h2:first-child{margin-top:0}"
    ".daily-note .include-note{margin-bottom:1.5rem}.daily-note p{min-height:1.4em}</style>"
    "<div class='daily-note'>"
    "<h2>Open Tasks</h2>"
    "<section class='include-note' data-extension-open-tasks='true' "
    "data-note-id='__OPEN_TASKS_VIEW__' data-box-size='expandable'>&nbsp;</section>"
    "<h2>Notes</h2><p></p>"
    "<h2>Day start</h2><p></p>"
    "</div>"
)


@dataclass(frozen=True)
class Template:
    """A #template note plus the attribute schema its instances inherit."""

    title: str
    marker: str
    content: str
    definitions: dict[str, str] = field(default_factory=dict)
    labels: dict[str, str] = field(default_factory=dict)
    # Known shipped bodies that can be safely migrated. Arbitrary edits made
    # by a user must never be overwritten by a later install.
    legacy_contents: tuple[str, ...] = ()


TEMPLATES: tuple[Template, ...] = (
    Template(
        title="Daily Note",
        marker="daily",
        content=DAILY_NOTE_CONTENT,
        legacy_contents=(
            DAILY_EMPTY_TASK_BLOCK +
            "<h2>Notes</h2><p></p>"
            "<h2>Day start</h2><p></p>",
            "<style>.daily-open-tasks-widget{border-top:1px solid var(--main-border-color);margin-top:1rem;padding-top:.75rem}.daily-open-tasks-widget h2{margin-top:0}.daily-open-tasks-widget table{width:100%}</style>" +
            DAILY_EMPTY_TASK_BLOCK +
            "<section class='daily-open-tasks-widget'><h2>Open Tasks</h2>"
            "<div class='daily-widget-body'>Loading…</div></section><h2>Notes</h2><p></p>"
            "<h2>Day start</h2><p></p>",
        ),
    ),
    Template(
        title="Task",
        marker="task",
        content=(
            "<h2>Overview</h2><p></p>"
            "<h2>Task Details</h2>"
            "<h3>Primary Task</h3><ul><li></li></ul>"
            "<h3>Sub-tasks</h3><ul><li></li><li></li><li></li></ul>"
            "<h3>Related Information</h3><p></p>"
            "<h3>Context</h3><p></p>"
            "<h3>Dependencies</h3><ul><li></li></ul>"
            "<h3>Acceptance Criteria</h3><ul><li></li><li></li><li></li></ul>"
            "<h2>Notes</h2><p></p>"
            "<h2>Links</h2><ul><li></li></ul>"
        ),
        definitions={**DUE_DATE, **PRIORITY, **DURATION, **COMPLEXITY,
                     **STATUS, **DONE_DATE, **PROJECT_REL, **TOPICS},
        legacy_contents=(
            "<h2>Context</h2><p></p><h2>Acceptance</h2><p></p>",
        ),
    ),
    Template(
        title="Project Task",
        marker="projectTask",
        content=(
            "<h2>Project Overview</h2><p></p>"
            "<h2>Scope &amp; Objectives</h2>"
            "<h3>Primary Objective</h3><p></p>"
            "<h3>Success Metrics</h3><ul><li></li><li></li><li></li></ul>"
            "<h2>Task Breakdown</h2>"
            "<h3>Phase 1: Planning &amp; Setup</h3><ul><li></li><li></li><li></li></ul>"
            "<h3>Phase 2: Development</h3><ul><li></li><li></li><li></li></ul>"
            "<h3>Phase 3: Testing &amp; Validation</h3><ul><li></li><li></li><li></li></ul>"
            "<h3>Phase 4: Deployment &amp; Documentation</h3><ul><li></li><li></li><li></li></ul>"
            "<h2>Dependencies &amp; Blockers</h2>"
            "<h3>Prerequisites</h3><ul><li></li><li></li></ul>"
            "<h3>Potential Blockers</h3><ul><li></li><li></li></ul>"
            "<h2>Resources &amp; Stakeholders</h2><p></p>"
            "<h2>Timeline</h2><p></p>"
            "<h2>Progress Tracking</h2><p></p>"
            "<h2>Notes &amp; Updates</h2><p></p>"
            "<h2>Related Documents</h2><ul><li></li></ul>"
        ),
        definitions={**DUE_DATE, **PRIORITY, **DURATION, **COMPLEXITY,
                     **STATUS, **DONE_DATE, **PROJECT_REL, **TOPICS},
        legacy_contents=(
            "<h2>Objective</h2><p></p>"
            "<h2>Success metrics</h2><ul><li></li></ul>"
            "<h2>Breakdown</h2><ul><li></li></ul>"
            "<h2>Dependencies &amp; blockers</h2><ul><li></li></ul>"
            "<h2>Notes</h2><p></p>",
        ),
    ),
    Template(
        title="Meeting",
        marker="meeting",
        content=(
            "<h2>Meeting Details</h2><p></p>"
            "<h2>Attendees</h2><ul><li></li><li></li></ul>"
            "<h2>Important Mentions</h2><ul><li></li><li></li></ul>"
            "<h2>Agenda &amp; Questions</h2><ul><li></li></ul>"
            "<h2>Notes</h2><p></p>"
            "<h2>Follow-up Actions</h2><ul><li></li></ul>"
            "<h2>Transcript</h2><p></p>"
        ),
        # startDate/startTime are native calendar labels — no remapping needed.
        definitions={
            "label:startDate": "promoted,alias=Meeting date,single,date",
            "label:startTime": "promoted,alias=Start time,single,text",
            "relation:attendee": "promoted,alias=Attendees,multi",
            "relation:organization": "promoted,alias=Organization,multi",
            **PROJECT_REL,
            **TOPICS,
        },
        legacy_contents=(
            "<h2>Attendees</h2><p></p>"
            "<h2>Agenda &amp; questions</h2><ul><li></li></ul>"
            "<h2>Notes</h2><p></p>"
            "<h2>Follow-up actions</h2>"
            "<ul class='todo-list'><li><label class='todo-list__label'>"
            "<input type='checkbox' disabled><span class='todo-list__label__description'>"
            "</span></label></li></ul>"
            "<h2>Transcript</h2><p></p>",
        ),
    ),
    Template(
        title="Meeting Prep",
        marker="meetingPrep",
        content=(
            "<h2>Purpose</h2><p></p>"
            "<h2>Attendees</h2><ul><li></li></ul>"
            "<h2>Agenda</h2><ul><li></li></ul>"
            "<h2>Questions</h2><ul><li></li></ul>"
            "<h2>Pre-meeting Notes</h2><p></p>"
        ),
        definitions={
            "label:startDate": "promoted,alias=Meeting date,single,date",
            "relation:attendee": "promoted,alias=Attendees,multi",
            **PROJECT_REL,
            **TOPICS,
        },
        legacy_contents=(
            "<h2>Purpose</h2><p></p>"
            "<h2>Agenda</h2><ul><li></li></ul>"
            "<h2>Questions</h2><ul><li></li></ul>"
            "<h2>Pre-meeting notes</h2><p></p>",
        ),
    ),
    Template(
        title="Story Draft",
        marker="storyDraft",
        content=STORY_DRAFT_CONTENT,
        definitions={
            **CLIENT,
            **ON_BEHALF,
            "label:round": "promoted,alias=Round,single,number",
            **STATUS,
            **DONE_DATE,
            **PROJECT_REL,
            **TOPICS,
        },
        legacy_contents=(
            STORY_DRAFT_CONTENT,
            "<h2>LINKS</h2><ul><li></li></ul>"
            "<h2>OPEN QUESTIONS</h2><ul><li></li></ul>"
            "<h2>IDEA / ANGLE</h2><p></p>"
            "<h2>REPORTING NOTES</h2><p></p>"
            "<h2>HED</h2><ul><li></li><li></li><li></li></ul>"
            "<h2>BYLINE</h2><p>By Ian Sherr (+1 415.347.6397)</p>"
            "<h2>STORYBODY</h2><p></p><p>--ENDIT--</p>",
            "<h2>LINKS</h2><ul><li></li></ul>"
            "<h2>OPEN QUESTIONS</h2><ul><li></li></ul>"
            "<h2>EDITORIAL NOTES</h2><p></p>"
            "<h2>REQUESTED CHANGES</h2><ul><li></li></ul>"
            "<h2>HED</h2><ul><li></li><li></li><li></li></ul>"
            "<h2>BYLINE</h2><p>By Ian Sherr (+1 415.347.6397)</p>"
            "<h2>STORYBODY</h2><p></p><p>--ENDIT--</p>"
            "<h2>WRITER RESPONSE</h2><p></p>",
        ),
    ),
    Template(
        title="Reporting Notes",
        marker="reportingNotes",
        content=REPORTING_NOTES_CONTENT,
        definitions={**CLIENT, **ON_BEHALF, **PROJECT_REL, **TOPICS},
        legacy_contents=(
            "<h2>LINKS</h2><ul><li></li></ul>"
            "<h2>OPEN QUESTIONS</h2><ul><li></li></ul>"
            "<h2>IDEA / ANGLE</h2><p></p>"
            "<h2>REPORTING NOTES</h2><p></p>",
        ),
    ),
    Template(
        title="Email Draft",
        marker="emailDraft",
        content=(
            "<h2>Links</h2><ul><li></li></ul>"
            "<h2>Open Questions</h2><ul><li></li></ul>"
            "<h2>Subject</h2><p></p>"
            "<h2>Body</h2><p></p>"
            "<h2>Reply / Follow-up Notes</h2><p></p>"
        ),
        definitions={
            **CLIENT,
            **ON_BEHALF,
            **STATUS,
            **PROJECT_REL,
            **TOPICS,
        },
        legacy_contents=(
            "<h2>Subject</h2><p></p><h2>Body</h2><p></p>",
        ),
    ),
    Template(
        title="Person",
        marker="person",
        content=(
            "<h2>Notes</h2><p></p>"
            "<h2>Meetings &amp; Mentions</h2><p></p>"
        ),
        # inverse= gives real two-way links: setting an employer here adds the
        # person to the organization's staff automatically. Dataview could not
        # do this — it could only query one direction at read time.
        definitions={
            "label:jobTitle": "promoted,alias=Job focus,single,text",
            "relation:employer": "promoted,alias=Employer,multi,inverse=staff",
            **PROJECT_REL,
            **TOPICS,
        },
        legacy_contents=("<h2>Notes</h2><p></p>",),
    ),
    Template(
        title="Organization",
        marker="organization",
        content=(
            "<h2>Notes</h2><p></p>"
            "<h2>Meetings</h2><p></p>"
            "<h2>Current People</h2><ul><li></li></ul>"
            "<h2>Past People</h2><ul><li></li></ul>"
        ),
        definitions={
            "label:location": "promoted,alias=Location,single,text",
            "label:ticker": "promoted,alias=Ticker,single,text",
            "relation:staff": "promoted,alias=People,multi,inverse=employer",
            **PROJECT_REL,
            **TOPICS,
        },
        legacy_contents=("<h2>Notes</h2><p></p>",),
    ),
    Template(
        title="Project Hub",
        marker="projectHub",
        content=(
            "<h2>Status</h2><p></p>"
            "<h2>Next Step</h2><p></p>"
            "<h2>Decisions &amp; notes</h2><p></p>"
        ),
        # kind distinguishes your own projects from multi-round edits of someone
        # else's story, as `kind: project` / `kind: edit` did in the frontmatter.
        definitions={
            "label:kind": "promoted,alias=Kind,single,text",
            **STATUS,
            **NEXT_ACTION,
            **CLIENT,
            **ON_BEHALF,
            "label:startDate": "promoted,alias=Started,single,date",
            **WRITER,
            **CURRENT_ROUND,
            **RELATED_HUBS,
            **TOPICS,
        },
        legacy_contents=(
            "<h2>Status</h2><p></p>"
            "<h2>Decisions &amp; notes</h2><p></p>",
        ),
    ),
    Template(
        title="Topic",
        marker="topic",
        content=(
            "<h2>About this topic</h2><p></p>"
            "<h2>Notes</h2><p>Notes related to this topic appear in the backlinks panel.</p>"
        ),
        definitions={**TOPIC_ALIAS},
        legacy_contents=(
            "<h2>About this topic</h2><p></p>",
        ),
    ),
)


def apply_template(api: Etapi, templates_root: str, template: Template) -> str:
    """Ensure one template note exists with its schema. Returns a status line."""
    note_id = find_template(api, templates_root, template.marker)
    status = "unchanged"

    if note_id is None:
        note_id = api.create_note(
            parent_note_id=templates_root,
            title=template.title,
            content=template.content,
        )
        api.set_label(note_id, MARKER, template.marker)
        api.set_label(note_id, "template")
        status = "created"
    elif api.get_note(note_id)["title"] != template.title:
        api.set_title(note_id, template.title)
        status = "renamed"

    existing_content = api.get_content(note_id)
    shipped_daily_upgrade = (
        template.marker == "daily"
        and DAILY_EMPTY_TASK_BLOCK in existing_content
        and "data-extension-open-tasks='true'" in existing_content
    )
    if existing_content in template.legacy_contents or shipped_daily_upgrade:
        api.set_content(note_id, template.content)
        status = "updated"

    # Template inheritance gives the instance the form. These definitions must
    # not continue down the note tree, or a child Story Draft would inherit a
    # second Project Hub form.
    for name, value in template.definitions.items():
        api.set_label(note_id, name, value, inheritable=False)
    for legacy_name in REMOVED_TEMPLATE_DEFINITIONS:
        for attribute in api.get_note(note_id).get("attributes", []):
            if (
                attribute.get("noteId") == note_id
                and attribute.get("type") == "label"
                and attribute.get("name") == legacy_name
            ):
                api.delete_attribute(attribute["attributeId"])
    for position, name in zip(
        range(30, 30 + 10 * len(template.definitions), 10),
        template.definitions,
    ):
        attribute = next(
            (
                attribute for attribute in api.get_note(note_id).get("attributes", [])
                if attribute.get("noteId") == note_id
                and attribute.get("name") == name
            ),
            None,
        )
        if attribute is not None and attribute.get("position") != position:
            api.set_attribute_position(attribute["attributeId"], position)
    # These are deliberately plain inherited labels rather than relying on
    # #extTemplate. Trilium uses the latter as an implementation marker and
    # does not reliably index it in saved-search expressions.
    api.set_label(note_id, "noteType", template.marker, inheritable=False)
    if template.marker in NOTE_GROUPS:
        api.set_label(note_id, "noteGroup", NOTE_GROUPS[template.marker], inheritable=False)
    if template.marker in NOTE_MARKERS:
        api.set_label(note_id, NOTE_MARKERS[template.marker], inheritable=False)
    for name, value in template.labels.items():
        api.set_label(note_id, name, value)
    # Do not archive templates: Trilium 0.104.1 excludes notes created from an
    # archived template from search, even when the archive label is not
    # inheritable. The Templates root uses #subtreeHidden for tree hygiene.
    for attribute in api.get_note(note_id).get("attributes", []):
        if (
            attribute.get("noteId") == note_id
            and attribute.get("type") == "label"
            and attribute.get("name") == "archived"
        ):
            api.delete_attribute(attribute["attributeId"])

    count = len(template.definitions)
    return f"{status:9} {template.title:15} {count:2} fields   {note_id}"


def _descendants(api: Etapi, root_id: str) -> list[str]:
    pending = [root_id]
    seen: set[str] = set()
    result: list[str] = []
    while pending:
        note_id = pending.pop()
        if not note_id or note_id in seen:
            continue
        seen.add(note_id)
        result.append(note_id)
        pending.extend(api.get_note(note_id).get("childNoteIds", []))
    return result


def reattach_existing_templates(api: Etapi, templates_root: str) -> int:
    """Reconnect preserved extension notes to freshly installed templates."""
    template_ids = {
        template.marker: find_template(api, templates_root, template.marker)
        for template in TEMPLATES
    }
    roots = [
        api.find_by_label(marker)
        for marker in (
            "projectRoot", "meetingRoot", "taskRoot", "storyDraftRoot",
            "emailRoot", "peopleRoot", "orgRoot", "topicRoot",
        )
    ]
    reattached = 0
    for root_id in roots:
        if not root_id:
            continue
        for note_id in _descendants(api, root_id):
            note = api.get_note(note_id)
            marker = next(
                (
                    attribute.get("value") for attribute in note.get("attributes", [])
                    if attribute.get("noteId") == note_id
                    and attribute.get("name") == "noteType"
                    and attribute.get("value") in template_ids
                ),
                None,
            )
            template_id = template_ids.get(marker)
            if not template_id:
                continue
            has_current_template = any(
                attribute.get("type") == "relation"
                and attribute.get("name") == "template"
                and attribute.get("value") == template_id
                for attribute in note.get("attributes", [])
            )
            if has_current_template:
                continue
            api.set_relation(note_id, "template", template_id)
            reattached += 1
    return reattached


def migrate_legacy_entity_labels(api: Etapi) -> tuple[int, int]:
    """Convert old text entity fields without touching imported/archive notes.

    An exact, case-insensitive title match below Organizations becomes a
    relation. Anything else becomes an explicit unaffiliated override. This
    avoids silently creating duplicate Organizations from a typo or a one-off
    client name; the user can create/select the Organization later.
    """
    organization_root = api.find_by_label("orgRoot")
    working_roots = [
        api.find_by_label(marker)
        for marker in ("projectRoot", "storyDraftRoot", "emailRoot")
    ]
    working_ids = {
        note_id
        for root_id in working_roots
        if root_id
        for note_id in _descendants(api, root_id)
    }
    if not organization_root or not working_ids:
        return 0, 0

    organizations = {}
    for note_id in _descendants(api, organization_root):
        if note_id == organization_root:
            continue
        note = api.get_note(note_id)
        organizations[note["title"].strip().casefold()] = note_id

    converted = 0
    overridden = 0
    for note_id in working_ids:
        note = api.get_note(note_id)
        for legacy_name, (relation_name, override_name) in LEGACY_ENTITY_LABELS.items():
            legacy = next(
                (
                    attribute for attribute in note.get("attributes", [])
                    if attribute.get("noteId") == note_id
                    and attribute.get("type") == "label"
                    and attribute.get("name") == legacy_name
                ),
                None,
            )
            if legacy is None:
                continue
            value = (legacy.get("value") or "").strip()
            if not value:
                api.delete_attribute(legacy["attributeId"])
                continue

            existing_relation = any(
                attribute.get("noteId") == note_id
                and attribute.get("type") == "relation"
                and attribute.get("name") == relation_name
                for attribute in note.get("attributes", [])
            )
            if not existing_relation:
                target_id = organizations.get(value.casefold())
                if target_id:
                    api.set_relation(note_id, relation_name, target_id)
                    converted += 1
                else:
                    api.set_label(note_id, override_name, value)
                    overridden += 1
            api.delete_attribute(legacy["attributeId"])
    return converted, overridden


def ensure_project_hub_icons(api: Etapi) -> int:
    """Make Project and Edit hubs visually distinct in the tree."""
    project_root = api.find_by_label("projectRoot")
    if not project_root:
        return 0

    updated = 0
    for note_id in _descendants(api, project_root):
        if note_id == project_root:
            continue
        note = api.get_note(note_id)
        if not any(
            attribute.get("name") == "extTemplate"
            and attribute.get("value") == "projectHub"
            for attribute in note.get("attributes", [])
        ):
            continue
        kind = next(
            (
                attribute.get("value")
                for attribute in note.get("attributes", [])
                if attribute.get("name") == "kind"
                and attribute.get("value") in ("project", "edit")
            ),
            "project",
        )
        expected_icon = "bx bx-edit-alt" if kind == "edit" else "bx bx-book"
        owned_marker = next(
            (
                attribute for attribute in note.get("attributes", [])
                if attribute.get("noteId") == note_id
                and attribute.get("name") == "extHubIcon"
            ),
            None,
        )
        owned_icon = next(
            (
                attribute for attribute in note.get("attributes", [])
                if attribute.get("noteId") == note_id
                and attribute.get("name") == "iconClass"
            ),
            None,
        )
        # Do not overwrite a deliberate custom icon on an older hub. Once the
        # extension owns the marker, future kind changes are kept in sync.
        if owned_icon is not None and owned_marker is None:
            continue
        if not owned_icon or owned_icon.get("value") != expected_icon:
            api.set_label(note_id, "iconClass", expected_icon)
            updated += 1
        api.set_label(note_id, "extHubIcon", kind)
    return updated


def migrate_project_hubs_to_areas(api: Etapi) -> int:
    """Move legacy direct-child hubs into Active or Archive once.

    Existing hubs may still be direct children of Projects from an older
    install. After this migration, physical placement is authoritative: users
    can archive an active hub simply by moving it to Archive, and later applies
    will not pull it back based on its status.
    """
    project_root = api.find_by_label("projectRoot")
    active_root = api.find_by_label("activeProjectRoot")
    archive_root = api.find_by_label("archiveProjectRoot")
    templates_root = api.find_by_label("templateRoot")
    project_template = find_template(api, templates_root, "projectHub") if templates_root else None
    if not project_root or not active_root or not archive_root:
        return 0

    moved = 0
    for note_id in list(api.get_note(project_root).get("childNoteIds", [])):
        if note_id in (active_root, archive_root, api.find_by_label("unassignedRoot")):
            continue
        note = api.get_note(note_id)
        is_hub = any(
            attribute.get("noteId") == note_id
            and attribute.get("name") == "noteType"
            and attribute.get("value") == "projectHub"
            for attribute in note.get("attributes", [])
        ) or any(
            attribute.get("noteId") == note_id
            and attribute.get("type") == "relation"
            and attribute.get("name") == "template"
            and attribute.get("value") == project_template
            for attribute in note.get("attributes", [])
        )
        if not is_hub:
            continue

        status = next(
            (
                attribute.get("value")
                for attribute in note.get("attributes", [])
                if attribute.get("noteId") == note_id
                and attribute.get("name") == "status"
            ),
            "active",
        )
        archived = any(
            attribute.get("noteId") == note_id
            and attribute.get("name") == "archived"
            and attribute.get("value", "") != "false"
            for attribute in note.get("attributes", [])
        )
        destination = archive_root if archived or status == "complete" else active_root
        api.move_note(note_id, destination)
        moved += 1
    return moved


def reconcile_project_hub_statuses(api: Etapi) -> int:
    """Align hub status with the latest edit-round state after an upgrade."""
    project_root = api.find_by_label("projectRoot")
    if not project_root:
        return 0
    templates_root = api.find_by_label("templateRoot")
    story_template = find_template(api, templates_root, "storyDraft") if templates_root else None
    project_template = find_template(api, templates_root, "projectHub") if templates_root else None

    updated = 0
    for hub_id in _descendants(api, project_root):
        if hub_id == project_root:
            continue
        hub = api.get_note(hub_id)
        if not any(
            attribute.get("noteId") == hub_id
            and attribute.get("name") == "extTemplate"
            and attribute.get("value") == "projectHub"
            for attribute in hub.get("attributes", [])
        ) and not any(
            attribute.get("noteId") == hub_id
            and attribute.get("name") == "noteType"
            and attribute.get("value") == "projectHub"
            for attribute in hub.get("attributes", [])
        ) and not any(
            attribute.get("noteId") == hub_id
            and attribute.get("type") == "relation"
            and attribute.get("name") == "template"
            and attribute.get("value") == project_template
            for attribute in hub.get("attributes", [])
        ):
            continue

        rounds = []
        for child_id in hub.get("childNoteIds", []):
            child = api.get_note(child_id)
            if not any(
                attribute.get("name") == "extTemplate"
                and attribute.get("value") == "storyDraft"
                for attribute in child.get("attributes", [])
            ) and not any(
                attribute.get("name") == "noteType"
                and attribute.get("value") == "storyDraft"
                for attribute in child.get("attributes", [])
            ) and not any(
                attribute.get("type") == "relation"
                and attribute.get("name") == "template"
                and attribute.get("value") == story_template
                for attribute in child.get("attributes", [])
            ):
                continue
            round_value = next(
                (
                    attribute.get("value") for attribute in child.get("attributes", [])
                    if attribute.get("name") == "round"
                ),
                None,
            )
            try:
                round_number = int(round_value)
            except (TypeError, ValueError):
                continue
            rounds.append((round_number, child))

        if not rounds:
            continue
        latest = max(rounds, key=lambda item: item[0])[1]
        latest_status = next(
            (
                attribute.get("value") for attribute in latest.get("attributes", [])
                if attribute.get("name") == "status"
            ),
            None,
        )
        expected = "complete" if latest_status == "done" else "active"
        current = next(
            (
                attribute.get("value") for attribute in hub.get("attributes", [])
                if attribute.get("noteId") == hub_id
                and attribute.get("name") == "status"
            ),
            None,
        )
        if current != expected:
            api.set_label(hub_id, "status", expected)
            updated += 1
    return updated


def migrate_edit_round_bodies(api: Etapi) -> int:
    """Give untouched older story notes their workflow-specific body.

    Story Draft used to contain both reporting and writing sections. Only notes
    whose body is exactly one of the shipped older bodies are migrated; any
    user-edited body is preserved.
    """
    story_template = next(t for t in TEMPLATES if t.marker == "storyDraft")
    roots = [
        marker for marker in ("projectRoot", "storyDraftRoot", "unassignedRoot")
        if api.find_by_label(marker) is not None
    ]
    if not roots:
        return 0

    # Story drafts now live directly under their Project Hub. Walk the small
    # working subtree instead of assuming they are children of Drafts.
    pending = [api.find_by_label(marker) for marker in roots]
    seen: set[str] = set()
    story_notes: list[str] = []
    while pending:
        parent_id = pending.pop()
        if not parent_id or parent_id in seen:
            continue
        seen.add(parent_id)
        for note_id in api.get_note(parent_id).get("childNoteIds", []):
            if note_id in seen:
                continue
            note = api.get_note(note_id)
            owned_template = next(
                (
                    a.get("value") for a in note.get("attributes", [])
                    if a.get("noteId") == note_id
                    and a.get("type") == "label"
                    and a.get("name") == "extTemplate"
                ),
                None,
            )
            inherited_template = any(
                a.get("type") == "label"
                and a.get("name") == "extTemplate"
                and a.get("value") == "storyDraft"
                for a in note.get("attributes", [])
            )
            if owned_template == "storyDraft" or inherited_template:
                story_notes.append(note_id)
            pending.append(note_id)

    migrated = 0
    for note_id in story_notes:
        note = api.get_note(note_id)
        project_id = next(
            (
                a.get("value")
                for a in note.get("attributes", [])
                if a.get("noteId") == note_id
                and a.get("type") == "relation"
                and a.get("name") == "project"
            ),
            None,
        )
        if not project_id:
            continue
        try:
            hub = api.get_note(project_id)
        except EtapiError:
            continue
        kind = next(
            (a.get("value") for a in hub.get("attributes", []) if a.get("name") == "kind"),
            None,
        )
        if api.get_content(note_id) not in story_template.legacy_contents:
            continue
        replacement = EDIT_ROUND_CONTENT if kind == "edit" else STORY_DRAFT_CONTENT
        api.set_content(note_id, replacement)
        migrated += 1
    return migrated


def ensure_project_reporting_notes(api: Etapi) -> int:
    """Add the Reporting Notes companion to older project hubs.

    Project hubs created before the reporting/draft split have a Story Draft
    but no Reporting Notes child. Create only the missing extension-owned note;
    existing notes and user content are left untouched.
    """
    project_root = api.find_by_label("projectRoot")
    templates_root = api.find_by_label("templateRoot")
    if not project_root or not templates_root:
        return 0
    reporting_template = find_template(api, templates_root, "reportingNotes")
    if not reporting_template:
        return 0

    created = 0
    for hub_id in _descendants(api, project_root):
        if hub_id == project_root:
            continue
        hub = api.get_note(hub_id)
        is_hub = any(
            attribute.get("noteId") == hub_id
            and attribute.get("name") == "noteType"
            and attribute.get("value") == "projectHub"
            for attribute in hub.get("attributes", [])
        )
        kind = next(
            (
                attribute.get("value")
                for attribute in hub.get("attributes", [])
                if attribute.get("noteId") == hub_id and attribute.get("name") == "kind"
            ),
            "project",
        )
        if not is_hub or kind != "project":
            continue
        existing_note_id = next(
            (
                child_id
                for child_id in hub.get("childNoteIds", [])
                if any(
                    attribute.get("noteId") == child_id
                    and attribute.get("name") in ("noteType", "extReportingNotes")
                    and (
                    attribute.get("value") in ("reportingNotes", "")
                    or attribute.get("name") == "extReportingNotes"
                )
                    for attribute in api.get_note(child_id).get("attributes", [])
                )
            ),
            None,
        )
        if existing_note_id:
            existing_note = api.get_note(existing_note_id)
            expected_title = reporting_notes_title(hub.get("title", "Project"))
            if existing_note.get("title") == "Reporting Notes":
                api.set_title(
                    existing_note_id,
                    expected_title,
                )
            if existing_note.get("title") == expected_title:
                api.set_label(existing_note_id, "extReportingTitleManaged")
            continue

        note_id = api.create_note(
            parent_note_id=hub_id,
            title=reporting_notes_title(hub.get("title", "Project")),
            content=REPORTING_NOTES_CONTENT,
        )
        api.set_relation(note_id, "template", reporting_template)
        api.set_relation(note_id, "project", hub_id)
        api.set_label(note_id, "noteType", "reportingNotes")
        api.set_label(note_id, "noteGroup", "reporting")
        api.set_label(note_id, "extReportingNotes")
        created += 1
    return created


def repair_existing_day_note_templates(
    api: Etapi, journal_id: str, daily_template_id: str
) -> int:
    """Attach the daily template to pre-existing calendar notes when missing.

    Trilium applies ``~dateTemplate`` when it creates a day note. An
    uninstall/reinstall can replace the extension template while preserving
    the user's existing Journal notes, leaving those older notes without a
    ``~template`` relation. Repair only notes that have no owned template
    relation, so a user's deliberate per-note template choice is preserved.
    """
    repaired = 0
    for result in api.search(
        "#dateNote", ancestor_note_id=journal_id, include_archived=True
    ):
        note_id = result["noteId"]
        owned_template = any(
            attribute.get("noteId") == note_id
            and attribute.get("type") == "relation"
            and attribute.get("name") == "template"
            for attribute in api.get_note(note_id).get("attributes", [])
        )
        if owned_template:
            continue
        api.set_relation(note_id, "template", daily_template_id)
        repaired += 1
    return repaired


def main() -> int:
    try:
        api = Etapi.from_env()
        templates_root = api.find_by_label("templateRoot")
        if templates_root is None:
            print("error: #templateRoot not found — run apply_skeleton.py first",
                  file=sys.stderr)
            return 1

        print(f"Trilium {api.app_info()['appVersion']} at {api.url}\n")
        for template in TEMPLATES:
            print(apply_template(api, templates_root, template))

        reattached = reattach_existing_templates(api, templates_root)
        if reattached:
            print(f"reattached {reattached} preserved note template relation(s)")

        moved = migrate_project_hubs_to_areas(api)
        if moved:
            print(f"migrated  {moved} Project Hub(s) into Active/Archive")

        converted, overridden = migrate_legacy_entity_labels(api)
        if converted or overridden:
            print(
                f"migrated  {converted} entity value(s) to Organization relation(s); "
                f"kept {overridden} as unaffiliated override(s)"
            )

        icon_updates = ensure_project_hub_icons(api)
        if icon_updates:
            print(f"updated   {icon_updates} Project Hub icon(s)")

        status_updates = reconcile_project_hub_statuses(api)
        if status_updates:
            print(f"updated   {status_updates} Project Hub status(es)")

        migrated = migrate_edit_round_bodies(api)
        if migrated:
            print(f"migrated  {migrated} untouched edit-round bodies")

        reporting_notes = ensure_project_reporting_notes(api)
        if reporting_notes:
            print(f"created   {reporting_notes} missing Project Hub Reporting Notes companion(s)")

        # Wire the daily template into the journal so Trilium applies it to
        # every generated day note. This is what replaces create-daily-note.
        journal = api.find_by_label("calendarRoot")
        daily = find_template(api, templates_root, "daily")
        if journal and daily:
            api.set_relation(journal, "dateTemplate", daily)
            print(f"\nwired     ~dateTemplate on Journal -> Daily Note ({daily})")
            repaired = repair_existing_day_note_templates(api, journal, daily)
            if repaired:
                print(f"repaired  {repaired} existing day-note template relations")
    except EtapiError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    print("\nTemplates applied.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
