# Extension improvement roadmap

This is the working product roadmap for the Trilium extension. The system is
already usable; these items improve clarity, speed, safety, and recoverability
without changing the underlying note model.

## Phase 1 — Today and daily workflow

- [x] Add a dedicated Overdue view, separate from Due Soon.
- [x] Add a compact Recently Touched section.
- [x] Add clearer empty states that explain what each empty widget represents.
- [x] Add direct empty-state actions, such as “New Task”.
- [x] Make the Today split resizable and keep the Journal pane dominant.
- [ ] Add keyboard shortcuts for Today, New Task, New Scratch, and New Meeting.

## Phase 2 — Project workflow

- [x] Add a project activity timeline showing rounds, tasks, meetings, and emails.
- [x] Make project activity sort by modification date and show project status.
- [x] Show the latest round, status, and next action in project tables.
- [x] Add a first-class Next Action field and surface it on project dashboards.
- [x] Make Active and Archive transitions explicit from project and round views.
- [x] Add “create Organization” from relation-field workflows.

## Phase 3 — Dashboards and navigation

- [x] Add dashboard filters for time range, project, status, and assignment.
- [x] Improve widget empty states and error messages.
- [x] Add collapse/expand controls and sensible widget sizing defaults.
- [x] Add breadcrumbs and “open project” links from rounds and search results.
- [x] Keep the Today quick-capture actions available inside the daily workflow.

## Phase 4 — Safety and maintenance

- [x] Add an extension health panel showing version, required notes, and hooks.
- [x] Add a repair command for missing templates, launchers, and Journal branches.
- [x] Add migration logging so upgrades explain what changed and what was preserved.
- [x] Add automated delete/recreate-day tests for branch restoration and Open Tasks.
- [x] Add a documented backup and rollback procedure before upgrades.

## Design rules

1. Trilium notes remain the source of truth; dashboards are views, not copies.
2. User-authored content is preserved unless a migration recognizes an untouched
   body shipped by an earlier extension version.
3. Project notes may have multiple branches, but every note keeps one identity.
4. New automation must be idempotent, versioned, and covered by an install test.
5. Implementation notes belong in Trilium’s hidden system subtree and are managed
   from this repository’s source files.

The Journal repair hook uses inheritable creation and change events because
Trilium creates day notes beneath year/month nodes and adds their date metadata
after the initial note-creation event.

## Delivery order

Work proceeds from the smallest daily-workflow improvements toward larger
project and dashboard features. Each slice should be installed against the
disposable instance, tested, and documented before the next slice begins.
