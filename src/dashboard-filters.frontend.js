/* Filter the native Dashboard's saved-search widgets without replacing them. */

const DASHBOARD_LAYOUT_SIZES = {
    compact: {
        extDashboardFilters: { w: 12, h: 3 },
        taskCalendar: { w: 6, h: 5 },
        meetingCalendar: { w: 6, h: 5 },
        dueSoon: { w: 3, h: 3 },
        openTasks: { w: 3, h: 4 },
        upcomingMeetings: { w: 3, h: 4 },
        openDrafts: { w: 3, h: 4 },
        openEmails: { w: 3, h: 4 },
        awaitingReplies: { w: 3, h: 4 },
        followUpsDue: { w: 3, h: 4 },
        activeProjects: { w: 3, h: 4 },
        highPriority: { w: 3, h: 4 },
        overdue: { w: 3, h: 4 },
        recentlyTouched: { w: 6, h: 4 },
    },
    comfortable: {
        extDashboardFilters: { w: 12, h: 4 },
        taskCalendar: { w: 6, h: 7 },
        meetingCalendar: { w: 6, h: 7 },
        dueSoon: { w: 4, h: 5 },
        openTasks: { w: 4, h: 5 },
        upcomingMeetings: { w: 4, h: 5 },
        openDrafts: { w: 4, h: 5 },
        openEmails: { w: 4, h: 5 },
        awaitingReplies: { w: 4, h: 5 },
        followUpsDue: { w: 4, h: 5 },
        activeProjects: { w: 4, h: 5 },
        highPriority: { w: 4, h: 5 },
        overdue: { w: 4, h: 5 },
        recentlyTouched: { w: 8, h: 5 },
    },
};

const DEFAULT_DASHBOARD_LAYOUT = {
    extDashboardFilters: { x: 0, y: 0, w: 12, h: 3 },
    taskCalendar: { x: 0, y: 3, w: 6, h: 6 },
    meetingCalendar: { x: 6, y: 3, w: 6, h: 6 },
    dueSoon: { x: 0, y: 9, w: 4, h: 4 },
    openTasks: { x: 4, y: 9, w: 4, h: 5 },
    upcomingMeetings: { x: 8, y: 9, w: 4, h: 5 },
    openDrafts: { x: 0, y: 14, w: 4, h: 5 },
    openEmails: { x: 4, y: 14, w: 4, h: 5 },
    awaitingReplies: { x: 8, y: 14, w: 4, h: 5 },
    followUpsDue: { x: 0, y: 19, w: 4, h: 5 },
    activeProjects: { x: 4, y: 19, w: 4, h: 5 },
    highPriority: { x: 8, y: 19, w: 4, h: 5 },
    overdue: { x: 0, y: 24, w: 4, h: 5 },
    recentlyTouched: { x: 4, y: 24, w: 8, h: 5 },
};

(async () => {
    const jqueryContainer = api.$container;
    const container = jqueryContainer && (jqueryContainer[0] || jqueryContainer);
    if (!container || typeof container.querySelector !== 'function') return;
    const panel = container.querySelector('.dashboard-filter-panel');
    if (!panel) return;

    const data = await api.runOnBackend(() => {
        const dashboard = api.getNoteWithLabel('dashboardRoot');
        if (!dashboard) return null;
        const descendants = (root) => {
            const result = [];
            const pending = [...root.getChildNotes()];
            const seen = new Set();
            while (pending.length) {
                const note = pending.shift();
                if (!note || seen.has(note.noteId)) continue;
                seen.add(note.noteId);
                result.push(note);
                pending.push(...note.getChildNotes());
            }
            return result;
        };
        const projectRoot = api.getNoteWithLabel('projectRoot');
        const projects = projectRoot
            ? descendants(projectRoot)
                .filter((note) => note.hasLabel('extTemplate', 'projectHub'))
                .map((note) => ({ noteId: note.noteId, title: note.title }))
                .sort((a, b) => a.title.localeCompare(b.title))
            : [];
        const people = api.searchForNotes('#noteGroup="people"', {})
            .map((note) => ({ noteId: note.noteId, title: note.title }))
            .sort((a, b) => a.title.localeCompare(b.title));
        const topicsRoot = api.getNoteWithLabel('topicRoot');
        const topics = topicsRoot
            ? topicsRoot.getChildNotes()
                .filter((note) => note.hasLabel('extTopic'))
                .map((note) => ({ noteId: note.noteId, title: note.title }))
                .sort((a, b) => a.title.localeCompare(b.title))
            : [];
        const widgetStatus = dashboard.getChildNotes()
            .filter((note) => note.getOwnedLabelValue('extBaseSearch'))
            .map((view) => {
                const searchString = view.getOwnedLabelValue('searchString');
                try {
                    return {
                        title: view.title,
                        count: api.searchForNotes(searchString, {}).length,
                    };
                } catch (error) {
                    return { title: view.title, error: error.message };
                }
            });
        return {
            dashboardId: dashboard.noteId,
            filters: {
                time: dashboard.getOwnedLabelValue('dashboardFilterTime') || '',
                project: dashboard.getOwnedLabelValue('dashboardFilterProject') || '',
                status: dashboard.getOwnedLabelValue('dashboardFilterStatus') || '',
                assignment: dashboard.getOwnedLabelValue('dashboardFilterAssignment') || '',
                topic: dashboard.getOwnedLabelValue('dashboardFilterTopic') || '',
            },
            projects,
            people,
            topics,
            widgetStatus,
        };
    });
    if (!data) return;

    const select = (name) => panel.querySelector(`[data-dashboard-filter="${name}"]`);
    const status = panel.querySelector('.dashboard-filter-status');
    const summary = panel.querySelector('.dashboard-filter-summary');
    const projectSelect = select('project');
    const assignmentSelect = select('assignment');
    const topicSelect = select('topic');
    data.projects.forEach((project) => {
        const option = document.createElement('option');
        option.value = project.noteId;
        option.textContent = project.title;
        projectSelect.appendChild(option);
    });
    data.people.forEach((person) => {
        const option = document.createElement('option');
        option.value = person.noteId;
        option.textContent = person.title;
        assignmentSelect.appendChild(option);
    });
    data.topics.forEach((topic) => {
        const option = document.createElement('option');
        option.value = topic.noteId;
        option.textContent = topic.title;
        topicSelect.appendChild(option);
    });
    Object.entries(data.filters).forEach(([name, value]) => {
        const target = select(name);
        if (target) target.value = value;
    });

    const renderWidgetSummary = (widgetStatus, filters) => {
        summary.classList.remove('is-error', 'is-empty');
        const errors = widgetStatus.filter((widget) => widget.error);
        if (errors.length) {
            summary.classList.add('is-error');
            summary.textContent = `Unavailable widgets: ${errors.map((widget) => `${widget.title} (${widget.error})`).join('; ')}`;
            return;
        }
        const total = widgetStatus.reduce((sum, widget) => sum + widget.count, 0);
        if (Object.values(filters).some(Boolean) && total === 0) {
            summary.classList.add('is-empty');
            summary.textContent = 'No notes match these filters. Clear or broaden the filters to see dashboard results.';
            return;
        }
        summary.textContent = `${total} matching note${total === 1 ? '' : 's'} across ${widgetStatus.length} dashboard widgets.`;
    };
    renderWidgetSummary(data.widgetStatus, data.filters);

    const readFilters = () => ({
        time: select('time').value,
        project: select('project').value,
        status: select('status').value,
        assignment: select('assignment').value,
        topic: select('topic').value,
    });
    const apply = async (filters) => {
        status.textContent = 'Applying…';
        try {
            const dashboardId = await api.runOnBackend((nextFilters) => {
                const dashboard = api.getNoteWithLabel('dashboardRoot');
                if (!dashboard) throw new Error('Dashboard not found');
                const project = nextFilters.project ? api.getNote(nextFilters.project) : null;
                const assignment = nextFilters.assignment ? api.getNote(nextFilters.assignment) : null;
                const topic = nextFilters.topic ? api.getNote(nextFilters.topic) : null;
                const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;
                const clauses = [];
                const days = Number(nextFilters.time);
                if ([7, 30, 90].includes(days)) clauses.push(`note.dateModified >= TODAY-${days}`);
                if (project) clauses.push(`~project.title = ${quote(project.title)}`);
                if (nextFilters.status) clauses.push(`#status = ${quote(nextFilters.status)}`);
                if (assignment) clauses.push(`~writer.title = ${quote(assignment.title)}`);
                if (topic) {
                    const value = quote(topic.title);
                    clauses.push(`(~topic.title = ${value} OR ~derivedTopic.title = ${value})`);
                }

                dashboard.setLabel('dashboardFilterTime', nextFilters.time || '');
                dashboard.setLabel('dashboardFilterProject', nextFilters.project || '');
                dashboard.setLabel('dashboardFilterStatus', nextFilters.status || '');
                dashboard.setLabel('dashboardFilterAssignment', nextFilters.assignment || '');
                dashboard.setLabel('dashboardFilterTopic', nextFilters.topic || '');
                dashboard.getChildNotes().forEach((view) => {
                    const base = view.getOwnedLabelValue('extBaseSearch');
                    if (!base) return;
                    view.setLabel('searchString', clauses.length
                        ? `${base} AND ${clauses.join(' AND ')}`
                        : base);
                });
                return dashboard.noteId;
            }, [filters]);
            await api.waitUntilSynced();
            await api.openTabWithNote(dashboardId, true);
        } catch (error) {
            status.textContent = `Could not apply filters: ${error.message}`;
            api.showError(`Could not apply Dashboard filters: ${error.message}`);
        }
    };

    const updateLayout = async (mode) => {
        status.textContent = mode === 'reset' ? 'Resetting layout…' : 'Updating layout…';
        try {
            const dashboardId = await api.runOnBackend((request) => {
                const dashboard = api.getNoteWithLabel('dashboardRoot');
                if (!dashboard) throw new Error('Dashboard not found');
                const attachment = dashboard.getAttachments()
                    .find((candidate) => candidate.role === 'viewConfig'
                        && candidate.title === 'dashboard.json');
                if (!attachment) throw new Error('Dashboard layout is not available');

                let layout;
                try {
                    layout = JSON.parse(String(attachment.getContent()));
                } catch (error) {
                    throw new Error(`Dashboard layout is invalid: ${error.message}`);
                }
                const widgets = layout.widgets && !Array.isArray(layout.widgets)
                    ? layout.widgets : {};
                const noteIds = {};
                dashboard.getChildNotes().forEach((note) => {
                    const viewMarker = note.getOwnedLabelValue('extView');
                    const filterMarker = note.getOwnedLabelValue('extDashboardFilters');
                    const marker = viewMarker || (filterMarker ? 'extDashboardFilters' : '');
                    if (marker) noteIds[marker] = note.noteId;
                });

                const knownNoteIds = new Set(Object.values(noteIds));
                Object.keys(widgets).forEach((noteId) => {
                    if (!knownNoteIds.has(noteId)) return;
                    if (!widgets[noteId] || typeof widgets[noteId] !== 'object') {
                        widgets[noteId] = {};
                    }
                });

                if (request.mode === 'reset') {
                    Object.entries(request.defaults).forEach(([marker, geometry]) => {
                        const noteId = noteIds[marker];
                        if (!noteId) return;
                        widgets[noteId] = { ...widgets[noteId], ...geometry };
                    });
                } else {
                    let nextY = Object.values(widgets).reduce((maxY, widget) => {
                        const y = Number(widget && widget.y);
                        const h = Number(widget && widget.h);
                        return Number.isFinite(y) ? Math.max(maxY, y + (Number.isFinite(h) ? h : 1)) : maxY;
                    }, 0);
                    Object.entries(request.sizes).forEach(([marker, size]) => {
                        const noteId = noteIds[marker];
                        if (!noteId) return;
                        const current = widgets[noteId] || { x: 0, y: nextY };
                        if (!Number.isFinite(Number(current.x))) current.x = 0;
                        if (!Number.isFinite(Number(current.y))) {
                            current.y = nextY;
                            nextY += size.h;
                        }
                        widgets[noteId] = { ...current, ...size };
                    });
                }

                layout.widgets = widgets;
                attachment.setContent(JSON.stringify(layout));
                return dashboard.noteId;
            }, [{
                mode,
                sizes: DASHBOARD_LAYOUT_SIZES[mode] || {},
                defaults: DEFAULT_DASHBOARD_LAYOUT,
            }]);
            await api.waitUntilSynced();
            await api.openTabWithNote(dashboardId, true);
            status.textContent = mode === 'reset'
                ? 'Layout reset'
                : `${mode === 'compact' ? 'Compact' : 'Comfortable'} layout applied`;
        } catch (error) {
            status.textContent = `Could not update layout: ${error.message}`;
            api.showError(`Could not update Dashboard layout: ${error.message}`);
        }
    };

    panel.querySelector('.dashboard-filter-apply').addEventListener('click', () => apply(readFilters()));
    panel.querySelector('.dashboard-filter-clear').addEventListener('click', () => {
        ['time', 'project', 'status', 'assignment', 'topic'].forEach((name) => {
            select(name).value = '';
        });
        apply(readFilters());
    });
    panel.querySelector('.dashboard-layout-compact').addEventListener('click', () => updateLayout('compact'));
    panel.querySelector('.dashboard-layout-comfortable').addEventListener('click', () => updateLayout('comfortable'));
    panel.querySelector('.dashboard-layout-reset').addEventListener('click', () => updateLayout('reset'));
    status.textContent = Object.values(data.filters).some(Boolean) ? 'Filters active' : 'No filters active';
})();
