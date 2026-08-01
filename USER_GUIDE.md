# Using the Notes System in Trilium

This is the practical guide for the Trilium port. The system is installed as
ordinary Trilium notes: containers, templates, Collections, saved searches,
and code notes. There is no separate Trilium plugin to enable.

Planned improvements are tracked in [`ROADMAP.md`](ROADMAP.md). The roadmap is
deliberately incremental: each change is installed and tested before the next
workflow layer is changed.

## Install once

The supported installer needs Python 3, a reachable Trilium instance, and an
ETAPI token with permission to create and update notes.

1. Use Trilium v0.104.1 or later and enable backend scripting. The backend
   scripts create notes, clone them into the Journal, and serve the launcher
   request endpoint.
2. In Trilium, create an ETAPI token from the Options / ETAPI settings.
3. Set the connection variables in the shell:

   ```sh
   export TRILIUM_URL=http://localhost:8080
   export TRILIUM_TOKEN=<your-etapi-token>
   ```

4. Install and verify:

   ```sh
   python3 tools/install.py
   ```

5. Reload Trilium in the browser. The launcher buttons appear in the launch bar.

The installer is idempotent: run it again after pulling an update. It updates
the extension notes and preserves your content notes. It does not uninstall or
delete user notes. The installed extension version is recorded as
`#extensionVersion` on Config; bump `tools/version.py` when shipping a
versioned change.

The update path is covered against the disposable Trilium 0.104.1 rig: two
consecutive installs converge to the same marked notes and verification passes
without duplicate containers, templates, Collections, or scripts.

If an extension-owned note, launcher, template, dashboard widget, or Journal
repair hook is accidentally removed, run
`python3 tools/repair.py`. Repair re-runs the idempotent
creation and wiring steps, verifies the result, and never deletes user notes.
Each install or repair also appends a timestamped summary to the hidden
**Extension Migration Log**, including preserved layout and unchanged notes.

For a clean removal, run `python3 tools/uninstall.py`. It
removes extension-owned implementation notes, launchbar entries, dashboards,
and empty fallback containers while preserving Journal, Projects, People,
Organizations, and the archive. Use Trilium’s own database backup/export before
installing on a real instance.

Before upgrades, follow the [backup and rollback procedure](BACKUP_ROLLBACK.md).
It covers Trilium database backups, extension package snapshots, verification,
and safe recovery boundaries.

### Disposable local instance

For a safe test rig rather than a real Trilium server:

```sh
cd dev
docker compose up -d
```

Open `http://localhost:8080`, complete setup, create an ETAPI token, then run
the installer from the repository root. The dev database is in `dev/data/` and
is gitignored. It is disposable; do not use this configuration for a shared or
internet-facing server.

## What the installer creates

The top-level notes are the system’s stable destinations:

| Note | Use |
| --- | --- |
| Journal | Native day, month, and year notes |
| Today | Stable pinned entry point for the current Journal note |
| Projects | Active, archived, and unassigned project hubs; shown as a table Collection |
| Meetings | Cross-project meeting calendar/search view |
| Drafts | Story drafts, surfaced as a Dashboard search |
| Emails | Email drafts, stored under their Project Hub or `Projects/Unassigned` |
| Tasks | Cross-project task view; notes are stored under their Project Hub or `Projects/Unassigned` |
| People | Person notes; shown as a table Collection |
| Organizations | Organization notes; shown as a table Collection |
| Topics | Optional cross-categories; Topic notes are shown as a table Collection |
| Templates | The reusable note templates; stored in Trilium’s hidden system subtree |
| Dashboards | One-page Dashboard containing cross-project saved-search widgets |
| Scripts | Implementation notes; stored in Trilium’s hidden system subtree |
| Config | Instance-local handler secret; stored in Trilium’s hidden system subtree |

Projects is organized as `Active`, `Archive`, and `Unassigned`. New Project Hubs
are created under `Projects/Active`. Existing direct-child hubs are migrated to
Active or Archive during installation; completed hubs go to Archive. Moving a
hub between those folders changes its visibility without changing the note or
any of its relations.

The Projects table includes the latest round number, current status, and next
action for each Project Hub. These are views of the Hub’s existing attributes,
not duplicate fields.

Use **Archive Project** from a Project Dashboard or round note to move the Hub
into `Projects/Archive`. This is separate from **Mark Project Complete**: it
changes physical project-area placement but does not mark the current round
done. Use **Reopen Project** from either view to move the Hub back to
`Projects/Active` and restore its active status.

Pin the **Today** note once in Trilium’s tab bar. It refreshes the current date
automatically and provides an **Open Today’s Journal** button that opens the
editable day note in a split, so yesterday’s day note does not need to remain
open or be closed manually. The Journal pane starts at 65% width; open the
collapsed **Today layout** panel at the bottom to adjust it, or drag Trilium’s
split divider. The selected width is remembered even if the Journal split has
not been opened yet. The page also includes the launchbar’s quick-capture
actions and a single-column live dashboard in this order: Active Projects,
Recently Touched, Drafts, Overdue, Due Soon, Follow-ups Due, Awaiting Replies,
High Priority, and Emails.

Empty Today widgets offer a relevant quick-capture action when possible—for
example, **New Task** for an empty task view or **New Story** for empty drafts.
Cross-project Today results show the related Project as a link. Story rounds
also show a breadcrumb with links back to Projects, the Project Hub, and its
Project Dashboard. Links from Today’s widgets open the target note in a new
tab, while **Open Today’s Journal** intentionally uses the split pane.
Project, dashboard, breadcrumb, and filter links also open in a new tab so an
edited note is not silently replaced. Newly created notes still open directly
because that is an explicit capture action.

The actual automation source is versioned under `src/` in
this repository. The installed code notes are a runtime copy of those files.

Scripts are editable code notes, but they are deployment artifacts: rerunning
the installer replaces their bodies from `src/`. Config is a normal text note;
its meaningful settings (`#createNoteSecret` and `#extensionVersion`) are
labels in Owned Attributes rather than body text.

## Daily workflow

### Capture a note

Use a toolbar launcher:

- New Meeting
- New Story
- New Edit
- New Scratch
- New Email
- New Task
- New Project Hub
- New Person
- New Organization

The Story and Edit launchers ask for a title, create the matching project hub
and first draft, and open it. A project story creates two linked notes: the
actual writing file is named `Title — Draft 1`, while a separate **Reporting
Notes** file contains Links, Open Questions, Idea / Angle, and Reporting Notes.
Reporting Notes includes shortcuts for creating meetings, people,
organizations, and a client tied to that Project Hub. New Scratch asks where the note belongs, then
creates a blank note without a template. Choose a Project Hub or leave it in
Projects/Unassigned for later.
Every type except Project Hub is also cloned into today’s Journal note. That is
intentional: the note has one identity but can appear in both its content
container and the day where it was created. Project Hubs are dateless and are
not cloned into a day. If today’s day note is deleted and recreated, the
extension repairs those branches for extension notes created today. It does not
infer a history of unrelated older notes merely edited today.

If the buttons are missing, reload the browser after installation. If they still
do not appear, check that the `Scripts` note exists and that backend scripting is
enabled. Upgrades remove launchers left behind by older versions, so a second
reload may be needed after installing an update.

### Work from the Journal

Open Journal and select today’s day note. Trilium creates missing day notes from
the Daily Note template. Use the inline checklist for quick capture and use
structured Task notes when the work needs a due date, priority, project, or
status. Each Daily Note also includes a live **Open Tasks** widget that links to
unfinished Task notes across projects; it is a view of the saved search, not a
second copy of the tasks.

### Use the dashboards

Open Dashboards for cross-cutting views:

The Dashboard’s filter widget can narrow all saved-search widgets by modified
time range, Project Hub, status, or Writer assignment. Time range means notes
modified within the selected period; **Clear** restores the unfiltered views.
The filter widget also reports how many notes the dashboard matches and calls
out failed widget searches or a filter combination with no results.
Use **Collapse widgets** for a compact overview, **Expand widgets** when
calendars and tables need more room, or **Reset layout** to restore the shipped
geometry. Existing manual positions are preserved until one of these controls
is chosen.

- **Due Soon** — unfinished notes with a due date within seven days.
- **Task Calendar** — unfinished notes with `#dueDate` on a calendar.
- **Meeting Calendar** — all meeting notes using `#startDate`, regardless of project.
- **Open Tasks** — unfinished tasks across all projects and Unassigned.
- **Overdue** — unfinished tasks whose due date is before today.
- **Recently Touched** — extension notes modified within the last seven days,
  excluding Journal day notes.
- **Upcoming Meetings** — meeting notes ordered by start date.
- **Active Projects** — active project and edit hubs, excluding the Archive branch.
- **Drafts** — unfiled story drafts across all projects.
- **Emails** — unfiled email drafts across all projects.
- **High Priority** — unfinished notes with `#priority=high`.
- **Awaiting Replies** — unfinished notes with `#status=awaiting`, ordered by follow-up date.
- **Follow-ups Due** — unfinished notes with a follow-up date in the next seven days.

Projects, Active, Archive, People, and Organizations are Collections or
collection-style directories. Meetings and Tasks are
cross-project saved-search views. The visible `Projects/Unassigned` note is the
quick-capture fallback; assigning a Project relation later makes the note appear
on that hub’s dashboard without changing its identity.

## Templates and fields

Creating a note through a launcher attaches a `~template` relation. The
template’s promoted attributes appear at the top of the note as editable fields.
The content scaffolds retain the useful sections from the original Obsidian
templates. Dataview-driven sections are intentionally represented by native
Trilium relations, Collections, backlinks, or the Project Dashboard instead
of copied query code.

Useful structured fields include:

| Note type | Fields |
| --- | --- |
| Task / Project Task | Due, Priority, Duration, Complexity, Status, Done, Project, Topics |
| Meeting / Meeting Prep | Meeting date, Start time, Attendees, Organization, Project, Topics |
| Story Draft | Client, On behalf of, Round, Status, Done, Project, Topics |
| Reporting Notes | Client, Project, Topics |
| Email Draft | Client, On behalf of, Status, Project, Topics |
| Person | Job focus, Employer, Project, Topics |
| Organization | Location, Ticker, People, Project, Topics |
| Project Hub | Kind, Status, Next action, Client, On behalf of, Started, Writer, Current round, Related Hubs, Topics |

Topics are optional multi-relations to notes under **Topics**. Open any working
note and use the **Topics** control to select several topics or create a new
one. If the note contains explicit Markdown-friendly hashtags such as `#AI`,
the picker shows them as suggestions; it does not assign or create them until
you click. Topics on a Project, Person, or Organization are also inherited as
derived Topics when that note is related through Project, Client, On behalf of,
Organization, Attendee, or Writer. Derived Topics update automatically when
the source changes; the picker shows the source note and **Keep explicit**
promotes a derived Topic into a durable choice. Explicit Topics are never
removed. A note can have no Topics at all. The native relations are the source
of truth for backlinks,
Collections, and Dashboard filtering.

Open **Topics** to see the live Topic index. It shows how many notes use each
topic explicitly, how many receive it through a related note, and the combined
total. Click a topic name to open it and inspect Trilium’s native backlinks;
use **Refresh** after changing relations in another note. **Rename** changes
the topic note without disturbing its relations. **Merge** moves explicit
relations into an existing topic and removes the duplicate topic note; derived
relations then recalculate normally.

To preserve a familiar hashtag while keeping one canonical classification,
create the short-name Topic, then use **Alias** in the Topic index and choose
the canonical Topic. Existing explicit relations are moved to the canonical
Topic. The picker displays the alias and identifies its canonical Topic.

The picker groups **Selected**, **Related**, and **Available** Topics. Selected
Topics appear as removable chips, aliases can select their canonical Topic in
one click, and the Save button shows the number of Topics being saved.
Hashtags found in the note are actionable: known hashtags can select an
existing Topic, aliases can select their canonical Topic, and unknown hashtags
can **Create & select** a new Topic. These actions always require your click.
On the note itself, explicit Topics appear as blue chips and related Topics as
secondary chips; click a chip to open the Topic or × to remove an explicit one.
Clicking the chip itself opens a details popover with its explicit/related
status, aliases, source notes, and quick actions.
For a related Topic, the popover also includes **Keep explicit** so it can be
promoted without opening the full picker.
Use **Ctrl/Cmd+Shift+T** to open the picker. The picker supports arrow-key
navigation, Enter to activate the focused choice, and protects unsaved changes
when you close it.

Client and On behalf of are controlled relations to notes in People or
Organizations. Use **New Client** beside a client field to enter the name and
choose Person or Organization; the matching note is created and assigned in
one step. Use **New Organization** for an organization-only field. Reporting
Notes also provides New Meeting, New Person, and New Organization shortcuts;
those captures are linked to the current Project Hub while People and
Organizations remain in their global directories.
For a genuine one-off, add `#clientOverride` or `#companyOnBehalfOverride` as an
ordinary label on that note. These labels remain text on that note and do not
create a relationship. If you later create the matching Organization, remove
the override label and replace it with the relation.

Waiting on, Follow-up, and Last sent are internal editorial-state labels. They
are populated by the dashboard’s **Mark Awaiting Reply** action rather than
shown as duplicate form fields.

To finish a task, set `Done` or change its status. To put work on a project
dashboard, set its `Project` relation to the hub. A relation is stronger than a
text tag: Trilium can follow it, show backlinks, and use it in the dashboard.

## Project Hubs

1. Click **New Project Hub**.
2. Fill in Kind, Status, Client, On behalf of, and Started as appropriate.
3. Create meetings, drafts, emails, or tasks from their toolbar buttons while
   the hub is active; they are stored directly under that hub.
4. If there is no active project, the note is stored under `Projects/Unassigned`.
   Set the promoted **Project** field later when you know where it belongs.
5. Open the **Project Dashboard** child under the hub.

Project Hubs use a book icon; Edit Hubs use a pencil icon. The `Kind` field
remains the authoritative value for sorting and filtering.

For an editing workflow, use **New Edit Round** inside the Project Dashboard.
It asks for the story or round title, links the new Story Draft to this hub,
assigns the next round number, sets its initial status to `editing`, clones it
into today’s Journal, and opens the new note.

Edit-round titles automatically receive `— Round N` when they do not already
contain a `Round N` or `vN` marker. The latest round’s Client and On behalf of
relations are reflected on the Project Hub when its dashboard opens. They are
also synchronized automatically when Client or On behalf of is changed on the
Project Hub, a Story Draft round, or its Reporting Notes. The synchronizer only
writes a relation when the target value differs, runs transactionally, and
ignores deleted or empty attribute events; this keeps the follow-up events
finite and prevents an unrelated edit from clearing project metadata.

The dashboard’s round actions keep the workflow moving: **Mark Awaiting Reply**
records who you are waiting on, the last-sent date, and a follow-up date;
**Mark Project Complete** records the completion date, sets Done, and marks
the parent Edit Hub complete. **New Round** starts the next pass and reopens
that hub as active.

The global **New Story** button starts your own writing workflow. **New Edit**
starts an editorial workflow for someone else’s story. Both create the matching
Project Hub and first Story Draft automatically. For later passes on an edit,
use **New Edit Round** on that edit hub.

Your own writing workflow creates a separate `<Project Title> — Reporting Notes`
file with
**LINKS**, **OPEN QUESTIONS**, **IDEA / ANGLE**, and **REPORTING NOTES**. The
actual first draft is a separate `Title — Draft 1` note containing the story
fields. Edit
rounds use **LINKS**, **OPEN QUESTIONS**, **EDITORIAL NOTES**, and **REQUESTED
CHANGES**, followed by **WRITER RESPONSE** at the end. Put the highest-value
references and unresolved questions at the top in either workflow.

Managed Reporting Notes follow a Project Hub title change automatically. If you
rename the Reporting Notes file itself, it becomes a deliberate custom title
and will no longer be changed by the extension.

The dashboard contains project-scoped views:

- **Rounds** — linked notes with a `#round` field.
- **Open Tasks** — unfinished task notes linked to the hub.
- **Meetings** — meeting notes linked to the hub.
- **Emails** — email drafts linked to the hub.
- **Awaiting Replies** — linked notes whose status is `awaiting`.
- **Follow-ups Due** — linked notes with a follow-up date within seven days.
- **Timeline** — linked notes, with recent notes expanded and older notes collapsed.
- **Days Touched** — Journal days containing a clone of a linked note.
- **Related Hubs** — hubs connected through the `Related Hubs` relation.

An empty dashboard shows a short next-step message instead of blank
sections. The related sections appear as soon as they have content. A writing
hub shows only **New Draft**; the reply-state actions appear only on an edit hub
with a current round. The dashboard does not infer a project from a title or a
folder.

Follow-up dates are highlighted when they are overdue or due today. The layout
uses Trilium's existing tables and buttons and collapses cleanly in a narrow
pane.

## Hidden implementation notes

The installer places Templates, Scripts, Config, and compatibility fallback
containers for Drafts and Emails under Trilium’s built-in
`_userHidden` system subtree. They remain accessible to the installer and
through direct relations, but are not shown in the normal tree or search. To
perform deliberate maintenance, use Trilium’s Advanced menu and choose “Show
Hidden Subtree.” To remove the extension, run
`python3 tools/uninstall.py`; it removes only extension-owned
runtime notes and empty containers, preserving user content and the archive.

Edit the matching source file under `src/` when changing
automation; a later install deploys that source into Trilium.
The hidden **Extension Migration Log** records installer and repair activity;
it is diagnostic history, not user content.

The `UI button ...` notes sometimes visible in the disposable dev instance are
browser-test fixtures. They are ordinary content notes and can be deleted from
that test instance; they are not required by the extension.

## Use the system from ikmal

ikmal can treat Trilium Task, Project Task, and Journal inline-checkbox items
as an experimental task source while Trilium remains the authoritative editor:

1. Open ikmal Settings → Integrations → Trilium.
2. Enter the Trilium URL and ETAPI token, enable the integration, and save.
3. ikmal discovers the extension’s `#taskRoot` and `#extTemplate` markers; no
   Trilium note ID needs to be copied into ikmal settings.

Structured tasks use each note’s immutable Trilium `noteId` as their stable
identity. Journal checkboxes use Trilium’s `data-list-item-id` and verify their
text before writing. Structured tasks support due dates, priorities, projects,
content, completion, reopening, rescheduling, ordinary edits, and creation;
Journal checkboxes support completion and reopening only. Deletion is
deliberately disabled. Story Draft and Project Hub notes stay in Trilium’s
editorial workflow rather than being flattened into ikmal tasks.

## Updating and testing

After changing the repository or pulling an update:

```sh
python3 tools/install.py
bash tests/run_all.sh
```

The test suite creates temporary notes with unique names and cleans them up.
The complete installer also checks containers, templates, scripts, saved-search
queries, and the Journal template relation.

## Backup and packaging

Use Trilium’s own database backup/export for your real content. The repository
packager is different:

```sh
python3 tools/export_package.py
```

That command exports only the structural Templates, Dashboards, and Scripts
subtrees. It is a distributable system package, not a backup of your Journal,
Tasks, Meetings, or Projects.

## Security notes

Backend scripting has server-level access. Keep it enabled only on an instance
you trust, and do not expose the disposable dev configuration publicly. The
custom note-creation endpoint uses an instance-local secret stored on Config;
the secret is deliberately not packaged with the extension.
