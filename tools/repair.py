#!/usr/bin/env python3
"""Repair extension-owned structure without touching user content.

This is the maintenance path for a partially deleted or stale installation.
It reuses the idempotent appliers in dependency order, then runs the same
structural verification as ``install.py``. It may recreate missing containers,
templates, scripts, launchers, dashboard widgets, and Journal repair wiring;
it never deletes notes.

    python3 tools/repair.py
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
from install import verify
from migration_log import record
from version import EXTENSION_VERSION


STEPS = (
    ("skeleton", apply_skeleton.main),
    ("templates", apply_templates.main),
    ("collections", apply_collections.main),
    ("scripts and launchers", apply_scripts.main),
)


def main() -> int:
    migration_output = []
    for name, step in STEPS:
        print(f"===== repair: {name} " + "=" * max(1, 50 - len(name)))
        captured = io.StringIO()
        with contextlib.redirect_stdout(captured):
            result = step()
        output = captured.getvalue()
        print(output, end="")
        migration_output.append(f"[{name}]\n{output}")
        if result != 0:
            print(f"\nrepair aborted during '{name}'", file=sys.stderr)
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
        record(Etapi.from_env(), "repair", EXTENSION_VERSION, "\n".join(migration_output))
        print("  migration log updated")
    except EtapiError as error:
        print(f"  warning: migration log unavailable: {error}", file=sys.stderr)

    print("  all checks passed")
    print("\nRepair complete. No user notes were deleted.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
