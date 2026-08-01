/**
 * Today Homepage Component: Native Trilium UI Dashboard with Live Kanban, Quick Capture, and Workflow Guide
 */

import { TodayEngine } from '../engine/todayEngine.js';
import { TemplateEngine } from '../engine/templateEngine.js';

export function renderTodayHomepage(
    container: HTMLElement,
    todayEngine: TodayEngine,
    templateEngine: TemplateEngine,
    onQuickCapture: (templateId: string) => void
): void {
    let isEditMode = false;
    let showGuide = true;

    // Interactive Sample Tasks
    let tasks = [
        { id: 't1', title: 'Review quarterly goals & roadmap', priority: 'high', status: 'todo', dueDate: '2026-08-05', project: 'Trilium Extension' },
        { id: 't2', title: 'Publish LanguageTool plugin update', priority: 'medium', status: 'in_progress', dueDate: '2026-08-02', project: 'LanguageTool Plugin' },
        { id: 't3', title: 'Setup ETAPI automated test suite', priority: 'high', status: 'done', dueDate: '2026-07-31', project: 'Trilium Extension' },
    ];

    function refresh() {
        container.innerHTML = '';

        const layout = todayEngine.getLayout();
        const widgets = todayEngine.getVisibleWidgets();

        // 1. Header Bar
        const header = document.createElement('div');
        header.className = 'today-header d-flex align-items-center justify-content-between mb-4 p-3.5 border rounded shadow-sm';
        header.style.backgroundColor = 'var(--sub-background-color, transparent)';
        header.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';

        const titleBox = document.createElement('div');
        const h1 = document.createElement('h1');
        h1.className = 'm-0 h4 font-weight-bold d-flex align-items-center gap-2';
        h1.innerHTML = '<i class="bx bx-home-alt text-primary"></i> Today Homepage';
        const subtitle = document.createElement('p');
        subtitle.className = 'text-muted m-0 small mt-1';
        subtitle.textContent = 'Daily dashboard with quick capture, live kanban, and component grid.';
        titleBox.append(h1, subtitle);

        const actionsBox = document.createElement('div');
        actionsBox.className = 'd-flex align-items-center gap-2';

        const templates = templateEngine.getAllTemplates().filter(t => !t.noJournalClone);
        for (const tpl of templates.slice(0, 4)) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-sm btn-outline-primary d-flex align-items-center gap-1';
            btn.innerHTML = `<i class="bx bx-${tpl.icon}"></i> ${tpl.title}`;
            btn.addEventListener('click', () => onQuickCapture(tpl.id));
            actionsBox.appendChild(btn);
        }

        const guideToggleBtn = document.createElement('button');
        guideToggleBtn.type = 'button';
        guideToggleBtn.className = 'btn btn-sm btn-outline-info d-flex align-items-center gap-1';
        guideToggleBtn.innerHTML = `<i class="bx bx-compass"></i> ${showGuide ? 'Hide Guide' : 'Workflow Guide'}`;
        guideToggleBtn.addEventListener('click', () => {
            showGuide = !showGuide;
            refresh();
        });
        actionsBox.appendChild(guideToggleBtn);

        const editToggleBtn = document.createElement('button');
        editToggleBtn.type = 'button';
        editToggleBtn.className = `btn btn-sm ${isEditMode ? 'btn-success' : 'btn-outline-secondary'} d-flex align-items-center gap-1`;
        editToggleBtn.innerHTML = isEditMode ? '<i class="bx bx-check"></i> Done' : '<i class="bx bx-slider-alt"></i> Customize Layout';
        editToggleBtn.addEventListener('click', () => {
            isEditMode = !isEditMode;
            refresh();
        });
        actionsBox.appendChild(editToggleBtn);

        header.append(titleBox, actionsBox);
        container.appendChild(header);

        // 2. Interactive Happy Path & System Workflow Guide Banner
        if (showGuide) {
            const guideCard = document.createElement('div');
            guideCard.className = 'card mb-4 border-info';
            guideCard.style.backgroundColor = 'var(--sub-background-color, transparent)';
            guideCard.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';
            guideCard.innerHTML = `
                <div class="card-body">
                    <div class="d-flex align-items-center justify-content-between mb-2">
                        <h5 class="card-title h6 text-info font-weight-bold m-0 d-flex align-items-center gap-2">
                            <i class="bx bx-compass"></i> Notes System — How the 3 Engine Layers Interlock
                        </h5>
                        <button type="button" class="btn-close text-reset btn-sm close-guide-btn" aria-label="Close"></button>
                    </div>
                    <div class="row g-3 mt-1">
                        <div class="col-md-4">
                            <div class="p-3 border rounded h-100" style="background-color: var(--main-background-color, transparent); border-color: var(--border-color, rgba(128,128,128,0.2)) !important;">
                                <strong class="text-primary d-flex align-items-center gap-1">
                                    <i class="bx bx-layer"></i> 1. Pick a Template
                                </strong>
                                <p class="small text-muted mb-0 mt-1">
                                    Create Tasks, Meetings, Story Drafts, or Project Hubs pre-formatted with title patterns and promoted forms.
                                </p>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="p-3 border rounded h-100" style="background-color: var(--main-background-color, transparent); border-color: var(--border-color, rgba(128,128,128,0.2)) !important;">
                                <strong class="text-success d-flex align-items-center gap-1">
                                    <i class="bx bx-git-repo-forked"></i> 2. Connect Relationships
                                </strong>
                                <p class="small text-muted mb-0 mt-1">
                                    Notes automatically link to parent hubs or organizations. Topic tags are dynamically derived and inherited.
                                </p>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="p-3 border rounded h-100" style="background-color: var(--main-background-color, transparent); border-color: var(--border-color, rgba(128,128,128,0.2)) !important;">
                                <strong class="text-warning d-flex align-items-center gap-1">
                                    <i class="bx bx-git-commit"></i> 3. Automate with IFTTT
                                </strong>
                                <p class="small text-muted mb-0 mt-1">
                                    IF-THIS-THEN-THAT rules evaluate note creation triggers (e.g. High Priority ➔ Mark Due Soon & Assign Tag).
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const closeBtn = guideCard.querySelector('.close-guide-btn') as HTMLButtonElement;
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    showGuide = false;
                    refresh();
                });
            }
            container.appendChild(guideCard);
        }

        // 3. Customization Panel (Edit Mode directly on Today Homepage)
        if (isEditMode) {
            const editPanel = document.createElement('div');
            editPanel.className = 'card mb-4 border';
            editPanel.style.backgroundColor = 'var(--sub-background-color, transparent)';
            editPanel.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';
            const editBody = document.createElement('div');
            editBody.className = 'card-body';
            editBody.innerHTML = `
                <h5 class="card-title h6 text-info font-weight-bold d-flex align-items-center gap-2 mb-3">
                    <i class="bx bx-slider-alt"></i> Customize Today Homepage Widgets
                </h5>
            `;

            const widgetList = document.createElement('div');
            widgetList.className = 'd-flex flex-column gap-2';

            layout.widgets.sort((a, b) => a.order - b.order).forEach((w, idx) => {
                const item = document.createElement('div');
                item.className = 'd-flex align-items-center justify-content-between p-2.5 border rounded';
                item.style.backgroundColor = 'var(--main-background-color, transparent)';

                item.innerHTML = `
                    <div class="d-flex align-items-center gap-2.5">
                        <input type="checkbox" class="form-check-input" ${w.visible ? 'checked' : ''}>
                        <span class="font-weight-medium small">${w.title}</span>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <select class="form-select form-select-sm" style="width: 120px; font-size: 11px;">
                            <option value="1" ${w.colSpan === 1 ? 'selected' : ''}>1 Column</option>
                            <option value="2" ${w.colSpan === 2 ? 'selected' : ''}>2 Columns</option>
                        </select>
                        <button type="button" class="btn btn-xs btn-outline-secondary move-up" ${idx === 0 ? 'disabled' : ''}><i class="bx bx-up-arrow-alt"></i></button>
                        <button type="button" class="btn btn-xs btn-outline-secondary move-down" ${idx === layout.widgets.length - 1 ? 'disabled' : ''}><i class="bx bx-down-arrow-alt"></i></button>
                    </div>
                `;

                const chk = item.querySelector('input[type="checkbox"]') as HTMLInputElement;
                chk.addEventListener('change', () => {
                    todayEngine.toggleWidgetVisibility(w.id, chk.checked);
                    refresh();
                });

                const sel = item.querySelector('select') as HTMLSelectElement;
                sel.addEventListener('change', () => {
                    todayEngine.updateWidget(w.id, { colSpan: Number(sel.value) as any });
                    refresh();
                });

                const up = item.querySelector('.move-up') as HTMLButtonElement;
                up.addEventListener('click', () => {
                    if (idx > 0) {
                        const ids = layout.widgets.map(x => x.id);
                        [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
                        todayEngine.reorderWidgets(ids);
                        refresh();
                    }
                });

                const down = item.querySelector('.move-down') as HTMLButtonElement;
                down.addEventListener('click', () => {
                    if (idx < layout.widgets.length - 1) {
                        const ids = layout.widgets.map(x => x.id);
                        [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
                        todayEngine.reorderWidgets(ids);
                        refresh();
                    }
                });

                widgetList.appendChild(item);
            });

            editBody.appendChild(widgetList);
            editPanel.appendChild(editBody);
            container.appendChild(editPanel);
        }

        // 4. Component Grid Widgets
        const grid = document.createElement('div');
        grid.className = 'row g-3 today-grid';

        for (const w of widgets) {
            const col = document.createElement('div');
            col.className = w.colSpan === 2 ? 'col-md-12' : 'col-md-6';

            const card = document.createElement('div');
            card.className = 'card h-100 border shadow-sm';
            card.style.backgroundColor = 'var(--sub-background-color, transparent)';
            card.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';

            const cardHeader = document.createElement('div');
            cardHeader.className = 'card-header bg-transparent d-flex align-items-center justify-content-between';
            cardHeader.innerHTML = `
                <h3 class="h6 font-weight-bold m-0 d-flex align-items-center gap-2">
                    <i class="bx bx-list-check text-primary"></i> ${w.title}
                </h3>
                ${w.actionType ? `
                    <button type="button" class="btn btn-xs btn-outline-primary action-btn d-flex align-items-center gap-1">
                        <i class="bx bx-plus"></i> ${w.actionLabel}
                    </button>
                ` : ''}
            `;

            if (w.actionType) {
                const actBtn = cardHeader.querySelector('.action-btn') as HTMLButtonElement;
                if (actBtn) actBtn.addEventListener('click', () => onQuickCapture(w.actionType!));
            }

            card.appendChild(cardHeader);

            const cardBody = document.createElement('div');
            cardBody.className = 'card-body p-3';

            if (w.id === 'openTasks') {
                renderKanbanView(cardBody);
            } else {
                cardBody.innerHTML = `
                    <div class="p-3 text-center text-muted small border rounded border-dashed" style="border-style: dashed !important;">
                        <i class="bx bx-check-circle h4 d-block mb-1 text-success"></i>
                        ${w.emptyMessage}
                    </div>
                `;
            }

            card.appendChild(cardBody);
            col.appendChild(card);
            grid.appendChild(col);
        }

        container.appendChild(grid);
    }

    function renderKanbanView(parent: HTMLElement) {
        const kanban = document.createElement('div');
        kanban.className = 'row g-2';

        const cols = [
            { id: 'todo', title: 'To Do', badge: 'secondary' },
            { id: 'in_progress', title: 'In Progress', badge: 'info' },
            { id: 'done', title: 'Completed', badge: 'success' },
        ];

        for (const c of cols) {
            const colEl = document.createElement('div');
            colEl.className = 'col-md-4';

            const colBox = document.createElement('div');
            colBox.className = 'kanban-col p-2.5 rounded border';
            colBox.style.backgroundColor = 'var(--main-background-color, transparent)';
            colBox.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';

            const count = tasks.filter(t => t.status === c.id).length;
            colBox.innerHTML = `
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <strong class="small font-weight-bold">${c.title}</strong>
                    <span class="badge bg-${c.badge} bg-opacity-20 text-${c.badge} fs-6 px-2 py-0.5">${count}</span>
                </div>
                <div class="card-list d-flex flex-column gap-2"></div>
            `;

            const cardList = colBox.querySelector('.card-list') as HTMLElement;
            const colTasks = tasks.filter(t => t.status === c.id);

            if (!colTasks.length) {
                cardList.innerHTML = '<div class="small text-muted p-2 text-center">No tasks</div>';
            } else {
                for (const t of colTasks) {
                    const card = document.createElement('div');
                    card.className = 'kanban-card p-2 rounded border shadow-xs bg-body';
                    card.style.backgroundColor = 'var(--sub-background-color, transparent)';
                    card.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';
                    card.innerHTML = `
                        <div class="font-weight-medium small mb-1">${t.title}</div>
                        <div class="d-flex align-items-center justify-content-between text-muted" style="font-size: 11px;">
                            <span><i class="bx bx-folder"></i> ${t.project}</span>
                            <span class="badge ${t.priority === 'high' ? 'bg-danger' : 'bg-warning'} bg-opacity-20 text-body py-0 px-1">${t.priority}</span>
                        </div>
                    `;
                    cardList.appendChild(card);
                }
            }

            colEl.appendChild(colBox);
            kanban.appendChild(colEl);
        }

        parent.appendChild(kanban);
    }

    refresh();
}
