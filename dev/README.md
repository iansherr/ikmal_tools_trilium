# Trilium dev instance

A disposable Trilium server for building and testing the extension. **This is not
your daily-driver Trilium** — its database lives in `./data`, which is gitignored
and safe to delete.

```sh
docker compose up -d      # start → http://localhost:8080
docker compose logs -f    # watch startup
docker compose down       # stop, keep data
docker compose down && rm -rf data   # full reset
```

The image is pinned to `v0.104.1` so test runs are reproducible.

## Why config.ini is mounted

Backend scripting is disabled by default as of v0.104.0. The note-creation
scripts (`api.createTextNote`, `api.getDayNote`) execute on the backend, so this
instance has to opt in via `[Security] backendScriptingEnabled=true`.

The `TRILIUM_SECURITY_*` environment-variable override **does not work** for
these keys — they are only read from `config.ini`. Mounting our own copy keeps
the toggle in version control while `./data` stays disposable.

Confirm it took effect after starting:

```sh
docker compose logs | grep -i 'backend script'
# WARNING: Backend script execution is ENABLED. ...
```

If you see `Backend script execution is DISABLED`, the mount is not in place.

`sqlConsoleEnabled` is deliberately left `false` — nothing in the extension needs
raw SQL, so there's no reason to widen the attack surface.

> Backend scripts have full server access: filesystem, network, and OS commands.
> That is acceptable here because the container is local, single-user, and
> throwaway. Do not copy this config to a shared or internet-facing instance.

## First run

1. Open http://localhost:8080 and complete setup (set a password).
2. Create an ETAPI token: Options → ETAPI → Create new token.
3. Export it for the tooling:

   ```sh
   export TRILIUM_URL=http://localhost:8080
   export TRILIUM_TOKEN=<token>
   ```

ETAPI is how the install/verify/test tooling talks to this instance — the
equivalent of what `install.sh` does for the Obsidian vault.
