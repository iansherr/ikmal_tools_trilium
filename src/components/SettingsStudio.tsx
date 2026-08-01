/**
 * Settings Studio Component: Configures Today Homepage Components,
 * Package Preferences, and YAML Package Import/Export.
 * Styled with elegant, native Trilium design tokens.
 */

import { TodayEngine } from '../engine/todayEngine.js';
import { TemplateEngine } from '../engine/templateEngine.js';
import { RelationshipEngine } from '../engine/relationshipEngine.js';
import { IftttEngine } from '../engine/iftttEngine.js';
import { dumpYamlSpec } from '../engine/yamlSpec.js';

export function renderSettingsStudio(
    container: HTMLElement,
    todayEngine: TodayEngine,
    templateEngine: TemplateEngine,
    relationshipEngine: RelationshipEngine,
    iftttEngine: IftttEngine,
    onSaveSettings?: (yamlSpec: string) => void
): void {
    let activeSection: 'todayComponents' | 'packagePreferences' | 'yamlPackage' = 'todayComponents';
    let importError = '';
    let importSuccess = '';

    function render() {
        container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'settings-studio-container d-flex flex-column gap-4';

        // 1. Elegant Header Banner
        const header = document.createElement('div');
        header.className = 'p-4 rounded border d-flex align-items-center justify-content-between shadow-sm';
        header.style.backgroundColor = 'var(--sub-background-color, var(--main-background-color, transparent))';
        header.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';
        header.style.borderRadius = '10px';

        header.innerHTML = `
            <div class="d-flex align-items-center gap-3">
                <div class="p-3 rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                    <i class="bx bx-cog h3 m-0 text-warning"></i>
                </div>
                <div>
                    <h2 class="h5 m-0 font-weight-bold d-flex align-items-center gap-2">
                        Settings & Component Studio
                        <span class="badge bg-secondary font-weight-normal small">v1.0.0</span>
                    </h2>
                    <p class="text-muted small m-0 mt-1">
                        Configure Today Homepage components, template schemas, relationship trees, and YAML package specs.
                    </p>
                </div>
            </div>
        `;
        wrapper.appendChild(header);

        // 2. Sub-Navigation Tabs
        const subNav = document.createElement('ul');
        subNav.className = 'nav nav-pills border-bottom pb-2 mb-2';

        const sections = [
            { id: 'todayComponents', label: '⚡ Today Components', icon: 'grid-alt' },
            { id: 'packagePreferences', label: '🎛️ Package Preferences', icon: 'slider' },
            { id: 'yamlPackage', label: '📜 Full YAML Package Spec', icon: 'file-coding' },
        ];

        for (const sec of sections) {
            const li = document.createElement('li');
            li.className = 'nav-item';
            const a = document.createElement('a');
            a.className = `nav-link ${activeSection === sec.id ? 'active' : ''} cursor-pointer d-flex align-items-center gap-2`;
            a.style.cursor = 'pointer';
            a.style.borderRadius = '6px';
            a.innerHTML = `<i class="bx bx-${sec.icon}"></i> ${sec.label}`;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                activeSection = sec.id as any;
                render();
            });
            li.appendChild(a);
            subNav.appendChild(li);
        }
        wrapper.appendChild(subNav);

        // 3. Section Content
        const contentArea = document.createElement('div');
        contentArea.className = 'settings-content';

        if (activeSection === 'todayComponents') {
            renderTodayComponentsSection(contentArea);
        } else if (activeSection === 'packagePreferences') {
            renderPackagePreferencesSection(contentArea);
        } else if (activeSection === 'yamlPackage') {
            renderYamlPackageSection(contentArea);
        }

        wrapper.appendChild(contentArea);
        container.appendChild(wrapper);
    }

    function renderTodayComponentsSection(el: HTMLElement) {
        const layout = todayEngine.getLayout();
        const section = document.createElement('div');
        section.className = 'd-flex flex-column gap-3';

        // Journal Split Width Control
        const widthCard = document.createElement('div');
        widthCard.className = 'card border';
        widthCard.style.backgroundColor = 'var(--sub-background-color, transparent)';
        widthCard.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';
        widthCard.innerHTML = `
            <div class="card-body">
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <h5 class="card-title h6 text-info font-weight-bold m-0 d-flex align-items-center gap-2">
                        <i class="bx bx-dock-right"></i> Journal Side Panel Width
                    </h5>
                    <span class="badge bg-primary font-weight-bold px-3 py-1 fs-6">${layout.journalWidthPercent}%</span>
                </div>
                <p class="text-muted small mb-3">Adjust the default split width allocated to the Journal day note on the Today Homepage.</p>
                <div class="d-flex align-items-center gap-3">
                    <span class="small text-muted font-weight-bold">35%</span>
                    <input type="range" class="form-range flex-grow-1" min="35" max="85" value="${layout.journalWidthPercent}">
                    <span class="small text-muted font-weight-bold">85%</span>
                </div>
            </div>
        `;

        const rangeInput = widthCard.querySelector('input[type="range"]') as HTMLInputElement;
        const rangeBadge = widthCard.querySelector('.badge') as HTMLElement;
        if (rangeInput) {
            rangeInput.addEventListener('input', () => {
                const val = Number(rangeInput.value);
                todayEngine.setJournalWidth(val);
                if (rangeBadge) rangeBadge.textContent = `${val}%`;
            });
        }
        section.appendChild(widthCard);

        // Today Widgets Manager
        const widgetCard = document.createElement('div');
        widgetCard.className = 'card border';
        widgetCard.style.backgroundColor = 'var(--sub-background-color, transparent)';
        widgetCard.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';
        widgetCard.innerHTML = `
            <div class="card-body">
                <h5 class="card-title h6 text-info font-weight-bold mb-3 d-flex align-items-center justify-content-between">
                    <span class="d-flex align-items-center gap-2"><i class="bx bx-layer"></i> Today Homepage Widgets (${layout.widgets.length})</span>
                    <span class="small text-muted font-weight-normal">Toggle visibility or reorder sections</span>
                </h5>
                <div class="widget-list d-flex flex-column gap-2"></div>
            </div>
        `;

        const listEl = widgetCard.querySelector('.widget-list') as HTMLElement;
        const widgets = [...layout.widgets].sort((a, b) => a.order - b.order);

        widgets.forEach((w, index) => {
            const item = document.createElement('div');
            item.className = `d-flex align-items-center justify-content-between p-3 rounded border transition-all ${w.visible ? 'border-primary' : 'border-secondary opacity-75'}`;
            item.style.backgroundColor = 'var(--main-background-color, transparent)';
            item.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';

            item.innerHTML = `
                <div class="d-flex align-items-center gap-3">
                    <input type="checkbox" class="form-check-input widget-toggle cursor-pointer" ${w.visible ? 'checked' : ''} style="width: 20px; height: 20px;">
                    <div>
                        <strong class="${w.visible ? 'font-weight-bold' : 'text-muted'}">${w.title}</strong>
                        <div class="small text-muted mt-1">
                            Query Marker: <code class="px-1 py-0.5 rounded border">#extView="${w.marker}"</code> • Grid: 
                            <span class="badge ${w.colSpan === 2 ? 'bg-info bg-opacity-10 text-info' : 'bg-secondary bg-opacity-10 text-muted'}">${w.colSpan === 2 ? 'Full Width (2 col)' : 'Half Width (1 col)'}</span>
                        </div>
                    </div>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <select class="form-select form-select-sm col-select" style="width: 140px; background-color: var(--main-background-color, inherit); color: var(--main-text-color, inherit); border-color: var(--border-color, #ccc);">
                        <option value="1" ${w.colSpan === 1 ? 'selected' : ''}>Half Width (1 col)</option>
                        <option value="2" ${w.colSpan === 2 ? 'selected' : ''}>Full Width (2 col)</option>
                    </select>
                    <button type="button" class="btn btn-sm btn-outline-secondary move-up" ${index === 0 ? 'disabled' : ''}><i class="bx bx-up-arrow-alt"></i></button>
                    <button type="button" class="btn btn-sm btn-outline-secondary move-down" ${index === widgets.length - 1 ? 'disabled' : ''}><i class="bx bx-down-arrow-alt"></i></button>
                </div>
            `;

            const toggle = item.querySelector('.widget-toggle') as HTMLInputElement;
            toggle.addEventListener('change', () => {
                todayEngine.toggleWidgetVisibility(w.id, toggle.checked);
                render();
            });

            const colSel = item.querySelector('.col-select') as HTMLSelectElement;
            colSel.addEventListener('change', () => {
                todayEngine.updateWidget(w.id, { colSpan: Number(colSel.value) as any });
                render();
            });

            const upBtn = item.querySelector('.move-up') as HTMLButtonElement;
            upBtn.addEventListener('click', () => {
                if (index > 0) {
                    const ids = widgets.map(item => item.id);
                    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
                    todayEngine.reorderWidgets(ids);
                    render();
                }
            });

            const downBtn = item.querySelector('.move-down') as HTMLButtonElement;
            downBtn.addEventListener('click', () => {
                if (index < widgets.length - 1) {
                    const ids = widgets.map(item => item.id);
                    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
                    todayEngine.reorderWidgets(ids);
                    render();
                }
            });

            listEl.appendChild(item);
        });

        section.appendChild(widgetCard);
        el.appendChild(section);
    }

    function renderPackagePreferencesSection(el: HTMLElement) {
        const section = document.createElement('div');
        section.className = 'card border';
        section.style.backgroundColor = 'var(--sub-background-color, transparent)';
        section.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';
        section.innerHTML = `
            <div class="card-body d-flex flex-column gap-4">
                <h5 class="card-title h6 text-info font-weight-bold m-0 d-flex align-items-center gap-2">
                    <i class="bx bx-slider"></i> Global Automation & Relationship Preferences
                </h5>

                <div class="form-check form-switch p-3 border rounded" style="border-color: var(--border-color, rgba(128, 128, 128, 0.2)) !important;">
                    <input class="form-check-input ms-0 me-3 cursor-pointer" type="checkbox" id="iftttToggle" checked style="width: 40px; height: 20px;">
                    <label class="form-check-label font-weight-bold cursor-pointer" for="iftttToggle">
                        Auto-Execute IFTTT Automation Rules
                        <div class="small text-muted font-weight-normal mt-1">
                            Automatically evaluate IF-THIS-THEN-THAT rules when creating tasks, story drafts, or project hubs.
                        </div>
                    </label>
                </div>

                <div class="form-check form-switch p-3 border rounded" style="border-color: var(--border-color, rgba(128, 128, 128, 0.2)) !important;">
                    <input class="form-check-input ms-0 me-3 cursor-pointer" type="checkbox" id="derivedTopicsToggle" checked style="width: 40px; height: 20px;">
                    <label class="form-check-label font-weight-bold cursor-pointer" for="derivedTopicsToggle">
                        Enable Derived Topic Propagation
                        <div class="small text-muted font-weight-normal mt-1">
                            Inherit topic tags dynamically from parent project hubs, organizations, or person relations.
                        </div>
                    </label>
                </div>

                <div class="form-check form-switch p-3 border rounded" style="border-color: var(--border-color, rgba(128, 128, 128, 0.2)) !important;">
                    <input class="form-check-input ms-0 me-3 cursor-pointer" type="checkbox" id="autoJournalCloneToggle" checked style="width: 40px; height: 20px;">
                    <label class="form-check-label font-weight-bold cursor-pointer" for="autoJournalCloneToggle">
                        Auto-Clone Created Notes into Journal Day Note
                        <div class="small text-muted font-weight-normal mt-1">
                            Clone newly created tasks, meetings, and story drafts into the current Journal day note.
                        </div>
                    </label>
                </div>
            </div>
        `;
        el.appendChild(section);
    }

    function renderYamlPackageSection(el: HTMLElement) {
        const section = document.createElement('div');
        section.className = 'd-flex flex-column gap-3';

        const yamlContent = dumpYamlSpec(
            todayEngine.getLayout(),
            templateEngine,
            relationshipEngine,
            iftttEngine
        );

        section.innerHTML = `
            <div class="card border" style="background-color: var(--sub-background-color, transparent); border-color: var(--border-color, rgba(128, 128, 128, 0.2));">
                <div class="card-body">
                    <h5 class="card-title h6 text-info font-weight-bold mb-2 d-flex align-items-center gap-2">
                        <i class="bx bx-file-coding"></i> Complete YAML Package Specification
                    </h5>
                    <p class="text-muted small mb-3">
                        Includes Today Homepage layout, all 12 templates, relationship rules, and IFTTT automation trees in clean, commented YAML.
                    </p>

                    ${importError ? `<div class="alert alert-danger small mb-3">${importError}</div>` : ''}
                    ${importSuccess ? `<div class="alert alert-success small mb-3">${importSuccess}</div>` : ''}

                    <div class="mb-3">
                        <textarea class="form-control font-monospace small" rows="18" style="font-family: Menlo, Monaco, Consolas, 'Courier New', monospace; font-size: 12.5px; line-height: 1.5; background-color: var(--main-background-color, inherit); color: var(--main-text-color, inherit); border-color: var(--border-color, rgba(128,128,128,0.3));">${yamlContent}</textarea>
                    </div>

                    <div class="d-flex align-items-center gap-2">
                        <button type="button" class="btn btn-sm btn-primary copy-yaml-btn d-flex align-items-center gap-1">
                            <i class="bx bx-copy"></i> Copy YAML to Clipboard
                        </button>
                        <button type="button" class="btn btn-sm btn-success save-yaml-btn d-flex align-items-center gap-1">
                            <i class="bx bx-save"></i> Save Specification Package
                        </button>
                    </div>
                </div>
            </div>
        `;

        const textarea = section.querySelector('textarea') as HTMLTextAreaElement;
        const copyBtn = section.querySelector('.copy-yaml-btn') as HTMLButtonElement;
        const saveBtn = section.querySelector('.save-yaml-btn') as HTMLButtonElement;

        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(textarea.value);
                importSuccess = 'YAML Specification copied to clipboard!';
                importError = '';
                render();
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                if (onSaveSettings) {
                    onSaveSettings(textarea.value);
                }
                importSuccess = 'YAML Specification package successfully saved!';
                importError = '';
                render();
            });
        }

        el.appendChild(section);
    }

    render();
}
