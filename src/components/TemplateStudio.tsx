/**
 * Template Studio Component: Interactive editor & Live Note Preview for Trilium templates.
 * Styled natively with Trilium Boxicons and design tokens.
 */

import { TemplateEngine } from '../engine/templateEngine.js';
import { TemplateDefinition, PromotedAttributeDef, AttributeDataType } from '../engine/types.js';

export function renderTemplateStudio(
    container: HTMLElement,
    templateEngine: TemplateEngine,
    onSave: () => void
): void {
    let selectedTemplateId: string = templateEngine.getAllTemplates()[0]?.id || 'task';

    function refresh() {
        container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'template-studio-wrapper d-flex flex-column gap-3';

        // Header Banner
        const header = document.createElement('div');
        header.className = 'p-3 rounded border d-flex align-items-center justify-content-between';
        header.style.backgroundColor = 'var(--sub-background-color, transparent)';
        header.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';
        header.innerHTML = `
            <div class="d-flex align-items-center gap-3">
                <i class="bx bx-layer h3 m-0 text-primary"></i>
                <div>
                    <h2 class="h5 m-0 font-weight-bold">Template Studio & Live Note Preview</h2>
                    <p class="text-muted small m-0 mt-1">
                        Configure template title patterns, promoted attribute forms, and content skeletons with live preview.
                    </p>
                </div>
            </div>
            <button type="button" class="btn btn-sm btn-outline-primary new-template-btn d-flex align-items-center gap-1">
                <i class="bx bx-plus"></i> New Template
            </button>
        `;

        const newTplBtn = header.querySelector('.new-template-btn') as HTMLButtonElement;
        newTplBtn.addEventListener('click', () => showCreateTemplateModal());
        wrapper.appendChild(header);

        const layoutRow = document.createElement('div');
        layoutRow.className = 'row g-3';

        // 1. Sidebar: Template Selector
        const sidebarCol = document.createElement('div');
        sidebarCol.className = 'col-md-3';

        const sidebarCard = document.createElement('div');
        sidebarCard.className = 'card border';
        sidebarCard.style.backgroundColor = 'var(--sub-background-color, transparent)';
        sidebarCard.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';

        const sidebarHeader = document.createElement('div');
        sidebarHeader.className = 'card-header bg-transparent border-bottom font-weight-bold small text-muted d-flex align-items-center gap-1';
        sidebarHeader.innerHTML = '<i class="bx bx-list-ul"></i> Templates';
        sidebarCard.appendChild(sidebarHeader);

        const listGroup = document.createElement('div');
        listGroup.className = 'list-group list-group-flush';

        for (const tpl of templateEngine.getAllTemplates()) {
            const item = document.createElement('a');
            item.href = '#';
            item.className = `list-group-item list-group-item-action d-flex align-items-center justify-content-between p-2.5 ${tpl.id === selectedTemplateId ? 'active' : ''}`;
            item.style.backgroundColor = tpl.id === selectedTemplateId ? 'var(--active-item-background-color, #3b82f6)' : 'transparent';
            item.style.color = tpl.id === selectedTemplateId ? '#fff' : 'var(--main-text-color, inherit)';
            item.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.1))';

            item.innerHTML = `
                <div class="d-flex align-items-center gap-2">
                    <i class="bx bx-${tpl.icon}"></i>
                    <span class="font-weight-medium small">${tpl.title}</span>
                </div>
                ${tpl.noJournalClone ? '<i class="bx bx-unlink small text-muted" title="No Journal clone"></i>' : ''}
            `;

            item.addEventListener('click', (e) => {
                e.preventDefault();
                selectedTemplateId = tpl.id;
                refresh();
            });
            listGroup.appendChild(item);
        }

        sidebarCard.appendChild(listGroup);
        sidebarCol.appendChild(sidebarCard);
        layoutRow.appendChild(sidebarCol);

        // 2. Editor & Live Note Preview Columns
        const activeTpl = templateEngine.getTemplate(selectedTemplateId);

        if (activeTpl) {
            // Editor Column
            const editorCol = document.createElement('div');
            editorCol.className = 'col-md-5';

            const editorCard = document.createElement('div');
            editorCard.className = 'card border';
            editorCard.style.backgroundColor = 'var(--sub-background-color, transparent)';
            editorCard.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';

            const editorHeader = document.createElement('div');
            editorHeader.className = 'card-header bg-transparent border-bottom d-flex align-items-center justify-content-between';
            editorHeader.innerHTML = `
                <h5 class="m-0 h6 font-weight-bold d-flex align-items-center gap-2">
                    <i class="bx bx-${activeTpl.icon} text-primary"></i>
                    <span>Template: ${activeTpl.title}</span>
                </h5>
                <span class="badge ${activeTpl.isBuiltin ? 'bg-secondary' : 'bg-info'} bg-opacity-20 text-muted">${activeTpl.isBuiltin ? 'Built-in' : 'Custom'}</span>
            `;
            editorCard.appendChild(editorHeader);

            const editorBody = document.createElement('div');
            editorBody.className = 'card-body d-flex flex-column gap-3';

            // Form Fields
            editorBody.innerHTML = `
                <div>
                    <label class="form-label small font-weight-bold">Template Title</label>
                    <input type="text" id="tpl-title" class="form-control form-control-sm" value="${activeTpl.title}">
                </div>
                <div>
                    <label class="form-label small font-weight-bold">Title Pattern</label>
                    <input type="text" id="tpl-pattern" class="form-control form-control-sm" value="${activeTpl.titlePattern}">
                    <div class="form-text small text-muted">Variables: <code>{title}</code>, <code>{isoDate}</code>, <code>{weekDay}</code></div>
                </div>
                <div>
                    <label class="form-label small font-weight-bold">Icon (Boxicons Class)</label>
                    <div class="input-group input-group-sm">
                        <span class="input-group-text"><i class="bx bx-${activeTpl.icon}"></i></span>
                        <input type="text" id="tpl-icon" class="form-control" value="${activeTpl.icon}">
                    </div>
                </div>

                <div class="border-top pt-3">
                    <div class="d-flex align-items-center justify-content-between mb-2">
                        <h6 class="m-0 font-weight-bold small d-flex align-items-center gap-1">
                            <i class="bx bx-list-check text-success"></i> Promoted Attributes (${activeTpl.attributes.length})
                        </h6>
                    </div>
                    <table class="table table-sm table-borderless small m-0">
                        <thead>
                            <tr class="text-muted border-bottom">
                                <th>Name</th>
                                <th>Type</th>
                                <th>Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${activeTpl.attributes.map(a => `
                                <tr>
                                    <td><code>#${a.name}</code></td>
                                    <td><span class="badge bg-secondary bg-opacity-20 text-muted">${a.type}</span></td>
                                    <td>${a.options ? a.options.join(', ') : a.defaultValue ?? '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <button type="button" class="btn btn-xs btn-outline-success mt-2 add-attr-btn d-flex align-items-center gap-1">
                        <i class="bx bx-plus"></i> Add Promoted Attribute
                    </button>
                </div>

                <div class="border-top pt-3">
                    <h6 class="m-0 font-weight-bold small mb-2 d-flex align-items-center gap-1">
                        <i class="bx bx-code-alt text-info"></i> Content Skeleton (HTML)
                    </h6>
                    <textarea id="tpl-content" class="form-control font-monospace small" rows="5" style="font-size: 12px;">${activeTpl.defaultContent}</textarea>
                </div>

                <div class="pt-2 d-flex justify-content-end">
                    <button type="button" class="btn btn-sm btn-primary save-tpl-btn d-flex align-items-center gap-1">
                        <i class="bx bx-save"></i> Save Template
                    </button>
                </div>
            `;

            const addAttrBtn = editorBody.querySelector('.add-attr-btn') as HTMLButtonElement;
            addAttrBtn.addEventListener('click', () => showAddAttrModal(activeTpl));

            const saveBtn = editorBody.querySelector('.save-tpl-btn') as HTMLButtonElement;
            saveBtn.addEventListener('click', () => {
                const newTitle = (editorBody.querySelector('#tpl-title') as HTMLInputElement).value;
                const newPattern = (editorBody.querySelector('#tpl-pattern') as HTMLInputElement).value;
                const newIcon = (editorBody.querySelector('#tpl-icon') as HTMLInputElement).value;
                const newContent = (editorBody.querySelector('#tpl-content') as HTMLTextAreaElement).value;

                templateEngine.updateTemplate(activeTpl.id, {
                    title: newTitle,
                    titlePattern: newPattern,
                    icon: newIcon,
                    defaultContent: newContent,
                });
                onSave();
                refresh();
            });

            editorCard.appendChild(editorBody);
            editorCol.appendChild(editorCard);
            layoutRow.appendChild(editorCol);

            // 3. Live Note Preview Column
            const previewCol = document.createElement('div');
            previewCol.className = 'col-md-4';

            const previewCard = document.createElement('div');
            previewCard.className = 'card border shadow-sm';
            previewCard.style.backgroundColor = 'var(--sub-background-color, transparent)';
            previewCard.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';

            const previewHeader = document.createElement('div');
            previewHeader.className = 'card-header bg-transparent border-bottom d-flex align-items-center justify-content-between';
            previewHeader.innerHTML = `
                <h5 class="m-0 h6 font-weight-bold text-info d-flex align-items-center gap-2">
                    <i class="bx bx-show"></i> Live Note Preview
                </h5>
                <span class="badge bg-success bg-opacity-20 text-success">Active Note Model</span>
            `;
            previewCard.appendChild(previewHeader);

            const previewBody = document.createElement('div');
            previewBody.className = 'card-body d-flex flex-column gap-3';

            const formattedTitle = templateEngine.formatTitle(activeTpl.id, 'Sample Note Title');

            previewBody.innerHTML = `
                <div class="p-3 rounded border" style="background-color: var(--main-background-color, transparent);">
                    <div class="d-flex align-items-center gap-2 mb-2">
                        <i class="bx bx-${activeTpl.icon} h4 m-0 text-primary"></i>
                        <h4 class="h6 m-0 font-weight-bold">${formattedTitle}</h4>
                    </div>
                    <div class="small text-muted mb-3">
                        <i class="bx bx-folder"></i> Target Folder: <code>${activeTpl.noJournalClone ? '#projectRoot' : '#calendarRoot / Journal'}</code>
                    </div>

                    <!-- Promoted Attributes Form Preview -->
                    <div class="border-top pt-2 mb-3">
                        <div class="small text-muted font-weight-bold mb-2"><i class="bx bx-slider-alt"></i> Promoted Form Controls</div>
                        <div class="d-flex flex-column gap-2">
                            ${activeTpl.attributes.map(a => `
                                <div class="d-flex align-items-center justify-content-between small">
                                    <span class="text-muted">#${a.name}</span>
                                    ${a.options ? `
                                        <select class="form-select form-select-sm py-0" style="width: 140px; font-size: 11px;">
                                            ${a.options.map(opt => `<option>${opt}</option>`).join('')}
                                        </select>
                                    ` : `
                                        <input type="text" class="form-control form-control-sm py-0 px-2" value="${a.defaultValue ?? ''}" placeholder="Value" style="width: 140px; font-size: 11px;">
                                    `}
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Content Skeleton Preview -->
                    <div class="border-top pt-2">
                        <div class="small text-muted font-weight-bold mb-2"><i class="bx bx-file-blank"></i> Note Body Skeleton</div>
                        <div class="p-2.5 rounded border small font-monospace" style="background-color: var(--main-background-color, inherit); font-size: 11.5px; max-height: 180px; overflow-y: auto;">
                            ${activeTpl.defaultContent || '<em class="text-muted">Empty note body</em>'}
                        </div>
                    </div>
                </div>
            `;

            previewCard.appendChild(previewBody);
            previewCol.appendChild(previewCard);
            layoutRow.appendChild(previewCol);
        }

        wrapper.appendChild(layoutRow);
        container.appendChild(wrapper);
    }

    function showCreateTemplateModal() {
        const title = prompt('Enter new Template ID (e.g. researchNote):');
        if (!title) return;
        templateEngine.registerTemplate({
            id: title.toLowerCase().replace(/\s+/g, '-'),
            title,
            titlePattern: '{title}',
            icon: 'file-blank',
            attributes: [],
            defaultContent: `<h2>${title}</h2><p>Notes content...</p>`,
        });
        onSave();
        refresh();
    }

    function showAddAttrModal(tpl: TemplateDefinition) {
        const name = prompt('Attribute name (e.g. priority, status, dueDate):');
        if (!name) return;
        const type = prompt('Attribute type (label or relation):', 'label') as any;
        const dataType = prompt('Data type (text, number, select, date):', 'text') as any;
        const optionsRaw = dataType === 'select' ? prompt('Comma-separated options (e.g. low, medium, high):') : null;

        tpl.attributes.push({
            name,
            type: type === 'relation' ? 'relation' : 'label',
            dataType: dataType || 'text',
            options: optionsRaw ? optionsRaw.split(',').map(s => s.trim()) : undefined,
        });
        onSave();
        refresh();
    }

    refresh();
}
