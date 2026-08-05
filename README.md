# Ikmal Tools for Trilium

A component-driven plugin suite for Trilium Notes: a Today Homepage, Template Studio for
editing note schemas and automation rules, standalone micro-tools, and a Settings tab —
all served from an installable package styled strictly to match Trilium's native theme.

For day-to-day use, see [`USER_GUIDE.md`](USER_GUIDE.md). Troubleshooting is
in [`FAQ.md`](FAQ.md). Backup and recovery is in
[`BACKUP_ROLLBACK.md`](BACKUP_ROLLBACK.md). Open items are in
[`ROADMAP.md`](ROADMAP.md).

## Package boundary

This repository contains only the Ikmal Tools package: its manifest, source engines,
frontend artifacts, and package-specific tests. The host-side package manager, Plugins
settings tab, lifecycle locking, and Trilium integration tests live separately in the
[experimental Trilium integration branch](https://github.com/iansherr/Trilium/tree/integration/plugins).
That branch does not bundle this repository or replace it. It provides the Trilium host
needed to install and exercise this package while the host changes are reviewed upstream.

For current end-to-end testing, run the separate `integration/plugins` branch of Trilium,
then install this package through its Plugins settings using a registry source or the
direct manifest URL:

`https://raw.githubusercontent.com/iansherr/ikmal_tools_trilium/main/trilium-package.json`

The integration branch is experimental and is not a production Trilium release.

The `src/artifacts` files are build inputs. The committed `dist/artifacts` files are the
bundled payloads referenced by the package manifest and downloaded by Trilium.

The current manifest is still the compatibility package for the existing DEV vault.
The build also generates staged App Store-style metadata under `manifests/`: an
independently installable `Ikmal Editor` component and an `Ikmal Tools` bundle
index. Those staged manifests are intentionally not registered or deployed until
the package manager's ownership-transfer migration is ready, so development never
creates a duplicate package tree.

## What this is

`trilium-package.json` declares one installable package (`iansherr/ikmal_tools_trilium`)
made of a main workspace dashboard, visible workspace setup/repair, project dashboards, global launcher, live editor status bar word counter, and standalone micro-tool render artifacts:

| Artifact | Type | Source | Description |
|---|---|---|---|
| `notes-system-today-page` | render note | `dist/artifacts/notes-system-today-page.js` | Visible, read-only Today page with the current journal entry point and responsive widgets |
| `notes-system-dashboard` | render note | `dist/artifacts/notes-system-dashboard.js` | Main 3-tab workspace UI (Today, Template Studio, Package Settings) |
| `notes-system-project-dashboard` | render note | `dist/artifacts/notes-system-project-dashboard.js` | Project Hub dashboard with live related work, task creation, and completion actions |
| `notes-system-kanban` | render note | `dist/artifacts/notes-system-kanban.js` | Ikmal Standalone Task Kanban Board |
| `notes-system-insights` | render note | `dist/artifacts/notes-system-insights.js` | Ikmal Standalone Writing & Productivity Insights |
| `notes-system-quick-capture` | render note | `dist/artifacts/notes-system-quick-capture.js` | Ikmal Standalone Quick Capture Toolbar |
| `notes-system-weather` | render note | `dist/artifacts/notes-system-weather.js` | Ikmal Standalone Weather & Climate Card |
| `notes-system-on-this-day` | render note | `dist/artifacts/notes-system-on-this-day.js` | Ikmal Standalone Time Machine (On This Day) |
| `notes-system-stale-notes` | render note | `dist/artifacts/notes-system-stale-notes.js` | Ikmal Standalone Stale Notes Reviewer |
| `notes-system-launcher` | frontend startup script | `dist/artifacts/notes-system-launcher.js` | Native, configurable launchbar entries for the ten creation actions plus the `Cmd/Ctrl+Shift+K` quick capture shortcut |
| `notes-system-word-count` | frontend startup script | `dist/artifacts/notes-system-word-count.js` | Per-editor word, character, reading-time, and selection-details footer |
| `notes-system-css` | stylesheet | `dist/artifacts/notes-system.css` | Theme & UI Stylesheet |
| `notes-system-workspace-bootstrap` | frontend startup script | `dist/artifacts/notes-system-workspace-bootstrap.js` | Idempotently creates/repairs the visible Today entry and Project Hub dashboard links |

The workspace dashboard render note mounts three tabs (Today, Template Studio, Settings) into a container div and owns state in memory for the session. The workspace bootstrap repairs the visible Today render relation, restores same-day journal branches for Ikmal-created notes, updates or creates Project Dashboard render children for current and legacy Project Hubs, removes only Ikmal-generated Open Tasks and Day start structure from daily-note bodies, and archives a stray package-created Project Dashboard if it is attached only to a daily note. It preserves user-entered text and is idempotent: it does not remove legitimate project branches or create duplicate dashboard children. Package artifacts are discovered through the authenticated hidden-note search path, while user-authored project and journal notes remain in their normal tree locations.

The visible Today page and the workspace dashboard share the same widget renderer, but have different responsibilities: the file-tree Today page is a focused daily workspace without the workspace Open Tasks board, while the dashboard retains that board along with layout editing, Template Studio, and package settings. Its journal button reuses the existing daily-note split, applies the saved journal-width percentage after Trilium initializes the split, and replaces the existing journal context when the date changes.

The launcher artifact registers the ten creation actions as native Trilium script
launchers, so Configure Launchbar can reorder them or move them to Available
Launchers. The word-count artifact remains a frontend startup script; it is not
a custom-widget launcher. It renders a compact Ikmal Editor word/character/read-
time indicator shown only while editing and pinned to the bottom of the note
window, including split panes and panes created later, instead of adding a
second row to Trilium's global status bar. Its local editor layer highlights
adjacent duplicate words without changing saved note content. With text
selected, right-clicking in an editor adds selection statistics and
paragraph-level local Ikmal Editor checks beside Trilium's existing context
menu. This editor layer is self-contained; it does not send note text to a
server. The separate LanguageTool package is optional and is not required.

The Today grid is container-responsive rather than window-responsive. Its auto-fit minimum is clamped to the available note-pane width, and the task board collapses to one column before a narrow split can create horizontal overflow. Quick-capture controls retain one-line labels and full-width touch targets in narrow panes.

## Architecture

```
src/
  engine/         Pure TypeScript logic, no DOM. Unit tested directly.
    templateEngine.ts       Template & category CRUD, title formatting.
    relationshipEngine.ts   Auto-clone / topic-inheritance calculations.
    ifThenRuleEngine.ts     Trigger → condition → action rule evaluation.
    todayEngine.ts          Today Homepage layout & widget config.
    noteCreationEngine.ts   Plans a new note from a template + rules + settings.
    noteInsightsEngine.ts   Activity heatmap, On This Day, moon phase, etc.
    weatherEngine.ts        Open-Meteo request/response mapping.
    settingsEngine.ts       In-memory automation settings (booleans).
    packagePersistence.ts   Reads/writes settings & YAML spec to/from Trilium.
    yamlParser.ts           Minimal YAML subset (no dependency).
    yamlSpec.ts             Whole-package YAML import/export.
    types.ts                Shared type definitions.
  components/     DOM rendering, one `render*(container, ...)` function each.
    TodayHomepage.tsx       Journal + widget grid + quick capture bar.
    TemplateStudio.tsx      Schema editor (categories, templates, rules) + preview.
    SettingsStudio.tsx      Automation toggles + YAML specification editor.
    QuickCaptureModal.ts    The "new note" modal opened from Today/launcher.
    nativeUi.ts             Shared primitives (escapeHtml, modal, toggle, etc.)
  artifacts/      What actually gets bundled and deployed (see table above).
```

Engines have no DOM dependency and are exercised directly by
`tests/notes_system.test.mjs`. Components call into engines and render;
they're covered indirectly through the engines they drive, plus a manual
visual check against a real Trilium instance before anything ships (see
"Verifying visually" below).

## Persistence

Trilium's frontend script API has no `setNoteContent`/`updateNote` method, and
`api.runOnBackend()` is gated behind the `backendScriptingEnabled` instance
option (commonly off), so it can't be relied on for routine saves. Instead,
this plugin persists everything as labels on its own manifest note — the note
tagged `#packageOwner="iansherr/ikmal_tools_trilium" #packageArtifact="manifest"`,
found via `api.searchForNotes` and written with a direct authenticated
`fetch` to `notes/{id}/set-attribute` (same CSRF/session convention the
sibling `../trilium_plugins` package manager uses). See
`src/engine/packagePersistence.ts`:

- The four `settings` entries declared in `trilium-package.json` persist as
  `packageSetting:<key>` labels.
- The whole YAML specification (Today layout, templates, categories, if/then
  rules), when saved from the Settings tab, persists as one JSON-encoded
  `packageData:yamlSpecification` label and is re-applied on top of the
  built-in defaults every time the dashboard loads.

Outside Trilium (tests, a static preview page) `packagePersistence.ts` falls
back to an in-memory store so the same code path runs everywhere.

`config/ians_notes_setup.yaml` (and its `.json` twin) is a **static reference
copy** of one real specification — useful as a starting point or an export
target — not something the running plugin reads automatically. Edit it in the
Settings tab's Specification editor and use Copy/Save there; the file on disk
doesn't sync itself.

## Creating notes

Quick Capture (`src/components/QuickCaptureModal.ts`) builds a
`NoteCreationPlan` (`noteCreationEngine.ts`: title, labels, relations, if/then
actions, auto-clone targets, journal-clone) and then materializes it
(`src/engine/noteMaterializer.ts`) with `api.createNote` for the note itself.
Filing it under a second parent — an auto-clone target from a parent-link
relationship, or today's journal note — isn't exposed on the frontend script
API either; Trilium's own client uses `PUT notes/{id}/clone-to-note/{parentId}`
for that (`branches.ts`), so this replicates it with the same authenticated-
fetch convention as the Persistence section above.

Any template relationship (`~project` on a Task, say) becomes a searchable
picker over real candidate notes (found by searching for the target
template's marker label) in the Quick Capture modal, so auto-clone and
derived-topic inheritance have an actual note to act on rather than always
resolving to nothing.

## Scripts

```sh
npm run check    # tsc --noEmit
npm run build    # compile src/ to dist/, bundle artifacts, recompute SRI hashes
npm test          # compile then run tests/*.test.mjs (node --test)
npm run register  # add/update this package's entry in the local ../trilium_plugins registry
```

`tests/run_all.sh` runs the Node suite plus the small offline Python
regression test for `tools/etapi.py`.

## Deploying to a live instance

```sh
python3 tools/deploy_plugin_to_instance.py
```

Finds or creates the package's manifest note (searched by
`#packageOwner`/`#packageArtifact="manifest"`), then creates or updates each
declared artifact note under it, tagging everything with `packageOwner`,
`packageVersion`, and `packageArtifact` labels. Idempotent — safe to re-run
after every build. Requires an ETAPI token for the target instance (see
`tools/etapi.py`); pass a different `url`/`token` to `deploy()` for a non-default
instance.

## Requirements

- Trilium ≥ 0.104.0 (see `compatibility.minTriliumVersion` in
  `trilium-package.json`).
- Node ≥ 18, TypeScript 5.8 (`devDependencies`).
- Python 3 with no extra packages, only for `tools/deploy_plugin_to_instance.py`
  and the offline `tests/test_etapi.py`.

## Verifying visually

This plugin deliberately matches Trilium's own look — real Bootstrap classes,
real Boxicons, real CSS custom properties — rather than inventing its own
style. When a local checkout of Trilium's source is available, drive a
headless browser against a static page that loads Trilium's own
`bootstrap.min.css`/`boxicons`/`theme-next-*.css`/`style.css` alongside the
built `dist/artifacts/notes-system-dashboard.js` and screenshot it. Type
checks and unit tests catch logic regressions; they don't catch a widget
rendering behind the wrong CSS variable or content bleeding between two
sections, which only shows up rendered.
