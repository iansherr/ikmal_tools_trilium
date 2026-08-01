/**
 * Template Studio Component: Ultra-Sleek Design with Rich Bootstrap Modals (No Browser Prompts).
 * Styled natively with Trilium Boxicons and standard Trilium design tokens.
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

        // 1. Sleek Header Banner
        const header = document.createElement('div');
        header.className = 'p-4 rounded-3 border d-flex align-items-center justify-content-between shadow-sm';
        header.style.backgroundColor = 'var(--sub-background-color, transparent)';
        header.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.15))';

        header.innerHTML = `
            <div class="d-flex align-items-center gap-3">
                <div class="p-3 rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                    <i class="bx bx-layer h3 m-0 text-primary"></i>
                </div>
                <div>
                    <h2 class="h5 m-0 font-weight-bold d-flex align-items-center gap-2">
                        Template Studio & Behavioral Engine
                        <span class="badge bg-secondary rounded-pill font-weight-normal small">v1.0.0</span>
                    </h2>
                    <p class="text-muted small m-0 mt-1">
                        Configure template schemas, parent-child links, automation rules, promoted attributes, and live note previews.
                    </p>
                </div>
            </div>
            <div class="d-flex align-items-center gap-2">
                <button type="button" class="btn btn-sm btn-outline-primary manage-cats-btn px-3 py-2 d-flex align-items-center gap-1.5 shadow-xs">
                    <i class="bx bx-category fs-6"></i> Category Matrix
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
        newTplBtn.addEventListener('click', () => openNewTemplateModal(wrapper, templateEngine, () => { onSave(); refresh(); }));
        wrapper.appendChild(header);

        const layoutRow = document.createElement('div');
        layoutRow.className = 'row g-4';

        // 2. Sidebar: Spacious Nested Tree View (3 Cols)
        const sidebarCol = document.createElement('div');
        sidebarCol.className = 'col-md-3';

        const sidebarCard = document.createElement('div');
        sidebarCard.className = 'card border shadow-sm h-100 rounded-3';
        sidebarCard.style.backgroundColor = 'var(--sub-background-color, transparent)';
        sidebarCard.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.15))';

        const sidebarHeader = document.createElement('div');
        sidebarHeader.className = 'card-header bg-transparent border-bottom font-weight-bold small text-muted d-flex align-items-center justify-content-between p-3.5';
        sidebarHeader.innerHTML = `
            <span class="d-flex align-items-center gap-2"><i class="bx bx-sitemap text-primary"></i> Template Hierarchy</span>
            <span class="badge bg-primary bg-opacity-10 text-primary rounded-pill small">Tree</span>
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
                item.className = `d-flex align-items-center justify-content-between px-3 py-2 rounded-2 cursor-pointer transition-all ${isSelected ? 'bg-primary text-white font-weight-bold shadow-sm' : 'text-body'}`;
                item.style.cursor = 'pointer';
                if (!isSelected) {
                    item.style.backgroundColor = 'transparent';
                }

                item.innerHTML = `
                    <div class="d-flex align-items-center gap-2">
                        ${depth > 0 ? '<i class="bx bx-subdirectory-right opacity-50"></i>' : ''}
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
        workspaceCard.className = 'card border shadow-sm h-100 rounded-3';
        workspaceCard.style.backgroundColor = 'var(--sub-background-color, transparent)';
        workspaceCard.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.15))';

        // Workspace Header
        const mainHeader = document.createElement('div');
        mainHeader.className = 'card-header bg-transparent border-bottom d-flex align-items-center justify-content-between p-3.5';
        mainHeader.innerHTML = `
            <div class="d-flex align-items-center gap-3">
                <div class="p-2.5 rounded-3 bg-primary bg-opacity-10 text-primary">
                    <i class="bx bx-${activeEditorTab === 'categories' ? 'category' : (activeTpl?.icon || 'layer')} fs-4 m-0"></i>
                </div>
                <div>
                    <h3 class="h6 m-0 font-weight-bold d-flex align-items-center gap-2">
                        <span>${activeEditorTab === 'categories' ? 'Category Behaviors & Automations' : `Template: ${activeTpl?.title}`}</span>
                        ${activeEditorTab !== 'categories' && activeTpl ? `<span class="badge bg-primary bg-opacity-10 text-primary rounded-pill font-weight-normal small">${activeTpl.category || 'custom'}</span>` : ''}
                    </h3>
                    <div class="text-muted small mt-0.5">${activeEditorTab === 'categories' ? 'Configure category root markers, journal cloning, topic inheritance, and category-wide rules' : `Marker: #${activeTpl?.marker} • ID: ${activeTpl?.id}`}</div>
                </div>
            </div>
            <div class="d-flex align-items-center gap-3">
                <ul class="nav nav-pills bg-body bg-opacity-50 p-1 rounded-3 border">
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
            renderCategoryTypeEditorView(workspaceBody, wrapper, templateEngine, iftttEngine, () => { onSave(); refresh(); });
        } else if (activeEditorTab === 'editor' && activeTpl) {
            renderSchemaEditorView(workspaceBody, wrapper, activeTpl, templateEngine, iftttEngine, (tab) => {
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

    function renderCategoryTypeEditorView(
        el: HTMLElement,
        wrapper: HTMLElement,
        engine: TemplateEngine,
        iftttEngine: IftttEngine,
        onSave: () => void
    ) {
        const catWrapper = document.createElement('div');
        catWrapper.className = 'd-flex flex-column gap-4';

        const cats = engine.getAllCategories();
        const allRules = iftttEngine.getAllRules();

        catWrapper.innerHTML = `
            <div class="d-flex align-items-center justify-content-between">
                <div>
                    <h5 class="h6 font-weight-bold m-0">Category Type Behavior Matrix & Automations (${cats.length})</h5>
                    <p class="text-muted small m-0 mt-1">Configure default container roots, journal cloning, topic inheritance, and category-wide rules.</p>
                </div>
                <button type="button" class="btn btn-sm btn-primary add-cat-btn d-flex align-items-center gap-1.5 shadow-xs">
                    <i class="bx bx-plus"></i> New Category Type
                </button>
            </div>

            <div class="d-flex flex-column gap-4">
                ${cats.map(c => {
                    const catRules = allRules.filter(r => r.trigger.targetCategory === c.id);
                    return `
                        <div class="card border p-4 shadow-sm rounded-3" style="background-color: var(--main-background-color, transparent);">
                            <div class="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2.5">
                                <div class="d-flex align-items-center gap-3">
                                    <div class="p-2.5 rounded-3 bg-primary bg-opacity-10 text-primary">
                                        <i class="bx bx-${c.icon} fs-4"></i>
                                    </div>
                                    <div>
                                        <h6 class="font-weight-bold m-0">${c.title}</h6>
                                        <code class="small text-muted">Category ID: ${c.id}</code>
                                    </div>
                                </div>
                                <span class="badge ${c.isBuiltin ? 'bg-secondary' : 'bg-info'} bg-opacity-20 text-muted rounded-pill px-3 py-1.5">${c.isBuiltin ? 'Built-in Category' : 'Custom Category'}</span>
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

                            <!-- Embedded Category-Wide Automations Card Stack -->
                            <div class="border-top pt-3">
                                <div class="d-flex align-items-center justify-content-between mb-2.5">
                                    <h6 class="font-weight-bold text-primary small m-0 d-flex align-items-center gap-1.5">
                                        <i class="bx bx-git-commit"></i> Category Automation Rules (${catRules.length})
                                    </h6>
                                    <button type="button" class="btn btn-xs btn-outline-primary add-cat-rule-btn d-flex align-items-center gap-1 shadow-xs" data-cat-id="${c.id}">
                                        <i class="bx bx-plus"></i> Add Category Rule
                                    </button>
                                </div>
                                <div class="d-flex flex-column gap-2">
                                    ${catRules.length > 0 ? catRules.map(r => `
                                        <div class="p-3 rounded-3 border small d-flex align-items-center justify-content-between shadow-xs" style="background-color: var(--sub-background-color, transparent);">
                                            <div class="d-flex align-items-center gap-2.5">
                                                <i class="bx bx-bolt-circle text-primary fs-5"></i>
                                                <div>
                                                    <strong class="text-body">${r.name}</strong>
                                                    <div class="text-muted tiny mt-0.5">Trigger: <code>${r.trigger.type}</code> • Actions: <code>${r.actions.map(a => a.type).join(', ')}</code></div>
                                                </div>
                                            </div>
                                            <div class="d-flex align-items-center gap-2">
                                                <button type="button" class="btn btn-xs btn-outline-primary edit-rule-btn px-2.5 py-1 font-weight-bold d-flex align-items-center gap-1 shadow-xs" data-rule-id="${r.id}">
                                                    <i class="bx bx-edit-alt"></i> Edit Rule
                                                </button>
                                                <span class="badge ${r.enabled ? 'bg-success' : 'bg-secondary'} bg-opacity-20 text-muted rounded-pill">${r.enabled ? 'Active' : 'Disabled'}</span>
                                            </div>
                                        </div>
                                    `).join('') : '<div class="text-muted tiny p-3 border rounded-3 text-center">No category-wide automation rules attached.</div>'}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <div class="d-flex justify-content-end pt-2">
                <button type="button" class="btn btn-primary px-4 py-2 font-weight-bold shadow-sm save-cats-btn d-flex align-items-center gap-1.5">
                    <i class="bx bx-save fs-6"></i> Save Category Matrix
                </button>
            </div>
        `;

        const addCatBtn = catWrapper.querySelector('.add-cat-btn') as HTMLButtonElement;
        addCatBtn.addEventListener('click', () => openNewCategoryModal(wrapper, engine, onSave));

        catWrapper.querySelectorAll('.add-cat-rule-btn').forEach(btn => {
            btn.addEventListener('click', (e: any) => {
                const catId = e.currentTarget.dataset.catId;
                openRuleEditorModal(wrapper, iftttEngine, { targetCategory: catId }, onSave);
            });
        });

        catWrapper.querySelectorAll('.edit-rule-btn').forEach(btn => {
            btn.addEventListener('click', (e: any) => {
                const ruleId = e.currentTarget.dataset.ruleId;
                const rule = iftttEngine.getRule(ruleId);
                if (rule) openRuleEditorModal(wrapper, iftttEngine, { rule }, onSave);
            });
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
        wrapper: HTMLElement,
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

        const parentRules = tpl.relationships.map(r => ({
            id: `rel_${tpl.id}_${r.relationName}`,
            name: `Parent Link ~${r.relationName} -> ${r.targetTemplateName}`,
            description: `IF note has ~${r.relationName} -> THEN link to ${r.targetTemplateName}, auto-clone to parent container, and inherit parent topics.`,
            scope: 'template',
            isParentLink: true,
            relationName: r.relationName,
            targetTemplateName: r.targetTemplateName,
            autoCloneToParent: r.autoCloneToParent,
            inheritTopics: r.inheritTopics,
        }));

        // 1. Basic Template Settings & Category Type
        const basicCard = document.createElement('div');
        basicCard.className = 'card border p-4 shadow-sm rounded-3';
        basicCard.style.backgroundColor = 'var(--main-background-color, transparent)';
        basicCard.style.borderColor = 'var(--border-color, rgba(128,128,128,0.15)) !important';

        basicCard.innerHTML = `
            <h6 class="font-weight-bold text-primary mb-3 d-flex align-items-center gap-2">
                <i class="bx bx-slider"></i> General Settings & Category Type
            </h6>
            <div class="row g-3">
                <div class="col-md-3">
                    <label class="form-label small font-weight-bold">Template Title</label>
                    <input type="text" id="tpl-title" class="form-control form-control-sm" value="${tpl.title}">
                </div>
                <div class="col-md-3">
                    <label class="form-label small font-weight-bold">Category Type</label>
                    <select id="tpl-category" class="form-select form-select-sm">
                        ${categories.map(c => `<option value="${c.id}" ${tpl.category === c.id ? 'selected' : ''}>${c.title}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label small font-weight-bold">Title Pattern</label>
                    <input type="text" id="tpl-pattern" class="form-control form-control-sm" value="${tpl.titlePattern}">
                </div>
                <div class="col-md-3">
                    <label class="form-label small font-weight-bold">Icon Class</label>
                    <div class="input-group input-group-sm">
                        <span class="input-group-text"><i class="bx bx-${tpl.icon}"></i></span>
                        <input type="text" id="tpl-icon" class="form-control" value="${tpl.icon}">
                    </div>
                </div>
            </div>
        `;
        formWrapper.appendChild(basicCard);

        // 2. UNIFIED IFTTT AUTOMATION RULES CARD (IDENTICAL CARDS ACROSS GLOBAL, CATEGORY, TEMPLATE SCOPES)
        const behaviorCard = document.createElement('div');
        behaviorCard.className = 'card border p-4 shadow-sm rounded-3';
        behaviorCard.style.backgroundColor = 'var(--main-background-color, transparent)';
        behaviorCard.style.borderColor = 'var(--border-color, rgba(128,128,128,0.15)) !important';

        behaviorCard.innerHTML = `
            <div class="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2.5">
                <div>
                    <h6 class="font-weight-bold text-primary m-0 d-flex align-items-center gap-2">
                        <i class="bx bx-git-commit"></i> Automation Rules (IFTTT Engine)
                    </h6>
                    <p class="text-muted tiny m-0 mt-0.5">Parent relationship links, auto-cloning, metadata inheritance, and custom logic rules.</p>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <button type="button" class="btn btn-sm btn-outline-primary add-rel-rule-btn d-flex align-items-center gap-1.5 shadow-xs">
                        <i class="bx bx-link"></i> Add Parent Link Rule
                    </button>
                    <button type="button" class="btn btn-sm btn-primary add-tpl-rule-btn d-flex align-items-center gap-1.5 shadow-xs">
                        <i class="bx bx-plus"></i> Add Custom Rule
                    </button>
                </div>
            </div>

            <div class="d-flex flex-column gap-4">
                <!-- Group 1: Global Scope Automations -->
                <div>
                    <div class="text-primary font-weight-bold small mb-2 d-flex align-items-center justify-content-between">
                        <span class="d-flex align-items-center gap-1.5"><i class="bx bx-globe"></i> Global System Rules (${globalRules.length})</span>
                        <span class="badge bg-primary bg-opacity-10 text-primary rounded-pill tiny">Global Scope</span>
                    </div>
                    <div class="d-flex flex-column gap-2">
                        ${globalRules.map(r => `
                            <div class="p-3 rounded-3 border small d-flex align-items-center justify-content-between shadow-xs" style="background-color: var(--sub-background-color, transparent);">
                                <div class="d-flex align-items-center gap-2.5">
                                    <i class="bx bx-globe text-primary fs-5"></i>
                                    <div>
                                        <strong class="text-body">${r.name}</strong>
                                        <div class="text-muted tiny mt-0.5">System-wide rule (Inherited across all notes)</div>
                                    </div>
                                </div>
                                <button type="button" class="btn btn-xs btn-outline-primary edit-rule-btn px-2.5 py-1 font-weight-bold d-flex align-items-center gap-1 shadow-xs" data-rule-id="${r.id}">
                                    <i class="bx bx-edit-alt"></i> Deeplink Edit Rule
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Group 2: Category Scope Automations -->
                <div>
                    <div class="text-info font-weight-bold small mb-2 d-flex align-items-center justify-content-between">
                        <span class="d-flex align-items-center gap-1.5"><i class="bx bx-category"></i> Category Type Rules (${catRules.length})</span>
                        <button type="button" class="btn btn-xs btn-link p-0 text-info edit-cat-rules-btn font-weight-bold">
                            <i class="bx bx-category"></i> Edit Category '${tpl.category}' Matrix
                        </button>
                    </div>
                    <div class="d-flex flex-column gap-2">
                        ${catRules.length > 0 ? catRules.map(r => `
                            <div class="p-3 rounded-3 border small d-flex align-items-center justify-content-between shadow-xs" style="background-color: var(--sub-background-color, transparent);">
                                <div class="d-flex align-items-center gap-2.5">
                                    <i class="bx bx-category text-info fs-5"></i>
                                    <div>
                                        <strong class="text-body">${r.name}</strong>
                                        <div class="text-muted tiny mt-0.5">Inherited from Category '${tpl.category}'</div>
                                    </div>
                                </div>
                                <button type="button" class="btn btn-xs btn-outline-info edit-cat-rules-btn px-2.5 py-1 font-weight-bold d-flex align-items-center gap-1 shadow-xs">
                                    <i class="bx bx-edit-alt"></i> Deeplink Edit Category
                                </button>
                            </div>
                        `).join('') : '<div class="p-2.5 text-center text-muted tiny border rounded-3">No category-wide rules for category \'' + tpl.category + '\'.</div>'}
                    </div>
                </div>

                <!-- Group 3: Template Scope Automations -->
                <div>
                    <div class="text-success font-weight-bold small mb-2 d-flex align-items-center justify-content-between">
                        <span class="d-flex align-items-center gap-1.5"><i class="bx bx-file"></i> Template Direct Rules (${parentRules.length + tplRules.length})</span>
                        <span class="badge bg-success bg-opacity-20 text-success rounded-pill tiny">Template Scope</span>
                    </div>
                    <div class="d-flex flex-column gap-2">
                        ${parentRules.map((r, idx) => `
                            <div class="p-3 rounded-3 border small d-flex align-items-center justify-content-between shadow-xs" style="background-color: var(--sub-background-color, transparent);">
                                <div class="d-flex align-items-center gap-2.5">
                                    <i class="bx bx-link text-success fs-5"></i>
                                    <div>
                                        <strong class="text-body">${r.name}</strong>
                                        <div class="text-muted tiny mt-0.5">${r.description}</div>
                                    </div>
                                </div>
                                <div class="d-flex align-items-center gap-2">
                                    <button type="button" class="btn btn-xs btn-outline-success edit-parent-rule-btn px-2.5 py-1 font-weight-bold d-flex align-items-center gap-1 shadow-xs" data-rel-idx="${idx}">
                                        <i class="bx bx-edit-alt"></i> Edit Link
                                    </button>
                                    <button type="button" class="btn btn-xs btn-outline-danger del-rel-btn p-1" data-rel-idx="${idx}">
                                        <i class="bx bx-trash"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}

                        ${tplRules.map(r => `
                            <div class="p-3 rounded-3 border small d-flex align-items-center justify-content-between shadow-xs" style="background-color: var(--sub-background-color, transparent);">
                                <div class="d-flex align-items-center gap-2.5">
                                    <i class="bx bx-bolt-circle text-success fs-5"></i>
                                    <div>
                                        <strong class="text-body">${r.name}</strong>
                                        <div class="text-muted tiny mt-0.5">Template-specific automation rule for '${tpl.title}'</div>
                                    </div>
                                </div>
                                <div class="d-flex align-items-center gap-2">
                                    <button type="button" class="btn btn-xs btn-outline-primary edit-rule-btn px-2.5 py-1 font-weight-bold d-flex align-items-center gap-1 shadow-xs" data-rule-id="${r.id}">
                                        <i class="bx bx-edit-alt"></i> Edit Rule
                                    </button>
                                    <button type="button" class="btn btn-xs btn-outline-danger del-rule-btn p-1" data-rule-id="${r.id}">
                                        <i class="bx bx-trash"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}

                        ${parentRules.length === 0 && tplRules.length === 0 ? '<div class="p-3 text-center text-muted tiny border rounded-3">No template-specific automation rules.</div>' : ''}
                    </div>
                </div>
            </div>
        `;

        behaviorCard.querySelectorAll('.edit-cat-rules-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab('categories');
            });
        });

        behaviorCard.querySelectorAll('.edit-rule-btn').forEach(btn => {
            btn.addEventListener('click', (e: any) => {
                const ruleId = e.currentTarget.dataset.ruleId;
                const rule = iftttEngine.getRule(ruleId);
                if (rule) openRuleEditorModal(wrapper, iftttEngine, { rule }, () => switchTab('preview'));
            });
        });

        behaviorCard.querySelectorAll('.edit-parent-rule-btn').forEach(btn => {
            btn.addEventListener('click', (e: any) => {
                const idx = Number(e.currentTarget.dataset.relIdx);
                openAddRelationshipModal(wrapper, tpl, engine, iftttEngine, idx, () => switchTab('preview'));
            });
        });

        const addRelBtn = behaviorCard.querySelector('.add-rel-rule-btn') as HTMLButtonElement;
        addRelBtn.addEventListener('click', () => openAddRelationshipModal(wrapper, tpl, engine, iftttEngine, undefined, () => switchTab('preview')));

        const addTplRuleBtn = behaviorCard.querySelector('.add-tpl-rule-btn') as HTMLButtonElement;
        addTplRuleBtn.addEventListener('click', () => openRuleEditorModal(wrapper, iftttEngine, { targetTemplateId: tpl.id }, () => switchTab('preview')));

        behaviorCard.querySelectorAll('.del-rel-btn').forEach(btn => {
            btn.addEventListener('click', (e: any) => {
                const idx = Number(e.currentTarget.dataset.relIdx);
                tpl.relationships.splice(idx, 1);
                engine.updateTemplate(tpl.id, tpl);
            });
        });

        behaviorCard.querySelectorAll('.del-rule-btn').forEach(btn => {
            btn.addEventListener('click', (e: any) => {
                const ruleId = e.currentTarget.dataset.ruleId;
                iftttEngine.deleteRule(ruleId);
            });
        });

        formWrapper.appendChild(behaviorCard);

        // 3. Promoted Attributes
        const attrCard = document.createElement('div');
        attrCard.className = 'card border p-4 shadow-sm rounded-3';
        attrCard.style.backgroundColor = 'var(--main-background-color, transparent)';
        attrCard.style.borderColor = 'var(--border-color, rgba(128,128,128,0.15)) !important';

        attrCard.innerHTML = `
            <div class="d-flex align-items-center justify-content-between mb-3">
                <h6 class="font-weight-bold text-success m-0 d-flex align-items-center gap-2">
                    <i class="bx bx-list-check"></i> Promoted Form Attributes (${tpl.attributes.length})
                </h6>
                <button type="button" class="btn btn-sm btn-outline-success add-attr-btn d-flex align-items-center gap-1 shadow-xs">
                    <i class="bx bx-plus"></i> Add Attribute
                </button>
            </div>
            <table class="table table-hover align-middle small m-0 border rounded-3 overflow-hidden">
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
                            <td><span class="badge bg-secondary bg-opacity-20 text-muted rounded-pill">${a.type}</span></td>
                            <td>${a.dataType}</td>
                            <td>${a.options ? a.options.join(', ') : a.defaultValue ?? '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        const addAttrBtn = attrCard.querySelector('.add-attr-btn') as HTMLButtonElement;
        addAttrBtn.addEventListener('click', () => openAddAttrModal(wrapper, tpl, engine, () => switchTab('preview')));

        formWrapper.appendChild(attrCard);

        // 4. HTML Content Skeleton
        const skeletonCard = document.createElement('div');
        skeletonCard.className = 'card border p-4 shadow-sm rounded-3';
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
            <div class="p-4 rounded-3 border" style="background-color: var(--main-background-color, transparent); border-color: var(--border-color, rgba(128,128,128,0.15)) !important;">
                <div class="d-flex align-items-center gap-3 border-bottom pb-3 mb-4">
                    <div class="p-3 rounded-3 bg-primary bg-opacity-10 text-primary">
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
                        <div class="card border p-3.5 h-100 shadow-xs rounded-3" style="background-color: var(--sub-background-color, transparent);">
                            <h6 class="font-weight-bold text-muted small mb-3"><i class="bx bx-slider-alt"></i> Direct Form Attributes</h6>
                            <div class="d-flex flex-column gap-2.5">
                                ${tpl.attributes.map(a => `
                                    <div class="d-flex align-items-center justify-content-between p-2 rounded-2 border" style="background-color: var(--main-background-color, transparent);">
                                        <span class="badge bg-primary bg-opacity-10 text-primary rounded-pill">#${a.name}</span>
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
                        <div class="card border p-3.5 h-100 shadow-xs rounded-3" style="background-color: var(--sub-background-color, transparent);">
                            <h6 class="font-weight-bold text-info small mb-3"><i class="bx bx-git-repo-forked"></i> Multi-Parent Inherited Context</h6>
                            <div class="d-flex flex-column gap-2.5 small text-muted">
                                <div class="d-flex align-items-center justify-content-between p-2 rounded-2 border" style="background-color: var(--main-background-color, transparent);">
                                    <span>Parent 1 (Project Hub):</span>
                                    <span class="badge bg-primary bg-opacity-20 text-primary rounded-pill">~project</span>
                                </div>
                                <div class="d-flex align-items-center justify-content-between p-2 rounded-2 border" style="background-color: var(--main-background-color, transparent);">
                                    <span>Parent 2 (Client Organization):</span>
                                    <span class="badge bg-info bg-opacity-20 text-info rounded-pill">~client</span>
                                </div>
                                <div class="d-flex align-items-center justify-content-between p-2 rounded-2 border" style="background-color: var(--main-background-color, transparent);">
                                    <span>Derived Topics (Dual Inherited):</span>
                                    <span class="badge bg-success bg-opacity-20 text-success rounded-pill">#TechNews</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card border p-3.5 mb-4 shadow-xs rounded-3" style="background-color: var(--sub-background-color, transparent);">
                    <div class="d-flex align-items-center justify-content-between mb-3">
                        <h6 class="font-weight-bold text-primary small m-0"><i class="bx bx-git-commit"></i> Active Automation Rules (IFTTT)</h6>
                        <button type="button" class="btn btn-xs btn-outline-info edit-cat-nav-btn font-weight-bold px-2.5 py-1 shadow-xs">
                            <i class="bx bx-category"></i> Deeplink Edit Category Matrix
                        </button>
                    </div>
                    <div class="d-flex flex-column gap-2 small text-muted">
                        <div class="d-flex align-items-center justify-content-between p-2 rounded-2 border" style="background-color: var(--main-background-color, transparent);">
                            <span>Global System Scope:</span>
                            <span class="badge bg-primary bg-opacity-20 text-primary rounded-pill">Auto-Clone to Project & Sync Derived Topics</span>
                        </div>
                        <div class="d-flex align-items-center justify-content-between p-2 rounded-2 border" style="background-color: var(--main-background-color, transparent);">
                            <span>Category '${tpl.category}' Scope:</span>
                            <span class="badge bg-info bg-opacity-20 text-info rounded-pill">${catRules.length} Category Rules Active</span>
                        </div>
                        <div class="d-flex align-items-center justify-content-between p-2 rounded-2 border" style="background-color: var(--main-background-color, transparent);">
                            <span>Template '${tpl.title}' Scope:</span>
                            <span class="badge bg-success bg-opacity-20 text-success rounded-pill">${tplRules.length} Template Rules Active</span>
                        </div>
                    </div>
                </div>

                <div class="border-top pt-4">
                    <h6 class="font-weight-bold text-muted small mb-2"><i class="bx bx-file-blank"></i> Content Skeleton Render</h6>
                    <div class="p-4 rounded-3 border font-monospace" style="background-color: var(--sub-background-color, transparent); min-height: 220px;">
                        ${tpl.defaultContent || '<em class="text-muted">Empty note body skeleton</em>'}
                    </div>
                </div>
            </div>
        `;

        const editCatNavBtn = previewWrapper.querySelector('.edit-cat-nav-btn') as HTMLButtonElement;
        editCatNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('categories');
        });

        el.appendChild(previewWrapper);
    }

    // --- RICH MODAL SYSTEM IMPLEMENTATION ---

    function openRuleEditorModal(
        wrapper: HTMLElement,
        iftttEngine: IftttEngine,
        opts: { rule?: IftttRuleDef; targetCategory?: string; targetTemplateId?: string },
        onSave: () => void
    ) {
        const isEdit = !!opts.rule;
        const rule = opts.rule || {
            id: `rule_${Date.now()}`,
            name: '',
            description: '',
            enabled: true,
            isBuiltin: false,
            trigger: {
                type: 'onNoteCreated' as const,
                targetCategory: opts.targetCategory,
                targetTemplateId: opts.targetTemplateId,
            },
            conditions: [],
            actions: [{ type: 'setLabel' as const, params: { labelName: 'processed', labelValue: 'true' } }],
        };

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-backdrop fade show d-flex align-items-center justify-content-center';
        modalOverlay.style.zIndex = '1050';
        modalOverlay.style.backgroundColor = 'rgba(0,0,0,0.6)';

        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog modal-dialog-centered modal-lg';
        dialog.style.width = '650px';

        const content = document.createElement('div');
        content.className = 'modal-content shadow-lg border-0 rounded-3';
        content.style.backgroundColor = 'var(--main-background-color, #ffffff)';
        content.style.color = 'var(--main-text-color, #333333)';

        content.innerHTML = `
            <div class="modal-header border-bottom p-3.5 d-flex align-items-center justify-content-between">
                <h5 class="modal-title h6 font-weight-bold d-flex align-items-center gap-2">
                    <i class="bx bx-bolt-circle text-primary fs-5"></i>
                    <span>${isEdit ? 'Deeplink Edit Automation Rule (IFTTT)' : 'Create New Automation Rule (IFTTT)'}</span>
                </h5>
                <button type="button" class="btn-close close-modal-btn"></button>
            </div>
            <div class="modal-body p-4 d-flex flex-column gap-3">
                <div>
                    <label class="form-label font-weight-bold small">Rule Name</label>
                    <input type="text" id="rule-name-input" class="form-control" value="${rule.name}" placeholder="e.g. High Priority Task -> Due Soon Tag">
                </div>

                <div>
                    <label class="form-label font-weight-bold small">Description</label>
                    <input type="text" id="rule-desc-input" class="form-control form-control-sm" value="${rule.description}" placeholder="Explain what this automation rule does...">
                </div>

                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label font-weight-bold small">Trigger Event Type</label>
                        <select id="rule-trigger-type" class="form-select form-select-sm">
                            <option value="onNoteCreated" ${rule.trigger.type === 'onNoteCreated' ? 'selected' : ''}>onNoteCreated</option>
                            <option value="onAttributeChanged" ${rule.trigger.type === 'onAttributeChanged' ? 'selected' : ''}>onAttributeChanged</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label font-weight-bold small">Rule Scope</label>
                        <input type="text" class="form-control form-control-sm" disabled value="${rule.trigger.targetCategory ? `Category: ${rule.trigger.targetCategory}` : (rule.trigger.targetTemplateId ? `Template: ${rule.trigger.targetTemplateId}` : 'Global System Scope')}">
                    </div>
                </div>

                <div class="border-top pt-3">
                    <label class="form-label font-weight-bold small text-primary"><i class="bx bx-check-circle"></i> Executed Action Type</label>
                    <select id="rule-action-type" class="form-select form-select-sm mb-2">
                        <option value="cloneToContainer" ${rule.actions[0]?.type === 'cloneToContainer' ? 'selected' : ''}>cloneToContainer (Auto-clone under Parent Container)</option>
                        <option value="setLabel" ${rule.actions[0]?.type === 'setLabel' ? 'selected' : ''}>setLabel (Set Label / Attribute Value)</option>
                        <option value="syncDerivedTopics" ${rule.actions[0]?.type === 'syncDerivedTopics' ? 'selected' : ''}>syncDerivedTopics (Recalculate Topic Inheritance)</option>
                    </select>
                </div>
            </div>
            <div class="modal-footer border-top p-3 d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-sm btn-outline-secondary close-modal-btn">Cancel</button>
                <button type="button" class="btn btn-sm btn-primary save-rule-modal-btn px-4 font-weight-bold">Save Rule</button>
            </div>
        `;

        const closeBtns = content.querySelectorAll('.close-modal-btn');
        closeBtns.forEach(btn => btn.addEventListener('click', () => modalOverlay.remove()));

        const saveBtn = content.querySelector('.save-rule-modal-btn') as HTMLButtonElement;
        saveBtn.addEventListener('click', () => {
            const name = (content.querySelector('#rule-name-input') as HTMLInputElement).value;
            if (!name) return;
            const desc = (content.querySelector('#rule-desc-input') as HTMLInputElement).value;
            const triggerType = (content.querySelector('#rule-trigger-type') as HTMLSelectElement).value as any;
            const actionType = (content.querySelector('#rule-action-type') as HTMLSelectElement).value as any;

            rule.name = name;
            rule.description = desc;
            rule.trigger.type = triggerType;
            rule.actions = [{ type: actionType, params: { labelName: 'processed', labelValue: 'true' } }];

            iftttEngine.registerRule(rule);
            modalOverlay.remove();
            onSave();
        });

        dialog.appendChild(content);
        modalOverlay.appendChild(dialog);
        wrapper.appendChild(modalOverlay);
    }

    function openAddRelationshipModal(
        wrapper: HTMLElement,
        tpl: TemplateDefinition,
        engine: TemplateEngine,
        iftttEngine: IftttEngine,
        editRelIdx?: number,
        onSave?: () => void
    ) {
        const isEdit = editRelIdx !== undefined;
        const rel = isEdit ? tpl.relationships[editRelIdx] : {
            id: `rel_${tpl.id}_${Date.now()}`,
            name: 'project link',
            relationName: 'project',
            targetTemplateId: 'projectHub',
            targetTemplateName: 'Project Hub',
            isMulti: false,
            autoCloneToParent: true,
            inheritTopics: true,
            direction: 'parent' as const,
        };

        const allTemplates = engine.getAllTemplates();

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-backdrop fade show d-flex align-items-center justify-content-center';
        modalOverlay.style.zIndex = '1050';
        modalOverlay.style.backgroundColor = 'rgba(0,0,0,0.6)';

        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog modal-dialog-centered';
        dialog.style.width = '550px';

        const content = document.createElement('div');
        content.className = 'modal-content shadow-lg border-0 rounded-3';
        content.style.backgroundColor = 'var(--main-background-color, #ffffff)';
        content.style.color = 'var(--main-text-color, #333333)';

        content.innerHTML = `
            <div class="modal-header border-bottom p-3.5 d-flex align-items-center justify-content-between">
                <h5 class="modal-title h6 font-weight-bold d-flex align-items-center gap-2">
                    <i class="bx bx-link text-primary fs-5"></i>
                    <span>${isEdit ? 'Edit Parent Link Rule' : 'Add Parent Relationship Link (IFTTT)'}</span>
                </h5>
                <button type="button" class="btn-close close-modal-btn"></button>
            </div>
            <div class="modal-body p-4 d-flex flex-column gap-3">
                <div>
                    <label class="form-label font-weight-bold small">Relation Name (e.g. project, client, writer, attendee)</label>
                    <input type="text" id="rel-name-input" class="form-control form-control-sm" value="${rel.relationName}">
                </div>

                <div>
                    <label class="form-label font-weight-bold small">Target Parent Template</label>
                    <select id="rel-target-input" class="form-select form-select-sm">
                        ${allTemplates.map(t => `<option value="${t.id}" ${t.id === rel.targetTemplateId ? 'selected' : ''}>${t.title} (${t.id})</option>`).join('')}
                    </select>
                </div>

                <div class="form-check form-switch pt-2">
                    <input class="form-check-input" type="checkbox" id="rel-clone-check" ${rel.autoCloneToParent ? 'checked' : ''}>
                    <label class="form-check-label font-weight-bold small">Auto-clone under Parent Container</label>
                </div>

                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="rel-topics-check" ${rel.inheritTopics ? 'checked' : ''}>
                    <label class="form-check-label font-weight-bold small">Inherit Parent Topics & Client Metadata</label>
                </div>
            </div>
            <div class="modal-footer border-top p-3 d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-sm btn-outline-secondary close-modal-btn">Cancel</button>
                <button type="button" class="btn btn-sm btn-primary save-rel-modal-btn px-4 font-weight-bold">Save Link Rule</button>
            </div>
        `;

        const closeBtns = content.querySelectorAll('.close-modal-btn');
        closeBtns.forEach(btn => btn.addEventListener('click', () => modalOverlay.remove()));

        const saveBtn = content.querySelector('.save-rel-modal-btn') as HTMLButtonElement;
        saveBtn.addEventListener('click', () => {
            const relName = (content.querySelector('#rel-name-input') as HTMLInputElement).value;
            const targetId = (content.querySelector('#rel-target-input') as HTMLSelectElement).value;
            const autoClone = (content.querySelector('#rel-clone-check') as HTMLInputElement).checked;
            const inheritTopics = (content.querySelector('#rel-topics-check') as HTMLInputElement).checked;

            const targetTpl = engine.getTemplate(targetId);

            rel.relationName = relName;
            rel.targetTemplateId = targetId;
            rel.targetTemplateName = targetTpl ? targetTpl.title : targetId;
            rel.autoCloneToParent = autoClone;
            rel.inheritTopics = inheritTopics;

            if (!isEdit) {
                tpl.relationships.push(rel);
            }
            engine.updateTemplate(tpl.id, tpl);

            iftttEngine.registerRule({
                id: `rule_rel_${tpl.id}_${relName}`,
                name: `Parent Link ~${relName} -> ${targetTpl ? targetTpl.title : targetId}`,
                description: `IF note has ~${relName} -> THEN link to ${targetTpl ? targetTpl.title : targetId}, auto-clone to parent container, and inherit parent topics.`,
                enabled: true,
                isBuiltin: false,
                trigger: { type: 'onNoteCreated', targetTemplateId: tpl.id },
                conditions: [{ field: relName, operator: 'isSet', value: true }],
                actions: [
                    { type: 'cloneToContainer', params: { relationName: relName } },
                    { type: 'syncDerivedTopics', params: {} },
                ],
            });

            modalOverlay.remove();
            if (onSave) onSave();
        });

        dialog.appendChild(content);
        modalOverlay.appendChild(dialog);
        wrapper.appendChild(modalOverlay);
    }

    function openNewTemplateModal(wrapper: HTMLElement, templateEngine: TemplateEngine, onSave: () => void) {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-backdrop fade show d-flex align-items-center justify-content-center';
        modalOverlay.style.zIndex = '1050';
        modalOverlay.style.backgroundColor = 'rgba(0,0,0,0.6)';

        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog modal-dialog-centered';

        const content = document.createElement('div');
        content.className = 'modal-content shadow-lg border-0 rounded-3';
        content.style.backgroundColor = 'var(--main-background-color, #ffffff)';

        content.innerHTML = `
            <div class="modal-header border-bottom p-3.5 d-flex align-items-center justify-content-between">
                <h5 class="modal-title h6 font-weight-bold d-flex align-items-center gap-2">
                    <i class="bx bx-plus text-primary fs-5"></i>
                    <span>Create New Template</span>
                </h5>
                <button type="button" class="btn-close close-modal-btn"></button>
            </div>
            <div class="modal-body p-4 d-flex flex-column gap-3">
                <div>
                    <label class="form-label font-weight-bold small">Template Title</label>
                    <input type="text" id="new-tpl-title" class="form-control form-control-sm" placeholder="e.g. Research Brief">
                </div>
                <div>
                    <label class="form-label font-weight-bold small">Category Type</label>
                    <select id="new-tpl-cat" class="form-select form-select-sm">
                        <option value="work">Work & Project Scoped</option>
                        <option value="drafts">Drafts & Editorial</option>
                        <option value="people">People & Client Entities</option>
                        <option value="system">System & Topic Index</option>
                        <option value="custom">Custom Category</option>
                    </select>
                </div>
            </div>
            <div class="modal-footer border-top p-3 d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-sm btn-outline-secondary close-modal-btn">Cancel</button>
                <button type="button" class="btn btn-sm btn-primary create-tpl-btn px-4 font-weight-bold">Create Template</button>
            </div>
        `;

        content.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', () => modalOverlay.remove()));
        const createBtn = content.querySelector('.create-tpl-btn') as HTMLButtonElement;
        createBtn.addEventListener('click', () => {
            const title = (content.querySelector('#new-tpl-title') as HTMLInputElement).value;
            if (!title) return;
            const category = (content.querySelector('#new-tpl-cat') as HTMLSelectElement).value as any;

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
            modalOverlay.remove();
            onSave();
        });

        dialog.appendChild(content);
        modalOverlay.appendChild(dialog);
        wrapper.appendChild(modalOverlay);
    }

    function openNewCategoryModal(wrapper: HTMLElement, engine: TemplateEngine, onSave: () => void) {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-backdrop fade show d-flex align-items-center justify-content-center';
        modalOverlay.style.zIndex = '1050';
        modalOverlay.style.backgroundColor = 'rgba(0,0,0,0.6)';

        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog modal-dialog-centered';

        const content = document.createElement('div');
        content.className = 'modal-content shadow-lg border-0 rounded-3';
        content.style.backgroundColor = 'var(--main-background-color, #ffffff)';

        content.innerHTML = `
            <div class="modal-header border-bottom p-3.5 d-flex align-items-center justify-content-between">
                <h5 class="modal-title h6 font-weight-bold d-flex align-items-center gap-2">
                    <i class="bx bx-category text-primary fs-5"></i>
                    <span>Create New Category Type</span>
                </h5>
                <button type="button" class="btn-close close-modal-btn"></button>
            </div>
            <div class="modal-body p-4 d-flex flex-column gap-3">
                <div>
                    <label class="form-label font-weight-bold small">Category Title</label>
                    <input type="text" id="cat-title-input" class="form-control form-control-sm" placeholder="e.g. Legal Documents">
                </div>
                <div>
                    <label class="form-label font-weight-bold small">Description</label>
                    <input type="text" id="cat-desc-input" class="form-control form-control-sm" placeholder="Contracts and legal agreements...">
                </div>
            </div>
            <div class="modal-footer border-top p-3 d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-sm btn-outline-secondary close-modal-btn">Cancel</button>
                <button type="button" class="btn btn-sm btn-primary create-cat-btn px-4 font-weight-bold">Create Category</button>
            </div>
        `;

        content.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', () => modalOverlay.remove()));
        const createBtn = content.querySelector('.create-cat-btn') as HTMLButtonElement;
        createBtn.addEventListener('click', () => {
            const title = (content.querySelector('#cat-title-input') as HTMLInputElement).value;
            if (!title) return;
            const description = (content.querySelector('#cat-desc-input') as HTMLInputElement).value || 'Custom category';
            const id = title.toLowerCase().replace(/\s+/g, '-');

            engine.registerCategory({ id, title, description, icon: 'layer', defaultRootMarker: 'unassignedRoot', autoJournalClone: true, inheritParentTopics: true, projectScopedDefault: false, isBuiltin: false });
            modalOverlay.remove();
            onSave();
        });

        dialog.appendChild(content);
        modalOverlay.appendChild(dialog);
        wrapper.appendChild(modalOverlay);
    }

    function openAddAttrModal(wrapper: HTMLElement, tpl: TemplateDefinition, engine: TemplateEngine, onSave: () => void) {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-backdrop fade show d-flex align-items-center justify-content-center';
        modalOverlay.style.zIndex = '1050';
        modalOverlay.style.backgroundColor = 'rgba(0,0,0,0.6)';

        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog modal-dialog-centered';

        const content = document.createElement('div');
        content.className = 'modal-content shadow-lg border-0 rounded-3';
        content.style.backgroundColor = 'var(--main-background-color, #ffffff)';

        content.innerHTML = `
            <div class="modal-header border-bottom p-3.5 d-flex align-items-center justify-content-between">
                <h5 class="modal-title h6 font-weight-bold d-flex align-items-center gap-2">
                    <i class="bx bx-list-check text-success fs-5"></i>
                    <span>Add Promoted Form Attribute</span>
                </h5>
                <button type="button" class="btn-close close-modal-btn"></button>
            </div>
            <div class="modal-body p-4 d-flex flex-column gap-3">
                <div>
                    <label class="form-label font-weight-bold small">Attribute Name (without #)</label>
                    <input type="text" id="attr-name-input" class="form-control form-control-sm" placeholder="e.g. priority, status, dueDate">
                </div>
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label font-weight-bold small">Attribute Type</label>
                        <select id="attr-type-input" class="form-select form-select-sm">
                            <option value="label">Label (#)</option>
                            <option value="relation">Relation (~)</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label font-weight-bold small">Data Type</label>
                        <select id="attr-datatype-input" class="form-select form-select-sm">
                            <option value="text">Text</option>
                            <option value="select">Select Options</option>
                            <option value="date">Date</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="modal-footer border-top p-3 d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-sm btn-outline-secondary close-modal-btn">Cancel</button>
                <button type="button" class="btn btn-sm btn-success create-attr-btn px-4 font-weight-bold">Save Attribute</button>
            </div>
        `;

        content.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', () => modalOverlay.remove()));
        const createBtn = content.querySelector('.create-attr-btn') as HTMLButtonElement;
        createBtn.addEventListener('click', () => {
            const name = (content.querySelector('#attr-name-input') as HTMLInputElement).value;
            if (!name) return;
            const type = (content.querySelector('#attr-type-input') as HTMLSelectElement).value as any;
            const dataType = (content.querySelector('#attr-datatype-input') as HTMLSelectElement).value as any;

            tpl.attributes.push({
                name,
                type: type === 'relation' ? 'relation' : 'label',
                dataType: dataType || 'text',
                isPromoted: true,
            });
            engine.updateTemplate(tpl.id, tpl);
            modalOverlay.remove();
            onSave();
        });

        dialog.appendChild(content);
        modalOverlay.appendChild(dialog);
        wrapper.appendChild(modalOverlay);
    }

    refresh();
}
