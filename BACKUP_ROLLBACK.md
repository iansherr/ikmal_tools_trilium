# Backup and rollback

This plugin keeps no state of its own outside Trilium's database — settings
and the YAML specification are labels on notes inside your Trilium instance
(see `README.md` → Persistence), and the artifact notes (dashboard, backend
script, CSS, launcher) are ordinary notes too. There is nothing to back up
separately from Trilium itself. This procedure is about that database, plus
knowing how to redeploy the package's code.

## Before deploying an update

1. Stop active editing and pause synchronization if this instance syncs with
   others — a rollback must be applied consistently across a sync cluster.
2. In Trilium: **Settings → Backup → Existing backups → Download**, and save
   the newest backup outside the Trilium data directory. See the
   [Trilium backup guide](https://docs.triliumnotes.org/user-guide/setup/backup).
3. If you administer the server directly, copy the complete data directory
   while Trilium is stopped (`document.db`, its WAL/SHM files if present,
   `config.ini`). Don't copy a live SQLite database as your only backup.
4. If you've made live edits to the YAML Specification in the Settings tab
   that you want tracked in git, copy them out now: Settings → Specification
   → **Copy**, then paste over `config/ians_notes_setup.yaml` and commit.
   Nothing does this automatically — the manifest note's
   `packageData:yamlSpecification` label is the only live copy, and it isn't
   in version control.
5. Note the current source revision:

   ```sh
   git rev-parse --short HEAD
   ```

## Deploy and verify

```sh
npm run build
python3 tools/deploy_plugin_to_instance.py
bash tests/run_all.sh
```

`deploy_plugin_to_instance.py` is idempotent — it finds each artifact note by
its `packageArtifact` label and updates its content in place rather than
duplicating it. It does not touch the `packageSetting:*` or
`packageData:yamlSpecification` labels, so your saved settings and
specification survive a redeploy. Reload the dashboard afterward and check
Today, Template Studio, and Settings before resuming normal work.

## Rolling back a bad deploy

Because the deploy script only ever updates artifact-note *content*, rolling
back code is: check out the previously known-good revision and redeploy.

```sh
git checkout <previous-good-revision>
npm run build
python3 tools/deploy_plugin_to_instance.py
```

This restores the dashboard/backend/CSS code, but not settings or a
specification you saved *after* that revision — those live in the manifest
note's labels independently of which code revision deployed them, so they
aren't affected by checking out older code, and won't be reverted by it
either.

If the problem is data loss or corruption rather than a bad code deploy —
missing notes, damaged branches, an unexpected migration — restore Trilium's
database instead: stop Trilium, replace `document.db`, remove stale
`document.db-wal`/`document.db-shm`, and start Trilium again. See the
[Trilium database guide](https://docs.triliumnotes.org/user-guide/advanced-usage/database)
and [restore instructions](https://docs.triliumnotes.org/user-guide/setup/backup#restoring-backup).
After restoring, pause synchronization until every synced instance is
restored or intentionally re-seeded from the same state — otherwise a newer
copy can propagate the bad state back in.

## Removing the package

Find its manifest note (`#packageOwner="iansherr/ikmal_tools" #packageArtifact="manifest"`)
and delete it along with its child artifact notes — everything the package
owns is filed under that note. This does not touch any notes the package
created for you (tasks, projects, journal entries); those are ordinary notes
with no dependency on the package continuing to exist.
