# Roadmap

Known gaps in the current package, in rough priority order. Nothing here is
scheduled — this is a punch list, not a commitment.

## Quick Capture doesn't create notes yet

`NoteCreationEngine.planNoteCreation()` computes the plan (title, labels,
auto-file target) and the modal shows it, but nothing calls
`api.createNewTextNote` or equivalent to actually write the note. This is the
single biggest gap between what the UI implies and what it does — see
`USER_GUIDE.md` → Quick capture.

## The Kanban board is sample data

`renderKanban()` in `TodayHomepage.tsx` always renders `SAMPLE_TASKS`, a
fixed array, regardless of environment. Every other Today widget is backed by
a real `api.searchForNotes` query (with a sample-data fallback only outside
Trilium); Kanban has no live path at all yet.

## The custom HTTP endpoint is a stub

`src/artifacts/notes-system-backend.js`'s `handleCustomRequest` only
implements `/notes-system/create` and `/notes-system/templates`, even though
`trilium-package.json`'s endpoint route also declares `ifThen` and
`settings`. What it does implement doesn't match the current engine model
either — its template list (`storyDraft`, etc.) predates the current
`TemplateEngine` template ids (`story`, `edit`, ...), and it hardcodes a
`taskRoot` container lookup rather than going through `TemplateEngine` /
`NoteCreationEngine`. Worth deciding whether this endpoint is still needed at
all before investing in fixing it — nothing in the dashboard currently calls
it.

## If an open-ended note picker is ever added, it should reuse `searchableSelect`

The template and category pickers in Template Studio (`nativeUi.ts`'s
`searchableSelect`) already do fuzzy filtering; the remaining `<select>`s
(trigger/action type, attribute kind/type, column count, density, units) are
small fixed enums where a native select is still the right call. If a future
feature picks from an open-ended set — linking to an arbitrary existing note
rather than a fixed template — extend `searchableSelect` rather than
building a second combobox.

## Design rules

1. Trilium notes remain the source of truth; the dashboard is a view, not a
   copy. Persisted state (settings, the YAML specification) lives on the
   package's manifest note, not in browser storage.
2. New automation must be idempotent and covered by a test in
   `tests/notes_system.test.mjs`.
3. UI changes get checked against a real Trilium render — Boxicons, Bootstrap
   classes, and CSS custom properties that actually exist in Trilium's
   theme-next stylesheets — not just `tsc`/tests. See `README.md` →
   Verifying visually.
