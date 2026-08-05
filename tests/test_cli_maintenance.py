"""Offline unit tests for cli_maintenance.py reconciliation & repair functions."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, call

TOOLS = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS))

import cli_maintenance as cli
from etapi import Etapi


class CliMaintenanceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.api = Etapi("http://example.test", "token")
        self.api.find_by_label = Mock()
        self.api.get_note = Mock()
        self.api.move_note = Mock()
        self.api.set_label = Mock()
        self.api.set_title = Mock()
        self.api.create_note = Mock()
        self.api.set_relation = Mock()
        self.api.search = Mock(return_value=[])
        self.api.ensure_note_is_present_in_parent = Mock(return_value=False)
        self.api.get_attachments = Mock(return_value=[])
        self.api.get_attachment_content = Mock(return_value="{}")
        self.api.create_attachment = Mock(return_value="att_1")
        self.api.set_attachment_content = Mock()
        self.api.get_content = Mock()
        self.api.set_content = Mock()


    def test_migrate_project_hubs_to_areas_moves_direct_children(self):
        self.api.find_by_label.side_effect = lambda marker: {
            "projectRoot": "proj_root",
            "activeProjectRoot": "active_root",
            "archiveProjectRoot": "archive_root",
            "unassignedRoot": "unassigned_root",
        }.get(marker)

        self.api.get_note.side_effect = lambda note_id: {
            "proj_root": {"childNoteIds": ["hub_1", "hub_2", "active_root", "archive_root"]},
            "hub_1": {
                "attributes": [{"noteId": "hub_1", "name": "extTemplate", "value": "projectHub"}, {"noteId": "hub_1", "name": "status", "value": "active"}]
            },
            "hub_2": {
                "attributes": [{"noteId": "hub_2", "name": "extTemplate", "value": "projectHub"}, {"noteId": "hub_2", "name": "status", "value": "complete"}]
            },
        }.get(note_id)

        moved = cli.migrate_project_hubs_to_areas(self.api)
        self.assertEqual(moved, 2)
        self.api.move_note.assert_has_calls([
            call("hub_1", "active_root"),
            call("hub_2", "archive_root"),
        ])

    def test_ensure_project_hub_icons_sets_correct_icon_class(self):
        self.api.find_by_label.return_value = "proj_root"
        self.api.get_note.side_effect = lambda note_id: {
            "proj_root": {"childNoteIds": ["hub_edit", "hub_proj"]},
            "hub_edit": {
                "attributes": [{"noteId": "hub_edit", "name": "extTemplate", "value": "projectHub"}, {"noteId": "hub_edit", "name": "kind", "value": "edit"}]
            },
            "hub_proj": {
                "attributes": [{"noteId": "hub_proj", "name": "extTemplate", "value": "projectHub"}, {"noteId": "hub_proj", "name": "kind", "value": "project"}]
            },
        }.get(note_id)

        updated = cli.ensure_project_hub_icons(self.api)
        self.assertEqual(updated, 2)
        self.api.set_label.assert_has_calls([
            call("hub_edit", "iconClass", "bx bx-edit-alt"),
            call("hub_edit", "extHubIcon", "edit"),
            call("hub_proj", "iconClass", "bx bx-book"),
            call("hub_proj", "extHubIcon", "project"),
        ], any_order=True)

    def test_ensure_project_reporting_notes_creates_missing_reporting_companion(self):
        self.api.find_by_label.side_effect = lambda marker: {
            "projectRoot": "proj_root",
            "templateRoot": "tpl_root",
        }.get(marker)

        self.api.get_note.side_effect = lambda note_id: {
            "proj_root": {"childNoteIds": ["hub_1"]},
            "tpl_root": {"childNoteIds": ["tpl_reporting"]},
            "tpl_reporting": {"attributes": [{"noteId": "tpl_reporting", "name": "extTemplate", "value": "reportingNotes"}]},
            "hub_1": {"title": "Acme Project", "childNoteIds": [], "attributes": [{"noteId": "hub_1", "name": "extTemplate", "value": "projectHub"}, {"noteId": "hub_1", "name": "kind", "value": "project"}]},
        }.get(note_id)

        self.api.create_note.return_value = "reporting_1"

        created = cli.ensure_project_reporting_notes(self.api)
        self.assertEqual(created, 1)
        self.api.create_note.assert_called_once_with(
            parent_note_id="hub_1",
            title="Acme Project — Reporting Notes",
            content=cli.ensure_project_reporting_notes.__doc__ and self.api.create_note.call_args.kwargs["content"],
        )

    def test_ensure_dashboard_layout_creates_attachment(self):
        self.api.find_by_label.return_value = "dash_root"
        self.api.get_attachments.return_value = []
        self.api.get_note.side_effect = lambda note_id: {
            "dash_root": {"childNoteIds": ["sv_due"]},
            "sv_due": {"attributes": [{"noteId": "sv_due", "name": "extView", "value": "dueSoon"}]},
        }.get(note_id)
        self.api.create_attachment = Mock(return_value="att_1")

        created = cli.ensure_dashboard_layout(self.api)
        self.assertTrue(created)
        self.api.create_attachment.assert_called_once()
        call_kwargs = self.api.create_attachment.call_args.kwargs
        self.assertEqual(call_kwargs["note_id"], "dash_root")
        self.assertEqual(call_kwargs["title"], "dashboard.json")

    def test_ensure_event_hooks_wires_relations(self):
        self.api.find_by_label.side_effect = lambda marker: {
            "projectRoot": "proj_root",
            "calendarRoot": "cal_root",
            "meetingRoot": "m_root",
        }.get(marker)

        self.api.search.side_effect = lambda query: {
            '#packageArtifact="notes-system-project-metadata-sync"': [{"noteId": "sync_proj"}],
            '#packageArtifact="notes-system-daily-note-repair"': [{"noteId": "sync_daily"}],
            '#packageArtifact="notes-system-topic-association-sync"': [{"noteId": "sync_topic"}],
        }.get(query, [])

        self.api.get_note.return_value = {"attributes": []}

        wired = cli.ensure_event_hooks(self.api)
        self.assertGreater(wired, 0)
        self.api.set_relation.assert_has_calls([
            call("proj_root", "runOnNoteChange", "sync_proj", inheritable=True),
            call("cal_root", "runOnNoteCreation", "sync_daily", inheritable=True),
        ], any_order=True)

    def test_ensure_project_hub_dashboards_creates_render_note(self):
        self.api.find_by_label.return_value = "proj_root"
        self.api.search.return_value = [{"noteId": "dash_code"}]
        self.api.get_note.side_effect = lambda note_id: {
            "proj_root": {"childNoteIds": ["hub_1"]},
            "hub_1": {
                "title": "Hub 1",
                "childNoteIds": [],
                "attributes": [{"noteId": "hub_1", "name": "extTemplate", "value": "projectHub"}]
            },
        }.get(note_id)
        self.api.create_note.return_value = "hub_dash_1"

        created = cli.ensure_project_hub_dashboards(self.api)
        self.assertEqual(created, 1)
        self.api.create_note.assert_called_once_with(
            parent_note_id="hub_1",
            title="Project Dashboard",
            note_type="render",
        )
        self.api.set_relation.assert_called_once_with("hub_dash_1", "renderNote", "dash_code")

    def test_ensure_daily_open_tasks_include_replaces_placeholder(self):
        self.api.find_by_label.side_effect = lambda marker: {
            "dashboardRoot": "dash_root",
            "templateRoot": "tpl_root",
            "calendarRoot": "cal_root",
        }.get(marker)

        self.api.get_note.side_effect = lambda note_id: {
            "dash_root": {"childNoteIds": ["ot_search"]},
            "ot_search": {"attributes": [{"noteId": "ot_search", "name": "extView", "value": "openTasks"}]},
            "tpl_root": {"childNoteIds": ["daily_tpl"]},
            "daily_tpl": {"attributes": [{"noteId": "daily_tpl", "name": "extTemplate", "value": "daily"}]},
        }.get(note_id)

        self.api.get_content.side_effect = lambda note_id: "__OPEN_TASKS_VIEW__"
        self.api.search.return_value = [{"noteId": "day_1"}]
        self.api.set_content = Mock()

        updated = cli.ensure_daily_open_tasks_include(self.api)
        self.assertEqual(updated, 2)
        self.api.set_content.assert_has_calls([
            call("daily_tpl", "ot_search"),
            call("day_1", "ot_search"),
        ])


if __name__ == "__main__":
    unittest.main(verbosity=2)

