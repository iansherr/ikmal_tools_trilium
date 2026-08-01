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

## Known-incomplete surfaces (see `ROADMAP.md` for detail)

- [ ] Quick Capture's Create button only plans a note; it doesn't call the
      Trilium API to create one.
- [ ] The Kanban board always shows fixed sample data, never a real search.
- [ ] The custom HTTP endpoint (`notes-system-endpoint` artifact) only
      implements `create` and `templates`, and those don't match the current
      `TemplateEngine` model.

## Verification method

`npm run check` and `npm test` catch logic and type regressions. They do not
catch a widget rendering behind a CSS variable Trilium doesn't define, or
content bleeding between two sections — those need a real render. See
`README.md` → Verifying visually.
