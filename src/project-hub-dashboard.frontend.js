/* Native replacement for project_hub.md's DataviewJS dashboard. */

function safeHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = typeof html === 'string' ? html : '';
    template.content.querySelectorAll('script,style,iframe,object,embed').forEach((node) => node.remove());
    template.content.querySelectorAll('*').forEach((node) => {
        [...node.attributes].forEach((attribute) => {
            if (attribute.name.toLowerCase().startsWith('on')) {
                node.removeAttribute(attribute.name);
            }
        });
    });
    return template.content;
}

function linkFor(note) {
    const link = document.createElement('a');
    link.href = '#';
    link.textContent = note.title;
    link.addEventListener('click', (event) => {
        event.preventDefault();
        api.openTabWithNote(note.noteId, true);
    });
    return link;
}

function cell(value) {
    const element = document.createElement('td');
    element.textContent = value || '—';
    return element;
}

function statusCell(value) {
    const element = document.createElement('td');
    element.classList.add('hub-status');
    const badge = document.createElement('span');
    badge.className = 'hub-status-badge';
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized) badge.classList.add(`hub-status-${normalized}`);
    badge.textContent = value || '—';
    element.appendChild(badge);
    return element;
}

function dateCell(value) {
    const element = document.createElement('time');
    element.className = 'hub-date';
    element.dateTime = value || '';
    element.textContent = value || '—';
    if (value) {
        const today = api.dayjs().format('YYYY-MM-DD');
        element.classList.toggle('hub-date-overdue', value < today);
        element.classList.toggle('hub-date-today', value === today);
    }
    return element;
}

function table(headers, rows) {
    if (!rows.length) {
        const empty = document.createElement('p');
        empty.textContent = 'None yet.';
        return empty;
    }
    const element = document.createElement('table');
    element.className = 'table table-sm';
    const head = element.createTHead().insertRow();
    headers.forEach((header) => {
        const th = document.createElement('th');
        th.textContent = header;
        head.appendChild(th);
    });
    const body = element.createTBody();
    const caption = element.createCaption();
    caption.className = 'visually-hidden';
    caption.textContent = headers.join(', ');
    rows.forEach((values) => {
        const row = body.insertRow();
        values.forEach((value) => {
            row.appendChild(value instanceof Node ? value : cell(value));
        });
    });
    return element;
}

function appendTimeline(container, notes) {
    if (!notes.length) {
        container.textContent = 'None yet.';
        return;
    }
    notes.forEach((note, index) => {
        const item = document.createElement(index < 5 ? 'article' : 'details');
        if (index >= 5) {
            const summary = document.createElement('summary');
            summary.appendChild(linkFor(note));
            summary.append(` · ${note.typeLabel || 'Note'} · ${note.modifiedDate || 'undated'}`);
            item.appendChild(summary);
        } else {
            const heading = document.createElement('h3');
            heading.appendChild(linkFor(note));
            heading.append(` · ${note.typeLabel || 'Note'} · ${note.modifiedDate || 'undated'}`);
            item.appendChild(heading);
        }
        const content = document.createElement('div');
        content.appendChild(safeHtml(note.content));
        item.appendChild(content);
        container.appendChild(item);
    });
}

async function startEditRound(hubId, hubKind = 'edit') {
    const roundDefaults = await api.runOnBackend((id) => {
        const hub = api.getNote(id);
        const rounds = hub.getTargetRelations()
            .filter((relation) => relation.type === 'relation' && relation.name === 'project')
            .map((relation) => api.getNote(relation.noteId))
            .filter((note) => note.hasLabel('extTemplate', 'storyDraft'))
            .map((note) => Number(note.getLabelValue('round')))
            .filter((round) => Number.isFinite(round));
        const nextRound = rounds.length ? Math.max(...rounds) + 1 : 1;
        const baseTitle = hub.title.replace(/\s+[—-]\s+(?:Round|Draft)\s+\d+\s*$/i, '').trim();
        return { baseTitle, nextRound };
    }, [hubId]);
    const suffix = hubKind === 'edit'
        ? `Round ${roundDefaults.nextRound}`
        : `Draft ${roundDefaults.nextRound}`;
    const title = await api.showPromptDialog({
        title: hubKind === 'edit' ? 'New Edit Round' : 'New Draft',
        message: 'Story or round title',
        defaultValue: `${roundDefaults.baseTitle} — ${suffix}`,
    });
    if (!title || !title.trim()) {
        return;
    }
    const secret = await api.runOnBackend(() => {
        const config = api.getNoteWithLabel('extConfig');
        return config ? config.getOwnedLabelValue('createNoteSecret') : null;
    });
    if (!secret) {
        api.showError('Note creation unavailable: rerun install.py to configure the handler.');
        return;
    }
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
                projectId: hubId,
                status: hubKind === 'edit' ? 'editing' : 'drafting',
                workflow: hubKind === 'edit' ? 'edit' : 'project',
            }),
        });
        const payload = await response.json();
        if (!response.ok) {
            throw new Error(payload.error || `request failed (${response.status})`);
        }
        await api.waitUntilSynced();
        await api.activateNewNote(payload.noteId);
    } catch (error) {
        api.showError(`Could not create edit round: ${error.message}`);
    }
}

async function editorialAction(noteId, action, fields = {}) {
    const secret = await api.runOnBackend(() => {
        const config = api.getNoteWithLabel('extConfig');
        return config ? config.getOwnedLabelValue('createNoteSecret') : null;
    });
    if (!secret) {
        api.showError('Editorial actions unavailable: rerun install.py to configure the handler.');
        return;
    }
    try {
        const response = await fetch('/custom/create-note', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-extension-secret': secret,
            },
            credentials: 'same-origin',
            body: JSON.stringify({ noteId, action, ...fields }),
        });
        const payload = await response.json();
        if (!response.ok) {
            throw new Error(payload.error || `request failed (${response.status})`);
        }
        await api.waitUntilSynced();
        await api.activateNote(noteId);
    } catch (error) {
        api.showError(`Could not update edit round: ${error.message}`);
    }
}

async function projectAreaAction(noteId, action, dashboardNoteId) {
    const secret = await api.runOnBackend(() => {
        const config = api.getNoteWithLabel('extConfig');
        return config ? config.getOwnedLabelValue('createNoteSecret') : null;
    });
    if (!secret) {
        api.showError('Project actions unavailable: rerun install.py to configure the handler.');
        return;
    }
    try {
        const response = await fetch('/custom/create-note', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-extension-secret': secret,
            },
            credentials: 'same-origin',
            body: JSON.stringify({ noteId, action }),
        });
        const payload = await response.json();
        if (!response.ok) {
            throw new Error(payload.error || `request failed (${response.status})`);
        }
        await api.waitUntilSynced();
        await api.activateNote(dashboardNoteId);
    } catch (error) {
        api.showError(`Could not update project area: ${error.message}`);
    }
}

async function markAwaiting(noteId) {
    const waitingOn = await api.showPromptDialog({
        title: 'Mark Awaiting Reply',
        message: 'Waiting on',
        defaultValue: '',
    });
    if (!waitingOn || !waitingOn.trim()) {
        return;
    }
    const followUpDate = await api.showPromptDialog({
        title: 'Mark Awaiting Reply',
        message: 'Follow-up date (YYYY-MM-DD)',
        defaultValue: api.dayjs().add(3, 'day').format('YYYY-MM-DD'),
    });
    if (!followUpDate || !followUpDate.trim()) {
        return;
    }
    await editorialAction(noteId, 'awaiting', {
        waitingOn: waitingOn.trim(),
        followUpDate: followUpDate.trim(),
    });
}

(async () => {
    // Trilium 0.104 exposes $container as a jQuery object.
    const jqueryContainer = api.$container;
    const container = jqueryContainer && (jqueryContainer[0] || jqueryContainer);
    if (!container || typeof container.querySelector !== 'function') {
        return;
    }
    // This script is registered as a frontend-startup script because Trilium
    // 0.104 has no reliable per-render script hook. Do not run it in ordinary
    // note views or Collections such as Projects; only the render note's
    // dashboard markup is a valid host.
    if (!container.querySelector('.project-hub-dashboard')) {
        return;
    }
    const loading = container.querySelector('.hub-dashboard-loading');
    try {
        const activeContext = api.getActiveContextNote && api.getActiveContextNote();
        if (!activeContext) {
            throw new Error('no active dashboard context');
        }
        const data = await api.runOnBackend((hubId) => {
            // This callback is serialized and executed in Trilium's backend
            // context. Keep the sync helper inside it; frontend-scope
            // functions are not visible after the callback is serialized.
            function syncHubMetadata(hub, rounds) {
                const currentRound = rounds[0] || null;
                const reporting = hub.getTargetRelations()
                    .filter((relation) => relation.type === 'relation' && relation.name === 'project')
                    .map((relation) => api.getNote(relation.noteId))
                    .find((note) => note.hasLabel('extTemplate', 'reportingNotes')) || null;
                if (!currentRound && !reporting) return;
                for (const [relationName, overrideName] of [
                    ['client', 'clientOverride'],
                    ['companyOnBehalf', 'companyOnBehalfOverride'],
                ]) {
                    const relation = (currentRound && currentRound.getRelations(relationName)[0])
                        || hub.getRelations(relationName)[0]
                        || (reporting && reporting.getRelations(relationName)[0]);
                    const notes = [hub, currentRound, reporting].filter(Boolean);
                    if (relation) {
                        notes.forEach((note) => note.setRelation(relationName, relation.value));
                    }
                    const override = (currentRound && currentRound.getOwnedLabelValue(overrideName))
                        || hub.getOwnedLabelValue(overrideName)
                        || (reporting && reporting.getOwnedLabelValue(overrideName));
                    if (override) {
                        hub.setLabel(overrideName, override);
                        if (currentRound) currentRound.setLabel(overrideName, override);
                        if (reporting) reporting.setLabel(overrideName, override);
                    }
                }
                if (currentRound && currentRound.getLabelValue('round')) {
                    hub.setLabel('currentRound', currentRound.getLabelValue('round'));
                }
            }

            const current = api.getNote(hubId);
            const hub = current.hasLabel('extTemplate', 'projectHub')
                ? current
                : current.getParentNotes().find((parent) => parent.hasLabel('extTemplate', 'projectHub'));
            if (!hub) {
                return null;
            }
            const roundNotes = hub.getTargetRelations()
                .filter((relation) => relation.type === 'relation' && relation.name === 'project')
                .map((relation) => api.getNote(relation.noteId))
                .filter((note) => note.hasLabel('extTemplate', 'storyDraft'))
                .sort((a, b) => Number(b.getLabelValue('round') || 0) - Number(a.getLabelValue('round') || 0));
            syncHubMetadata(hub, roundNotes);
            // Read the exact incoming relation graph instead of using the
            // fuzzy search engine: every note that points at this hub owns a
            // `project` relation whose target is the hub.
            const related = hub.getTargetRelations()
                .filter((relation) => relation.type === 'relation' && relation.name === 'project')
                .map((relation) => api.getNote(relation.noteId));
            const dateNotes = new Map();
            const followUpLimit = api.dayjs().add(7, 'day').format('YYYY-MM-DD');
            const items = related.map((note) => {
                const parents = note.getParentNotes();
                const round = note.getLabelValue('round');
                const status = note.getLabelValue('status');
                const doneDate = note.getLabelValue('doneDate');
                const waitingOn = note.getLabelValue('waitingOn');
                const followUpDate = note.getLabelValue('followUpDate');
                const created = note.dateCreated || note.dateModified || '';
                const modified = note.dateModified || created;
                const isTask = note.hasLabel('extTemplate', 'task')
                    || note.hasLabel('extTemplate', 'projectTask');
                const isMeeting = note.hasLabel('extTemplate', 'meeting');
                const isEmail = note.hasLabel('extTemplate', 'emailDraft');
                const isRound = note.hasLabel('extTemplate', 'storyDraft');
                const isReporting = note.hasLabel('extTemplate', 'reportingNotes');
                parents.forEach((parent) => {
                    if (parent.hasOwnedLabel('dateNote')) {
                        const touched = parent.getOwnedLabelValue('dateNote');
                        dateNotes.set(parent.noteId, {
                            noteId: parent.noteId,
                            title: parent.title,
                            date: touched,
                        });
                    }
                });
                return {
                    noteId: note.noteId,
                    title: note.title,
                    content: note.getContent(),
                    date: String(created).slice(0, 10),
                    modifiedAt: String(modified),
                    modifiedDate: String(modified).slice(0, 10),
                    round: round || '',
                    status: status || '',
                    waitingOn: waitingOn || '',
                    followUpDate: followUpDate || '',
                    startDate: note.getLabelValue('startDate') || '',
                    open: !doneDate && status !== 'done' && isTask,
                    typeLabel: isTask ? 'Task'
                        : isMeeting ? 'Meeting'
                            : isEmail ? 'Email'
                                : isRound ? 'Round'
                                    : isReporting ? 'Reporting Notes' : 'Note',
                    isMeeting,
                    isEmail,
                    isReporting,
                };
            });
            const rounds = items
                .filter((item) => item.round)
                .sort((a, b) => Number(b.round) - Number(a.round));
            const relatedHubs = hub.getRelations('relatedHub').map((relation) => {
                const note = api.getNote(relation.value);
                return {
                    noteId: note.noteId,
                    title: note.title,
                };
            });
            const projectArea = hub.getParentNotes().some((parent) => parent.hasLabel('projectArchive'))
                ? 'archive' : 'active';
            return {
                hubId: hub.noteId,
                hubKind: hub.getLabelValue('kind') || 'project',
                hubStatus: hub.getLabelValue('status') || 'active',
                projectArea,
                nextAction: hub.getLabelValue('nextAction') || '',
                currentRound: rounds[0] || null,
                rounds,
                openTasks: items.filter((item) => item.open),
                meetings: items
                    .filter((item) => item.isMeeting)
                    .sort((a, b) => a.startDate.localeCompare(b.startDate)),
                emails: items
                    .filter((item) => item.isEmail)
                    .sort((a, b) => b.date.localeCompare(a.date)),
                awaitingReplies: items.filter((item) => item.status === 'awaiting'),
                followUps: items.filter(
                    (item) => item.followUpDate
                        && item.followUpDate <= followUpLimit
                        && item.status !== 'done',
                ),
                timeline: [...items].sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt)),
                daysTouched: [...dateNotes.values()].sort((a, b) => b.date.localeCompare(a.date)),
                relatedHubs,
            };
        }, [activeContext.noteId]);

        if (!data) {
            return;
        }

        if (loading) loading.remove();
        const statusLine = container.querySelector('#hub-status-line');
        if (statusLine) statusLine.textContent = `Project status: ${data.hubStatus}`;
        const newRoundButton = container.querySelector('.hub-new-edit-round');
        newRoundButton.textContent = data.hubKind === 'edit' ? 'New Edit Round' : 'New Draft';
        newRoundButton.hidden = data.projectArea === 'archive';
        const currentRound = container.querySelector('#hub-current-round');
        if (data.currentRound) {
            currentRound.replaceChildren(`Current round: ${data.currentRound.round} — `);
            currentRound.appendChild(linkFor(data.currentRound));
        } else {
            currentRound.textContent = 'Current round: none yet.';
        }
        const nextAction = container.querySelector('#hub-next-action');
        if (nextAction) {
            nextAction.textContent = data.nextAction
                ? `Next action: ${data.nextAction}`
                : 'Next action: not set — add one in the promoted attributes above.';
        }
        const rounds = container.querySelector('#hub-rounds');
        const section = (name) => container.querySelector(`[data-hub-section="${name}"]`);
        const renderSection = (name, target, content, hasItems) => {
            const targetSection = section(name);
            if (targetSection) targetSection.hidden = !hasItems;
            if (target && hasItems) target.replaceChildren(content);
        };
        renderSection('rounds', rounds, table(
            ['Round', 'Story', 'Status'],
            data.rounds.map((item) => {
                const title = linkFor(item);
                return [item.round, title, statusCell(item.status)];
            }),
        ), data.rounds.length > 0);
        const tasks = container.querySelector('#hub-open-tasks');
        renderSection('openTasks', tasks, table(
            ['Task', 'Status'],
            data.openTasks.map((item) => [linkFor(item), statusCell(item.status)]),
        ), data.openTasks.length > 0);
        const meetings = container.querySelector('#hub-meetings');
        renderSection('meetings', meetings, table(
            ['Meeting', 'Starts'],
            data.meetings.map((item) => [linkFor(item), dateCell(item.startDate)]),
        ), data.meetings.length > 0);
        const emails = container.querySelector('#hub-emails');
        renderSection('emails', emails, table(
            ['Email', 'Status'],
            data.emails.map((item) => [linkFor(item), statusCell(item.status)]),
        ), data.emails.length > 0);
        const awaiting = container.querySelector('#hub-awaiting-replies');
        renderSection('awaitingReplies', awaiting, table(
            ['Round', 'Story', 'Waiting on', 'Follow-up'],
            data.awaitingReplies.map((item) => [item.round, linkFor(item), item.waitingOn, dateCell(item.followUpDate)]),
        ), data.awaitingReplies.length > 0);
        const followUps = container.querySelector('#hub-follow-ups');
        renderSection('followUps', followUps, table(
            ['Story', 'Status', 'Follow-up'],
            data.followUps.map((item) => [linkFor(item), statusCell(item.status), dateCell(item.followUpDate)]),
        ), data.followUps.length > 0);
        const timelineSection = section('timeline');
        if (timelineSection) timelineSection.hidden = data.timeline.length === 0;
        if (data.timeline.length) appendTimeline(container.querySelector('#hub-timeline'), data.timeline);
        const days = container.querySelector('#hub-days-touched');
        renderSection('daysTouched', days, table(
            ['Day'],
            data.daysTouched.map((item) => [linkFor(item)]),
        ), data.daysTouched.length > 0);
        const hubs = container.querySelector('#hub-related-hubs');
        renderSection('relatedHubs', hubs, table(
            ['Hub'],
            data.relatedHubs.map((item) => [linkFor(item)]),
        ), data.relatedHubs.length > 0);
        const hasContent = data.rounds.length || data.openTasks.length || data.meetings.length
            || data.emails.length || data.awaitingReplies.length || data.followUps.length
            || data.timeline.length || data.daysTouched.length || data.relatedHubs.length;
        const emptyState = container.querySelector('#hub-empty-state');
        if (emptyState && !hasContent) {
            emptyState.hidden = false;
            emptyState.textContent = data.hubKind === 'edit'
                ? 'No edit rounds yet. Create the first round when you are ready.'
                : 'No project activity yet. Create your first draft to get started.';
        }
        newRoundButton.addEventListener('click', () => startEditRound(data.hubId, data.hubKind));
        const awaitingButton = container.querySelector('.hub-mark-awaiting');
        const completeButton = container.querySelector('.hub-complete-round');
        const currentRoundId = data.currentRound && data.currentRound.noteId;
        const editorialActions = container.querySelector('.hub-editorial-actions');
        if (editorialActions) editorialActions.hidden = data.projectArea === 'archive'
            || data.hubKind !== 'edit' || !currentRoundId;
        if (data.projectArea === 'active' && data.hubKind === 'edit' && currentRoundId) {
            awaitingButton.addEventListener('click', () => markAwaiting(currentRoundId));
            completeButton.addEventListener('click', () => editorialAction(currentRoundId, 'complete'));
        }
        const archiveButton = container.querySelector('.hub-archive-project');
        const reopenButton = container.querySelector('.hub-reopen-project');
        if (archiveButton) {
            archiveButton.hidden = data.projectArea === 'archive';
            archiveButton.addEventListener('click', () => projectAreaAction(
                data.hubId, 'archiveProject', activeContext.noteId,
            ));
        }
        if (reopenButton) {
            reopenButton.hidden = data.projectArea !== 'archive';
            reopenButton.addEventListener('click', () => projectAreaAction(
                data.hubId, 'reopenProject', activeContext.noteId,
            ));
        }
    } catch (error) {
        if (loading) loading.textContent = `Dashboard unavailable: ${error.message}`;
        api.showError(`Project dashboard unavailable: ${error.message}`);
    }
})();
