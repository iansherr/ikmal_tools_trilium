# Using the Notes System dashboard

The dashboard is one render note with three tabs: **Today**, **Template
Studio**, and **Settings**. Everything below describes what's actually wired
up today — a couple of surfaces are previews rather than finished features;
those are called out explicitly rather than glossed over.

## Today

A two-pane layout: the Journal note on one side (resizable — drag the
divider, or set a percentage in the layout editor), a grid of widgets on the
other.

### Widgets

On by default, each backed by a live `api.searchForNotes` query:

- **Open Tasks**, **Overdue Work**, **Due Soon** — tasks by status/date.
- **Active Projects** — project hubs currently in progress.
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

The buttons under "Quick capture" open a modal for the first four templates
that aren't excluded from journal filing. **Today this only plans and
previews a note** — title, promoted attributes, computed labels, and where it
would auto-file — rather than creating anything in your note tree yet. Treat
it as a preview of what `NoteCreationEngine` would do, not a working "new
note" button. See `ROADMAP.md`.

### Kanban board

Also a preview: it always renders a fixed set of sample tasks (`SAMPLE_TASKS`
in `TodayHomepage.tsx`), not your real tasks. Useful for seeing the column
layout and card style; not yet backed by a search.

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
