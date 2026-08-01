/**
 * Template Studio Component: Nested Template Tree Sidebar, Inheritance & Relationship Section,
 * Large Live Note Preview with Inherited Attributes.
 * Styled natively with Trilium Boxicons and design tokens.
 */

import { TemplateEngine } from '../engine/templateEngine.js';
import { TemplateDefinition, PromotedAttributeDef, AttributeDataType } from '../engine/types.js';
import { exportTemplateAsHtml } from '../engine/yamlSpec.js';

export function renderTemplateStudio(
    container: HTMLElement,
    templateEngine: TemplateEngine,
    onSave: () => void
): void {
    let selectedTemplateId: string = templateEngine.getAllTemplates()[0]?.id || 'story';

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
                    <h2 class="h5 m-0 font-weight-bold">Template Studio & Relationship Inheritance</h2>
                    <p class="text-muted small m-0 mt-1">
                        Configure nested template schemas, parent inheritance rules, promoted attributes, and live side-by-side note preview.
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

        // 1. Sidebar: Nested Template Hierarchy Tree
        const sidebarCol = document.createElement('div');
        sidebarCol.className = 'col-md-3';

        const sidebarCard = document.createElement('div');
        sidebarCard.className = 'card border h-100';
        sidebarCard.style.backgroundColor = 'var(--sub-background-color, transparent)';
        sidebarCard.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';

        const sidebarHeader = document.createElement('div');
        sidebarHeader.className = 'card-header bg-transparent border-bottom font-weight-bold small text-muted d-flex align-items-center gap-1';
        sidebarHeader.innerHTML = '<i class="bx bx-sitemap"></i> Nested Template Hierarchy';
        sidebarCard.appendChild(sidebarHeader);

        const listGroup = document.createElement('div');
        listGroup.className = 'list-group list-group-flush p-2 d-flex flex-column gap-1';

        // Define nested hierarchy tree groups
        const hierarchyGroups = [
            {
                groupName: 'Project & Editorial Hubs',
                icon: 'book',
                templates: ['projectHub', 'story', 'edit', 'reportingNotes', 'projectTask'],
            },
            {
                groupName: 'Work & Meetings',
                icon: 'calendar-event',
                templates: ['meeting', 'meetingPrep', 'task', 'emailDraft'],
            },
            {
                groupName: 'People & Organizations',
                icon: 'user',
                templates: ['person', 'organization'],
            },
            {
                groupName: 'System & Topics',
                icon: 'purchase-tag',
                templates: ['topic'],
            },
        ];

        for (const grp of hierarchyGroups) {
            const grpHeader = document.createElement('div');
            grpHeader.className = 'tiny font-weight-bold text-muted text-uppercase tracking-wider px-2 pt-2 pb-1 border-bottom';
            grpHeader.style.borderColor = 'var(--border-color, rgba(128,128,128,0.1)) !important;';
            grpHeader.innerHTML = `<i class="bx bx-${grp.icon}"></i> ${grp.groupName}`;
            listGroup.appendChild(grpHeader);

            for (const tId of grp.templates) {
                const tpl = templateEngine.getTemplate(tId);
                if (!tpl) continue;

                const isChild = tId === 'story' || tId === 'edit' || tId === 'reportingNotes' || tId === 'projectTask' || tId === 'meetingPrep';
                const isGrandchild = tId === 'edit';

                const item = document.createElement('a');
                item.href = '#';
                item.className = `list-group-item list-group-item-action d-flex align-items-center justify-content-between p-2 rounded border-0 ${tpl.id === selectedTemplateId ? 'active' : ''}`;
                item.style.backgroundColor = tpl.id === selectedTemplateId ? 'var(--active-item-background-color, #3b82f6)' : 'transparent';
                item.style.color = tpl.id === selectedTemplateId ? '#fff' : 'var(--main-text-color, inherit)';
                item.style.paddingLeft = isGrandchild ? '1.8rem' : (isChild ? '1.2rem' : '0.6rem');

                item.innerHTML = `
                    <div class="d-flex align-items-center gap-2">
                        ${isGrandchild ? '<i class="bx bx-subdirectory-right text-muted"></i>' : (isChild ? '<i class="bx bx-right-arrow-alt text-muted"></i>' : '')}
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
        }

        sidebarCard.appendChild(listGroup);
        sidebarCol.appendChild(sidebarCard);
        layoutRow.appendChild(sidebarCol);

        // 2. Editor & Large Preview Columns
        const activeTpl = templateEngine.getTemplate(selectedTemplateId);

        if (activeTpl) {
            // Editor Column (5 cols)
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
                <div class="d-flex align-items-center gap-2">
                    <button type="button" class="btn btn-xs btn-outline-secondary export-html-btn d-flex align-items-center gap-1" title="Download template HTML file">
                        <i class="bx bx-download"></i> Export .html
                    </button>
                    <span class="badge ${activeTpl.isBuiltin ? 'bg-secondary' : 'bg-info'} bg-opacity-20 text-muted">${activeTpl.isBuiltin ? 'Built-in' : 'Custom'}</span>
                </div>
            `;

            const exportBtn = editorHeader.querySelector('.export-html-btn') as HTMLButtonElement;
            exportBtn.addEventListener('click', () => {
                const { filename, content } = exportTemplateAsHtml(activeTpl);
                const blob = new Blob([content], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
            });

            editorCard.appendChild(editorHeader);

            const editorBody = document.createElement('div');
            editorBody.className = 'card-body d-flex flex-column gap-3';

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

                <!-- Integrated Parent Inheritance & Relationship Section -->
                <div class="border-top pt-3">
                    <h6 class="m-0 font-weight-bold small mb-2 d-flex align-items-center gap-1 text-info">
                        <i class="bx bx-git-repo-forked"></i> Parent Inheritance & Relationship Rules
                    </h6>
                    <div class="p-2.5 rounded border small d-flex flex-column gap-1.5" style="background-color: var(--main-background-color, transparent); border-color: var(--border-color, rgba(128,128,128,0.2)) !important;">
                        ${activeTpl.relationships.length > 0 ? activeTpl.relationships.map(r => `
                            <div class="d-flex align-items-center justify-content-between">
                                <span>
                                    <i class="bx bx-right-arrow-alt text-success"></i> Links to <strong>${r.targetTemplateName}</strong> via <code>~${r.relationName}</code>
                                </span>
                                <span class="badge ${r.inheritTopics ? 'bg-info bg-opacity-20 text-info' : 'bg-secondary bg-opacity-20 text-muted'}">
                                    ${r.inheritTopics ? 'Inherits Topics & Client' : 'Link Only'}
                                </span>
                            </div>
                        `).join('') : '<div class="text-muted">Root template (no parent relation required).</div>'}
                    </div>
                </div>

                <!-- Promoted Attributes with Interactive Help Chips -->
                <div class="border-top pt-3">
                    <div class="d-flex align-items-center justify-content-between mb-2">
                        <h6 class="m-0 font-weight-bold small d-flex align-items-center gap-1">
                            <i class="bx bx-list-check text-success"></i> Promoted Attributes (${activeTpl.attributes.length})
                        </h6>
                    </div>

                    <!-- Interactive Option Chips for New Users -->
                    <div class="d-flex flex-wrap gap-1.5 mb-2">
                        <span class="badge bg-secondary bg-opacity-20 text-muted font-weight-normal small">Quick Add Chips:</span>
                        <button type="button" class="btn btn-xs btn-outline-info chip-btn" data-chip="label-text">Label: Priority</button>
                        <button type="button" class="btn btn-xs btn-outline-info chip-btn" data-chip="label-date">Label: Due Date</button>
                        <button type="button" class="btn btn-xs btn-outline-info chip-btn" data-chip="relation-project">Relation: Project</button>
                        <button type="button" class="btn btn-xs btn-outline-info chip-btn" data-chip="relation-client">Relation: Client</button>
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

            // Setup Quick Add Chips
            editorBody.querySelectorAll('.chip-btn').forEach(btn => {
                btn.addEventListener('click', (e: any) => {
                    const chip = e.target.dataset.chip;
                    if (chip === 'label-text') {
                        activeTpl.attributes.push({ name: 'priority', type: 'label', dataType: 'select', options: ['high', 'medium', 'low'] });
                    } else if (chip === 'label-date') {
                        activeTpl.attributes.push({ name: 'dueDate', type: 'label', dataType: 'date' });
                    } else if (chip === 'relation-project') {
                        activeTpl.attributes.push({ name: 'project', type: 'relation', dataType: 'text' });
                    } else if (chip === 'relation-client') {
                        activeTpl.attributes.push({ name: 'client', type: 'relation', dataType: 'text' });
                    }
                    onSave();
                    refresh();
                });
            });

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

            // 3. LARGE Live Note Preview Column (4 cols) with Inherited Attributes
            const previewCol = document.createElement('div');
            previewCol.className = 'col-md-4';

            const previewCard = document.createElement('div');
            previewCard.className = 'card border shadow-sm h-100';
            previewCard.style.backgroundColor = 'var(--sub-background-color, transparent)';
            previewCard.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';

            const previewHeader = document.createElement('div');
            previewHeader.className = 'card-header bg-transparent border-bottom d-flex align-items-center justify-content-between';
            previewHeader.innerHTML = `
                <h5 class="m-0 h6 font-weight-bold text-info d-flex align-items-center gap-2">
                    <i class="bx bx-show"></i> Live Note & Inheritance Preview
                </h5>
                <span class="badge bg-success bg-opacity-20 text-success">Render Model</span>
            `;
            previewCard.appendChild(previewHeader);

            const previewBody = document.createElement('div');
            previewBody.className = 'card-body d-flex flex-column gap-3';

            const formattedTitle = templateEngine.formatTitle(activeTpl.id, 'Sample Note Title');

            previewBody.innerHTML = `
                <div class="p-3 rounded border flex-grow-1 d-flex flex-column" style="background-color: var(--main-background-color, transparent);">
                    <div class="d-flex align-items-center gap-2 mb-2 border-bottom pb-2">
                        <i class="bx bx-${activeTpl.icon} h4 m-0 text-primary"></i>
                        <div>
                            <h4 class="h6 m-0 font-weight-bold">${formattedTitle}</h4>
                            <div class="small text-muted mt-0.5">
                                <i class="bx bx-folder"></i> Target Subtree: <code>${activeTpl.noJournalClone ? '#projectRoot' : '#calendarRoot / Journal'}</code>
                            </div>
                        </div>
                    </div>

                    <!-- Promoted Attributes Form Preview -->
                    <div class="border-bottom pb-2.5 mb-2.5">
                        <div class="small text-muted font-weight-bold mb-2 d-flex align-items-center gap-1">
                            <i class="bx bx-slider-alt"></i> Direct Promoted Form Attributes
                        </div>
                        <div class="d-flex flex-column gap-2">
                            ${activeTpl.attributes.map(a => `
                                <div class="d-flex align-items-center justify-content-between p-1.5 rounded border" style="background-color: var(--sub-background-color, transparent);">
                                    <div class="d-flex align-items-center gap-2">
                                        <span class="badge bg-primary bg-opacity-10 text-primary">#${a.name}</span>
                                    </div>
                                    ${a.options ? `
                                        <select class="form-select form-select-sm py-0" style="width: 130px; font-size: 11px;">
                                            ${a.options.map(opt => `<option>${opt}</option>`).join('')}
                                        </select>
                                    ` : `
                                        <input type="text" class="form-control form-control-sm py-0 px-2" value="${a.defaultValue ?? ''}" placeholder="Value..." style="width: 130px; font-size: 11px;">
                                    `}
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Inherited Attributes & Derived Topics Preview -->
                    <div class="border-bottom pb-2.5 mb-2.5">
                        <div class="small text-info font-weight-bold mb-2 d-flex align-items-center gap-1">
                            <i class="bx bx-git-repo-forked"></i> Inherited Parent Metadata & Topics
                        </div>
                        <div class="d-flex flex-column gap-1.5 small text-muted">
                            <div class="d-flex align-items-center justify-content-between">
                                <span>~client (Inherited):</span>
                                <span class="badge bg-secondary bg-opacity-20 text-muted">Acme Corp</span>
                            </div>
                            <div class="d-flex align-items-center justify-content-between">
                                <span>~derivedTopic (Inherited):</span>
                                <span class="badge bg-info bg-opacity-20 text-info">#AI Technology</span>
                            </div>
                        </div>
                    </div>

                    <!-- Content Skeleton Preview -->
                    <div class="flex-grow-1 d-flex flex-column">
                        <div class="small text-muted font-weight-bold mb-2 d-flex align-items-center gap-1">
                            <i class="bx bx-file-blank"></i> Content Skeleton Body
                        </div>
                        <div class="p-2.5 rounded border flex-grow-1 font-monospace" style="background-color: var(--sub-background-color, transparent); font-size: 11.5px; max-height: 160px; overflow-y: auto;">
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
