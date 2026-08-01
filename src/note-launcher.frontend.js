/* Shared action for the hidden script notes installed as launchbar entries. */

function chooseScratchProject(projects) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal fade show';
        overlay.style.display = 'block';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.35)';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');

        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog modal-dialog-centered';
        const content = document.createElement('div');
        content.className = 'modal-content';
        content.style.padding = '1rem';
        const heading = document.createElement('h2');
        heading.className = 'modal-title';
        heading.textContent = 'Where should this scratch note live?';
        const hint = document.createElement('p');
        hint.className = 'text-muted';
        hint.textContent = 'Choose a Project Hub, or keep it in Unassigned for later.';
        const actions = document.createElement('div');
        actions.className = 'd-flex flex-column gap-2';

        const finish = (projectId) => {
            document.removeEventListener('keydown', onKeyDown);
            overlay.remove();
            resolve(projectId);
        };
        const onKeyDown = (event) => {
            if (event.key === 'Escape') finish(undefined);
        };
        const choice = (projectId, label, description, primary = false) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `btn ${primary ? 'btn-primary' : 'btn-secondary'}`;
            button.textContent = label;
            button.title = description;
            button.addEventListener('click', () => finish(projectId));
            actions.appendChild(button);
            return button;
        };
        const unassigned = choice(null, 'Unassigned', 'Keep this quick note under Projects/Unassigned.', true);
        for (const project of projects) {
            choice(project.noteId, project.title, `Put this note under ${project.title}.`);
        }
        choice(undefined, 'Cancel', 'Do not create anything.');
        content.append(heading, hint, actions);
        dialog.appendChild(content);
        overlay.appendChild(dialog);
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) finish(undefined);
        });
        document.addEventListener('keydown', onKeyDown);
        document.body.appendChild(overlay);
        unassigned.focus();
    });
}

(async () => {

const typeKey = api.currentNote.getOwnedLabelValue('extLauncherType');
const label = api.currentNote.getOwnedLabelValue('extLauncherLabel') || api.currentNote.title;

if (!typeKey) {
    api.showError('Launcher is missing its note type. Rerun install.py.');
} else {
    const secret = await api.runOnBackend(() => {
        const config = api.getNoteWithLabel('extConfig');
        return config ? config.getOwnedLabelValue('createNoteSecret') : null;
    });

    if (!secret) {
        api.showError('Note creation unavailable: #createNoteSecret missing on Config. Run install.py.');
    } else {
        const title = await api.showPromptDialog({
            title: label,
            message: 'Title',
            defaultValue: '',
        });

        if (title && title.trim()) {
            let body = { type: typeKey, title: title.trim() };
            if (typeKey === 'story' || typeKey === 'edit') {
                body = {
                    action: 'startStory',
                    title: title.trim(),
                    mode: typeKey === 'edit' ? 'edit' : 'project',
                };
            } else if (typeKey === 'scratch') {
                const projects = await api.runOnBackend(() => {
                    const root = api.getNoteWithLabel('activeProjectRoot')
                        || api.getNoteWithLabel('projectRoot');
                    if (!root) return [];
                    const pending = [...root.getChildNotes()];
                    const projects = [];
                    while (pending.length) {
                        const note = pending.shift();
                        pending.push(...note.getChildNotes());
                        if (note.hasLabel('extTemplate', 'projectHub')) {
                            projects.push({ noteId: note.noteId, title: note.title });
                        }
                    }
                    return projects;
                });
                const projectId = await chooseScratchProject(projects || []);
                if (projectId === undefined) {
                    return;
                }
                body = { action: 'scratch', title: title.trim(), projectId };
            }

            try {
                const response = await fetch('/custom/create-note', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-extension-secret': secret,
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify(body),
                });
                const payload = await response.json();
                if (!response.ok) {
                    throw new Error(payload.error || `request failed (${response.status})`);
                }
                await api.waitUntilSynced();
                await api.activateNewNote(payload.noteId);
            } catch (error) {
                api.showError(`Could not create note: ${error.message}`);
            }
        }
    }
}
})();
