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

## What this is

`trilium-package.json` declares one installable package (`iansherr/ikmal_tools_trilium`)
made of a main workspace dashboard, global launcher, live editor status bar word counter, and standalone micro-tool render artifacts:

| Artifact | Type | Source | Description |
|---|---|---|---|
| `notes-system-dashboard` | render note | `dist/artifacts/notes-system-dashboard.js` | Main 3-tab workspace UI (Today, Template Studio, Package Settings) |
| `notes-system-kanban` | render note | `dist/artifacts/notes-system-kanban.js` | Ikmal Standalone Task Kanban Board |
| `notes-system-insights` | render note | `dist/artifacts/notes-system-insights.js` | Ikmal Standalone Writing & Productivity Insights |
| `notes-system-quick-capture` | render note | `dist/artifacts/notes-system-quick-capture.js` | Ikmal Standalone Quick Capture Toolbar |
| `notes-system-weather` | render note | `dist/artifacts/notes-system-weather.js` | Ikmal Standalone Weather & Climate Card |
| `notes-system-on-this-day` | render note | `dist/artifacts/notes-system-on-this-day.js` | Ikmal Standalone Time Machine (On This Day) |
| `notes-system-stale-notes` | render note | `dist/artifacts/notes-system-stale-notes.js` | Ikmal Standalone Stale Notes Reviewer |
| `notes-system-launcher` | launcher entry | `dist/artifacts/notes-system-launcher.js` | Global Header Launcher Bar & `Cmd/Ctrl+Shift+K` Hotkey |
| `notes-system-word-count` | launcher entry | `dist/artifacts/notes-system-word-count.js` | Live Editor Status Bar Word & Char Counter |
| `notes-system-css` | stylesheet | `dist/artifacts/notes-system.css` | Theme & UI Stylesheet |

The workspace dashboard render note mounts three tabs (Today, Template Studio, Settings) into a container div and owns state in memory for the session. Nothing here talks to Trilium's database schema directly, and there is no backend script or custom HTTP endpoint — notes are created and read entirely from the frontend, through the standard script API (`api.searchForNotes`, `api.createNote`, etc.) and a small set of authenticated `fetch` calls.

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
