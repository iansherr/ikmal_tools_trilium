# Trilium FAQ

## Is this a Trilium plugin?

No. Trilium has no Obsidian-style plugin package here. The system is made from
ordinary Trilium notes plus the ETAPI installer: templates, Collections, saved
searches, Render notes, and frontend/backend code notes.

## Do I need to edit the installed code notes?

No for normal use. Edit content notes in Trilium. If automation itself needs a
change, edit the matching file under `src/` and rerun
`tools/install.py`; the installer updates the runtime code notes.

## Why does a new meeting appear twice?

It is one note with two parents: its normal container and today’s Journal note.
Trilium cloning is being used deliberately so the day shows what was created
without duplicating the note’s identity.

## How should I use Topics?

Use Topics only when a note is useful outside its Project or workflow. Open a
note, click **Topics**, and select one or more subjects. The picker also shows
explicit `#hashtags` from the title or body as suggestions. Topics are stored as
native relations to notes under **Topics**, not as raw labels, so they support
backlinks and Dashboard filtering. Topics on a related Project, Person, or
Organization appear automatically as derived Topics. Those derived Topics are
recomputed when the source changes; manually selected Topics are preserved.
Leaving a note unclassified is completely fine.

The **Topics** collection includes a live index with explicit, related, and
total note counts. Click a topic to inspect its backlinks, or use **Refresh**
after changing relations elsewhere. The index can also rename a topic or
merge it into an existing topic; merge only removes the duplicate Topic note
after its explicit relations are moved.
Use **Alias** when two names should remain visible but resolve to one canonical
Topic.

## Why is a Project Hub not cloned into the Journal?

A hub represents an ongoing project, not a single day. Its dashboard gets days
through the notes related to it.

## How do I keep today’s Journal note handy?

Pin the top-level **Today** note once. It is a stable render note that updates
to the current Journal day and opens that day’s editable note in a split. It
does not create a new tab for yesterday when the date changes, and it includes
the same quick-capture actions as the launchbar plus a single-column live view
of Active Projects, Recently Touched, Drafts, Overdue, Due Soon, Follow-ups Due,
Awaiting Replies, High Priority, and Emails.

The Daily Note template also adds a live Open Tasks widget. It links to the
actual unfinished Task notes and does not duplicate or embed their contents.
If a day note is deleted and recreated, extension notes created that day are
reattached automatically when the day note is opened.

## Why is my Project Dashboard empty?

Set the linked note’s promoted **Project** relation to the hub. The dashboard
uses actual relations, not a title search. Rounds also require `#round`, and
Open Tasks only includes unfinished notes under Tasks.

On a new hub this is expected: the dashboard shows a compact next-step message
and hides empty sections until there is related activity.

## Where should I put an old project?

Move the Project Hub into `Projects/Archive`. This preserves the same note,
dashboard, relations, and history. New hubs are created in `Projects/Active`,
and the Active Projects dashboard excludes the Archive branch.

## How should I track multiple edit rounds?

Create one `kind=edit` Project Hub per story. Use **New Edit Round** on that
hub for each meaningful pass or returned draft. It links the note and assigns
the next `#round` automatically. Set `#status=awaiting` and a `#followUpDate`
when the next move belongs to the writer or editor; those notes appear in
Awaiting Replies and Follow-ups Due.

On the Project Dashboard, **Mark Awaiting Reply** and **Mark Project Complete**
update the current round for you. The awaiting action asks for the person and
follow-up date; project completion is immediate. Use **New Round** from the
dashboard or any round note to start the next pass.

The global **New Story** button starts your own writing workflow, while **New
Edit** starts an editorial workflow for someone else’s story. Both create the
matching hub and first draft so new stories do not become unlinked notes. Use
**New Scratch** for a blank, untemplated note; it asks whether to place it in a
Project Hub or Projects/Unassigned.

If you cancel a title or enter an invalid mode, no notes are created. Editorial
actions reject unknown notes, invalid dates, and incomplete awaiting-reply
details.

## Where did the toolbar buttons go?

Reload the browser after installation. Then check that Scripts exists and that
backend scripting is enabled. If the handler secret is missing, rerun the
installer so Config receives `#createNoteSecret`. Upgrades remove the old
deprecated toolbar launchers and recreate the current launchbar entries.

## Why can’t I see the script notes?

That is intentional. Install places Scripts under Trilium’s built-in
`_userHidden` system subtree. The notes remain live and are accessible to the
installer, but are not shown in the normal tree. If you need to inspect them,
use Trilium’s Advanced menu and choose “Show Hidden Subtree.”

## Why are Templates, Scripts, and Config visible?

They are implementation notes, not working content. Templates, Scripts, and
Config are stored in Trilium’s built-in `_userHidden` system subtree, which is
intended for internal notes created by scripts. They remain accessible to the
installer and through direct relations. Trilium can still reveal them through
Advanced → Show Hidden Subtree when deliberate maintenance is needed.

## Why can’t I edit a script or Config?

The installed script notes are editable Trilium code notes, but their source of
truth is `src/`; reinstalling overwrites their bodies. Config
settings are labels in Owned Attributes, not the body. Neither is protected or
marked read-only by the installer.

## Can I delete notes named “UI button ...”?

Yes, if they are from the disposable dev instance. They are fixtures created by
the browser test. They are not source files and are not needed by the installer.

## Does Trilium sync with Obsidian or ikmal?

Not currently. Trilium stores notes in its own database; ikmal reads Markdown
files and does not see Trilium’s task notes. Treat the chosen host as the source
of truth until an adapter is built.

## Is `export_package.py` a backup?

No. It exports only the system’s structural notes so they can be distributed or
imported elsewhere. Back up the real Trilium database using Trilium’s own backup
mechanism.

## How do I reset the test instance?

Only for the disposable dev instance:

```sh
cd dev
docker compose down
```

Removing `dev/data/` resets the database completely. Never do that to a real
Trilium data directory.
