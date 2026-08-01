/**
 * Settings Studio Component: Configures Today Homepage Components,
 * Package Preferences, and JSON Package Import/Export.
 */

import { TodayEngine } from '../engine/todayEngine.js';
import { TemplateEngine } from '../engine/templateEngine.js';

export function renderSettingsStudio(
    container: HTMLElement,
    todayEngine: TodayEngine,
    templateEngine: TemplateEngine,
    onSaveSettings?: (packageJson: string) => void
): void {
    let activeSection: 'todayComponents' | 'packagePreferences' | 'jsonPackage' = 'todayComponents';
    let importError = '';
    let importSuccess = '';

    function render() {
        container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'settings-studio-container d-flex flex-column gap-4';

        // 1. Header Banner
        const header = document.createElement('div');
        header.className = 'p-3 rounded border bg-dark d-flex align-items-center justify-content-between';
        header.style.backgroundColor = 'var(--main-background-color, #1e1e2e)';
        header.innerHTML = `
            <div>
                <h2 class="h4 m-0 font-weight-bold d-flex align-items-center gap-2 text-primary">
                    <i class="bx bx-cog text-warning"></i> Settings & Component Studio
                </h2>
                <p class="text-muted small m-0 mt-1">
                    Component-driven configuration for the Today Homepage, automation toggles, and JSON settings package manager.
                </p>
            </div>
        `;
        wrapper.appendChild(header);

        // 2. Sub-Navigation Tabs
        const subNav = document.createElement('ul');
        subNav.className = 'nav nav-tabs border-bottom mb-3';

        const sections = [
            { id: 'todayComponents', label: '⚡ Today Homepage Components', icon: 'grid-alt' },
            { id: 'packagePreferences', label: '🎛️ Package Preferences', icon: 'slider' },
            { id: 'jsonPackage', label: '📦 JSON Settings Package', icon: 'code-alt' },
        ];

        for (const sec of sections) {
            const li = document.createElement('li');
            li.className = 'nav-item';
            const a = document.createElement('a');
            a.className = `nav-link ${activeSection === sec.id ? 'active font-weight-bold' : ''} cursor-pointer`;
            a.style.cursor = 'pointer';
            a.innerHTML = `<i class="bx bx-${sec.icon} mr-1"></i> ${sec.label}`;
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
        } else if (activeSection === 'jsonPackage') {
            renderJsonPackageSection(contentArea);
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
        widthCard.className = 'card mb-3 border-secondary';
        widthCard.innerHTML = `
            <div class="card-body">
                <h5 class="card-title h6 text-info font-weight-bold">
                    <i class="bx bx-dock-right"></i> Journal Split Panel Width (${layout.journalWidthPercent}%)
                </h5>
                <p class="text-muted small mb-2">Adjust default split width allocated to the Journal note on the Today Homepage.</p>
                <div class="d-flex align-items-center gap-3">
                    <input type="range" class="form-range flex-grow-1" min="35" max="85" value="${layout.journalWidthPercent}">
                    <span class="badge bg-primary font-weight-bold p-2">${layout.journalWidthPercent}%</span>
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
        widgetCard.className = 'card border-secondary';
        widgetCard.innerHTML = `
            <div class="card-body">
                <h5 class="card-title h6 text-info font-weight-bold mb-3 d-flex align-items-center justify-content-between">
                    <span><i class="bx bx-layer"></i> Today Homepage Widgets (${layout.widgets.length})</span>
                    <span class="small text-muted font-weight-normal">Drag or use arrow buttons to reorder</span>
                </h5>
                <div class="widget-list d-flex flex-column gap-2"></div>
            </div>
        `;

        const listEl = widgetCard.querySelector('.widget-list') as HTMLElement;
        const widgets = [...layout.widgets].sort((a, b) => a.order - b.order);

        widgets.forEach((w, index) => {
            const item = document.createElement('div');
            item.className = `d-flex align-items-center justify-content-between p-3 rounded border ${w.visible ? 'border-primary bg-dark' : 'border-secondary opacity-75'}`;
            item.style.backgroundColor = 'var(--main-background-color, #1e1e2e)';

            item.innerHTML = `
                <div class="d-flex align-items-center gap-3">
                    <input type="checkbox" class="form-check-input widget-toggle" ${w.visible ? 'checked' : ''}>
                    <div>
                        <strong class="${w.visible ? 'text-white' : 'text-muted'}">${w.title}</strong>
                        <div class="small text-muted">Marker: <code>#extView="${w.marker}"</code> • Columns: ${w.colSpan === 2 ? 'Full Width (2 col)' : 'Half Width (1 col)'}</div>
                    </div>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <select class="form-select form-select-sm col-select" style="width: 140px;">
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
        section.className = 'card border-secondary';
        section.innerHTML = `
            <div class="card-body d-flex flex-column gap-4">
                <h5 class="card-title h6 text-info font-weight-bold m-0">
                    <i class="bx bx-slider"></i> Global Package Automation & Relationship Preferences
                </h5>

                <div class="form-check form-switch p-3 border rounded">
                    <input class="form-check-input ms-0 me-3" type="checkbox" id="iftttToggle" checked>
                    <label class="form-check-label font-weight-bold" for="iftttToggle">
                        Auto-Execute IFTTT Automation Rules
                        <div class="small text-muted font-weight-normal">
                            Automatically evaluate IF-THIS-THEN-THAT rules when creating tasks, story drafts, or project hubs.
                        </div>
                    </label>
                </div>

                <div class="form-check form-switch p-3 border rounded">
                    <input class="form-check-input ms-0 me-3" type="checkbox" id="derivedTopicsToggle" checked>
                    <label class="form-check-label font-weight-bold" for="derivedTopicsToggle">
                        Enable Derived Topic Propagation
                        <div class="small text-muted font-weight-normal">
                            Inherit topic tags dynamically from parent project hubs, organizations, or person relations.
                        </div>
                    </label>
                </div>

                <div class="form-check form-switch p-3 border rounded">
                    <input class="form-check-input ms-0 me-3" type="checkbox" id="autoJournalCloneToggle" checked>
                    <label class="form-check-label font-weight-bold" for="autoJournalCloneToggle">
                        Auto-Clone Created Notes into Journal Day Note
                        <div class="small text-muted font-weight-normal">
                            Clone newly created tasks, meetings, and story drafts into the current Journal day note.
                        </div>
                    </label>
                </div>
            </div>
        `;
        el.appendChild(section);
    }

    function renderJsonPackageSection(el: HTMLElement) {
        const section = document.createElement('div');
        section.className = 'd-flex flex-column gap-3';

        const jsonState = {
            version: '1.0.0',
            packageId: 'iansherr/notes-system',
            todayLayout: todayEngine.getLayout(),
            templates: templateEngine.getAllTemplates(),
        };

        const jsonString = JSON.stringify(jsonState, null, 2);

        section.innerHTML = `
            <div class="card border-secondary">
                <div class="card-body">
                    <h5 class="card-title h6 text-info font-weight-bold mb-2">
                        <i class="bx bx-code-alt"></i> JSON Package Manifest & Settings State
                    </h5>
                    <p class="text-muted small mb-3">
                        Export your Today Homepage components, templates, and automation state as a clean JSON package. Load it into the plugin settings note anytime.
                    </p>

                    ${importError ? `<div class="alert alert-danger small mb-3">${importError}</div>` : ''}
                    ${importSuccess ? `<div class="alert alert-success small mb-3">${importSuccess}</div>` : ''}

                    <div class="mb-3">
                        <label class="form-label font-weight-bold small">Package Configuration JSON</label>
                        <textarea class="form-html-code form-control font-monospace small bg-dark text-light" rows="12" style="font-family: monospace; font-size: 13px;">${jsonString}</textarea>
                    </div>

                    <div class="d-flex align-items-center gap-2">
                        <button type="button" class="btn btn-sm btn-primary copy-json-btn">
                            <i class="bx bx-copy"></i> Copy JSON to Clipboard
                        </button>
                        <button type="button" class="btn btn-sm btn-success save-json-btn">
                            <i class="bx bx-save"></i> Save Settings Package
                        </button>
                    </div>
                </div>
            </div>
        `;

        const textarea = section.querySelector('textarea') as HTMLTextAreaElement;
        const copyBtn = section.querySelector('.copy-json-btn') as HTMLButtonElement;
        const saveBtn = section.querySelector('.save-json-btn') as HTMLButtonElement;

        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(textarea.value);
                importSuccess = 'JSON Package copied to clipboard!';
                importError = '';
                render();
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                try {
                    const parsed = JSON.parse(textarea.value);
                    if (parsed && parsed.todayLayout) {
                        if (onSaveSettings) {
                            onSaveSettings(textarea.value);
                        }
                        importSuccess = 'Settings package successfully saved!';
                        importError = '';
                    } else {
                        importError = 'Invalid JSON: missing todayLayout property';
                        importSuccess = '';
                    }
                } catch (e: any) {
                    importError = `JSON parse error: ${e.message}`;
                    importSuccess = '';
                }
                render();
            });
        }

        el.appendChild(section);
    }

    render();
}
