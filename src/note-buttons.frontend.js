/*
 * Configure the extension's launchbar entries once at frontend startup.
 *
 * Trilium's old toolbar-button API still works in 0.104, but is deprecated.
 * The current backend launcher API stores the launchers in the
 * same place as native Trilium launchers and avoids a console warning on every
 * reload. Each launcher points at one of the hidden frontend script notes.
 */

const LAUNCHERS = [
    { id: 'newProjectHub', script: 'launcherProjectHub', title: 'New Project Hub', icon: 'book', shortcut: '' },
    { id: 'newScratch', script: 'launcherScratch', title: 'New Scratch', icon: 'file-blank', shortcut: '' },
    { id: 'newMeeting', script: 'launcherMeeting', title: 'New Meeting', icon: 'calendar-event', shortcut: 'alt+m' },
    { id: 'newTask', script: 'launcherTask', title: 'New Task', icon: 'check-square', shortcut: 'alt+t' },
    { id: 'newStory', script: 'launcherStory', title: 'New Story', icon: 'news', shortcut: 'alt+s' },
    { id: 'newEdit', script: 'launcherEdit', title: 'New Edit', icon: 'edit-alt', shortcut: '' },
    { id: 'newEmail', script: 'launcherEmail', title: 'New Email', icon: 'envelope', shortcut: '' },
    { id: 'newPerson', script: 'launcherPerson', title: 'New Person', icon: 'user', shortcut: '' },
    { id: 'newOrganization', script: 'launcherOrganization', title: 'New Organization', icon: 'buildings', shortcut: '' },
    { id: 'newTopic', script: 'launcherTopic', title: 'New Topic', icon: 'purchase-tag', shortcut: '' },
];

api.runOnBackend((launchers) => {
    // This callback is serialized and executed on the backend. Keep the
    // lookup inside it; functions defined in the frontend scope are not
    // available to the serialized backend callback after a clean reinstall.
    const findImplementationScript = (marker) => {
        const scriptsRoot = api.getNoteWithLabel('scriptRoot');
        if (!scriptsRoot) {
            return null;
        }
        const pending = [scriptsRoot];
        while (pending.length) {
            const note = pending.shift();
            if (note.getOwnedLabelValue('extScript') === marker) {
                return note;
            }
            pending.push(...note.getChildNotes());
        }
        return null;
    };

    const legacyTitles = new Set(launchers.map((launcher) => launcher.title));
    const roots = [
        '_lbVisibleLaunchers', '_lbAvailableLaunchers',
        'lbVisibleLaunchers', 'lbAvailableLaunchers',
    ];
    const removeLegacyLaunchers = (note) => {
        for (const child of note.getChildNotes()) {
            // The legacy API created launchers without a stable marker. These
            // exact titles are this extension's reserved entries, so remove
            // both old and half-migrated copies before recreating one current
            // launcher per action.
            if (child.type === 'launcher' && legacyTitles.has(child.title)) {
                child.deleteNote();
                continue;
            }
            removeLegacyLaunchers(child);
        }
    };
    for (const rootId of roots) {
        try {
            removeLegacyLaunchers(api.getNote(rootId));
        } catch (error) {
            // Hidden launchbar roots are implementation details and can differ
            // between Trilium versions; launcher creation still works without
            // legacy cleanup.
        }
    }

    for (const launcher of launchers) {
        const script = findImplementationScript(launcher.script);
        if (!script) {
            api.log(`Missing launcher script #${launcher.script}`);
            continue;
        }
        const result = api.createOrUpdateLauncher({
            id: launcher.id,
            title: launcher.title,
            icon: launcher.icon,
            keyboardShortcut: launcher.shortcut,
            isVisible: true,
            type: 'script',
            scriptNoteId: script.noteId,
            targetNoteId: 'root',
        });
        // Trilium 0.104.1 can create the launcher shell without persisting
        // the promoted ~script relation during startup. Set it explicitly so
        // the visible button has an executable target.
        result.note.setRelation('script', script.noteId);
        result.note.setLabel('extLauncherType', script.getOwnedLabelValue('extLauncherType'));
        result.note.setLabel('extLauncherLabel', script.getOwnedLabelValue('extLauncherLabel'));
        result.note.setContent(script.getContent());
        result.note.setLabel('scriptInLauncherContent');
        result.note.mime = 'application/javascript;env=frontend';
        result.note.save();
        // Keep the icon explicit because launcher icon normalization changed
        // between the legacy toolbar API and the current launchbar API.
        result.note.setLabel('iconClass', `bx bx-${launcher.icon}`);
    }
}, [LAUNCHERS]);

// Story Drafts get the same editorial controls as the Project Dashboard. This
// runs at frontend startup, so keep the UI scoped to the current round note;
// ordinary notes and the extension's own implementation notes are untouched.
(async () => {
    const note = api.currentNote;
    if (!note || !note.hasLabel('extTemplate', 'storyDraft')) {
        return;
    }
    const jqueryContainer = api.$container;
    const container = jqueryContainer && (jqueryContainer[0] || jqueryContainer);
    if (!container || typeof container.querySelector !== 'function') {
        return;
    }
    if (container.querySelector('.extension-round-actions')) {
        return;
    }

    const bar = document.createElement('div');
    bar.className = 'extension-round-actions alert alert-secondary';
    bar.style.alignItems = 'center';
    bar.style.display = 'flex';
    bar.style.flexWrap = 'wrap';
    bar.style.gap = '0.45rem';
    bar.style.marginBottom = '0.8rem';
    const label = document.createElement('strong');
    label.textContent = 'Round actions';
    label.style.marginRight = '0.35rem';
    bar.appendChild(label);

    const secret = await api.runOnBackend(() => {
        const config = api.getNoteWithLabel('extConfig');
        return config ? config.getOwnedLabelValue('createNoteSecret') : null;
    });
    if (!secret) {
        return;
    }

    const editorialAction = async (action, fields = {}) => {
        try {
            const response = await fetch('/custom/create-note', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-extension-secret': secret,
                },
                credentials: 'same-origin',
                body: JSON.stringify({ noteId: note.noteId, action, ...fields }),
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.error || `request failed (${response.status})`);
            }
            await api.waitUntilSynced();
            await api.activateNote(note.noteId);
        } catch (error) {
            api.showError(`Could not update round: ${error.message}`);
        }
    };

    const getProjectContext = () => api.runOnBackend((noteId) => {
            const round = api.getNote(noteId);
            const hub = round.getRelations('project')
                .map((relation) => api.getNote(relation.value))
                .find((candidate) => candidate.hasLabel('extTemplate', 'projectHub'));
            if (!hub) return null;
            const rounds = hub.getTargetRelations()
                .filter((relation) => relation.type === 'relation' && relation.name === 'project')
                .map((relation) => api.getNote(relation.noteId))
                .filter((candidate) => candidate.hasLabel('extTemplate', 'storyDraft'))
                .map((candidate) => Number(candidate.getLabelValue('round')))
                .filter((number) => Number.isFinite(number));
            const nextRound = rounds.length ? Math.max(...rounds) + 1 : 1;
            const hubKind = hub.getLabelValue('kind') || 'project';
            const suffix = hubKind === 'edit' ? `Round ${nextRound}` : `Draft ${nextRound}`;
            const baseTitle = hub.title.replace(/\s+[—-]\s+(?:Round|Draft)\s+\d+\s*$/i, '').trim();
            const hubArea = hub.getParentNotes().some((parent) => parent.hasLabel('projectArchive'))
                ? 'archive' : 'active';
            const projectRoot = api.getNoteWithLabel('projectRoot');
            const dashboard = hub.getChildNotes().find((child) => child.hasLabel('extHubDashboard', 'projectHub'));
            return {
                hubId: hub.noteId,
                hubTitle: hub.title,
                projectRootId: projectRoot ? projectRoot.noteId : null,
                hubDashboardId: dashboard ? dashboard.noteId : null,
                hubKind,
                hubArea,
                defaultTitle: `${baseTitle} — ${suffix}`,
            };
        }, [note.noteId]);

    const startNewRound = async () => {
        const context = await getProjectContext();
        if (!context) {
            api.showError('This round is not attached to a Project Hub.');
            return;
        }
        if (context.hubArea === 'archive') {
            api.showError('Reopen the Project before starting a new round.');
            return;
        }
        const title = await api.showPromptDialog({
            title: 'New Round',
            message: 'Story or round title',
            defaultValue: context.defaultTitle,
        });
        if (!title || !title.trim()) return;
        try {
            const response = await fetch('/custom/create-note', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-extension-secret': secret,
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    type: 'story',
                    title: title.trim(),
                    projectId: context.hubId,
                    status: context.hubKind === 'edit' ? 'editing' : 'drafting',
                    workflow: context.hubKind === 'edit' ? 'edit' : 'project',
                }),
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.error || `request failed (${response.status})`);
            }
            await api.waitUntilSynced();
            await api.activateNewNote(payload.noteId);
        } catch (error) {
            api.showError(`Could not create new round: ${error.message}`);
        }
    };

    const button = (title, action, handler = null, className = 'btn btn-secondary') => {
        const element = document.createElement('button');
        element.type = 'button';
        element.className = className;
        element.textContent = title;
        element.addEventListener('click', () => (handler ? handler() : editorialAction(action)));
        bar.appendChild(element);
        return element;
    };

    const newRoundButton = button('New Round', null, startNewRound, 'btn btn-primary');
    const awaitingButton = button('Mark Awaiting Reply', 'awaiting', async () => {
        const waitingOn = await api.showPromptDialog({
            title: 'Mark Awaiting Reply',
            message: 'Waiting on',
            defaultValue: '',
        });
        if (!waitingOn || !waitingOn.trim()) return;
        const followUpDate = await api.showPromptDialog({
            title: 'Mark Awaiting Reply',
            message: 'Follow-up date (YYYY-MM-DD)',
            defaultValue: api.dayjs().add(3, 'day').format('YYYY-MM-DD'),
        });
        if (!followUpDate || !followUpDate.trim()) return;
        await editorialAction('awaiting', {
            waitingOn: waitingOn.trim(),
            followUpDate: followUpDate.trim(),
        });
    });
    const completeButton = button('Mark Project Complete', 'complete');
    const archiveButton = button('Archive Project', 'archiveProject', null, 'btn btn-outline-secondary');
    const reopenButton = button('Reopen Project', 'reopenProject', null, 'btn btn-outline-primary');

    const projectContextPromise = getProjectContext();
    const breadcrumbs = document.createElement('nav');
    breadcrumbs.className = 'extension-project-breadcrumbs';
    breadcrumbs.setAttribute('aria-label', 'Project navigation');
    breadcrumbs.style.color = 'var(--muted-text-color)';
    breadcrumbs.style.fontSize = '0.85rem';
    breadcrumbs.style.marginBottom = '0.65rem';
    breadcrumbs.textContent = 'Loading project context…';
    container.prepend(breadcrumbs);

    const breadcrumbLink = (title, noteId) => {
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = title;
        link.addEventListener('click', (event) => {
            event.preventDefault();
            api.openTabWithNote(noteId, true);
        });
        return link;
    };
    projectContextPromise.then((context) => {
        if (!context) {
            newRoundButton.hidden = true;
            awaitingButton.hidden = true;
            completeButton.hidden = true;
            archiveButton.hidden = true;
            reopenButton.hidden = true;
            breadcrumbs.hidden = true;
            return;
        }
        breadcrumbs.replaceChildren();
        if (context.projectRootId) {
            breadcrumbs.appendChild(breadcrumbLink('Projects', context.projectRootId));
            breadcrumbs.append(' / ');
        }
        breadcrumbs.appendChild(breadcrumbLink(context.hubTitle, context.hubId));
        if (context.hubDashboardId) {
            breadcrumbs.append(' / ');
            breadcrumbs.appendChild(breadcrumbLink('Project Dashboard', context.hubDashboardId));
        }
        breadcrumbs.append(' / ', note.title);
        const archived = context.hubArea === 'archive';
        newRoundButton.hidden = archived;
        awaitingButton.hidden = archived;
        completeButton.hidden = archived;
        archiveButton.hidden = archived;
        reopenButton.hidden = !archived;
    }).catch((error) => {
        breadcrumbs.hidden = true;
        api.log(`Could not load project area: ${error.message}`);
    });

    container.prepend(bar);
})();

// Entity-backed relation fields get a nearby creation shortcut. Client fields
// can point to either a Person or an Organization; the choice creates the
// canonical note and immediately assigns the relation, avoiding duplicate
// free-text names.
(async () => {
    const note = api.currentNote;
    if (!note) return;
    const relationOptions = note.hasLabel('extTemplate', 'projectHub')
        || note.hasLabel('extTemplate', 'storyDraft')
        || note.hasLabel('extTemplate', 'emailDraft')
        ? [
            { name: 'client', title: 'New Client', chooseType: true },
            { name: 'companyOnBehalf', title: 'New On-Behalf Organization' },
        ]
        : note.hasLabel('extTemplate', 'meeting')
            || note.hasLabel('extTemplate', 'meetingPrep')
            ? [{ name: 'organization', title: 'New Organization' }]
            : note.hasLabel('extTemplate', 'person')
                ? [{ name: 'employer', title: 'New Employer Organization' }]
                : [];
    if (!relationOptions.length) return;

    const jqueryContainer = api.$container;
    const container = jqueryContainer && (jqueryContainer[0] || jqueryContainer);
    if (!container || typeof container.querySelector !== 'function') return;
    if (container.querySelector('.extension-organization-actions')) return;

    const secret = await api.runOnBackend(() => {
        const config = api.getNoteWithLabel('extConfig');
        return config ? config.getOwnedLabelValue('createNoteSecret') : null;
    });
    if (!secret) return;

    const bar = document.createElement('div');
    bar.className = 'extension-organization-actions alert alert-secondary';
    bar.style.alignItems = 'center';
    bar.style.display = 'flex';
    bar.style.flexWrap = 'wrap';
    bar.style.gap = '0.45rem';
    bar.style.marginBottom = '0.8rem';
    const label = document.createElement('strong');
    label.textContent = 'Organization shortcuts';
    label.style.marginRight = '0.35rem';
    bar.appendChild(label);

    const chooseEntityType = () => new Promise((resolve) => {
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
        heading.textContent = 'What kind of client is this?';
        const actions = document.createElement('div');
        actions.className = 'd-flex flex-column gap-2';
        const finish = (value) => { overlay.remove(); resolve(value); };
        for (const [value, label] of [['person', 'Person'], ['organization', 'Organization']]) {
            const choice = document.createElement('button');
            choice.type = 'button';
            choice.className = 'btn btn-secondary';
            choice.textContent = label;
            choice.addEventListener('click', () => finish(value));
            actions.appendChild(choice);
        }
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'btn btn-link';
        cancel.textContent = 'Cancel';
        cancel.addEventListener('click', () => finish(undefined));
        actions.appendChild(cancel);
        content.append(heading, actions);
        dialog.appendChild(content);
        overlay.appendChild(dialog);
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) finish(undefined);
        });
        document.body.appendChild(overlay);
    });

    const createEntity = async (option, button) => {
        const title = await api.showPromptDialog({
            title: option.chooseType ? 'New Client' : 'New Organization',
            message: option.chooseType ? 'Client name' : 'Organization name',
            defaultValue: '',
        });
        if (!title || !title.trim()) return;
        const entityType = option.chooseType
            ? await chooseEntityType()
            : 'organization';
        if (!entityType) return;
        button.disabled = true;
        try {
            const response = await fetch('/custom/create-note', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-extension-secret': secret,
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    action: 'createEntity',
                    noteId: note.noteId,
                    relationName: option.name,
                    title: title.trim(),
                    entityType,
                }),
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.error || `request failed (${response.status})`);
            }
            await api.waitUntilSynced();
            await api.activateNote(note.noteId);
        } catch (error) {
            api.showError(`Could not create ${option.chooseType ? 'client' : 'organization'}: ${error.message}`);
        } finally {
            button.disabled = false;
        }
    };

    relationOptions.forEach((option) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-secondary';
        button.textContent = option.title;
        button.addEventListener('click', () => createEntity(option, button));
        bar.appendChild(button);
    });
    container.prepend(bar);
})();

// Reporting Notes keep the capture controls beside the reporting scaffold.
// Every created item receives the same Project relation as the note, while
// People and Organizations remain in their global directories.
(async () => {
    const note = api.currentNote;
    if (!note || !note.hasLabel('extTemplate', 'reportingNotes')) return;
    const jqueryContainer = api.$container;
    const container = jqueryContainer && (jqueryContainer[0] || jqueryContainer);
    if (!container || typeof container.querySelector !== 'function') return;
    if (container.querySelector('.extension-reporting-actions')) return;

    const context = await api.runOnBackend((noteId) => {
        const reporting = api.getNote(noteId);
        const hub = reporting.getRelations('project')
            .map((relation) => api.getNote(relation.value))
            .find((candidate) => candidate.hasLabel('extTemplate', 'projectHub'));
        return hub ? { hubId: hub.noteId, hubTitle: hub.title } : null;
    }, [note.noteId]);
    if (!context) return;
    const secret = await api.runOnBackend(() => {
        const config = api.getNoteWithLabel('extConfig');
        return config ? config.getOwnedLabelValue('createNoteSecret') : null;
    });
    if (!secret) return;

    const chooseEntityType = () => new Promise((resolve) => {
        const value = window.prompt('Client type: enter person or organization', 'organization');
        const normalized = (value || '').trim().toLowerCase();
        resolve(['person', 'organization'].includes(normalized) ? normalized : undefined);
    });

    const bar = document.createElement('div');
    bar.className = 'extension-reporting-actions alert alert-secondary';
    bar.style.display = 'flex';
    bar.style.flexWrap = 'wrap';
    bar.style.alignItems = 'center';
    bar.style.gap = '0.45rem';
    bar.style.marginTop = '1.25rem';
    const label = document.createElement('strong');
    label.textContent = 'Reporting shortcuts';
    label.style.marginRight = '0.35rem';
    bar.appendChild(label);

    const create = async (type, button, relationName = null, entityType = null) => {
        const title = await api.showPromptDialog({
            title: type === 'meeting' ? 'New Meeting' : type === 'person' ? 'New Person' : 'New Organization',
            message: 'Title',
            defaultValue: '',
        });
        if (!title || !title.trim()) return;
        if (relationName && !entityType) {
            entityType = await chooseEntityType();
            if (!entityType) return;
        }
        button.disabled = true;
        try {
            const body = relationName
                ? { action: 'createEntity', noteId: note.noteId, relationName, entityType, title: title.trim() }
                : { type, title: title.trim(), projectId: context.hubId };
            const response = await fetch('/custom/create-note', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-extension-secret': secret },
                credentials: 'same-origin',
                body: JSON.stringify(body),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || `request failed (${response.status})`);
            await api.waitUntilSynced();
            await api.activateNewNote(payload.noteId || payload.entityId || payload.organizationId || payload.personId);
        } catch (error) {
            api.showError(`Could not create reporting item: ${error.message}`);
        } finally {
            button.disabled = false;
        }
    };

    const addButton = (title, type, relationName = null, entityType = null) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-secondary';
        button.textContent = title;
        button.addEventListener('click', () => create(type, button, relationName, entityType));
        bar.appendChild(button);
    };
    addButton('New Meeting', 'meeting');
    addButton('New Person', 'person');
    addButton('New Organization', 'organization');
    addButton('New Client', 'organization', 'client');

    const placeholder = container.querySelector('.reporting-note-actions-placeholder');
    if (placeholder) placeholder.replaceWith(bar);
    else container.appendChild(bar);
})();
