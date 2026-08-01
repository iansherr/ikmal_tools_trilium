# Trilium workflow UX audit

This is the working checklist for the usability and reliability pass on the
Trilium extension. It records the problems found in the live disposable
instance and the acceptance criteria for closing them.

## Findings and acceptance criteria

### Dashboard rendering

- A render note can be opened without a frontend `$container`. The dashboard
  must return quietly in that context instead of throwing a null-container
  error.
- A new hub should show one useful empty-state message and the primary action.
  Empty dashboard sections should not occupy most of the page.
- Editorial actions should be visible only for an edit hub with a current
  round. A writing/project hub should show `New Draft`, without disabled
  editorial controls.
- Dates should be readable at a glance: overdue and today follow-ups need a
  visual distinction, while all values remain accessible as text.
- The dashboard must remain usable in a narrow pane and in Trilium's dark
  theme. The visual system should use Trilium's existing button and table
  classes rather than introducing a competing application shell.

### Creation and editorial state validation

- Story mode accepts only `project` or `edit`.
- Editorial actions accept only `awaiting`, `returned`, or `complete`, and
  only apply to Story Draft notes.
- `awaiting` requires a non-empty person/team and a valid `YYYY-MM-DD`
  follow-up date. Optional sent dates use the same date validation.
- Unknown project IDs, malformed dates, malformed rounds, blank titles, and
  unsupported note types fail with a useful 400 response and do not create a
  partial note.
- Returned and completed rounds clear stale waiting metadata; completion also
  records the completion date.

### Launcher and install behavior

- The install process must create the complete launcher set idempotently.
- The launcher implementation should use Trilium's current launchbar API. The
  old `api.addButtonToToolbar()` path is deprecated in Trilium 0.104 and is
  cleaned up during installation.
- Re-running install must preserve custom template content and must not create
  duplicate dashboards, launcher notes, or saved searches.

### Coverage still required

The regression suite should cover invalid mode/action/note/project IDs,
invalid dates, missing awaiting fields, state cleanup, custom-template
preservation, duplicate round requests, and both story modes. A browser pass
should check the project and edit dashboards, cancelled prompts, direct render
context, narrow width, dark theme, and the absence of extension errors in the
console.

## Status

- [x] Story project/edit modes and type-specific scaffolds
- [x] Links and open questions placed first in story workflows
- [x] Editorial round actions and state labels
- [x] Template migration that preserves user-customized content
- [x] Null-container-safe dashboard startup
- [x] Compact, content-aware dashboard empty states
- [x] Date/status visual cues
- [x] Strict request validation and edge-case tests
- [x] Duplicate-round protection
- [x] Current launchbar API migration
- [x] Browser verification of project dashboard, launcher cancellation, explicit mode chooser, and narrow layout
- [ ] Browser verification of a populated edit dashboard and dark theme

The detailed user-facing workflow remains in [USER_GUIDE.md](USER_GUIDE.md),
with common questions in [FAQ.md](FAQ.md). This file is intentionally more
technical: it is the acceptance checklist for future changes.
