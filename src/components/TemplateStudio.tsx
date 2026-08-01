/**
 * Template Studio Component: Unified Automations, Clean Headings, and Clickable Navigation Links.
 * Styled natively with Trilium Boxicons and standard Trilium form components.
 */

import { TemplateEngine } from '../engine/templateEngine.js';
import { IftttEngine } from '../engine/iftttEngine.js';
import { TemplateDefinition, PromotedAttributeDef, TemplateRelationshipDef, TemplateCategoryDef, IftttRuleDef } from '../engine/types.js';
import { exportTemplateAsHtml } from '../engine/yamlSpec.js';

export function renderTemplateStudio(
    container: HTMLElement,
    templateEngine: TemplateEngine,
    iftttEngine: IftttEngine,
    onSave: () => void
): void {
    let selectedTemplateId: string = templateEngine.getAllTemplates()[0]?.id || 'story';
    let activeEditorTab: 'editor' | 'preview' | 'categories' = 'editor';

    function refresh() {
        container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'template-studio-wrapper d-flex flex-column gap-4';

        // 1. Header Banner
        const header = document.createElement('div');
        header.className = 'p-4 rounded border d-flex align-items-center justify-content-between shadow-sm';
        header.style.backgroundColor = 'var(--sub-background-color, transparent)';
        header.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.15))';
        header.style.borderRadius = '12px';

        header.innerHTML = `
            <div class="d-flex align-items-center gap-3">
                <div class="p-3 rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                    <i class="bx bx-layer h3 m-0 text-primary"></i>
                </div>
                <div>
                    <h2 class="h5 m-0 font-weight-bold d-flex align-items-center gap-2">
                        Template Studio & Behavioral Engine
                        <span class="badge bg-secondary font-weight-normal small">v1.0.0</span>
                    </h2>
                    <p class="text-muted small m-0 mt-1">
                        Configure template schemas, parent-child links, automation rules, promoted attributes, and note previews.
                    </p>
                </div>
            </div>
            <div class="d-flex align-items-center gap-2">
                <button type="button" class="btn btn-sm btn-outline-primary manage-cats-btn px-3 py-2 d-flex align-items-center gap-1.5 shadow-xs">
                    <i class="bx bx-category fs-6"></i> Category Behaviors & Rules
                </button>
                <button type="button" class="btn btn-sm btn-primary new-template-btn px-3 py-2 d-flex align-items-center gap-1.5 shadow-xs">
                    <i class="bx bx-plus fs-6"></i> New Template
                </button>
            </div>
        `;

        const manageCatsBtn = header.querySelector('.manage-cats-btn') as HTMLButtonElement;
        manageCatsBtn.addEventListener('click', () => {
            activeEditorTab = 'categories';
            refresh();
        });

        const newTplBtn = header.querySelector('.new-template-btn') as HTMLButtonElement;
        newTplBtn.addEventListener('click', () => showCreateTemplateModal());
        wrapper.appendChild(header);

        const layoutRow = document.createElement('div');
        layoutRow.className = 'row g-4';

        // 2. Sidebar: Spacious Nested Tree View (3 Cols)
        const sidebarCol = document.createElement('div');
        sidebarCol.className = 'col-md-3';

        const sidebarCard = document.createElement('div');
        sidebarCard.className = 'card border shadow-sm h-100';
        sidebarCard.style.backgroundColor = 'var(--sub-background-color, transparent)';
        sidebarCard.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.15))';
        sidebarCard.style.borderRadius = '12px';

        const sidebarHeader = document.createElement('div');
        sidebarHeader.className = 'card-header bg-transparent border-bottom font-weight-bold small text-muted d-flex align-items-center justify-content-between p-3.5';
        sidebarHeader.innerHTML = `
            <span class="d-flex align-items-center gap-2"><i class="bx bx-sitemap text-primary"></i> Template Hierarchy</span>
            <span class="badge bg-primary bg-opacity-10 text-primary small">Tree</span>
        `;
        sidebarCard.appendChild(sidebarHeader);

        const treeContainer = document.createElement('div');
        treeContainer.className = 'card-body p-3';

        // Multi-Parent Tree Nodes
        const treeNodes = [
            {
                id: 'projectHub',
                label: 'Project Hub',
                children: [
                    {
                        id: 'story',
                        label: 'Story Project',
                        children: [
                            { id: 'edit', label: 'Edit Package', children: [] },
                            { id: 'reportingNotes', label: 'Reporting Notes', children: [] }
                        ]
                    },
                    { id: 'projectTask', label: 'Project Task', children: [] },
                    { id: 'meeting', label: 'Project Meeting', children: [] },
                    { id: 'scratch', label: 'Project Scratch Note', children: [] },
                    { id: 'person', label: 'Project Person', children: [] },
                    { id: 'organization', label: 'Client Organization', children: [] },
                    { id: 'emailDraft', label: 'Email Draft', children: [] },
                    { id: 'topic', label: 'Assigned Topic', children: [] }
                ]
            },
            {
                id: 'organization',
                label: 'Organization Directory',
                children: [
                    { id: 'person', label: 'Key Contact Person', children: [] },
                    {
                        id: 'meeting',
                        label: 'Client Meeting',
                        children: [
                            { id: 'meetingPrep', label: 'Meeting Prep', children: [] }
                        ]
                    }
                ]
            },
            {
                id: 'person',
                label: 'Person Directory',
                children: [
                    { id: 'meeting', label: 'Person Meeting', children: [] }
                ]
            },
            {
                id: 'task',
                label: 'Standalone Task (Unassigned)',
                children: []
            },
            {
                id: 'scratch',
                label: 'Unassigned Scratch Note',
                children: []
            },
            {
                id: 'topic',
                label: 'Global Topic Index',
                children: []
            }
        ];

        function renderTreeBranch(nodes: Array<{ id: string; label?: string; children: any[] }>, depth = 0): HTMLElement {
            const ul = document.createElement('ul');
            ul.className = 'list-unstyled m-0 d-flex flex-column gap-1.5';
            if (depth > 0) ul.style.paddingLeft = '1.2rem';

            for (const node of nodes) {
                const tpl = templateEngine.getTemplate(node.id);
                if (!tpl) continue;

                const li = document.createElement('li');
                const isSelected = tpl.id === selectedTemplateId && activeEditorTab !== 'categories';

                const item = document.createElement('div');
                item.className = `d-flex align-items-center justify-content-between px-3 py-2 rounded cursor-pointer transition-all ${isSelected ? 'bg-primary text-white font-weight-bold shadow-sm' : 'text-body'}`;
                item.style.cursor = 'pointer';
                if (!isSelected) {
                    item.style.backgroundColor = 'transparent';
                }

                item.innerHTML = `
                    <div class="d-flex align-items-center gap-2">
                        ${depth > 0 ? '<i class="bx bx-subdirectory-right text-muted"></i>' : ''}
                        <i class="bx bx-${tpl.icon}"></i>
                        <span class="small">${node.label || tpl.title}</span>
                    </div>
                `;

                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    selectedTemplateId = tpl.id;
                    if (activeEditorTab === 'categories') activeEditorTab = 'editor';
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

        // 3. Workspace Column: Spacious 9-column Editor / Render Preview / Category Type Editor
        const activeTpl = templateEngine.getTemplate(selectedTemplateId);

        const mainCol = document.createElement('div');
        mainCol.className = 'col-md-9';

        const workspaceCard = document.createElement('div');
        workspaceCard.className = 'card border shadow-sm h-100';
        workspaceCard.style.backgroundColor = 'var(--sub-background-color, transparent)';
        workspaceCard.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.15))';
        workspaceCard.style.borderRadius = '12px';

        // Workspace Header
        const mainHeader = document.createElement('div');
        mainHeader.className = 'card-header bg-transparent border-bottom d-flex align-items-center justify-content-between p-3.5';
        mainHeader.innerHTML = `
            <div class="d-flex align-items-center gap-3">
                <div class="p-2 rounded bg-primary bg-opacity-10 text-primary">
                    <i class="bx bx-${activeEditorTab === 'categories' ? 'category' : (activeTpl?.icon || 'layer')} fs-5 m-0"></i>
                </div>
                <div>
                    <h3 class="h6 m-0 font-weight-bold d-flex align-items-center gap-2">
                        <span>${activeEditorTab === 'categories' ? 'Category Behaviors & Automations' : `Template: ${activeTpl?.title}`}</span>
                        ${activeEditorTab !== 'categories' && activeTpl ? `<span class="badge bg-primary bg-opacity-10 text-primary font-weight-normal small">${activeTpl.category || 'custom'}</span>` : ''}
                    </h3>
                    <div class="text-muted small mt-0.5">${activeEditorTab === 'categories' ? 'Configure category root markers, journal cloning, topic inheritance, and category-wide IFTTT rules' : `Marker: #${activeTpl?.marker} • ID: ${activeTpl?.id}`}</div>
                </div>
            </div>
            <div class="d-flex align-items-center gap-3">
                <ul class="nav nav-pills bg-body bg-opacity-50 p-1 rounded border">
                    <li class="nav-item">
                        <button class="nav-link btn-sm py-1 px-3 ${activeEditorTab === 'editor' ? 'active font-weight-bold' : ''} editor-tab-btn" type="button">
                            <i class="bx bx-edit-alt"></i> Schema & Rules
                        </button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link btn-sm py-1 px-3 ${activeEditorTab === 'preview' ? 'active font-weight-bold' : ''} preview-tab-btn" type="button">
                            <i class="bx bx-show"></i> Live Preview
                        </button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link btn-sm py-1 px-3 ${activeEditorTab === 'categories' ? 'active font-weight-bold' : ''} categories-tab-btn" type="button">
                            <i class="bx bx-category"></i> Category Matrix
                        </button>
                    </li>
                </ul>
            </div>
        `;

        const editorTabBtn = mainHeader.querySelector('.editor-tab-btn') as HTMLButtonElement;
        const previewTabBtn = mainHeader.querySelector('.preview-tab-btn') as HTMLButtonElement;
        const categoriesTabBtn = mainHeader.querySelector('.categories-tab-btn') as HTMLButtonElement;

        editorTabBtn.addEventListener('click', () => { activeEditorTab = 'editor'; refresh(); });
        previewTabBtn.addEventListener('click', () => { activeEditorTab = 'preview'; refresh(); });
        categoriesTabBtn.addEventListener('click', () => { activeEditorTab = 'categories'; refresh(); });

        workspaceCard.appendChild(mainHeader);

        const workspaceBody = document.createElement('div');
        workspaceBody.className = 'card-body p-4';

        if (activeEditorTab === 'categories') {
            renderCategoryTypeEditorView(workspaceBody, templateEngine, iftttEngine, () => { onSave(); refresh(); });
        } else if (activeEditorTab === 'editor' && activeTpl) {
            renderSchemaEditorView(workspaceBody, activeTpl, templateEngine, iftttEngine, (tab) => {
                activeEditorTab = tab;
                refresh();
            });
        } else if (activeTpl) {
            renderLivePreviewView(workspaceBody, activeTpl, templateEngine, iftttEngine, (tab) => {
                activeEditorTab = tab;
                refresh();
            });
        }

        workspaceCard.appendChild(workspaceBody);
        mainCol.appendChild(workspaceCard);
        layoutRow.appendChild(mainCol);

        wrapper.appendChild(layoutRow);
        container.appendChild(wrapper);
    }

    function renderCategoryTypeEditorView(el: HTMLElement, engine: TemplateEngine, iftttEngine: IftttEngine, onSave: () => void) {
        const catWrapper = document.createElement('div');
        catWrapper.className = 'd-flex flex-column gap-4';

        const cats = engine.getAllCategories();
        const allRules = iftttEngine.getAllRules();

        catWrapper.innerHTML = `
            <div class="d-flex align-items-center justify-content-between">
                <div>
                    <h5 class="h6 font-weight-bold m-0">Category Type Behavior Matrix & Rules (${cats.length})</h5>
                    <p class="text-muted small m-0 mt-1">Configure default container roots, journal cloning, topic inheritance, and category-wide automation rules.</p>
                </div>
                <button type="button" class="btn btn-sm btn-primary add-cat-btn d-flex align-items-center gap-1">
                    <i class="bx bx-plus"></i> Add New Category Type
                </button>
            </div>

            <div class="d-flex flex-column gap-4">
                ${cats.map(c => {
                    const catRules = allRules.filter(r => r.trigger.targetCategory === c.id);
                    return `
                        <div class="card border p-3.5" style="background-color: var(--main-background-color, transparent);">
                            <div class="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                                <div class="d-flex align-items-center gap-2">
                                    <div class="p-2 rounded bg-primary bg-opacity-10 text-primary">
                                        <i class="bx bx-${c.icon} fs-5"></i>
                                    </div>
                                    <div>
                                        <h6 class="font-weight-bold m-0">${c.title}</h6>
                                        <code class="small">Category ID: ${c.id}</code>
                                    </div>
                                </div>
                                <span class="badge ${c.isBuiltin ? 'bg-secondary' : 'bg-info'} bg-opacity-20 text-muted">${c.isBuiltin ? 'Built-in Category' : 'Custom Category'}</span>
                            </div>

                            <div class="row g-3 small mb-3">
                                <div class="col-md-4">
                                    <label class="form-label font-weight-bold text-muted">Default Root Container</label>
                                    <input type="text" class="form-control form-control-sm cat-root-input" data-cat-id="${c.id}" value="${c.defaultRootMarker || 'projectRoot'}">
                                </div>
                                <div class="col-md-8">
                                    <label class="form-label font-weight-bold text-muted">Behavior Toggles</label>
                                    <div class="d-flex flex-wrap gap-4 pt-1">
                                        <div class="form-check form-switch">
                                            <input class="form-check-input cat-journal-check" type="checkbox" data-cat-id="${c.id}" ${c.autoJournalClone !== false ? 'checked' : ''}>
                                            <label class="form-check-label">Daily Journal Clone</label>
                                        </div>
                                        <div class="form-check form-switch">
                                            <input class="form-check-input cat-topic-check" type="checkbox" data-cat-id="${c.id}" ${c.inheritParentTopics !== false ? 'checked' : ''}>
                                            <label class="form-check-label">Inherit Parent Topics</label>
                                        </div>
                                        <div class="form-check form-switch">
                                            <input class="form-check-input cat-project-check" type="checkbox" data-cat-id="${c.id}" ${c.projectScopedDefault ? 'checked' : ''}>
                                            <label class="form-check-label">Project Scoped</label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Embedded Category-Wide Automations -->
                            <div class="border-top pt-3">
                                <div class="d-flex align-items-center justify-content-between mb-2">
                                    <h6 class="font-weight-bold text-warning small m-0 d-flex align-items-center gap-1.5">
                                        <i class="bx bx-git-commit"></i> Category Automations & Rules (${catRules.length})
                                    </h6>
                                    <button type="button" class="btn btn-xs btn-outline-warning add-cat-rule-btn d-flex align-items-center gap-1" data-cat-id="${c.id}">
                                        <i class="bx bx-plus"></i> Add Category Rule
                                    </button>
                                </div>
                                <div class="d-flex flex-column gap-2">
                                    ${catRules.length > 0 ? catRules.map(r => `
                                        <div class="p-2.5 rounded border small d-flex align-items-center justify-content-between" style="background-color: var(--sub-background-color, transparent);">
                                            <div>
                                                <strong><i class="bx bx-bolt-circle text-warning"></i> ${r.name}</strong>
                                                <div class="text-muted tiny">Trigger: <code>${r.trigger.type}</code> • Actions: <code>${r.actions.map(a => a.type).join(', ')}</code></div>
                                            </div>
                                            <span class="badge ${r.enabled ? 'bg-success' : 'bg-secondary'} bg-opacity-20 text-muted">${r.enabled ? 'Enabled' : 'Disabled'}</span>
                                        </div>
                                    `).join('') : '<div class="text-muted tiny p-2 border rounded text-center">No category-wide automation rules attached.</div>'}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <div class="d-flex justify-content-end pt-2">
                <button type="button" class="btn btn-primary px-4 py-2 font-weight-bold shadow-sm save-cats-btn d-flex align-items-center gap-1.5">
                    <i class="bx bx-save fs-6"></i> Save Category Behaviors & Rules
                </button>
            </div>
        `;

        catWrapper.querySelectorAll('.add-cat-rule-btn').forEach(btn => {
            btn.addEventListener('click', (e: any) => {
                const catId = e.currentTarget.dataset.catId;
                const name = prompt(`Rule Name for Category '${catId}':`);
                if (!name) return;
                const attrName = prompt('Attribute name trigger (optional, e.g. status, priority):');

                iftttEngine.registerRule({
                    id: `cat_rule_${catId}_${Date.now()}`,
                    name,
                    description: `Category-wide rule for all templates in '${catId}'.`,
                    enabled: true,
                    isBuiltin: false,
                    trigger: {
                        type: attrName ? 'onAttributeChanged' : 'onNoteCreated',
                        targetCategory: catId,
                        attributeName: attrName || undefined,
                    },
                    conditions: [],
                    actions: [{ type: 'setLabel', params: { labelName: 'processed', labelValue: 'true' } }],
                });
                onSave();
            });
        });

        const addCatBtn = catWrapper.querySelector('.add-cat-btn') as HTMLButtonElement;
        addCatBtn.addEventListener('click', () => {
            const title = prompt('Enter Category Title (e.g. Research Briefs):');
            if (!title) return;
            const description = prompt('Enter Category Description:') || 'Custom category';
            const icon = prompt('Enter Boxicons icon name (e.g. search, heart, bookmark):', 'layer') || 'layer';

            const id = title.toLowerCase().replace(/\s+/g, '-');
            engine.registerCategory({ id, title, description, icon, defaultRootMarker: 'unassignedRoot', autoJournalClone: true, inheritParentTopics: true, projectScopedDefault: false, isBuiltin: false });
            onSave();
        });

        const saveCatsBtn = catWrapper.querySelector('.save-cats-btn') as HTMLButtonElement;
        saveCatsBtn.addEventListener('click', () => {
            catWrapper.querySelectorAll('.cat-root-input').forEach((input: any) => {
                const catId = input.dataset.catId;
                const cat = engine.getCategory(catId);
                if (cat) {
                    cat.defaultRootMarker = input.value;
                    cat.autoJournalClone = (catWrapper.querySelector(`.cat-journal-check[data-cat-id="${catId}"]`) as HTMLInputElement)?.checked;
                    cat.inheritParentTopics = (catWrapper.querySelector(`.cat-topic-check[data-cat-id="${catId}"]`) as HTMLInputElement)?.checked;
                    cat.projectScopedDefault = (catWrapper.querySelector(`.cat-project-check[data-cat-id="${catId}"]`) as HTMLInputElement)?.checked;
                    engine.registerCategory(cat);
                }
            });
            onSave();
        });

        el.appendChild(catWrapper);
    }

    function renderSchemaEditorView(
        el: HTMLElement,
        tpl: TemplateDefinition,
        engine: TemplateEngine,
        iftttEngine: IftttEngine,
        switchTab: (tab: 'categories' | 'preview') => void
    ) {
        const formWrapper = document.createElement('div');
        formWrapper.className = 'd-flex flex-column gap-4';

        const categories = engine.getAllCategories();
        const globalRules = iftttEngine.getAllRules().filter(r => !r.trigger.targetCategory && !r.trigger.targetTemplateId);
        const catRules = iftttEngine.getAllRules().filter(r => r.trigger.targetCategory === tpl.category);
        const tplRules = iftttEngine.getAllRules().filter(r => r.trigger.targetTemplateId === tpl.id);

        // 1. Basic Template Settings & Category Type
        const basicCard = document.createElement('div');
        basicCard.className = 'card border p-3.5';
        basicCard.style.backgroundColor = 'var(--main-background-color, transparent)';
        basicCard.style.borderColor = 'var(--border-color, rgba(128,128,128,0.15)) !important';

        basicCard.innerHTML = `
            <h6 class="font-weight-bold text-primary mb-3 d-flex align-items-center gap-2">
                <i class="bx bx-slider"></i> General Settings & Category Type
            </h6>
            <div class="row g-3">
                <div class="col-md-3">
                    <label class="form-label small font-weight-bold">Template Title</label>
                    <input type="text" id="tpl-title" class="form-control" value="${tpl.title}">
                </div>
                <div class="col-md-3">
                    <label class="form-label small font-weight-bold">Category Type</label>
                    <select id="tpl-category" class="form-select">
                        ${categories.map(c => `<option value="${c.id}" ${tpl.category === c.id ? 'selected' : ''}>${c.title}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label small font-weight-bold">Title Pattern</label>
                    <input type="text" id="tpl-pattern" class="form-control" value="${tpl.titlePattern}">
                </div>
                <div class="col-md-3">
                    <label class="form-label small font-weight-bold">Icon Class</label>
                    <div class="input-group">
                        <span class="input-group-text"><i class="bx bx-${tpl.icon}"></i></span>
                        <input type="text" id="tpl-icon" class="form-control" value="${tpl.icon}">
                    </div>
                </div>
            </div>
        `;
        formWrapper.appendChild(basicCard);

        // 2. Automations & Data Flow Rules (Parent Links + IFTTT with Clickable Inheritance Links!)
        const behaviorCard = document.createElement('div');
        behaviorCard.className = 'card border p-3.5';
        behaviorCard.style.backgroundColor = 'var(--main-background-color, transparent)';
        behaviorCard.style.borderColor = 'var(--border-color, rgba(128,128,128,0.15)) !important';

        behaviorCard.innerHTML = `
            <div class="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                <h6 class="font-weight-bold text-info m-0 d-flex align-items-center gap-2">
                    <i class="bx bx-git-repo-forked"></i> Automations & Data Flow Rules
                </h6>
                <button type="button" class="btn btn-sm btn-outline-info add-rel-rule-btn d-flex align-items-center gap-1">
                    <i class="bx bx-plus"></i> Add Parent Link
                </button>
            </div>

            <!-- Parent Relationship Links -->
            <div class="mb-4">
                <div class="text-muted small font-weight-bold mb-2"><i class="bx bx-link"></i> Parent Relationship Links (${tpl.relationships.length})</div>
                <div class="d-flex flex-column gap-2">
                    ${tpl.relationships.length > 0 ? tpl.relationships.map((r, idx) => `
                        <div class="p-3 rounded border d-flex align-items-center justify-content-between" style="background-color: var(--sub-background-color, transparent);">
                            <div>
                                <strong class="text-body"><i class="bx bx-right-arrow-alt text-success"></i> <code>~${r.relationName}</code> &rarr; ${r.targetTemplateName}</strong>
                                <div class="text-muted small mt-1">Auto-clone to Parent: <strong>${r.autoCloneToParent ? 'Yes' : 'No'}</strong> • Inherit Topics/Client: <strong>${r.inheritTopics ? 'Yes' : 'No'}</strong></div>
                            </div>
                            <button type="button" class="btn btn-sm btn-outline-danger del-rel-btn" data-rel-idx="${idx}">
                                <i class="bx bx-trash"></i> Delete
                            </button>
                        </div>
                    `).join('') : '<div class="p-3 text-center text-muted small border rounded">Root template (No parent link required).</div>'}
                </div>
            </div>

            <!-- Automation Rules with Clickable Links to Edit Categories -->
            <div>
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <div class="text-warning small font-weight-bold"><i class="bx bx-git-commit"></i> Active Automation Stack</div>
                    <button type="button" class="btn btn-xs btn-outline-warning add-tpl-rule-btn d-flex align-items-center gap-1">
                        <i class="bx bx-plus"></i> Add Template Rule
                    </button>
                </div>
                <div class="d-flex flex-column gap-2">
                    ${globalRules.map(r => `
                        <div class="p-2.5 rounded border small d-flex align-items-center justify-content-between" style="background-color: var(--sub-background-color, transparent);">
                            <div>
                                <span><i class="bx bx-globe text-primary"></i> ${r.name}</span>
                                <div class="text-muted tiny">System-wide automation rule</div>
                            </div>
                            <span class="badge bg-primary bg-opacity-10 text-primary">Global Rule</span>
                        </div>
                    `).join('')}

                    ${catRules.map(r => `
                        <div class="p-2.5 rounded border small d-flex align-items-center justify-content-between" style="background-color: var(--sub-background-color, transparent);">
                            <div>
                                <span><i class="bx bx-category text-info"></i> ${r.name}</span>
                                <div class="text-muted tiny">Inherited from category '${tpl.category}'</div>
                            </div>
                            <button type="button" class="btn btn-xs btn-link p-0 text-info edit-cat-rules-btn">
                                <i class="bx bx-edit-alt"></i> Edit Category Rules
                            </button>
                        </div>
                    `).join('')}

                    ${tplRules.length > 0 ? tplRules.map(r => `
                        <div class="p-2.5 rounded border small d-flex align-items-center justify-content-between" style="background-color: var(--sub-background-color, transparent);">
                            <div>
                                <span><i class="bx bx-file text-success"></i> ${r.name}</span>
                                <div class="text-muted tiny">Template-specific automation rule</div>
                            </div>
                            <span class="badge bg-success bg-opacity-20 text-success">Template Rule</span>
                        </div>
                    `).join('') : '<div class="p-2 text-center text-muted tiny border rounded">No template-specific automation rules.</div>'}
                </div>
            </div>
        `;

        behaviorCard.querySelectorAll('.edit-cat-rules-btn').forEach(btn => {
            btn.addEventListener('click', () => switchTab('categories'));
        });

        const addRelBtn = behaviorCard.querySelector('.add-rel-rule-btn') as HTMLButtonElement;
        addRelBtn.addEventListener('click', () => showAddRelationshipModal(tpl, engine));

        behaviorCard.querySelectorAll('.del-rel-btn').forEach(btn => {
            btn.addEventListener('click', (e: any) => {
                const idx = Number(e.currentTarget.dataset.relIdx);
                tpl.relationships.splice(idx, 1);
                engine.updateTemplate(tpl.id, tpl);
            });
        });

        const addTplRuleBtn = behaviorCard.querySelector('.add-tpl-rule-btn') as HTMLButtonElement;
        addTplRuleBtn.addEventListener('click', () => {
            const name = prompt(`Automation Rule Name for '${tpl.title}':`);
            if (!name) return;
            const attrName = prompt('Attribute name trigger (optional, e.g. status, priority):');

            iftttEngine.registerRule({
                id: `tpl_rule_${tpl.id}_${Date.now()}`,
                name,
                description: `Template-specific automation rule for '${tpl.title}'.`,
                enabled: true,
                isBuiltin: false,
                trigger: {
                    type: attrName ? 'onAttributeChanged' : 'onNoteCreated',
                    targetTemplateId: tpl.id,
                    attributeName: attrName || undefined,
                },
                conditions: [],
                actions: [{ type: 'setLabel', params: { labelName: 'processed', labelValue: 'true' } }],
            });
        });

        formWrapper.appendChild(behaviorCard);

        // 3. Promoted Attributes
        const attrCard = document.createElement('div');
        attrCard.className = 'card border p-3.5';
        attrCard.style.backgroundColor = 'var(--main-background-color, transparent)';
        attrCard.style.borderColor = 'var(--border-color, rgba(128,128,128,0.15)) !important';

        attrCard.innerHTML = `
            <div class="d-flex align-items-center justify-content-between mb-3">
                <h6 class="font-weight-bold text-success m-0 d-flex align-items-center gap-2">
                    <i class="bx bx-list-check"></i> Promoted Form Attributes (${tpl.attributes.length})
                </h6>
                <button type="button" class="btn btn-sm btn-outline-success add-attr-btn d-flex align-items-center gap-1">
                    <i class="bx bx-plus"></i> Add Attribute
                </button>
            </div>
            <table class="table table-hover align-middle small m-0 border">
                <thead>
                    <tr class="text-muted border-bottom">
                        <th>Attribute Name</th>
                        <th>Type</th>
                        <th>Data Type</th>
                        <th>Default / Options</th>
                    </tr>
                </thead>
                <tbody>
                    ${tpl.attributes.map(a => `
                        <tr>
                            <td><code>#${a.name}</code></td>
                            <td><span class="badge bg-secondary bg-opacity-20 text-muted">${a.type}</span></td>
                            <td>${a.dataType}</td>
                            <td>${a.options ? a.options.join(', ') : a.defaultValue ?? '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        const addAttrBtn = attrCard.querySelector('.add-attr-btn') as HTMLButtonElement;
        addAttrBtn.addEventListener('click', () => showAddAttrModal(tpl, engine));

        formWrapper.appendChild(attrCard);

        // 4. HTML Content Skeleton
        const skeletonCard = document.createElement('div');
        skeletonCard.className = 'card border p-3.5';
        skeletonCard.style.backgroundColor = 'var(--main-background-color, transparent)';
        skeletonCard.style.borderColor = 'var(--border-color, rgba(128,128,128,0.15)) !important';

        skeletonCard.innerHTML = `
            <h6 class="font-weight-bold text-info mb-3 d-flex align-items-center gap-2">
                <i class="bx bx-code-alt"></i> Default Content Skeleton (HTML)
            </h6>
            <textarea id="tpl-content" class="form-control font-monospace" rows="8">${tpl.defaultContent}</textarea>
        `;
        formWrapper.appendChild(skeletonCard);

        // Save Button Footer
        const footer = document.createElement('div');
        footer.className = 'd-flex justify-content-end';
        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'btn btn-primary px-4 py-2 font-weight-bold shadow-sm d-flex align-items-center gap-1.5';
        saveBtn.innerHTML = '<i class="bx bx-save fs-6"></i> Save Template Schema';
        saveBtn.addEventListener('click', () => {
            const newTitle = (formWrapper.querySelector('#tpl-title') as HTMLInputElement).value;
            const newCategory = (formWrapper.querySelector('#tpl-category') as HTMLSelectElement).value as any;
            const newPattern = (formWrapper.querySelector('#tpl-pattern') as HTMLInputElement).value;
            const newIcon = (formWrapper.querySelector('#tpl-icon') as HTMLInputElement).value;
            const newContent = (formWrapper.querySelector('#tpl-content') as HTMLTextAreaElement).value;

            engine.updateTemplate(tpl.id, {
                title: newTitle,
                category: newCategory,
                titlePattern: newPattern,
                icon: newIcon,
                defaultContent: newContent,
            });
        });

        footer.appendChild(saveBtn);
        formWrapper.appendChild(footer);

        el.appendChild(formWrapper);
    }

    function renderLivePreviewView(
        el: HTMLElement,
        tpl: TemplateDefinition,
        engine: TemplateEngine,
        iftttEngine: IftttEngine,
        switchTab: (tab: 'categories' | 'preview') => void
    ) {
        const previewWrapper = document.createElement('div');
        previewWrapper.className = 'd-flex flex-column gap-4';

        const formattedTitle = engine.formatTitle(tpl.id, 'Sample Note Title');
        const catRules = iftttEngine.getAllRules().filter(r => r.trigger.targetCategory === tpl.category);
        const tplRules = iftttEngine.getAllRules().filter(r => r.trigger.targetTemplateId === tpl.id);

        previewWrapper.innerHTML = `
            <div class="p-4 rounded border" style="background-color: var(--main-background-color, transparent); border-color: var(--border-color, rgba(128,128,128,0.15)) !important;">
                <div class="d-flex align-items-center gap-3 border-bottom pb-3 mb-4">
                    <div class="p-3 rounded bg-primary bg-opacity-10 text-primary">
                        <i class="bx bx-${tpl.icon} h3 m-0"></i>
                    </div>
                    <div>
                        <h3 class="h5 m-0 font-weight-bold">${formattedTitle}</h3>
                        <div class="small text-muted mt-1">
                            <i class="bx bx-folder"></i> Target Subtree: <code>${tpl.noJournalClone ? '#projectRoot' : '#calendarRoot / Journal'}</code>
                        </div>
                    </div>
                </div>

                <div class="row g-4 mb-4">
                    <div class="col-md-6">
                        <div class="card border p-3.5 h-100" style="background-color: var(--sub-background-color, transparent);">
                            <h6 class="font-weight-bold text-muted small mb-3"><i class="bx bx-slider-alt"></i> Direct Form Attributes</h6>
                            <div class="d-flex flex-column gap-2.5">
                                ${tpl.attributes.map(a => `
                                    <div class="d-flex align-items-center justify-content-between p-2 rounded border" style="background-color: var(--main-background-color, transparent);">
                                        <span class="badge bg-primary bg-opacity-10 text-primary">#${a.name}</span>
                                        ${a.options ? `
                                            <select class="form-select form-select-sm" style="width: 160px;">
                                                ${a.options.map(opt => `<option>${opt}</option>`).join('')}
                                            </select>
                                        ` : `
                                            <input type="text" class="form-control form-control-sm" value="${a.defaultValue ?? ''}" placeholder="Value..." style="width: 160px;">
                                        `}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card border p-3.5 h-100" style="background-color: var(--sub-background-color, transparent);">
                            <h6 class="font-weight-bold text-info small mb-3"><i class="bx bx-git-repo-forked"></i> Multi-Parent Inherited Context</h6>
                            <div class="d-flex flex-column gap-2.5 small text-muted">
                                <div class="d-flex align-items-center justify-content-between p-2 rounded border" style="background-color: var(--main-background-color, transparent);">
                                    <span>Parent 1 (Project Hub):</span>
                                    <span class="badge bg-primary bg-opacity-20 text-primary">~project</span>
                                </div>
                                <div class="d-flex align-items-center justify-content-between p-2 rounded border" style="background-color: var(--main-background-color, transparent);">
                                    <span>Parent 2 (Client Organization):</span>
                                    <span class="badge bg-info bg-opacity-20 text-info">~client</span>
                                </div>
                                <div class="d-flex align-items-center justify-content-between p-2 rounded border" style="background-color: var(--main-background-color, transparent);">
                                    <span>Derived Topics (Dual Inherited):</span>
                                    <span class="badge bg-success bg-opacity-20 text-success">#TechNews</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Automation Stack Preview with Clickable Navigation -->
                <div class="card border p-3.5 mb-4" style="background-color: var(--sub-background-color, transparent);">
                    <div class="d-flex align-items-center justify-content-between mb-3">
                        <h6 class="font-weight-bold text-warning small m-0"><i class="bx bx-git-commit"></i> Active Automation Stack</h6>
                        <button type="button" class="btn btn-xs btn-link p-0 text-info edit-cat-nav-btn">
                            <i class="bx bx-category"></i> Edit Category Behaviors
                        </button>
                    </div>
                    <div class="d-flex flex-column gap-2 small text-muted">
                        <div class="d-flex align-items-center justify-content-between p-2 rounded border" style="background-color: var(--main-background-color, transparent);">
                            <span>Global System Scope:</span>
                            <span class="badge bg-primary bg-opacity-20 text-primary">Auto-Clone to Project & Sync Derived Topics</span>
                        </div>
                        <div class="d-flex align-items-center justify-content-between p-2 rounded border" style="background-color: var(--main-background-color, transparent);">
                            <span>Category '${tpl.category}' Scope:</span>
                            <span class="badge bg-info bg-opacity-20 text-info">${catRules.length} Category Rules Active</span>
                        </div>
                        <div class="d-flex align-items-center justify-content-between p-2 rounded border" style="background-color: var(--main-background-color, transparent);">
                            <span>Template '${tpl.title}' Scope:</span>
                            <span class="badge bg-success bg-opacity-20 text-success">${tplRules.length} Template Rules Active</span>
                        </div>
                    </div>
                </div>

                <div class="border-top pt-4">
                    <h6 class="font-weight-bold text-muted small mb-2"><i class="bx bx-file-blank"></i> Content Skeleton Render</h6>
                    <div class="p-4 rounded border font-monospace" style="background-color: var(--sub-background-color, transparent); min-height: 220px;">
                        ${tpl.defaultContent || '<em class="text-muted">Empty note body skeleton</em>'}
                    </div>
                </div>
            </div>
        `;

        const editCatNavBtn = previewWrapper.querySelector('.edit-cat-nav-btn') as HTMLButtonElement;
        editCatNavBtn.addEventListener('click', () => switchTab('categories'));

        el.appendChild(previewWrapper);
    }

    function showAddRelationshipModal(tpl: TemplateDefinition, engine: TemplateEngine) {
        const relName = prompt('Enter relation name (e.g. project, client, organization, writer, attendee):');
        if (!relName) return;
        const allTemplates = engine.getAllTemplates();
        const targetId = prompt(`Select target parent template ID:\n${allTemplates.map(t => t.id).join(', ')}`);
        if (!targetId) return;

        const targetTpl = engine.getTemplate(targetId);
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

        engine.addRelationship(tpl.id, newRel);
    }

    function showCreateTemplateModal() {
        const title = prompt('Enter new Template Title (e.g. Research Brief):');
        if (!title) return;
        const category = prompt('Category Type (work, drafts, people, system, custom):', 'work') as any;

        const id = title.toLowerCase().replace(/\s+/g, '-');
        templateEngine.registerTemplate({
            id,
            marker: `ext${title.replace(/\s+/g, '')}`,
            title,
            category: category || 'work',
            rootContainerMarker: 'projectRoot',
            titlePattern: '{title}',
            icon: 'file-blank',
            attributes: [],
            relationships: [],
            defaultContent: `<h2>${title}</h2><p>Notes content...</p>`,
        });
        onSave();
        refresh();
    }

    function showAddAttrModal(tpl: TemplateDefinition, engine: TemplateEngine) {
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
            isPromoted: true,
        });
        engine.updateTemplate(tpl.id, tpl);
    }

    refresh();
}
