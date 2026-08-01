# Roadmap

Known gaps in the current package, in rough priority order. Nothing here is
scheduled — this is a punch list, not a commitment.

## Derived topic inheritance is computed but never applied

`NoteCreationEngine.planNoteCreation()` computes `inheritedTopicSources` (the
notes a new note should inherit topics from, when `enableDerivedTopics` is
on) and `RelationshipEngine.computeDerivedTopics()` exists to merge them —
but nothing in the plan or in `noteMaterializer.ts` ever calls it or turns
the result into a label/relation on the note. The setting toggles, the
computation runs, and the result goes nowhere. Fixing this needs: reading
each source note's own topics (a search/read Quick Capture doesn't currently
do), merging via `computeDerivedTopics`, and adding the merged set to
`buildAttributeRows`'s output before the note is created.

## Multi-value parent-link relationships only ever get one target

`TemplateRelationshipDef.isMulti` exists (a template can declare a
relationship that allows several targets), but the Quick Capture picker
(`searchableSelect`) only ever selects one value. A multi-valued relationship
quietly behaves as single-valued until the picker gains multi-select.

## The custom HTTP endpoint and backend script were removed, not fixed

They implemented `/notes-system/create` and `/notes-system/templates`
against a stale copy of the template model (hardcoded `taskRoot` lookup,
template ids that predated the current `TemplateEngine`), and nothing called
either — Quick Capture creates notes entirely from the frontend
(`noteMaterializer.ts`) via `api.createNote` and a couple of authenticated
`fetch` calls for what that API doesn't expose. Reimplementing this
server-side would mean duplicating engine logic in a separate runtime for no
current caller; if a real need for a server-side endpoint shows up, model it
against the current engines from scratch rather than resurrecting the old
one from git history.

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
4. Anything that picks one value from an open-ended set (an existing note,
   not a fixed template/category) should reuse `nativeUi.ts`'s
   `searchableSelect` rather than a new combobox — see Quick Capture's
   parent-link picker for the pattern (fetch candidates, pass as options).
