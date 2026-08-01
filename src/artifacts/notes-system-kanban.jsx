/**
 * Standalone Task Kanban Board (JSX Render Note)
 * Renders an interactive Kanban board note for tasks (#extTask), allowing it
 * to be embedded anywhere in Trilium or pinned in the sidebar.
 */

import { TemplateEngine } from '../engine/templateEngine.js';
import { RelationshipEngine } from '../engine/relationshipEngine.js';
import { IfThenRuleEngine } from '../engine/ifThenRuleEngine.js';
import { TodayEngine } from '../engine/todayEngine.js';
import { NoteCreationEngine } from '../engine/noteCreationEngine.js';
import { SettingsEngine } from '../engine/settingsEngine.js';
import { escapeHtml, section } from '../components/nativeUi.js';

export function initNotesSystemKanban(containerEl) {
    const templateEngine = new TemplateEngine();
    const relationshipEngine = new RelationshipEngine(templateEngine);
    const ifThenRuleEngine = new IfThenRuleEngine();
    const todayEngine = new TodayEngine();
    const settingsEngine = new SettingsEngine();
    const noteCreationEngine = new NoteCreationEngine(templateEngine, relationshipEngine, ifThenRuleEngine, settingsEngine);

    const shell = document.createElement('div');
    shell.className = 'notes-system-shell p-3';

    const { card } = section(shell, {
        title: 'Task Kanban Board',
        description: 'Live active task cards sorted by status column.',
    });

    const board = document.createElement('div');
    board.className = 'ns-kanban mt-2';

    const KANBAN_COLUMNS = [
        { id: 'todo', title: 'To Do' },
        { id: 'in_progress', title: 'In Progress' },
        { id: 'done', title: 'Done' },
    ];

    let taskCache = [];

    function loadTasks() {
        if (typeof api === 'undefined' || !api.searchForNotes) {
            taskCache = [
                { id: 't1', title: 'Sample Task 1 (Offline)', status: 'todo' },
                { id: 't2', title: 'Sample Task 2 (Offline)', status: 'in_progress' },
            ];
            renderColumns();
            return;
        }

        api.searchForNotes('#extTask').then((notes) => {
            taskCache = (notes || []).map((n) => ({
                id: n.noteId,
                title: n.title || 'Untitled Task',
                status: (n.labels || []).find((l) => l.name === 'status')?.value || 'todo',
            }));
            renderColumns();
        }).catch((err) => {
            console.error('[Kanban Widget] Search failed:', err);
        });
    }

    function renderColumns() {
        board.innerHTML = '';
        for (const column of KANBAN_COLUMNS) {
            const tasks = taskCache.filter((t) => t.status === column.id);

            const col = document.createElement('div');
            col.className = 'kanban-col';
            col.innerHTML = `
                <div class="ns-kanban-head">
                    <span>${escapeHtml(column.title)}</span>
                    <span class="ns-count">${tasks.length}</span>
                </div>
            `;

            const list = document.createElement('div');
            list.className = 'ns-kanban-list';

            if (tasks.length) {
                for (const t of tasks) {
                    const cardItem = document.createElement('div');
                    cardItem.className = 'ns-kanban-card';
                    cardItem.innerHTML = `<span class="ns-card-title">${escapeHtml(t.title)}</span>`;
                    cardItem.addEventListener('click', () => {
                        if (typeof api !== 'undefined' && api.openNote) {
                            api.openNote(t.id);
                        }
                    });
                    list.appendChild(cardItem);
                }
            } else {
                const empty = document.createElement('div');
                empty.className = 'ns-empty tiny p-2 text-center text-muted';
                empty.textContent = 'No tasks';
                list.appendChild(empty);
            }

            col.appendChild(list);
            board.appendChild(col);
        }
    }

    card.appendChild(board);
    shell.appendChild(card);
    containerEl.appendChild(shell);

    loadTasks();
}

if (typeof api !== 'undefined' || typeof window !== 'undefined') {
    const init = () => {
        const container = (typeof api !== 'undefined' && api.$container && (api.$container[0] || api.$container))
            || document.querySelector('.notes-system-kanban-root')
            || document.body;
        if (container) {
            initNotesSystemKanban(container);
        }
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
