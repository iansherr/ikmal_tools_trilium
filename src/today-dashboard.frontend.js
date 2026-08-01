/* Stable pinned entry point for the current Journal day note and quick capture. */

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

const TODAY_WIDGETS = [
    { marker: 'activeProjects', columns: [['Kind', 'kind'], ['Status', 'status']] },
    { marker: 'recentlyTouched', columns: [['Kind', 'kind'], ['Status', 'status'], ['Project', 'project']] },
    { marker: 'openDrafts', columns: [['Status', 'status'], ['Round', 'round'], ['Project', 'project']] },
    { marker: 'overdue', columns: [['Due', 'dueDate'], ['Priority', 'priority'], ['Project', 'project']] },
    { marker: 'dueSoon', columns: [['Due', 'dueDate'], ['Priority', 'priority'], ['Project', 'project']] },
    { marker: 'followUpsDue', columns: [['Follow-up', 'followUpDate'], ['Waiting on', 'waitingOn']] },
    { marker: 'awaitingReplies', columns: [['Follow-up', 'followUpDate'], ['Waiting on', 'waitingOn']] },
    { marker: 'highPriority', columns: [['Priority', 'priority'], ['Due', 'dueDate'], ['Project', 'project']] },
    { marker: 'openEmails', columns: [['Status', 'status'], ['Project', 'project']] },
];

const OPEN_TASK_WIDGET = {
    marker: 'openTasks',
    columns: [['Due', 'dueDate'], ['Priority', 'priority'], ['Project', 'project']],
};

const TODAY_SPLIT_STORAGE_KEY = 'trilium-extension.today-journal-width';
const DEFAULT_JOURNAL_WIDTH = 65;

function readJournalWidth() {
    try {
        const value = Number(localStorage.getItem(TODAY_SPLIT_STORAGE_KEY));
        return Number.isFinite(value) ? Math.min(80, Math.max(50, value)) : DEFAULT_JOURNAL_WIDTH;
    } catch (error) {
        return DEFAULT_JOURNAL_WIDTH;
    }
}

function saveJournalWidth(value) {
    try {
        localStorage.setItem(TODAY_SPLIT_STORAGE_KEY, String(value));
    } catch (error) {
        // Private browsing or a restricted embedded context may deny storage;
        // the split remains usable for the current session.
    }
}

const EMPTY_WIDGET_MESSAGES = {
    activeProjects: 'No active projects.',
    recentlyTouched: 'Nothing touched in the last seven days.',
    openDrafts: 'No open drafts.',
    overdue: 'No overdue tasks.',
    dueSoon: 'No tasks due soon.',
    followUpsDue: 'No follow-ups due soon.',
    awaitingReplies: 'No replies currently awaited.',
    highPriority: 'No unfinished high-priority work.',
    openEmails: 'No open email drafts.',
    openTasks: 'No open tasks.',
};

const EMPTY_WIDGET_ACTIONS = {
    activeProjects: ['projectHub', 'New Project'],
    openDrafts: ['story', 'New Story'],
    overdue: ['task', 'New Task'],
    dueSoon: ['task', 'New Task'],
    followUpsDue: ['email', 'New Email'],
    awaitingReplies: ['email', 'New Email'],
    highPriority: ['task', 'New Task'],
    openEmails: ['email', 'New Email'],
    openTasks: ['task', 'New Task'],
};

function ensureDailyOpenTasksWidget(container, note = api.currentNote) {
    const nativeInclude = container.querySelector(
        '.include-note[data-extension-open-tasks="true"]',
    );
    if (nativeInclude) {
        // Included Search notes can remain in Trilium's "not executed" state
        // until opened directly. Keep the native include as a fallback, but
        // use the live backend query below for the visible panel.
        nativeInclude.style.display = 'none';
    }
    let widget = container.querySelector('.daily-open-tasks-widget');
    if (widget) return widget;

    let isDayNote = false;
    try {
        isDayNote = Boolean(note && note.getOwnedLabelValue('dateNote'));
    } catch (error) {
        api.log(`Could not identify the current day note: ${error.message}`);
    }
    if (!isDayNote) return null;

    // Older Journal notes were created before the widget was added to Daily
    // Note. Add a view-only fallback so they get the same live panel without
    // modifying the user's saved note body.
    widget = document.createElement('section');
    widget.className = 'daily-open-tasks-widget';
    const heading = document.createElement('h2');
    heading.textContent = 'Open Tasks';
    const body = document.createElement('div');
    body.className = 'daily-widget-body';
    body.textContent = 'Loading…';
    widget.append(heading, body);
    container.appendChild(widget);
    return widget;
}

async function repairTodayBranches() {
    return api.runOnBackend(() => {
        const dayNote = api.getTodayNote();
        const today = api.dayjs().format('YYYY-MM-DD');
        const sources = [
            ['extTask'],
            ['extMeeting'],
            ['extStoryDraft'],
            ['extReportingNotes'],
            ['extEmailDraft'],
            ['extScratch'],
            ['noteGroup', 'people'],
            ['noteGroup', 'organization'],
        ];
        const candidates = new Map();
        for (const [name, value] of sources) {
            for (const note of api.getNotesWithLabel(name, value)) {
                candidates.set(note.noteId, note);
            }
        }

        let restored = 0;
        for (const note of candidates.values()) {
            if (api.dayjs(note.dateCreated).format('YYYY-MM-DD') !== today) continue;
            api.ensureNoteIsPresentInParent(note.noteId, dayNote.noteId, '');
            restored += 1;
        }
        return restored;
    }, []);
}

async function loadSearchWidgets(markers) {
    return api.runOnBackend((wantedMarkers) => {
        const dashboard = api.getNoteWithLabel('dashboardRoot');
        const views = dashboard ? dashboard.getChildNotes() : [];
        const relationTarget = (note, name) => {
            const relation = note.getRelations(name)[0];
            if (!relation) return '';
            const target = api.getNote(relation.value);
            return target ? { noteId: target.noteId, title: target.title } : '';
        };
        const readView = (marker) => {
            const view = views.find((note) => note.getOwnedLabelValue('extView') === marker);
            if (!view) throw new Error(`Dashboard view '${marker}' is missing`);
            const searchString = view.getOwnedLabelValue('searchString');
            if (!searchString) throw new Error(`Dashboard view '${marker}' has no search`);
            const notes = api.searchForNotes(searchString, {}) || [];
            return notes.slice(0, 50).map((note) => ({
                noteId: note.noteId,
                title: note.title,
                kind: note.getLabelValue('kind') || '',
                status: note.getLabelValue('status') || '',
                round: note.getLabelValue('round') || '',
                dueDate: note.getLabelValue('dueDate') || '',
                priority: note.getLabelValue('priority') || '',
                followUpDate: note.getLabelValue('followUpDate') || '',
                waitingOn: note.getLabelValue('waitingOn') || '',
                project: relationTarget(note, 'project'),
            }));
        };

        return wantedMarkers.map((marker) => {
            try {
                return { marker, rows: readView(marker) };
            } catch (error) {
                return { marker, error: error.message, rows: [] };
            }
        });
    }, [markers]);
}

function renderSearchWidget(widget, result, columns) {
    const body = widget.querySelector('.today-widget-body, .daily-widget-body');
    if (!body) return;
    body.replaceChildren();
    if (result.error) {
        const error = document.createElement('p');
        error.className = 'today-empty';
        error.textContent = `Unavailable: ${result.error}`;
        body.appendChild(error);
        return;
    }
    if (!result.rows.length) {
        const empty = document.createElement('p');
        empty.className = 'today-empty';
        empty.textContent = EMPTY_WIDGET_MESSAGES[result.marker] || 'Nothing here yet.';
        body.appendChild(empty);
        const action = EMPTY_WIDGET_ACTIONS[result.marker];
        const dashboard = widget.closest('.today-dashboard');
        const sourceButton = dashboard && dashboard.querySelector(
            `[data-today-action="${action ? action[0] : ''}"]`,
        );
        if (action && sourceButton) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn btn-sm btn-outline-primary today-empty-action';
            button.textContent = action[1];
            button.addEventListener('click', () => sourceButton.click());
            body.appendChild(button);
        }
        return;
    }

    const table = document.createElement('table');
    table.className = 'table table-sm';
    const head = table.createTHead().insertRow();
    const nameHeader = document.createElement('th');
    nameHeader.textContent = 'Name';
    head.appendChild(nameHeader);
    columns.forEach(([label]) => {
        const header = document.createElement('th');
        header.textContent = label;
        head.appendChild(header);
    });
    const tableBody = table.createTBody();
    result.rows.forEach((row) => {
        const tableRow = tableBody.insertRow();
        const name = tableRow.insertCell();
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = row.title;
        link.addEventListener('click', (event) => {
            event.preventDefault();
            api.openTabWithNote(row.noteId, true);
        });
        name.appendChild(link);
        columns.forEach(([, key]) => {
            const cell = tableRow.insertCell();
            if (key === 'project' && row.project && row.project.noteId) {
                const projectLink = document.createElement('a');
                projectLink.href = '#';
                projectLink.textContent = row.project.title;
                projectLink.title = `Open project: ${row.project.title}`;
                projectLink.addEventListener('click', (event) => {
                    event.preventDefault();
                    api.openTabWithNote(row.project.noteId, true);
                });
                cell.appendChild(projectLink);
            } else {
                cell.textContent = row[key] || '—';
            }
        });
    });
    body.appendChild(table);
}

function renderTodayHealth(container, data) {
    const status = container.querySelector('.today-health-status');
    const body = container.querySelector('.today-health-body');
    if (!status || !body) return;
    status.classList.toggle('is-error', !data.healthy);
    status.textContent = data.healthy ? 'Healthy' : 'Needs attention';
    body.replaceChildren();
    const list = document.createElement('ul');
    list.className = 'today-health-list';
    const rows = [
        `Version: ${data.version || 'unknown'}`,
        `Scripts installed: ${data.scriptCount}`,
        `Journal repair hooks: ${data.hooks ? 'present' : 'missing'}`,
        `Open Tasks include: ${data.openTasksInclude ? 'current' : 'stale or missing'}`,
        `Today branches: ${data.todayBranches}`,
        `Open tasks: ${data.openTasks}`,
    ];
    if (data.missingScripts && data.missingScripts.length) {
        rows.push(`Missing scripts: ${data.missingScripts.join(', ')}`);
    }
    rows.forEach((text) => {
        const item = document.createElement('li');
        item.textContent = text;
        list.appendChild(item);
    });
    body.appendChild(list);
    const repair = document.createElement('button');
    repair.type = 'button';
    repair.className = 'btn btn-sm btn-outline-secondary';
    repair.textContent = 'Repair today’s Journal branches';
    repair.addEventListener('click', async () => {
        repair.disabled = true;
        repair.textContent = 'Repairing…';
        try {
            await repairTodayBranches();
            await api.waitUntilSynced();
            await refreshTodayHealth(container);
        } catch (error) {
            api.showError(`Could not repair today’s Journal branches: ${error.message}`);
        } finally {
            repair.disabled = false;
            repair.textContent = 'Repair today’s Journal branches';
        }
    });
    body.appendChild(repair);
}

async function refreshTodayHealth(container) {
    const data = await api.runOnBackend(() => {
        const config = api.getNoteWithLabel('extConfig');
        const scriptsRoot = api.getNoteWithLabel('scriptRoot');
        const journal = api.getNoteWithLabel('calendarRoot');
        const today = api.getTodayNote();
        const dashboard = api.getNoteWithLabel('dashboardRoot');
        const openTasksView = dashboard && dashboard.getChildNotes()
            .find((note) => note.getOwnedLabelValue('extView') === 'openTasks');
        const pending = scriptsRoot ? [scriptsRoot] : [];
        const seen = new Set();
        let scriptCount = 0;
        const scriptMarkers = new Set();
        while (pending.length) {
            const note = pending.pop();
            if (!note || seen.has(note.noteId)) continue;
            seen.add(note.noteId);
            if (note.hasOwnedLabel('extScript')) {
                scriptCount += 1;
                scriptMarkers.add(note.getOwnedLabelValue('extScript'));
            }
            pending.push(...note.getChildNotes());
        }
        const requiredScripts = [
            'todayDashboardScript', 'hubDashboardScript', 'dashboardFiltersScript',
            'createNoteApi', 'dailyNoteRepair', 'noteButtons',
        ];
        const missingScripts = requiredScripts.filter((marker) => !scriptMarkers.has(marker));
        const hooks = Boolean(journal
            && journal.getRelations('runOnNoteCreation').some((relation) => {
                try { return api.getNote(relation.value).hasOwnedLabel('extScript', 'dailyNoteRepair'); }
                catch (error) { return false; }
            })
            && journal.getRelations('runOnNoteChange').some((relation) => {
                try { return api.getNote(relation.value).hasOwnedLabel('extScript', 'dailyNoteRepair'); }
                catch (error) { return false; }
            }));
        const openTasks = api.searchForNotes('#extTask AND #!doneDate', {}).length;
        const todayContent = today ? today.getContent() : '';
        const targetMatch = todayContent.match(
            /data-extension-open-tasks=["']true["'][^>]*data-note-id=["']([^"']+)/i,
        );
        const openTasksInclude = !targetMatch || Boolean(openTasksView && targetMatch[1] === openTasksView.noteId);
        return {
            version: config ? config.getOwnedLabelValue('extensionVersion') : '',
            scriptCount,
            hooks,
            todayBranches: today ? today.getChildNotes().length : 0,
            openTasks,
            openTasksInclude,
            missingScripts,
            healthy: Boolean(
                config && scriptsRoot && journal && hooks && scriptCount > 0
                && !missingScripts.length && openTasksInclude,
            ),
        };
    }, []);
    renderTodayHealth(container, data);
}

async function refreshSearchWidgets(widgets, dailyWidget) {
    const definitions = [...widgets];
    if (dailyWidget) definitions.push(OPEN_TASK_WIDGET);
    if (!definitions.length) return;
    const results = await loadSearchWidgets(definitions.map((definition) => definition.marker));
    results.forEach((result) => {
        const definition = definitions.find((candidate) => candidate.marker === result.marker);
        if (!definition) return;
        const target = result.marker === OPEN_TASK_WIDGET.marker && dailyWidget
            ? dailyWidget
            : document.querySelector(`[data-today-widget="${result.marker}"]`);
        if (target) renderSearchWidget(target, result, definition.columns);
    });
}

let lastDailyWidgetContextKey = null;
let lastDailyWidgetRefresh = 0;

async function refreshActiveDailyWidget() {
    if (!api.getActiveContext) return;
    const context = api.getActiveContext();
    if (!context || context.isEmpty()) return;

    const note = context.note;
    const jqueryContent = await context.getContentElement();
    const content = jqueryContent && (jqueryContent[0] || jqueryContent);
    if (!note || !content || typeof content.querySelector !== 'function') return;

    let isDayNote = false;
    try {
        isDayNote = Boolean(note && note.getOwnedLabelValue('dateNote'));
    } catch (error) {
        api.log(`Could not identify the active day note: ${error.message}`);
    }
    if (!isDayNote) return;

    // Repair before checking for the visible widget. Native Included Search
    // markup used to make this function return before repair could run.
    await repairTodayBranches();
    const widget = ensureDailyOpenTasksWidget(content, note);
    if (!widget) return;
    const contextKey = `${context.ntxId}:${note.noteId}`;
    const now = Date.now();
    if (lastDailyWidgetContextKey === contextKey && now - lastDailyWidgetRefresh < 60 * 1000) {
        return;
    }

    const result = (await loadSearchWidgets([OPEN_TASK_WIDGET.marker]))[0];
    renderSearchWidget(widget, result, OPEN_TASK_WIDGET.columns);
    lastDailyWidgetContextKey = contextKey;
    lastDailyWidgetRefresh = now;
}

(async () => {
    const jqueryContainer = api.$container;
    const container = jqueryContainer && (jqueryContainer[0] || jqueryContainer);
    if (!container || typeof container.querySelector !== 'function') {
        return;
    }
    // frontendStartup runs once when the application starts, but the user can
    // switch to a newly-created Journal day much later. Poll the active split
    // so day-note widgets are populated when that note is actually opened.
    setInterval(() => refreshActiveDailyWidget().catch((error) => {
        api.log(`Could not refresh the active day-note widget: ${error.message}`);
    }), 1000);
    const dashboard = container.querySelector('.today-dashboard');
    const dailyWidget = ensureDailyOpenTasksWidget(container);
    if (!dashboard && !dailyWidget) {
        return;
    }

    if (!dashboard) {
        try {
            await refreshSearchWidgets([], dailyWidget);
        } catch (error) {
            api.log(`Could not load Open Tasks: ${error.message}`);
        }
        return;
    }

    const title = dashboard.querySelector('.today-note-title');
    const openButton = dashboard.querySelector('.today-open-note');
    const journalWidthInput = dashboard.querySelector('.today-journal-width');
    const journalWidthValue = dashboard.querySelector('.today-journal-width-value');
    const resetSplitButton = dashboard.querySelector('.today-reset-split');
    const actionButtons = [...dashboard.querySelectorAll('[data-today-action]')];
    let currentNoteId = null;
    let journalContext = null;
    let secretPromise = null;
    let splitResizeBinding = null;

    const updateJournalWidthControl = (value) => {
        const width = Math.round(Math.min(80, Math.max(50, value)));
        if (journalWidthInput) journalWidthInput.value = String(width);
        if (journalWidthValue) journalWidthValue.textContent = `${width}%`;
        return width;
    };

    const splitPair = () => {
        const todaySplit = container.closest('.note-split');
        const journalNtxId = journalContext && journalContext.ntxId;
        if (!todaySplit || !journalNtxId) return null;
        const parent = todaySplit.parentElement;
        if (!parent) return null;
        const journalSplit = [...parent.children].find((element) =>
            element.classList && element.classList.contains('note-split')
            && element.getAttribute('data-ntx-id') === journalNtxId,
        );
        if (!journalSplit) return null;
        return { todaySplit, journalSplit, parent };
    };

    const setJournalWidth = (value, persist = true) => {
        const width = updateJournalWidthControl(value);
        // Save even when the Journal split has not been opened yet. This lets
        // the collapsed Today layout control establish the user's preference
        // before the first split is created.
        if (persist) saveJournalWidth(width);
        const pair = splitPair();
        if (!pair) return false;
        // Trilium's desktop split manager uses width percentages on these
        // elements. Keep the existing gutter in place so its native drag
        // behavior continues to work after this initial sizing.
        pair.todaySplit.style.width = `${100 - width}%`;
        pair.journalSplit.style.width = `${width}%`;
        return true;
    };

    const rememberDraggedWidth = () => {
        const pair = splitPair();
        if (!pair) return;
        const total = pair.todaySplit.getBoundingClientRect().width
            + pair.journalSplit.getBoundingClientRect().width;
        if (!total) return;
        const width = Math.round(pair.journalSplit.getBoundingClientRect().width / total * 100);
        if (width >= 50 && width <= 80) {
            updateJournalWidthControl(width);
            saveJournalWidth(width);
        }
    };

    const bindSplitGutter = () => {
        const pair = splitPair();
        if (!pair) return;
        const gutter = [...pair.parent.children].find((element) =>
            element.classList && element.classList.contains('gutter'),
        );
        if (!gutter || splitResizeBinding === gutter) return;
        splitResizeBinding = gutter;
        gutter.addEventListener('mouseup', () => setTimeout(rememberDraggedWidth, 0));
        gutter.addEventListener('touchend', () => setTimeout(rememberDraggedWidth, 0));
    };

    const applyJournalWidth = () => {
        if (!setJournalWidth(readJournalWidth(), false)) return;
        bindSplitGutter();
    };

    let splitWidthTimers = [];
    const scheduleJournalWidth = () => {
        // The split's native resizer can finish after openSplitWithNote() and
        // after the first paint. Re-apply at bounded points during startup so
        // its late initialization cannot discard the saved preference.
        for (const timer of splitWidthTimers) clearTimeout(timer);
        splitWidthTimers = [];
        requestAnimationFrame(() => {
            applyJournalWidth();
            for (const delay of [50, 150, 350, 750, 1500]) {
                splitWidthTimers.push(setTimeout(applyJournalWidth, delay));
            }
        });
    };

    const getSecret = async () => {
        if (!secretPromise) {
            secretPromise = api.runOnBackend(() => {
                const config = api.getNoteWithLabel('extConfig');
                return config ? config.getOwnedLabelValue('createNoteSecret') : null;
            });
        }
        return secretPromise;
    };

    const refresh = async () => {
        const today = await api.runOnBackend(() => {
            const note = api.getTodayNote();
            return { noteId: note.noteId, title: note.title };
        }, []);

        if (journalContext && currentNoteId && currentNoteId !== today.noteId
            && journalContext.noteId === currentNoteId) {
            try {
                journalContext = await journalContext.setNote(today.noteId);
                scheduleJournalWidth();
            } catch (error) {
                api.log(`Could not update the Today split: ${error.message}`);
                journalContext = null;
            }
        }

        currentNoteId = today.noteId;
        title.textContent = today.title;
        openButton.disabled = false;
    };

    const openToday = async () => {
        if (!currentNoteId) return;
        const existingContext = api.getNoteContexts().find((context) => context.noteId === currentNoteId);
        if (existingContext) {
            journalContext = existingContext;
            await api.activateNote(currentNoteId);
            scheduleJournalWidth();
            return;
        }
        await api.openSplitWithNote(currentNoteId, true);
        journalContext = api.getNoteContexts().find((context) => context.noteId === currentNoteId) || null;
        scheduleJournalWidth();
    };

    const createFromToday = async (action, button) => {
        const label = button.textContent.trim();
        const noteTitle = await api.showPromptDialog({
            title: label,
            message: 'Title',
            defaultValue: '',
        });
        if (!noteTitle || !noteTitle.trim()) return;

        const secret = await getSecret();
        if (!secret) {
            throw new Error('Note creation unavailable: #createNoteSecret is missing. Run install.py.');
        }

        let body = { type: action, title: noteTitle.trim() };
        if (action === 'story' || action === 'edit') {
            body = {
                action: 'startStory',
                title: noteTitle.trim(),
                mode: action === 'edit' ? 'edit' : 'project',
            };
        } else if (action === 'scratch') {
            const projects = await api.runOnBackend(() => {
                const root = api.getNoteWithLabel('activeProjectRoot')
                    || api.getNoteWithLabel('projectRoot');
                if (!root) return [];
                const pending = [...root.getChildNotes()];
                const result = [];
                while (pending.length) {
                    const note = pending.shift();
                    pending.push(...note.getChildNotes());
                    if (note.hasLabel('extTemplate', 'projectHub')) {
                        result.push({ noteId: note.noteId, title: note.title });
                    }
                }
                return result;
            });
            const projectId = await chooseScratchProject(projects || []);
            if (projectId === undefined) return;
            body = { action: 'scratch', title: noteTitle.trim(), projectId };
        }

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
    };

    openButton.addEventListener('click', () => {
        openToday().catch((error) => api.showError(`Could not open Today’s Journal: ${error.message}`));
    });

    if (journalWidthInput) {
        journalWidthInput.value = String(readJournalWidth());
        journalWidthInput.addEventListener('input', () => {
            setJournalWidth(Number(journalWidthInput.value), true);
        });
    }
    if (resetSplitButton) {
        resetSplitButton.addEventListener('click', () => {
            setJournalWidth(DEFAULT_JOURNAL_WIDTH, true);
        });
    }

    for (const button of actionButtons) {
        button.addEventListener('click', async () => {
            button.disabled = true;
            try {
                await createFromToday(button.dataset.todayAction, button);
            } catch (error) {
                api.showError(`Could not create note: ${error.message}`);
            } finally {
                button.disabled = false;
            }
        });
    }

    try {
        await refresh();
        await refreshTodayHealth(container);
        await refreshSearchWidgets(TODAY_WIDGETS, null);
        // Keep a pinned Today tab current across midnight without opening a
        // second day-note tab. If its split already exists, setNote preserves
        // the user's divider position.
        setInterval(() => refresh().catch((error) => api.log(error.message)), 60 * 1000);
        setInterval(() => refreshSearchWidgets(TODAY_WIDGETS, null)
            .catch((error) => api.log(`Could not refresh Today widgets: ${error.message}`)), 60 * 1000);
    } catch (error) {
        title.textContent = `Today unavailable: ${error.message}`;
    }
})();
