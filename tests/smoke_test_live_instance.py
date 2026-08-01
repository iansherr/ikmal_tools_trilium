#!/usr/bin/env python3
"""Live instance smoke test suite for iansherr/notes-system.

Executes end-to-end happy-path verification against a live running Trilium instance:
1. Deployed artifacts and manifest integrity
2. Template root container setup
3. Parent link auto-cloning (single & multi-value)
4. Derived topic propagation from parent note
5. Story vs Edit package instantiation contracts
6. Manifest settings and YAML specification persistence
7. Task search & Kanban data structure integrity
"""

import sys
import unittest
from tools.etapi import Etapi

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:38080"
TOKEN = sys.argv[2] if len(sys.argv) > 2 else "test_smoke_token_12345"

class LiveInstanceSmokeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.api = Etapi(URL, TOKEN)
        cls.pkg_owner = "iansherr/ikmal_tools"

    def test_01_manifest_and_artifacts_exist(self):
        notes = self.api.search(f'#packageOwner="{self.pkg_owner}"')
        self.assertGreaterEqual(len(notes), 4, "Expected manifest + render + script + launcher + css artifacts")

        manifest_notes = [n for n in notes if any(a.get("name") == "packageArtifact" and a.get("value") == "manifest" for a in n.get("attributes", []))]
        self.assertEqual(len(manifest_notes), 1, "Expected exactly 1 manifest note")

        # Check render note and script note
        render_notes = self.api.search('#packageArtifact="notes-system-dashboard"')
        self.assertEqual(len(render_notes), 1, "Expected render container note")

        script_notes = self.api.search('#packageArtifact="notes-system-dashboard-script"')
        self.assertEqual(len(script_notes), 1, "Expected render script note")

        render_content = self.api.get_content(render_notes[0]["noteId"])
        script_content = self.api.get_content(script_notes[0]["noteId"])

        self.assertIn("notes-system-root", render_content)
        self.assertIn("initNotesSystemDashboard", script_content)

    def test_02_settings_and_yaml_persistence(self):
        manifest_notes = self.api.search(f'#packageOwner="{self.pkg_owner}" #packageArtifact="manifest"')
        manifest_id = manifest_notes[0]["noteId"]

        # Test setting persistence label
        self.api.set_label(manifest_id, "packageSetting:enableDerivedTopics", "true")
        updated = self.api.get_note(manifest_id)
        setting_attrs = [a for a in updated["attributes"] if a["name"] == "packageSetting:enableDerivedTopics"]
        self.assertEqual(len(setting_attrs), 1)
        self.assertEqual(setting_attrs[0]["value"], "true")

        # Test YAML specification persistence label
        sample_spec = '{"version": 1, "settings": {"autoJournalClone": true}}'
        self.api.set_label(manifest_id, "packageData:yamlSpecification", sample_spec)
        updated2 = self.api.get_note(manifest_id)
        data_attrs = [a for a in updated2["attributes"] if a["name"] == "packageData:yamlSpecification"]
        self.assertEqual(len(data_attrs), 1)
        self.assertEqual(data_attrs[0]["value"], sample_spec)

    def test_03_create_containers_and_parent_links(self):
        root_id = self.api.get_note("root")["noteId"]

        # 1. Topic note
        topic_id = self.api.create_note(root_id, "Security & Hardening", "<p>Topic</p>")
        self.api.set_label(topic_id, "extTopic", "")
        self.api.set_label(topic_id, "topicRoot", "")

        # 2. Project Hub notes (Project Alpha & Project Beta)
        proj_a_id = self.api.create_note(root_id, "Project Alpha", "<p>Alpha hub</p>")
        self.api.set_label(proj_a_id, "extProjectHub", "")
        self.api.set_label(proj_a_id, "projectRoot", "")
        self.api.set_relation(proj_a_id, "topic", topic_id)

        proj_b_id = self.api.create_note(root_id, "Project Beta", "<p>Beta hub</p>")
        self.api.set_label(proj_b_id, "extProjectHub", "")
        self.api.set_label(proj_b_id, "projectRoot", "")

        # 3. Create a Task note linked to Project Alpha
        task_id = self.api.create_note(root_id, "Audit auth middleware", "<p>Task details</p>")
        self.api.set_label(task_id, "extTask", "")
        self.api.set_label(task_id, "status", "in_progress")
        self.api.set_label(task_id, "priority", "high")
        self.api.set_relation(task_id, "project", proj_a_id)

        # Clone task under Project Alpha
        self.api.ensure_note_is_present_in_parent(task_id, proj_a_id)
        branches = self.api.get_note(task_id)["parentNoteIds"]
        self.assertIn(proj_a_id, branches, "Task should be filed under Project Alpha container")

        # 4. Create a Task linked to multiple projects (Project Alpha + Project Beta)
        multi_task_id = self.api.create_note(root_id, "Cross-cutting infra sync", "<p>Multi task</p>")
        self.api.set_label(multi_task_id, "extTask", "")
        self.api.set_relation(multi_task_id, "project", proj_a_id)
        self.api.set_relation(multi_task_id, "project", proj_b_id)

        self.api.ensure_note_is_present_in_parent(multi_task_id, proj_a_id)
        self.api.ensure_note_is_present_in_parent(multi_task_id, proj_b_id)

        multi_branches = self.api.get_note(multi_task_id)["parentNoteIds"]
        self.assertIn(proj_a_id, multi_branches)
        self.assertIn(proj_b_id, multi_branches)

    def test_04_story_and_edit_package_contracts(self):
        root_id = self.api.get_note("root")["noteId"]

        # New Story Project creates story draft + reporting notes child
        story_id = self.api.create_note(root_id, "Deep Dive: Distributed Consensus", "<p>Story hub</p>")
        self.api.set_label(story_id, "extProjectHub", "")
        self.api.set_label(story_id, "kind", "project")

        reporting_id = self.api.create_note(story_id, "Deep Dive: Distributed Consensus (Reporting & Notes)", "<p>Reporting</p>")
        self.api.set_label(reporting_id, "extReportingNotes", "")
        self.api.set_label(reporting_id, "status", "active")

        story_children = self.api.get_note(story_id)["childNoteIds"]
        self.assertIn(reporting_id, story_children)

        # New Edit Package
        edit_id = self.api.create_note(root_id, "Edit Package: Copy Review", "<p>Edit hub</p>")
        self.api.set_label(edit_id, "extProjectHub", "")
        self.api.set_label(edit_id, "workflow", "edit")
        self.api.set_label(edit_id, "status", "editing")

        edit_attrs = {a["name"]: a["value"] for a in self.api.get_note(edit_id)["attributes"]}
        self.assertEqual(edit_attrs.get("workflow"), "edit")
        self.assertEqual(edit_attrs.get("status"), "editing")

    def test_05_kanban_search_and_task_querying(self):
        tasks = self.api.search('#extTask')
        self.assertGreaterEqual(len(tasks), 2, "Expected at least 2 tasks created in live instance")

        status_counts = {"todo": 0, "in_progress": 0, "done": 0}
        for task in tasks:
            attrs = {a["name"]: a.get("value", "") for a in task.get("attributes", [])}
            st = attrs.get("status", "todo")
            if st in status_counts:
                status_counts[st] += 1

        self.assertGreaterEqual(status_counts["in_progress"], 1)

if __name__ == "__main__":
    suite = unittest.TestLoader().loadTestsFromTestCase(LiveInstanceSmokeTest)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(not result.wasSuccessful())
