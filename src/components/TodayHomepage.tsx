/**
 * Today Homepage Component: Native Trilium UI Dashboard with Live Kanban & Quick Actions
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

    // Sample Task State for Interactive Demonstration
    let tasks = [
        { id: 't1', title: 'Review quarterly goals & roadmap', priority: 'high', status: 'todo', dueDate: '2026-08-05', project: 'Trilium Extension' },
        { id: 't2', title: 'Publish LanguageTool plugin update', priority: 'medium', status: 'in_progress', dueDate: '2026-08-02', project: 'LanguageTool Plugin' },
        { id: 't3', title: 'Setup ETAPI automated test suite', priority: 'high', status: 'done', dueDate: '2026-07-31', project: 'Trilium Extension' },
    ];

    function refresh() {
        container.innerHTML = '';

        const layout = todayEngine.getLayout();
        const widgets = todayEngine.getVisibleWidgets();

        // 1. Native Trilium Style Header & Quick Capture Bar
        const header = document.createElement('div');
        header.className = 'today-header d-flex align-items-center justify-content-between mb-4 p-3';

        const titleBox = document.createElement('div');
        const h1 = document.createElement('h1');
        h1.className = 'm-0 h3 font-weight-bold d-flex align-items-center gap-2';
        h1.innerHTML = '<i class="bx bx-sun text-warning"></i> Today Homepage';
        const subtitle = document.createElement('p');
        subtitle.className = 'text-muted m-0 small mt-1';
        subtitle.textContent = 'Component-driven daily dashboard styled natively with Trilium UI tokens.';
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

        const editToggleBtn = document.createElement('button');
        editToggleBtn.type = 'button';
        editToggleBtn.className = `btn btn-sm ${isEditMode ? 'btn-success' : 'btn-secondary'}`;
        editToggleBtn.innerHTML = isEditMode ? '<i class="bx bx-check"></i> Done Editing' : '<i class="bx bx-slider-alt"></i> Customize Layout';
        editToggleBtn.addEventListener('click', () => {
            isEditMode = !isEditMode;
            refresh();
        });
        actionsBox.appendChild(editToggleBtn);

        header.append(titleBox, actionsBox);
        container.appendChild(header);

        // 2. Customization Panel (Edit Mode)
        if (isEditMode) {
            const editPanel = document.createElement('div');
            editPanel.className = 'card mb-4 border-info';
            const editBody = document.createElement('div');
            editBody.className = 'card-body';
            editBody.innerHTML = `
                <h5 class="card-title text-info d-flex align-items-center gap-2">
                    <i class="bx bx-slider-alt"></i> Dashboard Component Settings
                </h5>
                <p class="card-text text-muted small">Toggle widget visibility and customize column layouts to match your workflow.</p>
            `;

            const widgetList = document.createElement('div');
            widgetList.className = 'd-flex flex-column gap-2 mb-3';

            for (const w of layout.widgets) {
                const item = document.createElement('div');
                item.className = 'd-flex align-items-center justify-content-between p-2 border rounded';
                item.style.backgroundColor = 'var(--ns-main-bg)';

                const info = document.createElement('div');
                info.className = 'd-flex align-items-center gap-2';
                const check = document.createElement('input');
                check.type = 'checkbox';
                check.checked = w.visible;
                check.className = 'form-check-input';
                check.addEventListener('change', () => {
                    todayEngine.toggleWidgetVisibility(w.id, check.checked);
                    refresh();
                });

                const label = document.createElement('span');
                label.className = 'font-weight-bold';
                label.textContent = w.title;

                info.append(check, label);

                const badge = document.createElement('span');
                badge.className = 'badge badge-secondary';
                badge.textContent = `Order: ${w.order}`;

                item.append(info, badge);
                widgetList.appendChild(item);
            }

            editBody.appendChild(widgetList);
            editPanel.appendChild(editBody);
            container.appendChild(editPanel);
        }

        // 3. Main Dashboard Component Grid
        const grid = document.createElement('div');
        grid.className = 'today-grid row g-3';

        for (const w of widgets) {
            const col = document.createElement('div');
            col.className = w.colSpan === 3 ? 'col-12' : w.colSpan === 2 ? 'col-md-8' : 'col-md-4';

            const card = document.createElement('div');
            card.className = 'card h-100 shadow-sm border-0';

            const cardHeader = document.createElement('div');
            cardHeader.className = 'card-header d-flex align-items-center justify-content-between bg-transparent border-bottom';
            const cardTitle = document.createElement('h6');
            cardTitle.className = 'm-0 font-weight-bold d-flex align-items-center gap-2';
            cardTitle.innerHTML = `<i class="bx bx-grid-alt text-primary"></i> ${w.title}`;
            cardHeader.appendChild(cardTitle);

            if (w.actionType && w.actionLabel) {
                const actionBtn = document.createElement('button');
                actionBtn.type = 'button';
                actionBtn.className = 'btn btn-xs btn-outline-success';
                actionBtn.textContent = `+ ${w.actionLabel}`;
                actionBtn.addEventListener('click', () => onQuickCapture(w.actionType!));
                cardHeader.appendChild(actionBtn);
            }

            const cardBody = document.createElement('div');
            cardBody.className = 'card-body p-3';

            if (w.marker === 'kanbanBoard') {
                renderKanbanBoard(cardBody, tasks, (taskId, newStatus) => {
                    const task = tasks.find(t => t.id === taskId);
                    if (task) {
                        task.status = newStatus;
                        refresh();
                    }
                });
            } else {
                const emptyState = document.createElement('p');
                emptyState.className = 'text-muted small m-0 text-center py-3';
                emptyState.textContent = w.emptyMessage;
                cardBody.appendChild(emptyState);
            }

            card.append(cardHeader, cardBody);
            col.appendChild(card);
            grid.appendChild(col);
        }

        container.appendChild(grid);
    }

    refresh();
}

/**
 * Render Interactive Kanban Board Component
 */
function renderKanbanBoard(
    container: HTMLElement,
    tasks: Array<{ id: string; title: string; priority: string; status: string; dueDate: string; project: string }>,
    onStatusChange: (taskId: string, newStatus: string) => void
) {
    const columns = [
        { id: 'todo', title: '📋 To Do', badgeClass: 'badge-primary' },
        { id: 'in_progress', title: '⚡ In Progress', badgeClass: 'badge-warning' },
        { id: 'done', title: '✅ Done', badgeClass: 'badge-success' },
    ];

    const kanbanRow = document.createElement('div');
    kanbanRow.className = 'row g-3';

    for (const col of columns) {
        const colTasks = tasks.filter(t => t.status === col.id);

        const colDiv = document.createElement('div');
        colDiv.className = 'col-md-4';

        const colCard = document.createElement('div');
        colCard.className = 'kanban-col h-100';

        const colHeader = document.createElement('div');
        colHeader.className = 'd-flex align-items-center justify-content-between mb-3 pb-2 border-bottom border-dark';
        colHeader.innerHTML = `
            <span class="font-weight-bold small">${col.title}</span>
            <span class="badge ${col.badgeClass}">${colTasks.length}</span>
        `;

        const cardContainer = document.createElement('div');
        cardContainer.className = 'd-flex flex-column gap-2 min-vh-20';

        if (colTasks.length === 0) {
            const emptyText = document.createElement('div');
            emptyText.className = 'text-muted text-center py-4 extra-small';
            emptyText.textContent = 'No tasks in column';
            cardContainer.appendChild(emptyText);
        } else {
            for (const task of colTasks) {
                const taskCard = document.createElement('div');
                taskCard.className = 'kanban-card shadow-sm';
                taskCard.innerHTML = `
                    <div class="d-flex align-items-center justify-content-between mb-1">
                        <span class="badge ${task.priority === 'high' ? 'badge-danger' : 'badge-secondary'} extra-small">${task.priority}</span>
                        <span class="text-muted extra-small"><i class="bx bx-calendar"></i> ${task.dueDate}</span>
                    </div>
                    <div class="font-weight-bold small text-white mb-2">${task.title}</div>
                    <div class="d-flex align-items-center justify-content-between text-muted extra-small">
                        <span><i class="bx bx-book"></i> ${task.project}</span>
                        <div class="btn-group btn-group-xs">
                            ${col.id !== 'todo' ? `<button class="btn btn-xs btn-outline-secondary move-prev" title="Move Left">&larr;</button>` : ''}
                            ${col.id !== 'done' ? `<button class="btn btn-xs btn-outline-secondary move-next" title="Move Right">&rarr;</button>` : ''}
                        </div>
                    </div>
                `;

                const prevBtn = taskCard.querySelector('.move-prev');
                if (prevBtn) {
                    prevBtn.addEventListener('click', () => {
                        const targetStatus = col.id === 'done' ? 'in_progress' : 'todo';
                        onStatusChange(task.id, targetStatus);
                    });
                }

                const nextBtn = taskCard.querySelector('.move-next');
                if (nextBtn) {
                    nextBtn.addEventListener('click', () => {
                        const targetStatus = col.id === 'todo' ? 'in_progress' : 'done';
                        onStatusChange(task.id, targetStatus);
                    });
                }

                cardContainer.appendChild(taskCard);
            }
        }

        colCard.append(colHeader, cardContainer);
        colDiv.appendChild(colCard);
        kanbanRow.appendChild(colDiv);
    }

    container.appendChild(kanbanRow);
}
