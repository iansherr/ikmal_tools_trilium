# UX acceptance checklist

The engineering acceptance criteria for this package, separate from the
user-facing `USER_GUIDE.md` and `FAQ.md`. Update this alongside any change
to `src/components/` or `src/artifacts/`.

## Dashboard rendering

- [x] `initNotesSystemDashboard` returns quietly without a container rather
      than throwing — checked in `notes-system-dashboard.jsx`'s `init()`
      before mounting.
- [x] Every list/grid section (Today widgets, Template Studio rule lists,
      attribute tables) has an explicit empty state via `nativeUi.ts`'s
      `emptyState()`, rather than rendering nothing.
- [x] User-controlled and note-derived text is escaped through `escapeHtml`
      before landing in `innerHTML` — enforced by
      `tests/notes_system.test.mjs`'s `security:` tests (markup/quote/
      ampersand neutralization, and that the weather label can't leak into
      the request URL).
- [ ] Narrow-pane layout: no `@media` breakpoints exist in
      `notes-system.css` yet — the grid currently relies on flex/grid sizing
      alone. Not yet checked at a genuinely narrow pane width.
- [x] Dark/light theme: no theme-specific CSS in this package at all — every
      color comes from Trilium's own `var(--...)` custom properties, so it
      tracks whichever theme Trilium is in by construction rather than by a
      separate check here.

## Persistence correctness

- [x] Settings and the YAML specification round-trip through the manifest
      note's labels — covered by `packagePersistence` tests, including the
      case where nothing has been saved yet (`null`, not a thrown error or a
      wrong default).
- [x] A save failure (non-2xx response, or a 403 that survives a CSRF
      refresh) surfaces as a visible error in the Settings tab rather than
      failing silently to the console — see `SettingsStudio.tsx`'s
      `applySetting`/save-button handlers.
- [x] Saving a partial YAML specification patches the running config rather
      than clearing sections it doesn't mention — `parseAndApplyYamlSpec`
      tests cover this directly.

## Template Studio correctness

- [x] Adding a parent link also registers the matching if/then rule
      (auto-clone + topic sync) rather than requiring both to be defined by
      hand.
- [x] Rule enable/disable, edit, and delete are available at all three
      scopes (global, category, template) with consistent controls
      (`ruleItem()` in `TemplateStudio.tsx`).
- [x] The Preview tab renders only what a real note would show (title,
      promoted attributes, body) — no rule/inheritance metadata leaking into
      what's meant to look like the actual note.

## Note creation correctness

- [x] Quick Capture's Create button materializes the plan via
      `noteMaterializer.ts` (`api.createNote`, then a clone-to-note fetch per
      auto-clone target and today's journal note) rather than only
      previewing it. The parent-link picker's rendering (real candidates,
      empty state, layout inside the modal) is checked against a real
      Trilium render; the actual create-against-a-live-instance path is not
      — no disposable instance was available this session, so this is
      verified by type-checking against Trilium's own client source
      (`api.createNote`'s signature, the `clone-to-note` route) plus the
      `buildAttributeRows` unit test, not an end-to-end run.
- [x] A materialization failure (missing container, failed clone) surfaces
      inline in the modal rather than closing it or failing silently — see
      `QuickCaptureModal.ts`'s try/catch around `materializeNoteCreation`.
- [x] Outside Trilium (no `api`), Quick Capture still shows the plan preview
      rather than throwing, so the static preview page and tests keep
      working.
- [x] The Kanban board is a live `api.searchForNotes('#extTask')` query
      inside Trilium, with the same sample-data-outside-Trilium fallback as
      every other note-driven Today widget.

- [x] Derived topic inheritance: `noteMaterializer.ts` fetches parent note topics and calls `applyDerivedTopics` (via `RelationshipEngine.computeDerivedTopics`), appending derived topic relation attributes (`~topic`) to the note prior to creation.
- [x] Multi-value parent-link relationships (`isMulti: true`): `searchableSelect` in `nativeUi.ts` supports multi-select with interactive pill tags, allowing Quick Capture to select and pass multiple target note IDs for multi-target parent relations and auto-cloning.

## Verification method

`npm run check` and `npm test` catch logic and type regressions. They do not
catch a widget rendering behind a CSS variable Trilium doesn't define, or
content bleeding between two sections — those need a real render. See
`README.md` → Verifying visually.
