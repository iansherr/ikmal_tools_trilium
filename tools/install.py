#!/usr/bin/env python3
"""Install the whole extension into a Trilium instance.

The Trilium counterpart to ``obsidian_plugin/install.sh``. Runs the appliers in
dependency order and then verifies the result, so a fresh instance and an
already-installed one both converge to the same state.

    python3 tools/install.py

Requires TRILIUM_URL and TRILIUM_TOKEN (or dev/.env).
"""

from __future__ import annotations

import contextlib
import io
import sys

import apply_collections
import apply_scripts
import apply_skeleton
import apply_templates
from etapi import Etapi, EtapiError
from migration_log import record
from version import EXTENSION_VERSION

# Order matters: templates need the Templates container, collections and scripts
# need both.
STEPS = (
    ("skeleton", apply_skeleton.main),
    ("templates", apply_templates.main),
    ("collections", apply_collections.main),
    ("scripts", apply_scripts.main),
)


def verify(api: Etapi) -> list[str]:
    """Post-install checks. Returns a list of problems, empty if healthy."""
    problems = []

    for container in apply_skeleton.CONTAINERS:
        if api.find_by_label(container.marker) is None:
            problems.append(f"missing container #{container.marker}")

    templates_root = api.find_by_label("templateRoot")
    if templates_root is None:
        problems.append("missing #templateRoot")
    else:
        for template in apply_templates.TEMPLATES:
            if apply_templates.find_template(api, templates_root, template.marker) is None:
                problems.append(f"missing template '{template.marker}'")

    scripts_root = api.find_by_label("scriptRoot")
    if scripts_root is None:
        problems.append("missing #scriptRoot")
    else:
        script_parents = {"": scripts_root}
        for script in apply_scripts.SCRIPTS:
            parent_id = script_parents.get(script.parent_marker or "")
            if parent_id is None:
                problems.append(
                    f"missing parent script marker '{script.parent_marker}'"
                )
                continue
            note_id = apply_scripts.find_script(api, parent_id, script.marker)
            if note_id is None:
                problems.append(f"missing script '{script.marker}'")
            else:
                script_parents[script.marker] = note_id

    # A malformed search returns nothing rather than erroring, so a broken
    # dashboard would otherwise look merely empty.
    for saved in apply_collections.SAVED_SEARCHES:
        try:
            api.search(saved.search)
        except EtapiError as error:
            problems.append(f"saved search '{saved.title}' is invalid: {error}")

    journal = api.find_by_label("calendarRoot")
    if journal is not None:
        relations = [
            a for a in api.get_note(journal).get("attributes", [])
            if a["type"] == "relation" and a["name"] == "dateTemplate"
        ]
        if not relations:
            problems.append("journal has no ~dateTemplate — day notes will be blank")

    config = api.find_by_label("extConfig")
    if config is None:
        problems.append("missing #extConfig")
    else:
        installed_version = next(
            (
                a.get("value")
                for a in api.get_note(config).get("attributes", [])
                if a.get("noteId") == config
                and a.get("type") == "label"
                and a.get("name") == "extensionVersion"
            ),
            None,
        )
        if installed_version != EXTENSION_VERSION:
            problems.append(
                f"extension version is {installed_version or 'unset'} "
                f"(expected {EXTENSION_VERSION})"
            )

    return problems


def main() -> int:
    migration_output = []
    for name, step in STEPS:
        print(f"===== {name} " + "=" * (60 - len(name)))
        captured = io.StringIO()
        with contextlib.redirect_stdout(captured):
            result = step()
        output = captured.getvalue()
        print(output, end="")
        migration_output.append(f"[{name}]\n{output}")
        if result != 0:
            print(f"\ninstall aborted during '{name}'", file=sys.stderr)
            return 1
        print()

    print("===== verify " + "=" * 55)
    try:
        problems = verify(Etapi.from_env())
    except EtapiError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    if problems:
        for problem in problems:
            print(f"  FAIL {problem}", file=sys.stderr)
        return 1

    try:
        record(Etapi.from_env(), "install", EXTENSION_VERSION, "\n".join(migration_output))
        print("  migration log updated")
    except EtapiError as error:
        print(f"  warning: migration log unavailable: {error}", file=sys.stderr)

    print("  all checks passed")
    print("\nInstalled. Reload the browser for the launcher buttons to appear.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
