/**
 * Template Studio Component: Interactive editor & easy creation studio for Trilium templates.
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

        const layoutRow = document.createElement('div');
        layoutRow.className = 'row g-3';

        // Sidebar: Template List & Create Button
        const sidebarCol = document.createElement('div');
        sidebarCol.className = 'col-md-3';

        const sidebarCard = document.createElement('div');
        sidebarCard.className = 'card shadow-sm border-0';
        sidebarCard.style.backgroundColor = 'var(--sub-background-color, #252538)';

        const sidebarHeader = document.createElement('div');
        sidebarHeader.className = 'card-header d-flex align-items-center justify-content-between bg-transparent border-bottom';
        sidebarHeader.innerHTML = '<h6 class="m-0 font-weight-bold"><i class="bx bx-layer text-primary"></i> Templates</h6>';

        const createBtn = document.createElement('button');
        createBtn.type = 'button';
        createBtn.className = 'btn btn-xs btn-primary';
        createBtn.textContent = '+ New';
        createBtn.addEventListener('click', () => showNewTemplateModal());
        sidebarHeader.appendChild(createBtn);

        const listGroup = document.createElement('div');
        listGroup.className = 'list-group list-group-flush';

        for (const tpl of templateEngine.getAllTemplates()) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `list-group-item list-group-item-action d-flex align-items-center justify-content-between ${tpl.id === selectedTemplateId ? 'active' : ''}`;
            btn.style.backgroundColor = tpl.id === selectedTemplateId ? 'var(--primary-color, #705df2)' : 'transparent';
            btn.style.color = tpl.id === selectedTemplateId ? '#fff' : 'inherit';
            btn.style.borderColor = 'rgba(255, 255, 255, 0.1)';

            const label = document.createElement('div');
            label.className = 'd-flex align-items-center gap-2';
            label.innerHTML = `<i class="bx bx-${tpl.icon}"></i> <span>${tpl.title}</span>`;

            btn.appendChild(label);
            btn.addEventListener('click', () => {
                selectedTemplateId = tpl.id;
                refresh();
            });
            listGroup.appendChild(btn);
        }

        sidebarCard.append(sidebarHeader, listGroup);
        sidebarCol.appendChild(sidebarCard);
        layoutRow.appendChild(sidebarCol);

        // Main Editor Panel
        const editorCol = document.createElement('div');
        editorCol.className = 'col-md-9';

        const activeTpl = templateEngine.getTemplate(selectedTemplateId);

        if (activeTpl) {
            const editorCard = document.createElement('div');
            editorCard.className = 'card shadow-sm border-0';
            editorCard.style.backgroundColor = 'var(--sub-background-color, #252538)';

            const editorHeader = document.createElement('div');
            editorHeader.className = 'card-header bg-transparent border-bottom d-flex align-items-center justify-content-between';
            editorHeader.innerHTML = `
                <h5 class="m-0 d-flex align-items-center gap-2">
                    <i class="bx bx-${activeTpl.icon} text-warning"></i>
                    <span>Template: ${activeTpl.title}</span>
                    ${activeTpl.isBuiltin ? '<span class="badge badge-secondary">Built-in</span>' : '<span class="badge badge-info">Custom</span>'}
                </h5>
            `;

            const editorBody = document.createElement('div');
            editorBody.className = 'card-body';

            // Form: Basic Settings
            const basicForm = document.createElement('div');
            basicForm.className = 'row g-3 mb-4';
            basicForm.innerHTML = `
                <div class="col-md-4">
                    <label class="form-label small font-weight-bold">Template Title</label>
                    <input type="text" id="tpl-title" class="form-control form-control-sm" value="${activeTpl.title}">
                </div>
                <div class="col-md-4">
                    <label class="form-label small font-weight-bold">Title Pattern</label>
                    <input type="text" id="tpl-pattern" class="form-control form-control-sm" value="${activeTpl.titlePattern}">
                    <div class="form-text small text-muted">Variables: {title}, YYYY-MM-DD</div>
                </div>
                <div class="col-md-4">
                    <label class="form-label small font-weight-bold">Icon (Boxicons)</label>
                    <input type="text" id="tpl-icon" class="form-control form-control-sm" value="${activeTpl.icon}">
                </div>
            `;
            editorBody.appendChild(basicForm);

            // Section: Promoted Attributes
            const attrSection = document.createElement('div');
            attrSection.className = 'mb-4 border-top pt-3';
            attrSection.innerHTML = `
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <h6 class="m-0 font-weight-bold"><i class="bx bx-list-check text-success"></i> Promoted Attributes (${activeTpl.attributes.length})</h6>
                </div>
            `;

            const attrTable = document.createElement('table');
            attrTable.className = 'table table-sm table-borderless text-white small';
            attrTable.innerHTML = `
                <thead>
                    <tr class="text-muted">
                        <th>Attribute Name</th>
                        <th>Label / Relation</th>
                        <th>Data Type</th>
                        <th>Default / Options</th>
                    </tr>
                </thead>
                <tbody>
                    ${activeTpl.attributes.map(a => `
                        <tr>
                            <td><code>#${a.name}</code></td>
                            <td><span class="badge badge-outline-info">${a.type}</span></td>
                            <td>${a.dataType}</td>
                            <td>${a.options ? a.options.join(', ') : a.defaultValue ?? '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            `;
            attrSection.appendChild(attrTable);

            // Add Attribute Button
            const addAttrBtn = document.createElement('button');
            addAttrBtn.type = 'button';
            addAttrBtn.className = 'btn btn-xs btn-outline-success mt-2';
            addAttrBtn.innerHTML = '+ Add Promoted Attribute';
            addAttrBtn.addEventListener('click', () => showAddAttrModal(activeTpl));
            attrSection.appendChild(addAttrBtn);

            editorBody.appendChild(attrSection);

            // Section: Default Content Skeleton
            const contentSection = document.createElement('div');
            contentSection.className = 'border-top pt-3';
            contentSection.innerHTML = '<h6 class="m-0 font-weight-bold mb-2"><i class="bx bx-code-alt text-info"></i> Content Skeleton (HTML/Markdown)</h6>';

            const contentArea = document.createElement('textarea');
            contentArea.className = 'form-control font-monospace small';
            contentArea.rows = 6;
            contentArea.value = activeTpl.defaultContent;
            contentSection.appendChild(contentArea);

            editorBody.appendChild(contentSection);

            // Save Template Changes Button
            const saveBtnBox = document.createElement('div');
            saveBtnBox.className = 'mt-4 d-flex justify-content-end';
            const saveBtn = document.createElement('button');
            saveBtn.type = 'button';
            saveBtn.className = 'btn btn-primary';
            saveBtn.innerHTML = '<i class="bx bx-save"></i> Save Template Configuration';
            saveBtn.addEventListener('click', () => {
                const newTitle = (document.getElementById('tpl-title') as HTMLInputElement).value;
                const newPattern = (document.getElementById('tpl-pattern') as HTMLInputElement).value;
                const newIcon = (document.getElementById('tpl-icon') as HTMLInputElement).value;
                templateEngine.updateTemplate(activeTpl.id, {
                    title: newTitle,
                    titlePattern: newPattern,
                    icon: newIcon,
                    defaultContent: contentArea.value,
                });
                onSave();
                refresh();
            });
            saveBtnBox.appendChild(saveBtn);
            editorBody.appendChild(saveBtnBox);

            editorCard.append(editorHeader, editorBody);
            editorCol.appendChild(editorCard);
        }

        layoutRow.appendChild(editorCol);
        container.appendChild(layoutRow);
    }

    function showNewTemplateModal() {
        const name = prompt('Enter new template name (e.g., Weekly Review):');
        if (!name) return;
        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        templateEngine.registerTemplate({
            id,
            marker: `ext${id.charAt(0).toUpperCase() + id.slice(1)}`,
            title: name,
            icon: 'file-blank',
            category: 'custom',
            rootContainerMarker: 'unassignedRoot',
            titlePattern: '{title}',
            defaultContent: '<h2>NOTES</h2><p></p>',
            attributes: [],
            relationships: [],
            isBuiltin: false,
        });
        selectedTemplateId = id;
        refresh();
    }

    function showAddAttrModal(tpl: TemplateDefinition) {
        const attrName = prompt('Enter attribute name (e.g. priority, status, reviewer):');
        if (!attrName) return;
        const dataType = (prompt('Enter data type (string, number, date, boolean, select, relation):') || 'string') as AttributeDataType;
        templateEngine.addPromotedAttribute(tpl.id, {
            name: attrName,
            type: dataType === 'relation' ? 'relation' : 'label',
            dataType,
            isPromoted: true,
            label: attrName.charAt(0).toUpperCase() + attrName.slice(1),
        });
        refresh();
    }

    refresh();
}
