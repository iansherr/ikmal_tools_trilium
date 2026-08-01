# FAQ

## Is this a Trilium plugin?

Yes — a package (`iansherr/notes-system`) made of one render note (the
dashboard), a backend script, a custom HTTP endpoint, a launcher entry, and a
stylesheet. See `README.md` for the artifact list and `trilium-package.json`
for the manifest.

## Why doesn't Quick Capture's "Create" button create a note?

It doesn't yet — `NoteCreationEngine.planNoteCreation()` computes the title,
labels, and auto-file target, and the modal shows that plan, but nothing
calls `api.createNewTextNote` (or an equivalent) to actually write it into
your note tree. It's a preview of what note creation *would* produce. See
`ROADMAP.md`.

## Why does the Kanban board always show the same tasks?

It renders a fixed sample dataset (`SAMPLE_TASKS` in `TodayHomepage.tsx`),
not a live search — it isn't backed by real notes yet. The rest of Today's
widgets (Open Tasks, Overdue, Due Soon, etc.) are live `api.searchForNotes`
queries; the Kanban board specifically is not.

## I toggled a setting / saved the Specification — will it still be there after I reload?

Yes. Both persist as labels on the package's manifest note (searched by
`#packageOwner="iansherr/notes-system" #packageArtifact="manifest"`) and are
re-applied automatically the next time the dashboard loads. See `README.md` →
Persistence for exactly how and why (not `runOnBackend`, not note content).

## Saving a setting failed with an error in the Settings tab — what happened?

`packagePersistence.ts` writes labels through a direct authenticated `fetch`
using the current session's CSRF token. The error message includes the HTTP
status; a 403 that survives a token refresh, or any non-2xx response,
surfaces as `Could not save this setting: ...` rather than failing silently.
Check you're logged into the same Trilium instance the dashboard note lives
in, and that the manifest note wasn't deleted or renamed out from under it.

## Why won't the Weather widget show anything?

It needs a location — latitude, longitude, and a label — set in the layout
editor. With no location set it renders an empty state rather than making a
request with empty coordinates. It calls Open-Meteo directly from the
browser; no API key required.

## Do I need `backendScriptingEnabled` turned on for this plugin?

No. Every write this plugin makes (settings, the YAML specification) goes
through the same authenticated `fetch`-to-attribute-endpoint path the
sibling `../trilium_plugins` package manager uses, which works regardless of
that instance option. It's specifically avoided because that option is
commonly off — see `README.md` → Persistence.

## How do I deploy a change to a real instance?

```sh
npm run build
python3 tools/deploy_plugin_to_instance.py
```

The deploy script is idempotent: it finds the existing manifest/artifact
notes by their `packageArtifact` label and updates their content in place,
or creates them if they don't exist yet. Needs an ETAPI token for the target
instance — see `tools/etapi.py`.

## Where do the built-in templates and categories come from?

`BUILTIN_TEMPLATES` and `BUILTIN_CATEGORIES` in `src/engine/templateEngine.ts`
— they're the defaults `TemplateEngine` is constructed with, not something
loaded from a file. Editing them in Template Studio (or via a saved YAML
Specification) changes the running instance; it doesn't touch that source
file.

## The tests pass locally but something's still broken in the dashboard — why?

`tests/notes_system.test.mjs` imports from `dist/`, not `src/` — `npm test`
recompiles first (`pretest`), but if you're running `node --test` directly
without that step, you're testing whatever was compiled last. Run `npm test`
or `npm run build` first.
