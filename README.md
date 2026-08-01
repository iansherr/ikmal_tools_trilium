# Trilium Extension

The Trilium port of the notes system. This file records the packaging decision
and the feature mapping so the research isn't repeated.

For day-to-day use, start with [`USER_GUIDE.md`](USER_GUIDE.md). Troubleshooting
is in [`FAQ.md`](FAQ.md). The engineering acceptance checklist is
[`UX_AUDIT.md`](UX_AUDIT.md).
The prioritized improvement roadmap is in [`ROADMAP.md`](ROADMAP.md).

## Current state

Working against a local dev instance (see `dev/README.md`):

- [x] Disposable Trilium v0.104.1 instance, backend scripting enabled
- [x] ETAPI reachable; credentials in `dev/.env` (gitignored)
- [x] Root containers created with marker labels — `tools/apply_skeleton.py`
- [x] Journal generating day notes as `2026-07-29 - Wednesday`
- [x] 10 templates as `#template` notes with promoted attributes — `tools/apply_templates.py`
- [x] `~dateTemplate` wired, so day notes are generated with the daily template
- [x] Collections and saved searches replacing the Dataview dashboards — `tools/apply_collections.py`
- [x] One-page Dashboard view containing the saved-search widgets
- [x] Creation scripts and launcher buttons — `tools/apply_scripts.py`, `src/`
- [x] Project Hub dashboard — native Render note with Rounds, Tasks, Meetings, Emails, Awaiting Replies, Follow-ups Due, Timeline, Days Touched, and Related Hubs views
- [x] Implementation notes stored in Trilium’s `_userHidden` system subtree
- [x] Test suite — `tests/run_all.sh` (the runner reports the current count)
- [x] Packaging — `tools/install.py`, `tools/export_package.py`
- [x] Safe uninstall — `tools/uninstall.py` (preserves user content)
- [x] Repair command — `tools/repair.py` (recreates missing extension structure)
- [x] Migration log — hidden `#extMigrationLog` note records install/repair changes
- [x] Backup and rollback procedure — [`BACKUP_ROLLBACK.md`](BACKUP_ROLLBACK.md)
- [x] Extension version marker — `tools/version.py`, stored on `#extConfig`
- [x] Automatic Project Hub metadata sync for Client and On behalf of relations
- [x] Optional Topics layer with native multi-relations, picker, hashtag suggestions, and Dashboard filtering
- [x] Project-specific Reporting Notes titles with safe rename handling
- [x] ikmal integration adapter for structured tasks and Journal checkboxes (see below)

```sh
cd dev && docker compose up -d
python3 tools/install.py          # idempotent, then verifies
python3 tools/repair.py           # restore missing extension-owned pieces
bash    tests/run_all.sh
```

## Packaging

`install.py` is the primary route — the counterpart to `obsidian_plugin/install.sh`.
It runs the four appliers in dependency order and then verifies the result, so a
fresh instance and an existing one converge to the same state. Because it is
idempotent it *updates* an install rather than importing a second copy beside it.

`export_package.py` produces importable zips in `dist/` for anyone who cannot
point tooling at their instance over ETAPI. **Trilium's own export format is the
distribution mechanism — no `trilium-pack` dependency is needed**, and
`!!!meta.json` carries attributes, so every template's promoted-attribute schema
survives the round trip.

Only structural subtrees are packaged (Templates, Dashboards, Scripts). Export is
whole-subtree with no depth limit, so packaging a content container such as Tasks
would ship whatever notes the source instance happened to hold. Those containers
carry no logic anyway — they are notes with a marker label each, recreated by
`apply_skeleton.py` — and `manifest.json` records the ones a zip-only install
still has to create.

Script bodies live in `src/` as real `.js` files rather than embedded in the
appliers, so they can be linted and diffed normally — and so a future
trilium-pack build consumes the same sources.

> The note-creation handler is exposed at `POST /custom/create-note`.
> Trilium does **not** authenticate `#customRequestHandler` endpoints, so the
> handler enforces a shared secret (`#createNoteSecret`, minted into
> `dev/.env`) and fails closed if it is missing. The secret is readable by
> anyone who can open the note in the UI, so it guards against outside access,
> not against a user of the instance. A multi-user deployment should move the
> buttons to `api.runOnBackend` and drop the HTTP surface.

Containers are found by **marker label**, never by title or tree position, so
the tree can be renamed or reorganised without breaking the scripts:
`#calendarRoot`, `#projectRoot`, `#meetingRoot`, `#storyDraftRoot`, `#emailRoot`,
`#taskRoot`, `#unassignedRoot`, `#peopleRoot`, `#orgRoot`, `#topicRoot`,
`#templateRoot`.

## There is no plugin system in Trilium

Unlike Obsidian, Trilium has no plugin manifest, registry, dependency resolution,
or update mechanism. Everything in the community ecosystem
([awesome-trilium](https://github.com/Nriver/awesome-trilium)) installs one of
four ways:

| Route | How it activates |
| --- | --- |
| Import a note or `.zip` into the tree | A **label** on the imported note: `#appTheme`, `#appCss`, `#widget`, `#run=frontendStartup`, `~renderNote`, `~shareCss` |
| Paste JS into a code note | Same labels |
| External program over ETAPI | Runs outside Trilium |
| Browser extension / mobile app | Out of scope here |

The upside: templates, scripts, collections, and dashboards are all just notes.
One zip carries the entire system — there is no plugin/vault split to keep in
sync the way `ikmal-for-obsidian` plus vault files must be.

## Packaging approach

- **Artifact** — [`trilium-pack`](https://github.com/rauenzi/trilium-pack):
  builds a Trilium-importable zip from local source given a `tpack.config.js`.
  Keeps source as real files in git.
- **Types** — [`trilium-types`](https://github.com/rauenzi/trilium-types):
  TypeScript `@types` for the Trilium script API.
- **Install / verify / test** — [`trilium-py`](https://github.com/Nriver/trilium-py)
  over ETAPI, replacing what `install.sh` and `tests/system/` do for Obsidian.

[`trilium-alchemy`](https://github.com/mm21/trilium-alchemy) (declarative
notes-as-code Python SDK) is the more elegant alternative but is a small
single-maintainer project; `trilium-pack` emits a plain zip that Trilium imports
natively, so there's no lock-in.

The extension version is a manually bumped constant in `tools/version.py`.
Each install writes it to `#extensionVersion` on Config and the verifier checks
it. Version 0.2.1 introduced project-hub storage, the Unassigned fallback, and
a calendar-first native Dashboard layout; later installs include migrations for
schema cleanup, preserved template relations, and Active/Archive project areas.

## Feature mapping

| Obsidian implementation | Trilium equivalent |
| --- | --- |
| Folders | Note tree + **cloning** (one note, many parents) |
| Frontmatter | Labels/relations + **promoted attributes** (typed form UI) |
| Wikilinks, `file.inlinks` | Internal links, relations, built-in backlinks |
| Templater templates | `#template` notes, `~template`, `~child:template` |
| Meta Bind buttons | Current launchbar script launchers configured through the backend API |
| Dataview `TABLE` | Saved searches + Collections (table/board/calendar/grid/list) |
| DataviewJS | Backend/frontend script notes, `api.searchForNotes()` |
| `create-daily-note`, `notes/daily/` | Day notes: `#calendarRoot`, `~dateTemplate`, `#datePattern` |

Two structural wins:

1. **Cloning removes the hub machinery.** `project_hub.md` is ~90 lines of
   DataviewJS reconstructing "notes that reference this hub" from inlinks. In
   Trilium a note is cloned under both its project hub and that day's note; the
   hub becomes a Collection listing its own children. No query code.
2. **The journal is native.** `#calendarRoot` + `~dateTemplate` auto-generates
   year/month/day notes with a template applied, `api.getDayNote()` makes
   linkbacks one line, `#dateNote` makes "days touched" a search, and the
   Calendar collection view in journal mode opens or creates a day on click.

## Task model

Trilium has **no native due date, priority, or task concept** — none appear in
its predefined label list. What it does have natively is `#startDate`,
`#endDate`, `#startTime` and `#endTime`, which the Calendar collection view
reads. Crucially the calendar can be pointed at *any* label:

    #calendar:startDate="dueDate"

So `#dueDate` becomes first-class on a calendar without a bespoke widget. The
same mechanism exists for `#calendar:endDate`, `#calendar:title`,
`#calendar:recurrence` and `#calendar:displayedAttributes`.

## Topics

Topics are optional cross-categories, separate from Projects and workflow
status. Each Topic is a visible note under `Topics`, and notes carry explicit
`topic` relations plus computed `derivedTopic` relations. A Project, Person, or
Organization can therefore contribute its Topics automatically through the
note's Project, Client, On behalf of, Organization, Attendee, or Writer
relations. Derived Topics are recomputed when those source notes change and do
not overwrite explicit choices. The current-note picker shows both kinds and
suggests explicit Markdown-friendly hashtags such as `#AI`; suggestions are
never assigned automatically. The Dashboard filters across both kinds.
Topics can also have a canonical `aliasOf` relation, so names such as `AI` can
resolve to `Artificial Intelligence` without creating a second classification.
The Topics collection also includes a live index with explicit, related, and
total note counts; click a topic name to inspect its native backlinks. From
the index, topics can be renamed or merged into an existing topic. Merging
preserves note identity and lets the association hooks recompute derived
relations.

The system therefore runs two layers, which is how it marries with Task-Hub:

**Quick capture — inline checkboxes.** Written directly inside day, meeting and
project notes, exactly as they are today. Task-Hub scans note *content* for
checkboxes and infers the date from the note *title*; our day notes are titled
`2026-07-29 - Wednesday`, which matches its `YYYY-MM-DD` pattern, so those
todos are dated for free. This is why the Daily Note and Meeting templates ship
with a checkbox list.

**Structured work — task notes.** Created from the Task or Project Task
template, carrying the fields that were inline `@tags` in Obsidian:

| Obsidian | Trilium | Consumed by |
| --- | --- | --- |
| `@due(2026-08-14)` | `#dueDate` | Calendar via `#calendar:startDate` remap |
| `@priority(high)` | `#priority` | Board grouping, `#color` styling |
| `@duration(2h)` | `#duration` | Table column |
| `@complexity(multi)` | `#complexity` | Table column |
| done state | `#doneDate`, `#status` | Board columns, `#archived` |
| `project:: #x` | `~project` relation | Hub backlinks |

Meetings use the native `#startDate`/`#startTime` instead of a remap, so they
land on a calendar with no configuration at all.

> Task-Hub's distributed zip is reported broken on v0.103+, and this instance is
> v0.104.1. Alternatives to evaluate: the Render-note port by @ricolandia,
> [`trilium-extended-shiz`](https://github.com/ojamin/trilium-extended-shiz),
> [`trilium-tasks`](https://github.com/justyns/trilium-tasks). The attribute
> layer above is ours and stays valid whichever panel wins.

## ikmal

The ikmal adapter is now implemented in the separate ikmal repository. It
aggregates both structured Trilium Task/Project Task notes and inline Journal
checkboxes. Trilium remains the source of truth; ikmal is an alternate viewer
and write surface.

Structured notes support due dates, priorities, project relations, content,
completion, reopening, rescheduling, editing, and creation. Journal checkboxes
use Trilium's stable `data-list-item-id` when present and support completion and
reopening. Their Journal date becomes the ikmal due date; rescheduling an
inline checkbox is intentionally unsupported because the date belongs to the
day note, not the individual item. Deletion is disabled for safety.

The adapter follows ikmal's existing integration contract through
`core/integrations/types.js` (`kind`, `status()`, `list()`, `push()`,
`capabilities`, `initStorage()`), alongside adapters for Apple Notes,
Reminders, Asana, CalDAV, calendars, and email.

Apple Notes is the closest precedent — it also reads checklist items out of an
app with no markdown on disk — while Trilium is richer:

| Capability | Apple Notes | Trilium |
| --- | --- | --- |
| `completed` | yes | yes |
| `due` | no | **yes** (`#dueDate`) |
| `priority` | no | **yes** (`#priority`) |
| `project` | folder name | **`~project` relation** |
| `create` | no | **yes** (ETAPI) |

Identity is also easier: the Apple Notes adapter needs a shadow table with fuzzy
matching to survive renames and reorders, whereas a Trilium task note *is* a
noteId and already stable. Journal checkboxes use Trilium's item ID and verify
the text before writing, refusing a conflicting edit.

### Should we standardize on Task-Hub?

No — Task-Hub is a *viewer*, not a storage format, and standardizing on a viewer
couples the system to a single-maintainer plugin that is already broken on
v0.103+. Standardize instead on the two things that outlive any panel:

1. **Inline `- [ ]` checkboxes** for quick capture — which is also ikmal's
   contract, so the convention is shared across both hosts.
2. **The attribute layer** above for structured work.

Task-Hub, `trilium-tasks`, `trilium-extended-shiz` and an ikmal adapter then all
become interchangeable readers of the same data.

> Trilium text notes store checkboxes as HTML (`<ul class="todo-list">`), so
> the adapter parses and writes that HTML directly rather than pretending the
> notes are markdown files.

## Native labels worth using

Rather than inventing names, prefer what Trilium already understands:
`#startDate`/`#endDate`/`#startTime`/`#endTime` (calendar), `#color`,
`#iconClass`, `#cssClass` (priority styling), `#sorted`/`#sortDirection`,
`#archived` (hide completed), `#inbox` (default target for new notes),
`#bookmarked`/`#bookmarkFolder` (launch bar quick links), `#searchHome`,
`#titleTemplate`, `#run`/`#runAtHour` (scheduled scripts).

## Open decisions

- **What carries over from `services/`** (currently under `obsidian_plugin/`,
  built for the retired SQLite pipeline). Promote to the root if reused.

## Prior art worth mining

- [`trilium-collection-views`](https://github.com/mabeyj/trilium-collection-views) — closest thing to a Dataview replacement
- [`trilium-agenda`](https://github.com/BeatLink/trilium-agenda) — sorts todos into categories; same author has priority colors and recurring todos
- [`Trilium_weekly_planner`](https://github.com/ecodiv/Trilium_weekly_planner) — turns inline task lines into a board
- [`Trilium-TodoList`](https://github.com/youli42/Trilium-TodoList) — Gantt-based task panel
