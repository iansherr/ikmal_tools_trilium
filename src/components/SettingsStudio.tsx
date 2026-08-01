/**
 * Settings Studio Component: Package preferences, global toggles, and YAML Specification Manager.
 * Styled natively with Trilium Boxicons and design tokens.
 */

import { TodayEngine } from '../engine/todayEngine.js';
import { TemplateEngine } from '../engine/templateEngine.js';
import { RelationshipEngine } from '../engine/relationshipEngine.js';
import { IftttEngine } from '../engine/iftttEngine.js';
import { dumpYamlSpec, parseAndApplyYamlSpec } from '../engine/yamlSpec.js';

export function renderSettingsStudio(
    container: HTMLElement,
    todayEngine: TodayEngine,
    templateEngine: TemplateEngine,
    relationshipEngine: RelationshipEngine,
    iftttEngine: IftttEngine,
    onSaveSettings?: (yamlSpec: string) => void
): void {
    let activeSection: 'packagePreferences' | 'yamlPackage' = 'packagePreferences';
    let importError = '';
    let importSuccess = '';

    function render() {
        container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'settings-studio-container d-flex flex-column gap-4';

        // 1. Header Banner
        const header = document.createElement('div');
        header.className = 'p-3.5 rounded border d-flex align-items-center justify-content-between shadow-sm';
        header.style.backgroundColor = 'var(--sub-background-color, transparent)';
        header.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';

        header.innerHTML = `
            <div class="d-flex align-items-center gap-3">
                <i class="bx bx-slider-alt h3 m-0 text-primary"></i>
                <div>
                    <h2 class="h5 m-0 font-weight-bold d-flex align-items-center gap-2">
                        Package Settings & Specification
                        <span class="badge bg-secondary font-weight-normal small">v1.0.0</span>
                    </h2>
                    <p class="text-muted small m-0 mt-1">
                        Global automation preferences, relationship toggles, and YAML package specification import/export.
                    </p>
                </div>
            </div>
        `;
        wrapper.appendChild(header);

        // 2. Sub-Navigation Tabs
        const subNav = document.createElement('ul');
        subNav.className = 'nav nav-pills border-bottom pb-2 mb-2';

        const sections = [
            { id: 'packagePreferences', label: 'Package Preferences', icon: 'slider' },
            { id: 'yamlPackage', label: 'YAML Specification', icon: 'file-coding' },
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

        if (activeSection === 'packagePreferences') {
            renderPackagePreferencesSection(contentArea);
        } else if (activeSection === 'yamlPackage') {
            renderYamlPackageSection(contentArea);
        }

        wrapper.appendChild(contentArea);
        container.appendChild(wrapper);
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
                        <i class="bx bx-file-coding"></i> Complete System Package Specification (YAML)
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
                const res = parseAndApplyYamlSpec(textarea.value, todayEngine, templateEngine, iftttEngine);
                if (res.success) {
                    importSuccess = res.message;
                    importError = '';
                    if (onSaveSettings) onSaveSettings(textarea.value);
                } else {
                    importError = res.message;
                    importSuccess = '';
                }
                render();
            });
        }

        el.appendChild(section);
    }

    render();
}
