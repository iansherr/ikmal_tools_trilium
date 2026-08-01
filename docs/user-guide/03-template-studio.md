# Template Studio & If/Then Automation Engine

**Template Studio** allows you to design custom note schemas, promoted attributes, relationship rules, and automated event triggers without writing code.

---

## Defining Note Schemas

Each note template defines:
- **Marker**: The Trilium label attached to notes created with this template (e.g. `extTask`, `extMeeting`).
- **Title Pattern**: Dynamic title format string (e.g. `{title}`, `Project: {title}`, `YYYY-MM-DD - {title}`).
- **Promoted Attributes**: Labels and relations displayed prominently at the top of note cards.
- **Parent Relationships**: Defines parent containers (e.g. Task `~project` link) with automatic parent cloning.

---

## If/Then Automation Rules

Automation rules evaluate triggers when notes are created or modified.

### Supported Actions:
1. **Archive Note (`archiveNote`)**: Attaches `#archived` label and optionally moves the note to an archive container.
2. **Prepend Content (`prependContent`)**: Injects template headers or checklists at the top of note bodies.
3. **Set Relation (`setRelation`)**: Automatically assigns parent or peer relationships.
4. **Remove Label (`removeLabel`)**: Strips temporary tags (e.g. removes `#draft` when marked `#final`).

---

## Single-Template YAML Export & Import

You can export or import individual template definitions as targeted YAML specs:

1. In **Template Studio**, click **Export YAML** on any template card to copy its specification to your clipboard.
2. Click **Import Template** in the header to paste and validate a YAML specification card.
