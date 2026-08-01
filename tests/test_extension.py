#!/usr/bin/env python3
"""System tests for the Trilium extension.

Runs against the dev instance (dev/). Every test creates its
own fixtures with a unique prefix and deletes them afterwards, so the suite is
re-runnable and does not depend on what a previous run left behind.

    python3 tests/test_extension.py

Skips cleanly if no instance is reachable.
"""

from __future__ import annotations

import json
import sys
import unittest
import urllib.error
import urllib.request
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS))

from apply_collections import SAVED_SEARCHES, restore_today_branches  # noqa: E402
from apply_scripts import SCRIPTS, find_script  # noqa: E402
from apply_skeleton import CONTAINERS, apply_container  # noqa: E402
from apply_templates import (  # noqa: E402
    TEMPLATES,
    apply_template,
    find_template,
    migrate_legacy_entity_labels,
    migrate_project_hubs_to_areas,
    reconcile_project_hub_statuses,
)
from etapi import Etapi, EtapiError, load_dev_env  # noqa: E402

import os  # noqa: E402


def instance_or_none() -> Etapi | None:
    try:
        api = Etapi.from_env()
        api.app_info()
        return api
    except EtapiError:
        return None


API = instance_or_none()


@unittest.skipIf(API is None, "no Trilium instance reachable")
class ExtensionTestCase(unittest.TestCase):
    """Shared fixture bookkeeping."""

    def setUp(self) -> None:
        self.api = API
        self.prefix = f"__test_{uuid.uuid4().hex[:8]}__"
        self.created: list[str] = []

    def tearDown(self) -> None:
        for note_id in reversed(self.created):
            try:
                self.api.delete_note(note_id)
            except EtapiError:
                pass

    def make_note(self, root_label: str, title: str, template_marker: str | None = None) -> str:
        root = self.api.find_by_label(root_label)
        note_id = self.api.create_note(root, f"{self.prefix}{title}", "<p></p>")
        self.created.append(note_id)
        if template_marker:
            templates_root = self.api.find_by_label("templateRoot")
            template_id = find_template(self.api, templates_root, template_marker)
            self.api.set_relation(note_id, "template", template_id)
        return note_id


class SkeletonTest(ExtensionTestCase):
    def test_every_container_exists_with_its_marker(self):
        for container in CONTAINERS:
            with self.subTest(container=container.title):
                note_id = self.api.find_by_label(container.marker)
                self.assertIsNotNone(note_id, f"#{container.marker} missing")
                self.assertEqual(self.api.get_note(note_id)["title"], container.title)

    def test_apply_is_idempotent(self):
        """A second apply must report unchanged, never create a duplicate."""
        for container in CONTAINERS:
            with self.subTest(container=container.title):
                self.assertTrue(apply_container(self.api, container).startswith("unchanged"))

    def test_implementation_roots_use_trilium_hidden_subtree(self):
        for marker in ("templateRoot", "extConfig", "scriptRoot"):
            with self.subTest(marker=marker):
                note_id = self.api.find_by_label(marker)
                self.assertIn("_userHidden", self.api.get_note(note_id)["parentNoteIds"])

        migration_log = self.api.find_by_label("extMigrationLog")
        self.assertIsNotNone(migration_log)
        self.assertIn("_userHidden", self.api.get_note(migration_log)["parentNoteIds"])
        self.assertIn("install", self.api.get_content(migration_log))

        dashboards = self.api.get_note(self.api.find_by_label("dashboardRoot"))
        self.assertIn("root", dashboards["parentNoteIds"])
        self.assertEqual(dashboards["type"], "book")
        dashboard_labels = {
            a["name"]: a.get("value", "")
            for a in dashboards["attributes"]
            if a["noteId"] == dashboards["noteId"] and a["type"] == "label"
        }
        self.assertEqual(dashboard_labels.get("viewType"), "dashboard")

    def test_cross_project_views_and_unassigned_capture_root(self):
        for marker in ("meetingRoot", "taskRoot"):
            note = self.api.get_note(self.api.find_by_label(marker))
            self.assertEqual(note["type"], "search")
        unassigned = self.api.get_note(self.api.find_by_label("unassignedRoot"))
        self.assertIn(self.api.find_by_label("projectRoot"), unassigned["parentNoteIds"])

    def test_project_area_branches_and_icons(self):
        project_root = self.api.find_by_label("projectRoot")
        active = self.api.get_note(self.api.find_by_label("activeProjectRoot"))
        archive = self.api.get_note(self.api.find_by_label("archiveProjectRoot"))
        self.assertIn(project_root, active["parentNoteIds"])
        self.assertIn(project_root, archive["parentNoteIds"])
        self.assertEqual(
            next(a["value"] for a in active["attributes"]
                 if a.get("noteId") == active["noteId"] and a.get("name") == "iconClass"),
            "bx bx-folder-open",
        )
        self.assertEqual(
            next(a["value"] for a in archive["attributes"]
                 if a.get("noteId") == archive["noteId"] and a.get("name") == "iconClass"),
            "bx bx-archive",
        )
        expected_icons = {
            "calendarRoot": "bx bx-calendar",
            "todayRoot": "bx bx-sun",
            "projectRoot": "bx bx-book",
            "meetingRoot": "bx bx-calendar-event",
            "storyDraftRoot": "bx bx-file",
            "emailRoot": "bx bx-envelope",
            "taskRoot": "bx bx-check-square",
            "unassignedRoot": "bx bx-inbox",
            "peopleRoot": "bx bx-group",
            "orgRoot": "bx bx-buildings",
            "topicRoot": "bx bx-purchase-tag",
        }
        for marker, expected in expected_icons.items():
            note = self.api.get_note(self.api.find_by_label(marker))
            with self.subTest(marker=marker):
                self.assertIn(
                    expected,
                    {
                        a.get("value") for a in note["attributes"]
                        if a.get("noteId") == note["noteId"] and a.get("name") == "iconClass"
                    },
                )

    def test_projects_table_exposes_project_summary_columns(self):
        project_root = self.api.find_by_label("projectRoot")
        owned = {
            a["name"]: a
            for a in self.api.get_note(project_root)["attributes"]
            if a.get("noteId") == project_root
            and a.get("type") == "label"
            and a.get("name") in {"label:currentRound", "label:status", "label:nextAction"}
        }
        self.assertEqual(
            {
                name: attribute.get("value")
                for name, attribute in owned.items()
            },
            {
                "label:currentRound": "promoted,alias=Latest round,single,number",
                "label:status": "promoted,alias=Status,single,text",
                "label:nextAction": "promoted,alias=Next action,single,text",
            },
        )
        self.assertEqual(
            [owned[name].get("position") for name in ("label:currentRound", "label:status", "label:nextAction")],
            [30, 40, 50],
        )

    def test_dashboard_has_a_seeded_native_layout(self):
        dashboard = self.api.find_by_label("dashboardRoot")
        layouts = [
            a for a in self.api.get_attachments(dashboard)
            if a.get("role") == "viewConfig" and a.get("title") == "dashboard.json"
        ]
        self.assertEqual(len(layouts), 1)
        layout = json.loads(self.api.get_attachment_content(layouts[0]["attachmentId"]))
        self.assertIsInstance(layout.get("widgets"), dict)
        widget_ids = {
            next(
                a["value"] for a in self.api.get_note(child_id).get("attributes", [])
                if a.get("noteId") == child_id
                and a.get("type") == "label"
                and a.get("name") == "extView"
            ): child_id
            for child_id in self.api.get_note(dashboard).get("childNoteIds", [])
            if any(
                a.get("noteId") == child_id
                and a.get("type") == "label"
                and a.get("name") == "extView"
                for a in self.api.get_note(child_id).get("attributes", [])
            )
        }
        self.assertTrue(widget_ids)
        self.assertTrue(set(widget_ids.values()).issubset(layout["widgets"]))
        self.assertTrue(all(
            {"x", "y", "w", "h"}.issubset(layout["widgets"][note_id])
            for note_id in widget_ids.values()
        ))

    def test_dashboard_has_filter_widget_and_unfiltered_search_bases(self):
        dashboard_id = self.api.find_by_label("dashboardRoot")
        dashboard = self.api.get_note(dashboard_id)
        filter_notes = [
            self.api.get_note(child_id)
            for child_id in dashboard.get("childNoteIds", [])
            if any(
                a.get("noteId") == child_id
                and a.get("name") == "extDashboardFilters"
                for a in self.api.get_note(child_id).get("attributes", [])
            )
        ]
        self.assertEqual(len(filter_notes), 1)
        render_targets = {
            a.get("value") for a in filter_notes[0].get("attributes", [])
            if a.get("noteId") == filter_notes[0]["noteId"]
            and a.get("type") == "relation" and a.get("name") == "renderNote"
        }
        self.assertEqual(
            {self.api.get_note(note_id)["title"] for note_id in render_targets},
            {"Dashboard Filters Markup"},
        )
        layouts = [
            a for a in self.api.get_attachments(dashboard_id)
            if a.get("role") == "viewConfig" and a.get("title") == "dashboard.json"
        ]
        layout = json.loads(self.api.get_attachment_content(layouts[0]["attachmentId"]))
        self.assertIn(filter_notes[0]["noteId"], layout["widgets"])
        for saved in SAVED_SEARCHES:
            view = next(
                self.api.get_note(child_id)
                for child_id in dashboard.get("childNoteIds", [])
                if any(
                    a.get("noteId") == child_id and a.get("name") == "extView"
                    and a.get("value") == saved.marker
                    for a in self.api.get_note(child_id).get("attributes", [])
                )
            )
            self.assertEqual(
                next(a["value"] for a in view["attributes"]
                     if a.get("noteId") == view["noteId"] and a.get("name") == "extBaseSearch"),
                saved.search,
            )


class TemplateTest(ExtensionTestCase):
    def test_every_template_exists(self):
        templates_root = self.api.find_by_label("templateRoot")
        for template in TEMPLATES:
            with self.subTest(template=template.title):
                self.assertIsNotNone(find_template(self.api, templates_root, template.marker))

    def test_instance_inherits_the_promoted_schema(self):
        note_id = self.make_note("taskRoot", "inherits", "task")
        names = {a["name"] for a in self.api.get_note(note_id)["attributes"]}
        for field in ("label:dueDate", "label:priority", "label:duration",
                      "label:complexity", "label:status", "label:doneDate",
                      "relation:project", "relation:topic"):
            self.assertIn(field, names)

    def test_template_lookup_ignores_instances(self):
        """Regression: ~template makes instances inherit #extTemplate, so a
        marker search matches them too. Lookup must use attribute ownership."""
        templates_root = self.api.find_by_label("templateRoot")
        expected = find_template(self.api, templates_root, "task")
        self.make_note("taskRoot", "decoy", "task")
        self.assertEqual(find_template(self.api, templates_root, "task"), expected)

    def test_project_hub_inherits_related_hubs_relation(self):
        note_id = self.make_note("projectRoot", "related hubs", "projectHub")
        names = {a["name"] for a in self.api.get_note(note_id)["attributes"]}
        self.assertIn("relation:relatedHub", names)
        self.assertIn("relation:companyOnBehalf", names)
        self.assertIn("label:nextAction", names)
        self.assertIn("relation:topic", names)

    def test_topic_inherits_canonical_alias_relation(self):
        note_id = self.make_note("topicRoot", "alias schema", "topic")
        names = {a["name"] for a in self.api.get_note(note_id)["attributes"]}
        self.assertIn("relation:aliasOf", names)

    def test_story_keeps_editorial_state_labels_out_of_promoted_form(self):
        note_id = self.make_note("storyDraftRoot", "editorial fields", "storyDraft")
        names = {a["name"] for a in self.api.get_note(note_id)["attributes"]}
        self.assertIn("label:doneDate", names)
        for field in ("label:waitingOn", "label:followUpDate", "label:lastSentDate"):
            self.assertNotIn(field, names)

    def test_entity_fields_are_relations_with_unaffiliated_overrides(self):
        note_id = self.make_note("storyDraftRoot", "entity fields", "storyDraft")
        names = {a["name"] for a in self.api.get_note(note_id)["attributes"]}
        for field in ("relation:client", "relation:companyOnBehalf"):
            self.assertIn(field, names)
        self.assertNotIn("label:client", names)
        self.assertNotIn("label:companyOnBehalf", names)
        self.assertNotIn("label:clientOverride", names)
        self.assertNotIn("label:companyOnBehalfOverride", names)

    def test_project_hub_schema_does_not_leak_into_child_notes(self):
        hub = self.make_note("projectRoot", "schema parent", "projectHub")
        child = self.api.create_note(hub, f"{self.prefix}schema child", "<p></p>")
        self.created.append(child)
        templates_root = self.api.find_by_label("templateRoot")
        story_template = find_template(self.api, templates_root, "storyDraft")
        self.api.set_relation(child, "template", story_template)
        names = {a["name"] for a in self.api.get_note(child)["attributes"]}
        self.assertIn("relation:client", names)
        for field in ("label:kind", "relation:writer", "relation:relatedHub"):
            self.assertNotIn(field, names)

    def test_project_hub_status_reconciliation_follows_latest_round(self):
        hub = self.make_note("projectRoot", "status parent", "projectHub")
        child = self.api.create_note(hub, f"{self.prefix}status round", "<p></p>")
        self.created.append(child)
        templates_root = self.api.find_by_label("templateRoot")
        story_template = find_template(self.api, templates_root, "storyDraft")
        self.api.set_relation(child, "template", story_template)
        self.api.set_label(child, "round", "1")
        self.api.set_label(child, "status", "done")
        self.assertGreaterEqual(reconcile_project_hub_statuses(self.api), 1)
        hub_owned = {
            a["name"]: a.get("value")
            for a in self.api.get_note(hub)["attributes"]
            if a["noteId"] == hub
        }
        self.assertEqual(hub_owned["status"], "complete")

    def test_legacy_hubs_move_to_active_or_archive(self):
        active_hub = self.make_note("projectRoot", "legacy active hub", "projectHub")
        archived_hub = self.make_note("projectRoot", "legacy archived hub", "projectHub")
        self.api.set_label(active_hub, "status", "active")
        self.api.set_label(archived_hub, "status", "complete")

        self.assertEqual(migrate_project_hubs_to_areas(self.api), 2)
        active_root = self.api.find_by_label("activeProjectRoot")
        archive_root = self.api.find_by_label("archiveProjectRoot")
        self.assertIn(active_root, self.api.get_note(active_hub)["parentNoteIds"])
        self.assertIn(archive_root, self.api.get_note(archived_hub)["parentNoteIds"])

    def test_legacy_client_values_match_organizations_or_become_overrides(self):
        organization = self.make_note("orgRoot", "Known client")
        organization_title = self.api.get_note(organization)["title"]
        matched = self.make_note("storyDraftRoot", "matched client", "storyDraft")
        unmatched = self.make_note("storyDraftRoot", "unmatched client", "storyDraft")
        self.api.set_label(matched, "client", organization_title)
        self.api.set_label(unmatched, "client", "One-off client")

        converted, overridden = migrate_legacy_entity_labels(self.api)

        self.assertGreaterEqual(converted, 1)
        self.assertGreaterEqual(overridden, 1)
        matched_attributes = self.api.get_note(matched)["attributes"]
        unmatched_attributes = self.api.get_note(unmatched)["attributes"]
        self.assertIn(
            organization,
            {
                a["value"] for a in matched_attributes
                if a["noteId"] == matched and a["type"] == "relation"
                and a["name"] == "client"
            },
        )
        self.assertIn(
            "One-off client",
            {
                a["value"] for a in unmatched_attributes
                if a["noteId"] == unmatched and a["type"] == "label"
                and a["name"] == "clientOverride"
            },
        )

    def test_story_template_prioritizes_links_and_questions(self):
        templates_root = self.api.find_by_label("templateRoot")
        template_id = find_template(self.api, templates_root, "storyDraft")
        content = self.api.get_content(template_id)
        self.assertLess(content.index("HED"), content.index("STORYBODY"))
        reporting_id = find_template(self.api, templates_root, "reportingNotes")
        reporting = self.api.get_content(reporting_id)
        for heading in ("LINKS", "OPEN QUESTIONS", "IDEA / ANGLE", "REPORTING NOTES"):
            self.assertIn(heading, reporting)

    def test_each_template_retains_type_specific_scaffold(self):
        templates_root = self.api.find_by_label("templateRoot")
        sections = {
            "task": "Task Details",
            "projectTask": "Task Breakdown",
            "meeting": "Important Mentions",
            "meetingPrep": "Pre-meeting Notes",
            "reportingNotes": "REPORTING NOTES",
            "emailDraft": "Reply / Follow-up Notes",
            "person": "Meetings &amp; Mentions",
            "organization": "Current People",
            "projectHub": "Next Step",
        }
        for marker, section in sections.items():
            with self.subTest(template=marker):
                template_id = find_template(self.api, templates_root, marker)
                self.assertIn(section, self.api.get_content(template_id))


class JournalTest(ExtensionTestCase):
    def day_note(self, date: str) -> dict:
        request = urllib.request.Request(
            f"{self.api.url}/etapi/calendar/days/{date}",
            headers={"Authorization": self.api.token},
        )
        return json.load(urllib.request.urlopen(request))

    def test_day_note_uses_the_configured_date_pattern(self):
        self.assertEqual(self.day_note("2026-09-15")["title"], "2026-09-15 - Tuesday")

    def test_day_note_gets_the_daily_template(self):
        day = self.day_note("2026-09-16")
        relations = [a for a in day["attributes"]
                     if a["type"] == "relation" and a["name"] == "template"]
        self.assertTrue(relations, "day note has no ~template relation")

    def test_delete_recreate_day_restores_open_task_branch_idempotently(self):
        today = date.today().isoformat()
        journal = self.api.find_by_label("calendarRoot")
        original_day = self.api.create_note(
            journal, f"{self.prefix}temporary day", "<p>temporary test day</p>",
        )
        self.created.append(original_day)
        self.api.set_label(original_day, "dateNote", today)

        task = self.make_note("unassignedRoot", "task after day deletion", "task")
        self.api.ensure_note_is_present_in_parent(task, original_day)
        self.assertIn(original_day, self.api.get_note(task)["parentNoteIds"])

        self.api.delete_note(original_day)
        recreated_day = self.api.create_note(
            journal, f"{self.prefix}recreated day", "<p>recreated test day</p>",
        )
        self.created.append(recreated_day)
        self.api.set_label(recreated_day, "dateNote", today)

        result = restore_today_branches(
            self.api, target_day_id=recreated_day, target_date=today,
        )
        self.assertRegex(result, r"[1-9][0-9]* branch\(es\) restored")
        self.assertIn(recreated_day, self.api.get_note(task)["parentNoteIds"])
        self.assertIn(
            task,
            {item["noteId"] for item in self.api.search(
                next(saved.search for saved in SAVED_SEARCHES if saved.marker == "openTasks")
            )},
        )

        before = self.api.get_note(task)["parentNoteIds"]
        self.assertIn("0 branch(es) restored", restore_today_branches(
            self.api, target_day_id=recreated_day, target_date=today,
        ))
        self.assertEqual(before, self.api.get_note(task)["parentNoteIds"])


@unittest.skipIf(API is None, "no Trilium instance reachable")
class ScriptTest(ExtensionTestCase):
    def test_script_implementation_notes_are_hidden_from_tree(self):
        scripts_root = self.api.find_by_label("scriptRoot")
        self.assertIn("_userHidden", self.api.get_note(scripts_root)["parentNoteIds"])
        owned = {
            a["name"] for a in self.api.get_note(scripts_root)["attributes"]
            if a["noteId"] == scripts_root and a["type"] == "label"
        }
        self.assertIn("subtreeHidden", owned)

        # The nested dashboard script must remain under its HTML parent even
        # though both implementation notes are hidden in the tree.
        parents = {"": scripts_root}
        for script in SCRIPTS:
            parent_id = parents.get(script.parent_marker or "")
            self.assertIsNotNone(parent_id)
            note_id = find_script(self.api, parent_id, script.marker)
            self.assertIsNotNone(note_id)
            parents[script.marker] = note_id

    def test_launchers_use_current_backend_api(self):
        source = (TOOLS.parent / "src" / "note-buttons.frontend.js").read_text()
        self.assertIn("createOrUpdateLauncher", source)
        self.assertNotIn("api.addButtonToToolbar", source)

        story_source = (TOOLS.parent / "src" / "note-launcher.frontend.js").read_text()
        self.assertIn("startStory", story_source)
        self.assertIn("chooseScratchProject", story_source)
        buttons_source = (TOOLS.parent / "src" / "note-buttons.frontend.js").read_text()
        self.assertIn("newEdit", buttons_source)
        self.assertIn("newScratch", buttons_source)
        self.assertIn("setRelation('script'", buttons_source)
        dashboard_source = (TOOLS.parent / "src" / "project-hub-dashboard.frontend.js").read_text()
        self.assertIn("Round ${roundDefaults.nextRound}", dashboard_source)
        self.assertIn("nextAction", dashboard_source)
        self.assertIn("modifiedAt", dashboard_source)
        self.assertIn("hubStatus", dashboard_source)
        self.assertIn("archiveProject", dashboard_source)
        self.assertIn("reopenProject", dashboard_source)
        today_source = (TOOLS.parent / "src" / "today-dashboard.frontend.js").read_text()
        self.assertIn("EMPTY_WIDGET_ACTIONS", today_source)
        self.assertIn("today-empty-action", (TOOLS.parent / "src" / "today-dashboard.frontend.js").read_text())
        self.assertIn("nativeInclude.style.display", today_source)
        self.assertIn("api.dayjs(note.dateCreated)", today_source)
        self.assertIn("refreshTodayHealth", today_source)
        self.assertIn("Repair today’s Journal branches", today_source)
        self.assertIn("project-hub-dashboard", dashboard_source)
        self.assertIn("return null", dashboard_source)
        self.assertIn("Mark Project Complete", (TOOLS.parent / "src" / "project-hub-dashboard.html").read_text())
        project_html = (TOOLS.parent / "src" / "project-hub-dashboard.html").read_text()
        self.assertIn("Archive Project", project_html)
        self.assertIn("Reopen Project", project_html)
        self.assertIn("extTemplate', 'storyDraft", buttons_source)
        self.assertIn("New Round", buttons_source)
        self.assertIn("Mark Awaiting Reply", buttons_source)
        self.assertNotIn("Mark Returned", buttons_source)
        self.assertIn("Mark Project Complete", buttons_source)
        self.assertIn("archiveProject", buttons_source)
        self.assertIn("reopenProject", buttons_source)
        self.assertIn("extReportingTitleManaged", (TOOLS.parent / "src" / "project-metadata-sync.backend.js").read_text())
        self.assertIn("createEntity", buttons_source)
        self.assertIn("New Client", buttons_source)
        self.assertIn("chooseEntityType", buttons_source)
        topics_source = (TOOLS.parent / "src" / "topics.frontend.js").read_text()
        self.assertIn("addRelation('topic'", topics_source)
        self.assertIn("removeRelation('topic'", topics_source)
        self.assertIn("derivedTopic", topics_source)
        self.assertIn("Hashtag suggestions", topics_source)
        self.assertIn("topicRoot", topics_source)
        self.assertIn("Keep explicit", topics_source)
        self.assertIn("topicSourceTitles", topics_source)
        self.assertIn("aliasOf", topics_source)
        self.assertIn("canonicalTopicId", topics_source)
        self.assertIn("Selected", topics_source)
        self.assertIn("Related — not yet explicit", topics_source)
        self.assertIn("Search topics or aliases", topics_source)
        self.assertIn("Save topics (", topics_source)
        self.assertIn("Create & select", topics_source)
        self.assertIn("Recognized hashtags", topics_source)
        self.assertIn("renderTopicSummary", topics_source)
        self.assertIn("Remove", topics_source)
        self.assertIn("Related through", topics_source)
        self.assertIn("showTopicPopover", topics_source)
        self.assertIn("Open Topic", topics_source)
        self.assertIn("Aliases:", topics_source)
        self.assertIn("dismissTopicPopover", topics_source)
        self.assertIn("Keep explicit", topics_source)
        self.assertIn("Could not keep topic explicit", topics_source)
        self.assertIn("Ctrl/Cmd+Shift+T", topics_source)
        self.assertIn("Discard unsaved Topic changes", topics_source)
        self.assertIn("ArrowDown", topics_source)
        self.assertIn("aria-labelledby", topics_source)
        self.assertIn("calc(100vw - 1rem)", topics_source)
        index_source = (TOOLS.parent / "src" / "topic-index.frontend.js").read_text()
        self.assertIn("Topic index", index_source)
        self.assertIn("explicitCount", index_source)
        self.assertIn("derivedCount", index_source)
        self.assertIn("api.activateNote", index_source)
        self.assertIn("Rename", index_source)
        self.assertIn("Merge", index_source)
        self.assertIn("deleteNote", index_source)
        self.assertIn("Alias", index_source)
        self.assertIn("aliasOf", index_source)
        self.assertIn("newTopic", buttons_source)
        self.assertIn("launcherTopic", (TOOLS.parent / "tools" / "apply_scripts.py").read_text())
        association_source = (TOOLS.parent / "src" / "topic-association-sync.backend.js").read_text()
        self.assertIn("derivedTopic", association_source)
        self.assertIn("companyOnBehalf", association_source)
        self.assertIn("getTargetRelations", association_source)
        self.assertIn("canonicalTopicId", association_source)
        self.assertIn("aliasOf", association_source)
        metadata_source = (TOOLS.parent / "src" / "project-metadata-sync.backend.js").read_text()
        self.assertIn("canonicalTopicId", metadata_source)
        self.assertIn("reporting-note-actions-placeholder", buttons_source)
        self.assertIn("New Meeting", buttons_source)
        self.assertIn("extension-project-breadcrumbs", buttons_source)
        self.assertIn("Project Dashboard", buttons_source)
        self.assertIn("projectRootId", buttons_source)
        self.assertIn("hub-status-badge", (TOOLS.parent / "src" / "project-hub-dashboard.frontend.js").read_text())
        self.assertIn("visually-hidden", (TOOLS.parent / "src" / "project-hub-dashboard.frontend.js").read_text())
        self.assertIn("hub-status-awaiting", (TOOLS.parent / "src" / "project-hub-dashboard.html").read_text())
        filter_source = (TOOLS.parent / "src" / "dashboard-filters.frontend.js").read_text()
        self.assertIn("Dashboard filters", filter_source)
        self.assertIn("dashboardFilterTime", filter_source)
        self.assertIn("~project.title", filter_source)
        self.assertIn("~writer.title", filter_source)
        self.assertIn("No notes match these filters", filter_source)
        self.assertIn("Unavailable widgets", filter_source)
        self.assertIn("Collapse widgets", (TOOLS.parent / "src" / "dashboard-filters.html").read_text())
        self.assertIn("Expand widgets", (TOOLS.parent / "src" / "dashboard-filters.html").read_text())
        self.assertIn("Reset layout", (TOOLS.parent / "src" / "dashboard-filters.html").read_text())
        self.assertIn("dashboard.json", filter_source)
        self.assertIn("getAttachments", filter_source)
        self.assertIn("setContent", filter_source)
        today_source = (TOOLS.parent / "src" / "today-dashboard.frontend.js").read_text()
        self.assertIn("getTodayNote", today_source)
        self.assertIn("today-open-note", today_source)
        self.assertIn("openSplitWithNote", today_source)
        self.assertIn("setNote(today.noteId)", today_source)
        self.assertIn("loadSearchWidgets", today_source)
        self.assertIn("daily-open-tasks-widget", today_source)
        self.assertIn("repairTodayBranches", today_source)
        self.assertIn("getContentElement", today_source)
        self.assertIn("relationTarget", today_source)
        self.assertIn("TODAY_SPLIT_STORAGE_KEY", today_source)
        self.assertIn("setJournalWidth", today_source)
        self.assertIn("bindSplitGutter", today_source)
        self.assertIn("splitWidthTimers", today_source)
        self.assertIn("Save even when the Journal split has not been opened yet", today_source)
        today_markup = (TOOLS.parent / "src" / "today-dashboard.html").read_text()
        self.assertIn('class="today-layout"', today_markup)
        self.assertIn('class="today-health"', today_markup)
        self.assertIn("Open project:", today_source)
        self.assertIn("openTabWithNote(row.noteId, true)", today_source)
        self.assertIn("openTabWithNote(row.project.noteId, true)", today_source)
        repair_source = (TOOLS / "repair.py").read_text()
        self.assertIn("apply_skeleton.main", repair_source)
        self.assertIn("apply_templates.main", repair_source)
        self.assertIn("apply_scripts.main", repair_source)
        self.assertIn("apply_collections.main", repair_source)
        self.assertIn("No user notes were deleted", repair_source)
        migration_source = (TOOLS / "migration_log.py").read_text()
        self.assertIn("extMigrationLog", migration_source)
        self.assertIn("preserved", migration_source)
        self.assertIn("datetime.now", migration_source)
        self.assertIn("target_day_id", (TOOLS.parent / "tools" / "apply_collections.py").read_text())
        backup_doc = (TOOLS.parent / "BACKUP_ROLLBACK.md").read_text()
        for required in (
            "Settings → Backup",
            "export_package.py",
            "repair.py",
            "uninstall.py",
            "restore",
            "EXTENSION_SECRET",
        ):
            with self.subTest(backup_section=required):
                self.assertIn(required, backup_doc)
        self.assertIn("include-note", (TOOLS.parent / "tools" / "apply_templates.py").read_text())
        repair_source = (TOOLS.parent / "src" / "daily-note-repair.backend.js").read_text()
        self.assertIn("ensureNoteIsPresentInParent", repair_source)
        self.assertIn("api.dayjs(note.dateCreated)", repair_source)
        for action in (
            "projectHub", "scratch", "meeting", "task", "story", "edit",
            "email", "person", "organization", "topic",
        ):
            with self.subTest(action=action):
                self.assertIn(f'data-today-action="{action}"',
                              (TOOLS.parent / "src" / "today-dashboard.html").read_text())
        self.assertIn("New Org", (TOOLS.parent / "src" / "today-dashboard.html").read_text())
        today_html = (TOOLS.parent / "src" / "today-dashboard.html").read_text()
        self.assertIn("today-journal-width", today_html)
        self.assertIn("today-reset-split", today_html)
        for marker in (
            "activeProjects", "recentlyTouched", "openDrafts", "overdue", "dueSoon", "followUpsDue",
            "awaitingReplies", "highPriority", "openEmails",
        ):
            with self.subTest(widget=marker):
                self.assertIn(f'data-today-widget="{marker}"', today_html)

    def test_installed_launchers_have_current_script_targets(self):
        expected = {
            "newMeeting", "newStory", "newEdit", "newScratch", "newEmail",
            "newTask", "newProjectHub", "newPerson", "newOrganization",
        }
        ordered_titles = [
            "New Project Hub", "New Scratch", "New Meeting", "New Task",
            "New Story", "New Edit", "New Email", "New Person", "New Organization",
        ]
        visible = self.api.get_note("_lbVisibleLaunchers")
        extension_titles = [
            self.api.get_note(note_id)["title"]
            for note_id in sorted(
                (
                    note_id for note_id in visible["childNoteIds"]
                    if note_id in {f"al_{launcher_id}" for launcher_id in expected}
                ),
                key=lambda note_id: next(
                    self.api.get_branch(branch_id).get("notePosition", 0)
                    for branch_id in self.api.get_note(note_id).get("parentBranchIds", [])
                    if self.api.get_branch(branch_id).get("parentNoteId") == "_lbVisibleLaunchers"
                ),
            )
        ]
        self.assertEqual(extension_titles, ordered_titles)
        for launcher_id in expected:
            with self.subTest(launcher=launcher_id):
                note = self.api.get_note(f"al_{launcher_id}")
                relation = next(
                    a for a in note["attributes"]
                    if a.get("noteId") == note["noteId"]
                    and a.get("type") == "relation"
                    and a.get("name") == "script"
                )
                self.assertEqual(self.api.get_note(relation["value"])["type"], "code")
                self.assertEqual(note["mime"], "application/javascript;env=frontend")
                labels = {
                    a.get("name") for a in note["attributes"]
                    if a.get("noteId") == note["noteId"]
                }
                self.assertIn("scriptInLauncherContent", labels)

    def test_journal_repair_hook_covers_the_calendar_subtree(self):
        journal = self.api.find_by_label("calendarRoot")
        attributes = self.api.get_note(journal)["attributes"]
        relations = {
            a.get("name"): a for a in attributes
            if a.get("noteId") == journal
            and a.get("type") == "relation"
            and a.get("name") in {"runOnNoteCreation", "runOnNoteChange"}
        }
        self.assertEqual(set(relations), {"runOnNoteCreation", "runOnNoteChange"})
        self.assertTrue(all(a.get("isInheritable") for a in relations.values()))
        self.assertFalse(any(
            a.get("name") == "runOnChildNoteCreation"
            for a in attributes
        ))

    def test_project_metadata_sync_hook_covers_projects_subtree(self):
        project_root = self.api.find_by_label("projectRoot")
        attributes = self.api.get_note(project_root)["attributes"]
        relations = {
            a.get("name"): a for a in attributes
            if a.get("noteId") == project_root
            and a.get("type") == "relation"
            and a.get("name") in {"runOnAttributeCreation", "runOnAttributeChange"}
            and self.api.get_note(a.get("value"))["title"] == "Project Metadata Sync"
        }
        self.assertEqual(set(relations), {"runOnAttributeCreation", "runOnAttributeChange"})
        self.assertTrue(all(a.get("isInheritable") for a in relations.values()))

        note_change = next(
            a for a in attributes
            if a.get("noteId") == project_root
            and a.get("type") == "relation"
            and a.get("name") == "runOnNoteChange"
            and self.api.get_note(a.get("value"))["title"] == "Project Metadata Sync"
        )
        self.assertTrue(note_change.get("isInheritable"))


class SavedSearchTest(ExtensionTestCase):
    def test_every_saved_search_query_is_valid(self):
        """A malformed query raises rather than silently returning nothing."""
        for saved in SAVED_SEARCHES:
            with self.subTest(search=saved.title):
                self.api.search(saved.search)

    def test_due_soon_excludes_far_future_and_completed(self):
        today = date.today().isoformat()
        near = self.make_note("taskRoot", "near", "task")
        self.api.set_label(near, "dueDate", today)
        far = self.make_note("taskRoot", "far", "task")
        self.api.set_label(far, "dueDate", "2099-01-01")
        done = self.make_note("taskRoot", "done", "task")
        self.api.set_label(done, "dueDate", today)
        self.api.set_label(done, "doneDate", (date.today() - timedelta(days=1)).isoformat())

        query = next(s for s in SAVED_SEARCHES if s.marker == "dueSoon").search
        found = {r["noteId"] for r in self.api.search(query)}
        self.assertIn(near, found)
        self.assertNotIn(far, found)
        self.assertNotIn(done, found, "completed tasks must not appear in Due Soon")

    def test_overdue_finds_past_unfinished_tasks(self):
        today = date.today()
        overdue = self.make_note("taskRoot", "overdue", "task")
        self.api.set_label(overdue, "dueDate", (today - timedelta(days=1)).isoformat())
        today = self.make_note("taskRoot", "today", "task")
        self.api.set_label(today, "dueDate", date.today().isoformat())
        done = self.make_note("taskRoot", "completed overdue", "task")
        self.api.set_label(done, "dueDate", (date.today() - timedelta(days=1)).isoformat())
        self.api.set_label(done, "doneDate", date.today().isoformat())

        query = next(s for s in SAVED_SEARCHES if s.marker == "overdue").search
        found = {r["noteId"] for r in self.api.search(query)}
        self.assertIn(overdue, found)
        self.assertNotIn(today, found)
        self.assertNotIn(done, found)

    def test_recently_touched_finds_current_extension_notes(self):
        note_id = self.make_note("unassignedRoot", "recently touched", "storyDraft")
        query = next(s for s in SAVED_SEARCHES if s.marker == "recentlyTouched").search
        self.assertIn(note_id, {r["noteId"] for r in self.api.search(query)})

    def test_editorial_follow_up_searches_find_waiting_story(self):
        story = self.make_note("unassignedRoot", "awaiting reply", "storyDraft")
        self.api.set_label(story, "status", "awaiting")
        self.api.set_label(story, "followUpDate", "2026-07-30")

        awaiting = next(s for s in SAVED_SEARCHES if s.marker == "awaitingReplies")
        follow_up = next(s for s in SAVED_SEARCHES if s.marker == "followUpsDue")
        self.assertIn(story, {n["noteId"] for n in self.api.search(awaiting.search)})
        self.assertIn(story, {n["noteId"] for n in self.api.search(follow_up.search)})


@unittest.skipIf(API is None, "no Trilium instance reachable")
class CreateNoteHandlerTest(ExtensionTestCase):
    """The endpoint the launcher buttons call."""

    def post(self, body: dict, secret: str | None = "valid") -> tuple[int, dict]:
        headers = {"Content-Type": "application/json"}
        if secret == "valid":
            config_id = self.api.find_by_label("extConfig")
            config = self.api.get_note(config_id)
            headers["x-extension-secret"] = next(
                (
                    attribute.get("value", "")
                    for attribute in config.get("attributes", [])
                    if attribute.get("noteId") == config_id
                    and attribute.get("name") == "createNoteSecret"
                ),
                "",
            )
        elif secret is not None:
            headers["x-extension-secret"] = secret

        request = urllib.request.Request(
            f"{self.api.url}/custom/create-note",
            data=json.dumps(body).encode(),
            method="POST",
            headers=headers,
        )
        try:
            with urllib.request.urlopen(request) as response:
                return response.status, json.load(response)
        except urllib.error.HTTPError as error:
            with error:
                return error.code, json.loads(error.read() or b"{}")

    def test_rejects_missing_secret(self):
        status, _ = self.post({"type": "task", "title": f"{self.prefix}nope"}, secret=None)
        self.assertEqual(status, 401)
        self.assertEqual(self.api.search(f'note.title = "{self.prefix}nope"'), [])

    def test_rejects_wrong_secret(self):
        status, _ = self.post({"type": "task", "title": f"{self.prefix}nope"}, secret="bad")
        self.assertEqual(status, 401)

    def test_rejects_unknown_type_and_missing_title(self):
        self.assertEqual(self.post({"type": "bogus", "title": "x"})[0], 400)
        self.assertEqual(self.post({"type": "task", "title": "   "})[0], 400)

    def test_rejects_invalid_mode_project_and_round_without_creating(self):
        title = f"{self.prefix}invalid mode"
        self.assertEqual(self.post({
            "action": "startStory", "title": title, "mode": "other",
        })[0], 400)
        self.assertEqual(self.api.search(f'note.title = "{title}"'), [])

        self.assertEqual(self.post({
            "type": "story", "title": f"{self.prefix}bad project",
            "projectId": "does-not-exist",
        })[0], 400)
        self.assertEqual(self.post({
            "type": "story", "title": f"{self.prefix}bad round",
            "round": 0,
        })[0], 400)

    def test_rejects_invalid_editorial_action_fields(self):
        status, story = self.post({"type": "story", "title": f"{self.prefix}validation"})
        self.assertEqual(status, 200)
        self.created.append(story["noteId"])

        for body in (
            {"action": "unknown", "noteId": story["noteId"]},
            {"action": "awaiting", "noteId": story["noteId"], "followUpDate": "2026-02-30", "waitingOn": "writer"},
            {"action": "awaiting", "noteId": story["noteId"], "followUpDate": "2026-08-05"},
        ):
            with self.subTest(body=body):
                self.assertEqual(self.post(body)[0], 400)

        self.assertEqual(self.post({
            "action": "complete", "noteId": "not-a-note",
        })[0], 400)

    def test_custom_template_content_survives_reapply(self):
        templates_root = self.api.find_by_label("templateRoot")
        template = next(t for t in TEMPLATES if t.marker == "task")
        template_id = find_template(self.api, templates_root, "task")
        original = self.api.get_content(template_id)
        custom = f"<h2>{self.prefix} custom section</h2><p>Keep this.</p>"
        try:
            self.api.set_content(template_id, custom)
            apply_template(self.api, templates_root, template)
            self.assertEqual(self.api.get_content(template_id), custom)
        finally:
            self.api.set_content(template_id, original)

    def test_concurrent_round_creation_gets_unique_numbers(self):
        status, hub = self.post({
            "type": "projectHub", "title": f"{self.prefix}concurrent hub", "kind": "edit",
        })
        self.assertEqual(status, 200)
        self.created.extend([hub["noteId"], hub["dashboardNoteId"]])
        self.assertIn(
            self.api.find_by_label("activeProjectRoot"),
            self.api.get_note(hub["noteId"])["parentNoteIds"],
        )

        def create_round(index: int):
            return self.post({
                "type": "story",
                "title": f"{self.prefix}concurrent round {index}",
                "projectId": hub["noteId"],
            })

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(create_round, (1, 2)))
        self.assertEqual([status for status, _ in results], [200, 200])
        self.created.extend(payload["noteId"] for _, payload in results)
        rounds = [
            next(a["value"] for a in self.api.get_note(payload["noteId"])["attributes"]
                 if a["noteId"] == payload["noteId"] and a["name"] == "round")
            for _, payload in results
        ]
        self.assertEqual(sorted(rounds), ["1", "2"])

    def test_creates_note_from_template_and_clones_into_day_note(self):
        status, payload = self.post({"type": "meeting", "title": f"{self.prefix}briefing"})
        self.assertEqual(status, 200)
        self.created.append(payload["noteId"])

        note = self.api.get_note(payload["noteId"])
        parents = {self.api.get_note(p)["title"] for p in note["parentNoteIds"]}
        self.assertIn("Unassigned", parents)
        self.assertEqual(len(note["parentNoteIds"]), 2,
                         "note should live under both its container and the day note")
        self.assertIn(payload["dayNoteId"], note["parentNoteIds"])

    def test_creates_untemplated_scratch_note(self):
        status, payload = self.post({
            "action": "scratch", "title": f"{self.prefix}scratch",
        })
        self.assertEqual(status, 200)
        self.created.append(payload["noteId"])
        note = self.api.get_note(payload["noteId"])
        owned = [a for a in note["attributes"] if a["noteId"] == payload["noteId"]]
        self.assertFalse(
            any(a["type"] == "relation" and a["name"] == "template" for a in owned)
        )
        self.assertIn(self.api.find_by_label("unassignedRoot"), note["parentNoteIds"])
        self.assertIn(payload["dayNoteId"], note["parentNoteIds"])

    def test_projectable_notes_live_under_hub_or_unassigned(self):
        status, hub = self.post({
            "type": "projectHub", "title": f"{self.prefix}storage hub",
        })
        self.assertEqual(status, 200)
        self.created.extend([hub["noteId"], hub["dashboardNoteId"]])

        status, meeting = self.post({
            "type": "meeting", "title": f"{self.prefix}hub meeting",
            "projectId": hub["noteId"],
        })
        self.assertEqual(status, 200)
        self.created.append(meeting["noteId"])
        self.assertIn(hub["noteId"], self.api.get_note(meeting["noteId"])["parentNoteIds"])

        status, email = self.post({
            "type": "email", "title": f"{self.prefix}unassigned email",
        })
        self.assertEqual(status, 200)
        self.created.append(email["noteId"])
        unassigned = self.api.find_by_label("unassignedRoot")
        self.assertIn(unassigned, self.api.get_note(email["noteId"])["parentNoteIds"])

    def test_project_hub_is_not_cloned_into_the_day_note(self):
        """Hubs are dateless; filing one under a day would misrepresent them."""
        status, payload = self.post({"type": "projectHub", "title": f"{self.prefix}hub"})
        self.assertEqual(status, 200)
        self.created.append(payload["noteId"])
        self.created.append(payload["dashboardNoteId"])
        self.assertIsNone(payload["dayNoteId"])
        self.assertEqual(len(self.api.get_note(payload["noteId"])["parentNoteIds"]), 1)
        dashboard = self.api.get_note(payload["dashboardNoteId"])
        self.assertEqual(dashboard["type"], "render")
        self.assertIn(
            "bx bx-book",
            {
                a.get("value") for a in self.api.get_note(payload["noteId"])["attributes"]
                if a.get("noteId") == payload["noteId"] and a.get("name") == "iconClass"
            },
        )
        self.assertIn(
            "renderNote",
            {a["name"] for a in dashboard["attributes"] if a["type"] == "relation"},
        )

    def test_project_area_actions_move_hub_from_hub_or_round(self):
        hub_status, hub = self.post({
            "type": "projectHub",
            "title": f"{self.prefix}area hub",
            "kind": "edit",
        })
        self.assertEqual(hub_status, 200)
        self.created.extend([hub["noteId"], hub["dashboardNoteId"]])
        round_status, round_note = self.post({
            "type": "story",
            "title": f"{self.prefix}area round",
            "projectId": hub["noteId"],
        })
        self.assertEqual(round_status, 200)
        self.created.append(round_note["noteId"])

        archive_status, archive_payload = self.post({
            "action": "archiveProject",
            "noteId": hub["noteId"],
        })
        self.assertEqual(archive_status, 200)
        self.assertEqual(archive_payload["area"], "archive")
        archived_parents = self.api.get_note(hub["noteId"])["parentNoteIds"]
        self.assertIn(self.api.find_by_label("archiveProjectRoot"), archived_parents)
        self.assertNotIn(self.api.find_by_label("activeProjectRoot"), archived_parents)
        self.assertEqual(
            next(a["value"] for a in self.api.get_note(hub["noteId"])["attributes"]
                 if a.get("noteId") == hub["noteId"] and a.get("name") == "status"),
            "active",
            "archiving is separate from completing the project",
        )

        reopen_status, reopen_payload = self.post({
            "action": "reopenProject",
            "noteId": round_note["noteId"],
        })
        self.assertEqual(reopen_status, 200)
        self.assertEqual(reopen_payload["area"], "active")
        active_parents = self.api.get_note(hub["noteId"])["parentNoteIds"]
        self.assertIn(self.api.find_by_label("activeProjectRoot"), active_parents)
        self.assertNotIn(self.api.find_by_label("archiveProjectRoot"), active_parents)
        self.assertEqual(reopen_payload["status"], "active")

    def test_create_organization_from_relation_field_links_it(self):
        story_status, story = self.post({
            "type": "story",
            "title": f"{self.prefix}organization relation",
        })
        self.assertEqual(story_status, 200)
        self.created.append(story["noteId"])

        organization_status, organization = self.post({
            "action": "createOrganization",
            "noteId": story["noteId"],
            "relationName": "client",
            "title": f"{self.prefix}new client organization",
        })
        self.assertEqual(organization_status, 200)
        self.created.append(organization["organizationId"])
        self.assertEqual(organization["relationName"], "client")
        self.assertIn(
            self.api.find_by_label("orgRoot"),
            self.api.get_note(organization["organizationId"])["parentNoteIds"],
        )
        self.assertIn(
            ("client", organization["organizationId"]),
            {
                (a["name"], a.get("value"))
                for a in self.api.get_note(story["noteId"])["attributes"]
                if a.get("noteId") == story["noteId"] and a.get("type") == "relation"
            },
        )
        invalid_status, _ = self.post({
            "action": "createOrganization",
            "noteId": story["noteId"],
            "relationName": "notAField",
            "title": f"{self.prefix}invalid organization",
        })
        self.assertEqual(invalid_status, 400)

    def test_create_client_can_be_person_or_organization_and_stays_project_linked(self):
        status, started = self.post({
            "action": "startStory",
            "title": f"{self.prefix}entity choice",
            "mode": "project",
        })
        self.assertEqual(status, 200)
        self.created.extend([
            started["hubId"], started["dashboardNoteId"], started["noteId"],
            started["reportingNoteId"],
        ])
        self.assertEqual(
            self.api.get_note(started["reportingNoteId"])["title"],
            f"{self.api.get_note(started['hubId'])['title']} — Reporting Notes",
        )

        hub_client = self.make_note("orgRoot", "hub-origin client")
        self.api.set_relation(started["hubId"], "client", hub_client)
        sync_status, _ = self.post({"action": "syncHub", "hubId": started["hubId"]})
        self.assertEqual(sync_status, 200)
        for note_id in (started["noteId"], started["reportingNoteId"]):
            self.assertIn(
                ("client", hub_client),
                {(a["name"], a.get("value")) for a in self.api.get_note(note_id)["attributes"]
                 if a.get("noteId") == note_id and a.get("type") == "relation"},
            )

        for entity_type in ("person", "organization"):
            status, payload = self.post({
                "action": "createEntity",
                "noteId": started["reportingNoteId"],
                "relationName": "client",
                "title": f"{self.prefix}{entity_type} client",
                "entityType": entity_type,
            })
            self.assertEqual(status, 200)
            entity_id = payload["entityId"]
            self.created.append(entity_id)
            entity = self.api.get_note(entity_id)
            self.assertIn(
                self.api.find_by_label("peopleRoot" if entity_type == "person" else "orgRoot"),
                entity["parentNoteIds"],
            )
            self.assertIn(
                ("project", started["hubId"]),
                {(a["name"], a.get("value")) for a in entity["attributes"]
                 if a.get("noteId") == entity_id and a.get("type") == "relation"},
            )
            self.assertIn(
                ("client", entity_id),
                {(a["name"], a.get("value")) for a in self.api.get_note(started["reportingNoteId"])["attributes"]
                 if a.get("noteId") == started["reportingNoteId"] and a.get("type") == "relation"},
            )
            self.assertIn(
                ("client", entity_id),
                {(a["name"], a.get("value")) for a in self.api.get_note(started["hubId"])["attributes"]
                 if a.get("noteId") == started["hubId"] and a.get("type") == "relation"},
            )

    def test_edit_round_links_to_hub_and_increments_round(self):
        hub_status, hub_payload = self.post({
            "type": "projectHub",
            "title": f"{self.prefix}edit hub",
            "kind": "edit",
        })
        self.assertEqual(hub_status, 200)
        self.created.extend([hub_payload["noteId"], hub_payload["dashboardNoteId"]])
        self.assertIn(
            "bx bx-edit-alt",
            {
                a.get("value") for a in self.api.get_note(hub_payload["noteId"])["attributes"]
                if a.get("noteId") == hub_payload["noteId"] and a.get("name") == "iconClass"
            },
        )

        first_status, first = self.post({
            "type": "story",
            "title": f"{self.prefix}round one",
            "projectId": hub_payload["noteId"],
            "status": "editing",
        })
        second_status, second = self.post({
            "type": "story",
            "title": f"{self.prefix}round two",
            "projectId": hub_payload["noteId"],
            "status": "awaiting",
        })
        self.assertEqual(first_status, 200)
        self.assertEqual(second_status, 200)
        self.created.extend([first["noteId"], second["noteId"]])

        first_note = self.api.get_note(first["noteId"])
        second_note = self.api.get_note(second["noteId"])
        for note, expected_round, expected_status in (
            (first_note, "1", "editing"),
            (second_note, "2", "awaiting"),
        ):
            relations = {
                a.get("value") for a in note["attributes"]
                if a["type"] == "relation" and a["name"] == "project"
            }
            self.assertIn(hub_payload["noteId"], relations)
            owned = {
                a["name"]: a.get("value")
                for a in note["attributes"]
                if a["noteId"] == note["noteId"]
            }
            self.assertEqual(owned["round"], expected_round)
            self.assertEqual(owned["status"], expected_status)
        self.assertTrue(first_note["title"].endswith("— Round 1"))
        self.assertTrue(second_note["title"].endswith("— Round 2"))
        hub_owned = {
            a["name"]: a.get("value")
            for a in self.api.get_note(hub_payload["noteId"])["attributes"]
            if a["noteId"] == hub_payload["noteId"]
        }
        self.assertEqual(hub_owned["currentRound"], "2")

        marked_status, marked = self.post({
            "type": "story",
            "title": f"{self.prefix}explicit v1",
            "projectId": hub_payload["noteId"],
        })
        self.assertEqual(marked_status, 200)
        self.created.append(marked["noteId"])
        self.assertEqual(marked["title"], f"{self.prefix}explicit v1")

    def test_start_story_creates_project_or_edit_hub(self):
        for mode, expected_status in (("project", "drafting"), ("edit", "editing")):
            status, payload = self.post({
                "action": "startStory",
                "title": f"{self.prefix}{mode} story",
                "mode": mode,
            })
            self.assertEqual(status, 200)
            self.created.extend([payload["hubId"], payload["dashboardNoteId"], payload["noteId"]])
            hub = self.api.get_note(payload["hubId"])
            story = self.api.get_note(payload["noteId"])
            hub_owned = {
                a["name"]: a.get("value") for a in hub["attributes"]
                if a["noteId"] == hub["noteId"]
            }
            story_owned = {
                a["name"]: a.get("value") for a in story["attributes"]
                if a["noteId"] == story["noteId"]
            }
            self.assertEqual(hub_owned["kind"], mode)
            self.assertEqual(story_owned["status"], expected_status)
            self.assertEqual(story_owned["round"], "1")
            if mode == "edit":
                self.assertTrue(story["title"].endswith("— Round 1"))
                self.assertIsNone(payload.get("reportingNoteId"))
            else:
                self.assertTrue(story["title"].endswith("— Draft 1"))
                self.assertIsNotNone(payload.get("reportingNoteId"))
                self.created.append(payload["reportingNoteId"])
            content = self.api.get_content(payload["noteId"])
            if mode == "project":
                self.assertIn("STORYBODY", content)
                self.assertNotIn("REPORTING NOTES", content)
                self.assertNotIn("WRITER RESPONSE", content)
                reporting = self.api.get_note(payload["reportingNoteId"])
                reporting_content = self.api.get_content(reporting["noteId"])
                for heading in ("LINKS", "OPEN QUESTIONS", "IDEA / ANGLE", "REPORTING NOTES"):
                    self.assertIn(heading, reporting_content)
                self.assertIn(
                    ("project", payload["hubId"]),
                    {(a["name"], a.get("value")) for a in reporting["attributes"]
                     if a.get("noteId") == reporting["noteId"] and a.get("type") == "relation"},
                )
            else:
                self.assertIn("EDITORIAL NOTES", content)
                self.assertIn("WRITER RESPONSE", content)

    def test_round_metadata_rolls_up_to_hub(self):
        organization = self.make_note("orgRoot", "rollup client")
        behalf = self.make_note("orgRoot", "rollup company")
        hub_status, hub = self.post({
            "type": "projectHub", "title": f"{self.prefix}rollup hub", "kind": "edit",
        })
        self.assertEqual(hub_status, 200)
        self.created.extend([hub["noteId"], hub["dashboardNoteId"]])
        story_status, story = self.post({
            "type": "story", "title": f"{self.prefix}rollup round",
            "projectId": hub["noteId"],
        })
        self.assertEqual(story_status, 200)
        self.created.append(story["noteId"])
        self.api.set_relation(story["noteId"], "client", organization)
        self.api.set_relation(story["noteId"], "companyOnBehalf", behalf)

        status, _ = self.post({"action": "syncHub", "hubId": hub["noteId"]})
        self.assertEqual(status, 200)
        hub_note = self.api.get_note(hub["noteId"])
        relations = {
            (a["name"], a.get("value"))
            for a in hub_note["attributes"]
            if a["noteId"] == hub["noteId"] and a["type"] == "relation"
        }
        self.assertIn(("client", organization), relations)
        self.assertIn(("companyOnBehalf", behalf), relations)

    def test_editorial_state_actions_update_round(self):
        hub_status, hub_payload = self.post({
            "type": "projectHub",
            "title": f"{self.prefix}state hub",
            "kind": "edit",
        })
        self.assertEqual(hub_status, 200)
        self.created.extend([hub_payload["noteId"], hub_payload["dashboardNoteId"]])
        status, story = self.post({
            "type": "story",
            "title": f"{self.prefix}state round",
            "projectId": hub_payload["noteId"],
        })
        self.assertEqual(status, 200)
        self.created.append(story["noteId"])

        status, _ = self.post({
            "action": "awaiting",
            "noteId": story["noteId"],
            "waitingOn": "writer",
            "followUpDate": "2026-08-05",
        })
        self.assertEqual(status, 200)
        note = self.api.get_note(story["noteId"])
        owned = {
            a["name"]: a.get("value") for a in note["attributes"]
            if a["noteId"] == note["noteId"]
        }
        self.assertEqual(owned["status"], "awaiting")
        self.assertEqual(owned["waitingOn"], "writer")
        self.assertEqual(owned["followUpDate"], "2026-08-05")
        self.assertTrue(owned["lastSentDate"])

        status, _ = self.post({"action": "returned", "noteId": story["noteId"]})
        self.assertEqual(status, 200)
        status, _ = self.post({"action": "complete", "noteId": story["noteId"]})
        self.assertEqual(status, 200)
        owned = {
            a["name"]: a.get("value") for a in self.api.get_note(story["noteId"])["attributes"]
            if a["noteId"] == story["noteId"]
        }
        self.assertEqual(owned["status"], "done")
        self.assertTrue(owned["doneDate"])
        hub_owned = {
            a["name"]: a.get("value")
            for a in self.api.get_note(hub_payload["noteId"])["attributes"]
            if a["noteId"] == hub_payload["noteId"]
        }
        self.assertEqual(hub_owned["status"], "complete")

        reopened_status, reopened = self.post({
            "type": "story",
            "title": f"{self.prefix}reopened round",
            "projectId": hub_payload["noteId"],
        })
        self.assertEqual(reopened_status, 200)
        self.created.append(reopened["noteId"])
        hub_owned = {
            a["name"]: a.get("value")
            for a in self.api.get_note(hub_payload["noteId"])["attributes"]
            if a["noteId"] == hub_payload["noteId"]
        }
        self.assertEqual(hub_owned["status"], "active")


@unittest.skipIf(API is None, "no Trilium instance reachable")
class PackageTest(ExtensionTestCase):
    """What export_package.py writes must be safe to hand to someone else."""

    EXPECTED = {
        "Templates", "Daily Note", "Task", "Project Task", "Meeting",
        "Meeting Prep", "Story Draft", "Reporting Notes", "Email Draft", "Person", "Organization", "Topic",
        "Project Hub", "Active", "Archive", "Dashboards", "Due Soon", "Task Calendar",
        "Meeting Calendar", "Open Tasks", "Upcoming Meetings", "Active Projects",
        "Drafts", "Emails", "High Priority", "Overdue", "Recently Touched",
        "Scripts", "Today Dashboard Markup", "Today Dashboard",
        "Daily Note Repair",
        "Project Hub Dashboard Markup", "Project Hub Dashboard",
        "Create Note API", "Note Creation Buttons",
        "Project Metadata Sync", "Topic Association Sync", "Topic Index",
        "New Meeting Launcher", "New Story Launcher", "New Edit Launcher",
        "New Scratch Launcher", "New Email Launcher",
        "New Task Launcher", "New Project Hub Launcher", "New Person Launcher",
        "New Organization Launcher", "New Topic Launcher", "Topic Controls",
        "Dashboard Filters Markup", "Dashboard Filters",
        "Awaiting Replies", "Follow-ups Due",
    }

    @classmethod
    def setUpClass(cls):
        import export_package
        cls.dist = export_package.DIST
        if export_package.main() != 0:
            raise unittest.SkipTest("export failed")

    def packaged_notes(self):
        """Yield (zip name, note dict) for every note in the package."""
        import zipfile
        for archive in sorted(self.dist.glob("*.zip")):
            with zipfile.ZipFile(archive) as zf:
                meta = json.loads(zf.read("!!!meta.json"))

            def walk(notes):
                for note in notes:
                    yield archive.name, note
                    yield from walk(note.get("children", []))

            yield from walk(meta["files"])

    def test_package_carries_no_secrets(self):
        """Regression: the handler secret used to live on the script notes, so
        it was exported into the zip -- and every install from that zip would
        then share one secret."""
        for archive, note in self.packaged_notes():
            for attribute in note.get("attributes", []):
                self.assertNotIn(
                    "secret", attribute["name"].lower(),
                    f"{archive} leaks #{attribute['name']} on {note.get('title')}",
                )

    def test_package_carries_no_user_content(self):
        """Regression: exporting content containers shipped whatever notes the
        source instance happened to hold, test fixtures included."""
        for archive, note in self.packaged_notes():
            title = note.get("title")
            if title is None:
                continue
            self.assertIn(
                title, self.EXPECTED,
                f"{archive} contains unexpected note {title!r} — content leaked into the package",
            )


if __name__ == "__main__":
    if API is None:
        print("No Trilium instance reachable — start it with:")
        print("  cd dev && docker compose up -d")
    unittest.main(verbosity=2)
