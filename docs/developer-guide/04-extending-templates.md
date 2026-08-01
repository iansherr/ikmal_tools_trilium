# Extending Templates & Adding Note Types

Adding a new note type or custom template to **Ikmal Tools for Trilium** requires 3 simple steps:

---

## 1. Register Template in `BUILTIN_TEMPLATES`

Edit [`src/engine/templateEngine.ts`](../../src/engine/templateEngine.ts) to declare your template definition:

```ts
{
    id: 'bugReport',
    marker: 'extBug',
    title: 'Bug Report',
    icon: 'bug',
    category: 'work',
    rootContainerMarker: 'taskRoot',
    titlePattern: 'BUG: {title}',
    defaultContent: '<h3>Reproduction Steps</h3><p>1. ...</p>',
    isBuiltin: true,
    attributes: [
        { name: 'severity', type: 'label', dataType: 'select', options: ['critical', 'major', 'minor'], defaultValue: 'major', isPromoted: true, label: 'Severity' },
        { name: 'status', type: 'label', dataType: 'select', options: ['open', 'investigating', 'resolved'], defaultValue: 'open', isPromoted: true, label: 'Status' },
    ],
    relationships: [
        {
            id: 'rel_bug_project',
            name: 'Project Hub',
            relationName: 'project',
            targetTemplateId: 'projectHub',
            targetTemplateName: 'Project Hub',
            isMulti: false,
            autoCloneToParent: true,
            inheritTopics: true,
            direction: 'parent',
        },
    ],
}
```

---

## 2. (Optional) Custom Note Types

If your template creates a specialized note type (like native Excalidraw `type: canvas` or Code notes `type: code`), specify:

```ts
noteType: 'canvas' // or 'code', 'text', 'render'
```

---

## 3. Rebuild & Run Tests

```bash
npm run build && ./tests/run_all.sh
```
