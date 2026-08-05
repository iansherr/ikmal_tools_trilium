# Using Ikmal Tools for Trilium

Ikmal Tools for Trilium is a component-driven plugin suite featuring the **Today Homepage & Workspace Dashboard**, **Template Studio**, **If/Then Automations**, **Package Settings**, and a **Standalone Micro-Tools Suite**.

## Today

A two-pane layout: the Journal note on one side (resizable — drag the
divider, or set a percentage in the layout editor), a grid of widgets on the
other. The journal button reuses one daily-note split instead of opening a new
split on every click, and the saved percentage is applied after Trilium lays
out the panes. The focused file-tree Today page does not show the workspace
Open Tasks board; that board remains available on the workspace dashboard.

### Widgets

On by default in the workspace dashboard, each backed by a live
`api.searchForNotes` query:

- **Open Tasks**, **Overdue Work**, **Due Soon** — tasks by status/date. Open
  Tasks is intentionally omitted from the focused file-tree Today page.
- **Active Projects** — live project hubs currently in progress, including legacy hubs that use `extTemplate="projectHub"`; each row can open its project note.
- **High Priority** — anything tagged high priority.
- **Follow-ups & Replies** — meetings/emails awaiting a reply or follow-up.
- **Stories & Drafts** — draft/edit-package notes in progress.
- **Recently Touched** — notes modified in the last few days.

Off by default (toggle on from the layout editor):

- **Weather** — needs a location; see below.
- **Activity** — a 12-week GitHub-style heatmap of note creation.
- **On This Day** — journal notes from this date in prior years.
- **Writing Goal** — a curated public-domain daily quote plus a word-count
  progress bar against a configurable target.
- **Moon & Daylight** — moon phase (computed locally, no network) plus
  sunrise/sunset/daylight length (pulled from the same weather call).
- **Needs Attention** — open notes untouched past a configurable threshold.

The three note-driven insight widgets (Activity, On This Day, Needs
Attention) share one `api.searchForNotes` call rather than issuing three
separate ones. Outside Trilium (the static preview page, or if a search
returns nothing) they fall back to deterministic sample data so the layout
always shows something meaningful while you're arranging it.

Each widget can be resized (one column / two columns / full width) and
reordered from the layout editor. Enabling **Weather** without a location set
will show an empty state rather than a broken request — set latitude,
longitude, and a label first.

### Quick capture

The buttons under "Quick capture" expose the original Ikmal creation set:
Project, Scratch, Meeting, Task, Story, Edit, Email, Person, Organization,
and Topic. Each opens a modal with a title, the template's promoted
attributes, and — if the template has a parent-link relationship, like a
Task's `~project` — a searchable picker over real existing notes of the
target type. Pick one and the note is auto-cloned there once created; leave
it blank and the note is still created, just without that relation. Create
calls `api.createNote` and files the note under any auto-clone targets and
today's journal note (see `README.md` → Creating notes); a failure shows
inline in the modal rather than closing it. The global launchbar exposes the
same creation actions as native, configurable Trilium launchers, so they can
be reordered or moved to Available Launchers from Configure Launchbar.

Outside Trilium (the static preview page, tests) there's no `api` to create
against, so Create instead shows what the plan *would* produce.

### Kanban board

A live `api.searchForNotes('#extTask')` query, columned by each task's
`status` label. Outside Trilium it falls back to fixed sample tasks
(`SAMPLE_TASKS` in `TodayHomepage.tsx`) so the layout still shows something
meaningful.

Daily notes contain the Notes area only. Ikmal removes its generated Open Tasks
include and Day start heading during startup while preserving any text already
entered in the day note.

## Ikmal Editor footer

While editing, Ikmal shows a compact indicator pinned to the bottom of the
note window with live word count, character count, and estimated reading time.
Its quiet right-aligned status icon shows a check when local checks are clear,
or an issue icon when they are not; hover it for the details.
It appears while an editor is active, follows all editor panes including panes
created after startup, and does not add extra height to Trilium's global status
bar. Select text and right-click it to see
the selected word/character totals and paragraph-level local checks for repeated
spaces, trailing whitespace, repeated punctuation, and unusually long
sentences. These checks are built into Ikmal Editor and do not require another
plugin or a network service.

Adjacent duplicate words are highlighted locally as a visual writing aid; the
highlight is a non-destructive editor decoration and is not saved into the note.

LanguageTool is a separate, optional package; Ikmal Editor does not depend on it.

## Template Studio

A rail on the left switches between **Templates** and **Categories**; the
main pane is a **Schema** editor with a **Preview** tab showing exactly what
a note created from the selected template would look like (title chrome,
promoted attributes, body) and nothing else — no rule/inheritance metadata,
since a real note wouldn't show that either.

The schema editor for a template covers:

- Title, category (type to filter — a searchable picker, not a plain
  dropdown, since the list grows as you add categories), title pattern
  (e.g. `Project: {title}`), and icon.
- **Global rules** — run for every note the system creates.
- **Category rules** — inherited from the template's category; "Edit the
  `<category>` category" jumps the rail over to it.
- **Template rules** — this template's parent links (`~relation` →
  target template, picked from the same searchable list, with
  auto-clone/topic-inheritance toggles) plus any rule scoped only to this
  template.
- Promoted attributes (name, label/relation, data type, default/options).
- The content skeleton (raw HTML) inserted into a new note's body.

Every rule row has an enable/disable toggle, an edit button (opens the same
modal used to create it), and — for anything that isn't built in — a delete
button. Adding a parent link (`+` next to "Template rules") also
auto-registers a matching if/then rule that files the note under its parent
and syncs derived topics, so you don't have to define both by hand.

**Categories** get their own schema pane: title, description, icon, default
root container marker, and three behavior toggles — auto-file new notes
under today's journal, inherit parent topics by default, and whether new
templates in this category default to project-scoped. These are defaults a
template can still override individually.

Built-in categories: Work & Project Scoped, Draft & Editorial, People &
Client Entities, System & Topic Index, Custom / Flexible. Built-in templates
span all of them — Task, Project Task, Meeting, Meeting Prep, Story Project,
Edit Package, Scratch Note, Project Hub, Reporting Notes, Person,
Organization, Topic, Email Draft.

## Settings

**Automation** — three toggles that actually gate `NoteCreationEngine`
behavior, plus the journal-split-width default:

- Execute if/then rules on note creation.
- Enable derived topic propagation from parent relations.
- File new notes under today's journal note (a master switch; each
  category's own toggle in Template Studio still applies underneath it).

These persist to the package's manifest note as it's installed in Trilium, so
they survive a reload. See `README.md` → Persistence for how.

**Specification** — the whole package (Today layout, categories, templates,
if/then rules) as one editable YAML document. **Copy** puts it on the
clipboard; **Save** validates it, applies it to the running dashboard
immediately, and persists it to the manifest note so it's still there next
time you open the dashboard. Saving is a *patch*, not a replacement — a
section left out of the document is left alone rather than cleared, so you
can save a document containing only the section you actually edited.

`config/ians_notes_setup.yaml` in this repo is a separate, static example of
one real specification. It's a useful starting point to paste into the
Specification editor, or a target to paste an export into, but it does not
sync with a running instance automatically — the editor is the only live
copy.
