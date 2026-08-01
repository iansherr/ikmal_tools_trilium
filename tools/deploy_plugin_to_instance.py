"""Deploy iansherr/notes-system package artifacts to a live Trilium instance.

Target root: Community Packages (hVY3hYDoODHc) or root container.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from tools.etapi import Etapi

ROOT_DIR = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT_DIR / "trilium-package.json"
COMMUNITY_PACKAGES_ROOT_ID = "hVY3hYDoODHc"

def deploy(url: str = "http://127.0.0.1:37843", token: str = "dummy") -> None:
    api = Etapi(url, token)
    manifest = json.loads(MANIFEST_PATH.read_text())
    
    print(f"🚀 Deploying plugin '{manifest['id']}' v{manifest['version']} to {url}...")
    
    # 1. Find or verify Community Packages root
    try:
        root_note = api.get_note(COMMUNITY_PACKAGES_ROOT_ID)
        parent_id = root_note["noteId"]
        print(f"  ✓ Target root found: '{root_note['title']}' ({parent_id})")
    except Exception:
        root_note = api.get_note("root")
        parent_id = root_note["noteId"]
        print(f"  ✓ Target fallback root: '{root_note['title']}' ({parent_id})")

    # 2. Check for existing package manifest note
    pkg_owner = manifest["id"]
    existing_pkg_notes = api.search(f'#packageOwner="{pkg_owner}"')
    
    pkg_manifest_note_id = None
    for note in existing_pkg_notes:
        owned_attrs = [a for a in note.get("attributes", []) if a.get("name") == "packageOwner" and a.get("value") == pkg_owner]
        if owned_attrs:
            pkg_manifest_note_id = note["noteId"]
            break
            
    if not pkg_manifest_note_id:
        pkg_manifest_note_id = api.create_note(
            parent_note_id=parent_id,
            title=manifest["name"],
            content=f"<h2>{manifest['name']} v{manifest['version']}</h2><p>{manifest['description']}</p>",
            note_type="doc",
        )
        print(f"  + Created package manifest note: {pkg_manifest_note_id}")
    else:
        print(f"  ✓ Found package manifest note: {pkg_manifest_note_id}")

    # Set package manifest labels
    api.set_label(pkg_manifest_note_id, "packageManaged", "")
    api.set_label(pkg_manifest_note_id, "packageOwner", pkg_owner)
    api.set_label(pkg_manifest_note_id, "packageVersion", manifest["version"])
    api.set_label(pkg_manifest_note_id, "packageEnabled", "")

    # 3. Create or update declared artifacts
    for artifact in manifest["artifacts"]:
        source_rel_path = artifact["source"]
        source_file = ROOT_DIR / source_rel_path
        
        if not source_file.exists():
            print(f"  ⚠️ Skipping missing source: {source_rel_path}")
            continue

        code_content = source_file.read_text()
        artifact_id = artifact["id"]
        artifact_type = artifact["type"]
        title = artifact.get("title", artifact_id)

        if artifact_type == "render":
            note_type = "render"
            mime = None
        elif artifact_type == "css":
            note_type = "code"
            mime = "text/css"
        elif artifact_type in ("backend", "endpoint", "widget", "launcher", "frontend"):
            note_type = "code"
            mime = "application/javascript"
        else:
            note_type = "code"
            mime = "text/plain"

        existing_artifacts = api.search(f'#packageArtifact="{artifact_id}"')
        art_note_id = existing_artifacts[0]["noteId"] if existing_artifacts else None

        if not art_note_id:
            art_note_id = api.create_note(
                parent_note_id=pkg_manifest_note_id,
                title=title,
                content=code_content,
                note_type=note_type,
                mime=mime,
            )
            print(f"  + Created artifact '{title}' ({artifact_type}): {art_note_id}")
        else:
            api.set_content(art_note_id, code_content)
            print(f"  ✓ Updated artifact '{title}' ({artifact_type}): {art_note_id}")

        api.set_label(art_note_id, "packageManaged", "")
        api.set_label(art_note_id, "packageOwner", pkg_owner)
        api.set_label(art_note_id, "packageVersion", manifest["version"])
        api.set_label(art_note_id, "packageArtifact", artifact_id)
        api.set_label(art_note_id, "packageEnabled", "")

        if artifact_type == "render":
            api.set_label(art_note_id, "renderNote", "")
        elif artifact_type == "css":
            api.set_label(art_note_id, "appCss", "")
        elif artifact_type == "backend" and artifact.get("activation") == "startup":
            api.set_label(art_note_id, "run", "backendStartup")

    print("\n🎉 Plugin deployed successfully into Trilium instance!")

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:37843"
    token = sys.argv[2] if len(sys.argv) > 2 else "dummy"
    deploy(url, token)
