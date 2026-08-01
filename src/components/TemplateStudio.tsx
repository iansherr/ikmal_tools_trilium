/**
 * Template Studio Component: True Nested Visual Tree View & Native Trilium Settings Proportions.
 * Styled natively with Trilium Boxicons and standard Trilium form components.
 */

import { TemplateEngine } from '../engine/templateEngine.js';
import { TemplateDefinition, PromotedAttributeDef, TemplateRelationshipDef } from '../engine/types.js';
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
        wrapper.className = 'template-studio-wrapper d-flex flex-column gap-4';

        // Header Banner (Trilium Settings Style)
        const header = document.createElement('div');
        header.className = 'p-3 rounded border d-flex align-items-center justify-content-between';
        header.style.backgroundColor = 'var(--sub-background-color, transparent)';
        header.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';
        header.innerHTML = `
            <div class="d-flex align-items-center gap-3">
                <i class="bx bx-layer h3 m-0 text-primary"></i>
                <div>
                    <h2 class="h5 m-0 font-weight-bold">Template Studio & Relationship Tree</h2>
                    <p class="text-muted small m-0 mt-1">
                        Configure nested template schemas, parent relationship links, promoted attributes, and note previews.
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
        layoutRow.className = 'row g-4';

        // 1. Sidebar: True Nested Visual Tree View (Trilium Navigation Style)
        const sidebarCol = document.createElement('div');
        sidebarCol.className = 'col-md-3';

        const sidebarCard = document.createElement('div');
        sidebarCard.className = 'card border h-100';
        sidebarCard.style.backgroundColor = 'var(--sub-background-color, transparent)';
        sidebarCard.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';

        const sidebarHeader = document.createElement('div');
        sidebarHeader.className = 'card-header bg-transparent border-bottom font-weight-bold small text-muted d-flex align-items-center justify-content-between';
        sidebarHeader.innerHTML = `
            <span class="d-flex align-items-center gap-1"><i class="bx bx-sitemap"></i> Nested Template Tree</span>
            <span class="small text-muted font-weight-normal">Tree View</span>
        `;
        sidebarCard.appendChild(sidebarHeader);

        const treeContainer = document.createElement('div');
        treeContainer.className = 'card-body p-2';

        // Build True Nested Tree Node Structure
        const treeNodes = [
            {
                id: 'projectHub',
                children: [
                    {
                        id: 'story',
                        children: [
                            { id: 'edit', children: [] }
                        ]
                    },
                    { id: 'reportingNotes', children: [] },
                    { id: 'projectTask', children: [] },
                    { id: 'emailDraft', children: [] }
                ]
            },
            {
                id: 'organization',
                children: [
                    {
                        id: 'meeting',
                        children: [
                            { id: 'meetingPrep', children: [] }
                        ]
                    },
                    { id: 'person', children: [] }
                ]
            },
            { id: 'task', children: [] },
            { id: 'topic', children: [] }
        ];

        function renderTreeBranch(nodes: Array<{ id: string; children: any[] }>, depth = 0): HTMLElement {
            const ul = document.createElement('ul');
            ul.className = 'list-unstyled m-0 d-flex flex-column gap-1';
            if (depth > 0) ul.style.paddingLeft = '1.25rem';

            for (const node of nodes) {
                const tpl = templateEngine.getTemplate(node.id);
                if (!tpl) continue;

                const li = document.createElement('li');
                const isSelected = tpl.id === selectedTemplateId;

                const item = document.createElement('div');
                item.className = `d-flex align-items-center justify-content-between p-2 rounded cursor-pointer transition-all ${isSelected ? 'bg-primary text-white font-weight-bold' : 'text-body'}`;
                item.style.cursor = 'pointer';
                if (!isSelected) {
                    item.style.backgroundColor = 'transparent';
                }

                item.innerHTML = `
                    <div class="d-flex align-items-center gap-2">
                        ${depth > 0 ? '<i class="bx bx-subdirectory-right text-muted" style="font-size: 14px;"></i>' : ''}
                        <i class="bx bx-${tpl.icon}"></i>
                        <span class="small">${tpl.title}</span>
                    </div>
                    ${isSelected ? '<span class="badge bg-white text-primary small">Active</span>' : ''}
                `;

                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    selectedTemplateId = tpl.id;
                    refresh();
                });

                li.appendChild(item);

                if (node.children && node.children.length > 0) {
                    li.appendChild(renderTreeBranch(node.children, depth + 1));
                }

                ul.appendChild(li);
            }

            return ul;
        }

        treeContainer.appendChild(renderTreeBranch(treeNodes));
        sidebarCard.appendChild(treeContainer);
        sidebarCol.appendChild(sidebarCard);
        layoutRow.appendChild(sidebarCol);

        // 2. Editor Column (5 cols) with Native Trilium Component Proportions
        const activeTpl = templateEngine.getTemplate(selectedTemplateId);

        if (activeTpl) {
            const editorCol = document.createElement('div');
            editorCol.className = 'col-md-5';

            const editorCard = document.createElement('div');
            editorCard.className = 'card border';
            editorCard.style.backgroundColor = 'var(--sub-background-color, transparent)';
            editorCard.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';

            const editorHeader = document.createElement('div');
            editorHeader.className = 'card-header bg-transparent border-bottom d-flex align-items-center justify-content-between p-3';
            editorHeader.innerHTML = `
                <h5 class="m-0 h6 font-weight-bold d-flex align-items-center gap-2">
                    <i class="bx bx-${activeTpl.icon} text-primary"></i>
                    <span>Template: ${activeTpl.title}</span>
                </h5>
                <div class="d-flex align-items-center gap-2">
                    <button type="button" class="btn btn-sm btn-outline-secondary export-html-btn d-flex align-items-center gap-1">
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
            editorBody.className = 'card-body p-3 d-flex flex-column gap-3';

            editorBody.innerHTML = `
                <div>
                    <label class="form-label small font-weight-bold">Template Title</label>
                    <input type="text" id="tpl-title" class="form-control" value="${activeTpl.title}">
                </div>
                <div>
                    <label class="form-label small font-weight-bold">Title Pattern</label>
                    <input type="text" id="tpl-pattern" class="form-control" value="${activeTpl.titlePattern}">
                    <div class="form-text small text-muted">Variables: <code>{title}</code>, <code>{isoDate}</code>, <code>{weekDay}</code></div>
                </div>
                <div>
                    <label class="form-label small font-weight-bold">Icon (Boxicons Class)</label>
                    <div class="input-group">
                        <span class="input-group-text"><i class="bx bx-${activeTpl.icon}"></i></span>
                        <input type="text" id="tpl-icon" class="form-control" value="${activeTpl.icon}">
                    </div>
                </div>

                <!-- Relationship Rules Section -->
                <div class="border-top pt-3">
                    <div class="d-flex align-items-center justify-content-between mb-2">
                        <h6 class="m-0 font-weight-bold small text-info d-flex align-items-center gap-1">
                            <i class="bx bx-git-repo-forked"></i> Parent Relationship Links (${activeTpl.relationships.length})
                        </h6>
                        <button type="button" class="btn btn-sm btn-outline-info add-rel-rule-btn d-flex align-items-center gap-1">
                            <i class="bx bx-plus"></i> Add Parent Link
                        </button>
                    </div>

                    <div class="d-flex flex-column gap-2 rel-rules-list">
                        ${activeTpl.relationships.length > 0 ? activeTpl.relationships.map((r, idx) => `
                            <div class="p-2.5 rounded border small d-flex align-items-center justify-content-between" style="background-color: var(--main-background-color, transparent); border-color: var(--border-color, rgba(128,128,128,0.2)) !important;">
                                <div>
                                    <div class="font-weight-bold">
                                        <i class="bx bx-right-arrow-alt text-success"></i> <code>~${r.relationName}</code> &rarr; ${r.targetTemplateName}
                                    </div>
                                    <div class="small text-muted mt-0.5">
                                        Auto-clone: <strong>${r.autoCloneToParent ? 'Yes' : 'No'}</strong> • Inherit Topics/Client: <strong>${r.inheritTopics ? 'Yes' : 'No'}</strong>
                                    </div>
                                </div>
                                <button type="button" class="btn btn-sm btn-outline-danger del-rel-btn" data-rel-idx="${idx}">
                                    <i class="bx bx-trash"></i>
                                </button>
                            </div>
                        `).join('') : '<div class="text-muted small p-3 border rounded text-center">Root template (No parent link required).</div>'}
                    </div>
                </div>

                <!-- Promoted Attributes Section -->
                <div class="border-top pt-3">
                    <div class="d-flex align-items-center justify-content-between mb-2">
                        <h6 class="m-0 font-weight-bold small text-success d-flex align-items-center gap-1">
                            <i class="bx bx-list-check"></i> Promoted Attributes (${activeTpl.attributes.length})
                        </h6>
                    </div>

                    <div class="d-flex flex-wrap gap-2 mb-2">
                        <span class="text-muted small">Quick Add:</span>
                        <button type="button" class="btn btn-sm btn-outline-secondary chip-btn" data-chip="label-text">Priority</button>
                        <button type="button" class="btn btn-sm btn-outline-secondary chip-btn" data-chip="label-date">Due Date</button>
                        <button type="button" class="btn btn-sm btn-outline-secondary chip-btn" data-chip="relation-project">Project Link</button>
                        <button type="button" class="btn btn-sm btn-outline-secondary chip-btn" data-chip="relation-client">Client Link</button>
                    </div>

                    <table class="table table-sm align-middle small m-0 border">
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
                    <button type="button" class="btn btn-sm btn-outline-success mt-2 add-attr-btn d-flex align-items-center gap-1">
                        <i class="bx bx-plus"></i> Add Promoted Attribute
                    </button>
                </div>

                <!-- Content Skeleton -->
                <div class="border-top pt-3">
                    <h6 class="m-0 font-weight-bold small mb-2 d-flex align-items-center gap-1">
                        <i class="bx bx-code-alt text-info"></i> Content Skeleton (HTML)
                    </h6>
                    <textarea id="tpl-content" class="form-control font-monospace" rows="6">${activeTpl.defaultContent}</textarea>
                </div>

                <div class="pt-2 d-flex justify-content-end">
                    <button type="button" class="btn btn-sm btn-primary save-tpl-btn d-flex align-items-center gap-1">
                        <i class="bx bx-save"></i> Save Template Configuration
                    </button>
                </div>
            `;

            // Relationship Editor Buttons
            const addRelBtn = editorBody.querySelector('.add-rel-rule-btn') as HTMLButtonElement;
            addRelBtn.addEventListener('click', () => showAddRelationshipModal(activeTpl));

            editorBody.querySelectorAll('.del-rel-btn').forEach(btn => {
                btn.addEventListener('click', (e: any) => {
                    const idx = Number(e.currentTarget.dataset.relIdx);
                    activeTpl.relationships.splice(idx, 1);
                    onSave();
                    refresh();
                });
            });

            // Quick Add Chips
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

            // 3. Live Note Preview Column (4 cols) with Standard Proportions
            const previewCol = document.createElement('div');
            previewCol.className = 'col-md-4';

            const previewCard = document.createElement('div');
            previewCard.className = 'card border h-100';
            previewCard.style.backgroundColor = 'var(--sub-background-color, transparent)';
            previewCard.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';

            const previewHeader = document.createElement('div');
            previewHeader.className = 'card-header bg-transparent border-bottom d-flex align-items-center justify-content-between p-3';
            previewHeader.innerHTML = `
                <h5 class="m-0 h6 font-weight-bold text-info d-flex align-items-center gap-2">
                    <i class="bx bx-show"></i> Live Note Preview
                </h5>
                <span class="badge bg-success bg-opacity-20 text-success">Render Model</span>
            `;
            previewCard.appendChild(previewHeader);

            const previewBody = document.createElement('div');
            previewBody.className = 'card-body p-3 d-flex flex-column gap-3';

            const formattedTitle = templateEngine.formatTitle(activeTpl.id, 'Sample Note Title');

            previewBody.innerHTML = `
                <div class="p-3 rounded border flex-grow-1 d-flex flex-column" style="background-color: var(--main-background-color, transparent);">
                    <div class="d-flex align-items-center gap-2 mb-3 border-bottom pb-2">
                        <i class="bx bx-${activeTpl.icon} h4 m-0 text-primary"></i>
                        <div>
                            <h4 class="h6 m-0 font-weight-bold">${formattedTitle}</h4>
                            <div class="small text-muted mt-0.5">
                                Subtree: <code>${activeTpl.noJournalClone ? '#projectRoot' : '#calendarRoot / Journal'}</code>
                            </div>
                        </div>
                    </div>

                    <!-- Direct Form Attributes -->
                    <div class="border-bottom pb-3 mb-3">
                        <div class="small text-muted font-weight-bold mb-2 d-flex align-items-center gap-1">
                            <i class="bx bx-slider-alt"></i> Direct Form Attributes
                        </div>
                        <div class="d-flex flex-column gap-2">
                            ${activeTpl.attributes.map(a => `
                                <div class="d-flex align-items-center justify-content-between p-2 rounded border" style="background-color: var(--sub-background-color, transparent);">
                                    <span class="badge bg-primary bg-opacity-10 text-primary">#${a.name}</span>
                                    ${a.options ? `
                                        <select class="form-select form-select-sm" style="width: 140px;">
                                            ${a.options.map(opt => `<option>${opt}</option>`).join('')}
                                        </select>
                                    ` : `
                                        <input type="text" class="form-control form-control-sm" value="${a.defaultValue ?? ''}" placeholder="Value..." style="width: 140px;">
                                    `}
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Multi-Parent Inherited Attributes & Topics -->
                    <div class="border-bottom pb-3 mb-3">
                        <div class="small text-info font-weight-bold mb-2 d-flex align-items-center gap-1">
                            <i class="bx bx-git-repo-forked"></i> Inherited Parent Context
                        </div>
                        <div class="d-flex flex-column gap-2 small text-muted">
                            <div class="d-flex align-items-center justify-content-between">
                                <span>Parent 1 (Project Hub):</span>
                                <span class="badge bg-primary bg-opacity-20 text-primary">~project</span>
                            </div>
                            <div class="d-flex align-items-center justify-content-between">
                                <span>Parent 2 (Client Org):</span>
                                <span class="badge bg-info bg-opacity-20 text-info">~client</span>
                            </div>
                            <div class="d-flex align-items-center justify-content-between">
                                <span>Derived Topics:</span>
                                <span class="badge bg-success bg-opacity-20 text-success">#TechNews</span>
                            </div>
                        </div>
                    </div>

                    <!-- Body Skeleton -->
                    <div class="flex-grow-1 d-flex flex-column">
                        <div class="small text-muted font-weight-bold mb-2 d-flex align-items-center gap-1">
                            <i class="bx bx-file-blank"></i> Content Skeleton Body
                        </div>
                        <div class="p-3 rounded border flex-grow-1 font-monospace small" style="background-color: var(--sub-background-color, transparent); min-height: 180px;">
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

    function showAddRelationshipModal(tpl: TemplateDefinition) {
        const relName = prompt('Enter relation name (e.g. project, client, organization, writer, attendee):');
        if (!relName) return;
        const allTemplates = templateEngine.getAllTemplates();
        const targetId = prompt(`Select target parent template ID:\n${allTemplates.map(t => t.id).join(', ')}`);
        if (!targetId) return;

        const targetTpl = templateEngine.getTemplate(targetId);
        const newRel: TemplateRelationshipDef = {
            id: `rel_${tpl.id}_${targetId}_${Date.now()}`,
            name: `${relName} link`,
            relationName: relName,
            targetTemplateId: targetId,
            targetTemplateName: targetTpl ? targetTpl.title : targetId,
            isMulti: false,
            autoCloneToParent: true,
            inheritTopics: true,
            direction: 'parent',
        };

        templateEngine.addRelationship(tpl.id, newRel);
        onSave();
        refresh();
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
            relationships: [],
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
