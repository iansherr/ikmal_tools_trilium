/**
 * Today Homepage Component: Editable & Organizable Dashboard View
 */

import { TodayEngine } from '../engine/todayEngine.js';
import { TemplateEngine } from '../engine/templateEngine.js';
import { TodayLayoutConfig, TodayWidgetConfig } from '../engine/types.js';

export function renderTodayHomepage(
    container: HTMLElement,
    todayEngine: TodayEngine,
    templateEngine: TemplateEngine,
    onQuickCapture: (templateId: string) => void
): void {
    let isEditMode = false;

    function refresh() {
        container.innerHTML = '';

        const layout = todayEngine.getLayout();
        const widgets = todayEngine.getVisibleWidgets();

        // 1. Header & Action Bar
        const header = document.createElement('div');
        header.className = 'today-header d-flex align-items-center justify-content-between mb-4 p-3 border-bottom';
        header.style.background = 'var(--main-background-color, #1e1e2e)';
        header.style.borderRadius = '8px';

        const titleBox = document.createElement('div');
        const h1 = document.createElement('h1');
        h1.className = 'm-0 h3 font-weight-bold';
        h1.innerHTML = '⚡ Today Homepage';
        const subtitle = document.createElement('p');
        subtitle.className = 'text-muted m-0 small';
        subtitle.textContent = 'Your daily command center — fully customizable and component-driven.';
        titleBox.append(h1, subtitle);

        const actionsBox = document.createElement('div');
        actionsBox.className = 'd-flex align-items-center gap-2';

        // Quick Launch Buttons
        const templates = templateEngine.getAllTemplates().filter(t => !t.noJournalClone);
        for (const tpl of templates.slice(0, 4)) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-sm btn-outline-primary d-flex align-items-center gap-1';
            btn.innerHTML = `<i class="bx bx-${tpl.icon}"></i> ${tpl.title}`;
            btn.addEventListener('click', () => onQuickCapture(tpl.id));
            actionsBox.appendChild(btn);
        }

        // Edit Mode Toggle Button
        const editToggleBtn = document.createElement('button');
        editToggleBtn.type = 'button';
        editToggleBtn.className = `btn btn-sm ${isEditMode ? 'btn-success' : 'btn-secondary'}`;
        editToggleBtn.innerHTML = isEditMode ? '<i class="bx bx-check"></i> Done Editing' : '<i class="bx bx-cog"></i> Customize Dashboard';
        editToggleBtn.addEventListener('click', () => {
            isEditMode = !isEditMode;
            refresh();
        });
        actionsBox.appendChild(editToggleBtn);

        header.append(titleBox, actionsBox);
        container.appendChild(header);

        // 2. Customization Panel (shown in Edit Mode)
        if (isEditMode) {
            const editPanel = document.createElement('div');
            editPanel.className = 'card mb-4 border-info';
            editPanel.style.backgroundColor = 'var(--sub-background-color, #252538)';
            const editBody = document.createElement('div');
            editBody.className = 'card-body';
            editBody.innerHTML = `
                <h5 class="card-title text-info"><i class="bx bx-slider-alt"></i> Customize Today Homepage Components</h5>
                <p class="card-text text-muted small">Toggle component visibility, drag/reorder widgets, and change column layouts.</p>
            `;

            const widgetList = document.createElement('div');
            widgetList.className = 'd-flex flex-column gap-2 mb-3';

            for (const w of layout.widgets) {
                const item = document.createElement('div');
                item.className = 'd-flex align-items-center justify-content-between p-2 border rounded';
                item.style.backgroundColor = 'var(--main-background-color, #1e1e2e)';

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
            col.className = w.colSpan === 2 ? 'col-md-8' : w.colSpan === 3 ? 'col-md-12' : 'col-md-4';

            const card = document.createElement('div');
            card.className = 'card h-100 shadow-sm border-0';
            card.style.backgroundColor = 'var(--sub-background-color, #252538)';

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

            const emptyState = document.createElement('p');
            emptyState.className = 'text-muted small m-0 text-center py-3';
            emptyState.textContent = w.emptyMessage;
            cardBody.appendChild(emptyState);

            card.append(cardHeader, cardBody);
            col.appendChild(card);
            grid.appendChild(col);
        }

        container.appendChild(grid);
    }

    refresh();
}
