"""Deploy iansherr/ikmal_tools_trilium package artifacts to a live Trilium instance.

Target root: Community Packages (hVY3hYDoODHc) or root container.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

try:
    from etapi import Etapi
except ImportError:
    from tools.etapi import Etapi

ROOT_DIR = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT_DIR / "trilium-package.json"
COMMUNITY_PACKAGES_ROOT_ID = "M1qSmOJaJaSK"
PACKAGE_MANIFEST_NOTE_ID = "iDm3LsUiZ51T"


def manifest_tree_notes(api: Etapi, manifest_note_id: str) -> list[dict]:
    """Load a package tree directly; ETAPI search omits hidden notes."""
    result = []
    pending = [manifest_note_id]
    seen = set()
    while pending:
        note_id = pending.pop()
        if note_id in seen:
            continue
        seen.add(note_id)
        note = api.get_note(note_id)
        result.append(note)
        pending.extend(note.get("childNoteIds", []))
    return result


def owned_artifacts(api: Etapi, owner: str, artifact_id: str) -> list[dict]:
    """Return only this package's artifacts; packageArtifact is not globally unique."""
    # Search by owner first. Hidden package notes are not consistently returned
    # by artifact-only searches in every Trilium frontend/cache state.
    candidates = api.search(f'#packageOwner="{owner}"')
    if not candidates and owner == "iansherr/ikmal_tools_trilium":
        candidates = manifest_tree_notes(api, PACKAGE_MANIFEST_NOTE_ID)
    return [
        note for note in candidates
        if any(
            attr.get("noteId") == note["noteId"]
            and attr.get("name") == "packageArtifact"
            and attr.get("value") == artifact_id
            for attr in note.get("attributes", [])
        )
    ]


def current_artifact(api: Etapi, owner: str, artifact_id: str) -> dict | None:
    candidates = [
        note for note in owned_artifacts(api, owner, artifact_id)
        if not any(a.get("name") == "archived" and a.get("noteId") == note["noteId"]
                   for a in note.get("attributes", []))
    ]
    return candidates[0] if candidates else None


def active_owned_notes(api: Etapi, owner: str) -> list[dict]:
    """Return active package notes without silently creating a second tree."""
    candidates = api.search(f'#packageOwner="{owner}"')
    if not candidates and owner == "iansherr/ikmal_tools_trilium":
        candidates = manifest_tree_notes(api, PACKAGE_MANIFEST_NOTE_ID)
    return [
        note for note in candidates
        if not any(a.get("name") == "archived" and a.get("noteId") == note["noteId"]
                   for a in note.get("attributes", []))
        and not any(a.get("name") == "transaction" and a.get("noteId") == note["noteId"]
                    for a in note.get("attributes", []))
    ]

def deploy(url: str = "http://127.0.0.1:37843", token: str = "dummy", manifest_path_str: str | None = None) -> None:
    api = Etapi(url, token)
    manifest_path = Path(manifest_path_str) if manifest_path_str else MANIFEST_PATH
    manifest = json.loads(manifest_path.read_text())
    base_dir = manifest_path.parent
    
    print(f"🚀 Deploying plugin '{manifest['id']}' v{manifest['version']} to {url}...")
    
    # 1. Resolve the hidden Community Packages root by its stable label. An
    # earlier local helper used a stale ID and silently fell back to `root`,
    # making the entire package tree visible to users.
    try:
        root_note = api.get_note(COMMUNITY_PACKAGES_ROOT_ID)
    except Exception as cause:
        raise RuntimeError(
            "Could not resolve the hidden Community Packages root; refusing to install into root. "
            "Open Settings → Plugins once to initialize the package manager."
        ) from cause
    parent_id = root_note["noteId"]
    print(f"  ✓ Target hidden root found: '{root_note['title']}' ({parent_id})")

    # 2. Check for existing package manifest note
    pkg_owner = manifest["id"]
    existing_pkg_notes = owned_artifacts(api, pkg_owner, "manifest")
    
    pkg_manifest_note_id = None
    for note in existing_pkg_notes:
        owned_attrs = [a for a in note.get("attributes", []) if a.get("name") == "packageOwner" and a.get("value") == pkg_owner]
        if owned_attrs:
            pkg_manifest_note_id = note["noteId"]
            break
            
    if not pkg_manifest_note_id:
        active_notes = active_owned_notes(api, pkg_owner)
        if active_notes:
            raise RuntimeError(
                f"Refusing to create a duplicate active package tree for {pkg_owner}: "
                f"{len(active_notes)} existing package note(s) were found but no manifest was resolved. "
                "Use Community Packages → Repair or archive the existing package before retrying."
            )
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
    api.set_label(pkg_manifest_note_id, "packageArtifact", "manifest")
    api.set_label(pkg_manifest_note_id, "packageEnabled", "true")
    api.set_label(pkg_manifest_note_id, "packageManifest", json.dumps(manifest, separators=(",", ":")))

    # 3. Create or update declared artifacts
    for artifact in manifest["artifacts"]:
        dist_rel_path = artifact["source"].replace("src/", "dist/").replace(".jsx", ".js")
        dist_file = base_dir / dist_rel_path
        source_file = dist_file if dist_file.exists() else (base_dir / artifact["source"])
        
        if not source_file.exists():
            print(f"  ⚠️ Skipping missing source: {artifact['source']}")
            continue

        code_content = source_file.read_text()
        artifact_id = artifact["id"]
        artifact_type = artifact["type"]
        title = artifact.get("title", artifact_id)


        if artifact_type == "render":
            # For render notes, create a parent render note + child code note (mime: application/javascript;env=frontend)
            existing_render = current_artifact(api, pkg_owner, artifact_id)
            render_note_id = existing_render["noteId"] if existing_render else None

            if not render_note_id:
                render_note_id = api.create_note(
                    parent_note_id=pkg_manifest_note_id,
                    title=title,
                    content="<div class='notes-system-root'></div>",
                    note_type="render",
                )
                print(f"  + Created render container '{title}': {render_note_id}")
            else:
                api.set_content(render_note_id, "<div class='notes-system-root'></div>")
                print(f"  ✓ Updated render container '{title}': {render_note_id}")

            api.set_label(render_note_id, "packageManaged", "")
            api.set_label(render_note_id, "packageOwner", pkg_owner)
            api.set_label(render_note_id, "packageVersion", manifest["version"])
            api.set_label(render_note_id, "packageArtifact", artifact_id)
            api.set_label(render_note_id, "packageEnabled", "true")

            # Check or create child script note
            script_title = f"{title} (Script)"
            existing_script = current_artifact(api, pkg_owner, f"{artifact_id}-script")
            script_note_id = existing_script["noteId"] if existing_script else None

            script_body = code_content


            if not script_note_id:
                script_note_id = api.create_note(
                    parent_note_id=render_note_id,
                    title=script_title,
                    content=script_body,
                    note_type="code",
                    mime="text/jsx",
                )
                print(f"  + Created render script '{script_title}': {script_note_id}")
            else:
                api.set_content(script_note_id, script_body)
                api.set_mime(script_note_id, "text/jsx")
                print(f"  ✓ Updated render script '{script_title}': {script_note_id}")

            api.set_label(script_note_id, "packageManaged", "")
            api.set_label(script_note_id, "packageOwner", pkg_owner)
            api.set_label(script_note_id, "packageVersion", manifest["version"])
            api.set_label(script_note_id, "packageArtifact", f"{artifact_id}-script")
            api.set_label(script_note_id, "packageEnabled", "true")

            # Link parent render note to child script note via ~renderNote relation
            api.set_relation(render_note_id, "renderNote", script_note_id)

        else:
            if artifact_type == "css":
                note_type = "code"
                mime = "text/css"
            elif artifact_type == "frontend":
                note_type = "code"
                mime = "application/javascript;env=frontend"
            elif artifact_type == "backend":
                note_type = "code"
                mime = "application/javascript;env=backend"
            elif artifact_type in ("endpoint", "widget", "launcher"):
                note_type = "code"
                mime = "application/javascript"
            else:
                note_type = "code"
                mime = "text/plain"

            existing_artifact = current_artifact(api, pkg_owner, artifact_id)
            art_note_id = existing_artifact["noteId"] if existing_artifact else None

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
                api.set_mime(art_note_id, mime)
                print(f"  ✓ Updated artifact '{title}' ({artifact_type}): {art_note_id}")

            api.set_label(art_note_id, "packageManaged", "")
            api.set_label(art_note_id, "packageOwner", pkg_owner)
            api.set_label(art_note_id, "packageVersion", manifest["version"])
            api.set_label(art_note_id, "packageArtifact", artifact_id)
            api.set_label(art_note_id, "packageEnabled", "true")

            if artifact_type == "css":
                api.set_label(art_note_id, "appCss", "")
            elif artifact_type == "frontend" and artifact.get("activation") == "startup":
                api.set_label(art_note_id, "run", "frontendStartup")
            elif artifact_type == "backend" and artifact.get("activation") == "startup":
                api.set_label(art_note_id, "run", "backendStartup")

            # Wire backend hook relations on container roots
            if artifact_id == "notes-system-project-metadata-sync":
                project_root = api.find_by_label("projectRoot")
                if project_root:
                    for rel in ("runOnNoteChange", "runOnAttributeChange", "runOnAttributeCreation"):
                        api.set_relation(project_root, rel, art_note_id, inheritable=True)
                    print(f"  ✓ Wired Project Metadata Sync hook on #projectRoot")
            elif artifact_id == "notes-system-daily-note-repair":
                calendar_root = api.find_by_label("calendarRoot")
                if calendar_root:
                    for rel in ("runOnNoteCreation", "runOnNoteChange"):
                        api.set_relation(calendar_root, rel, art_note_id, inheritable=True)
                    print(f"  ✓ Wired Daily Note Repair hook on #calendarRoot")
            elif artifact_id == "notes-system-topic-association-sync":
                work_roots = ("meetingRoot", "taskRoot", "storyDraftRoot", "emailRoot", "unassignedRoot", "peopleRoot", "orgRoot", "topicRoot")
                for root_marker in work_roots:
                    root_id = api.find_by_label(root_marker)
                    if root_id:
                        for rel in ("runOnAttributeCreation", "runOnAttributeChange", "runOnNoteCreation", "runOnNoteChange"):
                            api.set_relation(root_id, rel, art_note_id, inheritable=True)
                print(f"  ✓ Wired Topic Association Sync hooks across work roots")
            elif artifact_id == "notes-system-create-note-api":
                api.set_label(art_note_id, "customRequestHandler", "create-note")
                print(f"  ✓ Wired Custom Request Handler 'create-note' on API note")

    print("\n🎉 Plugin deployed successfully into Trilium instance with manifest label!")

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:37843"
    token = sys.argv[2] if len(sys.argv) > 2 else "dummy"
    manifest_path_str = sys.argv[3] if len(sys.argv) > 3 else None
    deploy(url, token, manifest_path_str)
