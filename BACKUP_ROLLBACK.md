# Backup and rollback

Use this procedure before installing an extension update on a real Trilium
instance. The extension package is a software backup; it is not a backup of
your Journal, Projects, archive, or other user notes.

## Before an upgrade

1. Stop active editing and pause synchronization. A rollback must be applied
   consistently to every member of a synchronization cluster.
2. In Trilium, open **Settings → Backup → Existing backups → Download** and
   save the newest database backup somewhere outside the Trilium data
   directory. Trilium also keeps daily, weekly, monthly, and pre-migration
   database backups in its data directory. See the [Trilium backup guide](https://docs.triliumnotes.org/user-guide/setup/backup).
3. If you administer the server directly, make a second copy of the complete
   Trilium data directory while Trilium is stopped, including `document.db`,
   its WAL/SHM files if present, and any relevant `config.ini`. Do not copy a
   live SQLite database as your only backup.
4. Save the extension source revision and package:

   ```sh
   git rev-parse --short HEAD
   python3 tools/export_package.py
   cp -a dist /path/to/safe/extension-package-backup
   ```

   The generated package contains Templates, Dashboards, and Scripts only. It
   deliberately excludes Config and its instance-local secret.
5. Record the installed `#extensionVersion` from Config and keep the current
   ETAPI URL/token and `EXTENSION_SECRET` in a private password manager or
   deployment environment. Never put them in the package or repository.

## Install and verify

Run the update from the saved source revision or the new revision you intend
to deploy:

```sh
python3 tools/install.py
python3 tools/repair.py
bash tests/run_all.sh
```

The repair command is safe to run after install. It recreates missing
extension-owned structure and records the result in the hidden Extension
Migration Log; it does not delete user notes. Reload Trilium after the scripts
are updated and check Today, Dashboards, one Project Dashboard, and the
launchbar before resuming normal work.

## Roll back a bad upgrade

Prefer a database restore when the problem involves missing notes, damaged
branches, unexpected migrations, or a Trilium server upgrade. The database
contains the notes, tree, metadata, and most configuration; Trilium's backup
documentation describes restoring a backup by stopping Trilium, replacing
`document.db`, removing stale `document.db-wal` and `document.db-shm`, and
starting Trilium again. See the [Trilium database guide](https://docs.triliumnotes.org/user-guide/advanced-usage/database) and [restore instructions](https://docs.triliumnotes.org/user-guide/setup/backup#restoring-backup).

For a code-only problem where the database is healthy:

1. Stop creating or editing notes while deciding.
2. Check out the previously known-good extension revision.
3. Run that revision's `install.py` or `repair.py` and verify its recorded
   version. This can repair additive script/template changes, but it is not a
   substitute for restoring the database if a migration changed or deleted
   data.
4. Reload the browser and inspect the Migration Log and key workflows.

Do not use `uninstall.py` as a rollback. Uninstall removes extension-owned
runtime notes and launchbar entries; it preserves user content, but it does not
restore an earlier database state. Do not manually delete `document.db` or
extension notes until the backup is confirmed readable.

After restoring, pause synchronization until every synchronized instance is
restored or intentionally re-seeded from the same database state. Otherwise a
newer copy can propagate the bad state back into the restored instance.

## Disposable development instance

For experiments, use the repository's disposable Trilium instance instead of
the real database:

```sh
cd dev
docker compose up -d
```

Run install, repair, uninstall, reinstall, and the live test suite there before
deploying to a real instance.
