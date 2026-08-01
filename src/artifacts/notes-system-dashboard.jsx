/**
 * Notes System Dashboard Entrypoint (JSX Render Note)
 * Combines Today Homepage, Template Studio, Relationship Manager, If/Then Automation Rules, and Package Settings.
 */

import { TemplateEngine } from '../engine/templateEngine.js';
import { RelationshipEngine } from '../engine/relationshipEngine.js';
import { IfThenRuleEngine } from '../engine/ifThenRuleEngine.js';
import { TodayEngine } from '../engine/todayEngine.js';
import { NoteCreationEngine } from '../engine/noteCreationEngine.js';
import { SettingsEngine } from '../engine/settingsEngine.js';
import { loadAutomationSettings } from '../engine/packagePersistence.js';
import { renderTodayHomepage } from '../components/TodayHomepage.js';
import { renderTemplateStudio } from '../components/TemplateStudio.js';
import { renderRelationshipManager } from '../components/RelationshipManager.js';
import { renderIfThenRuleTree } from '../components/IfThenRuleTree.js';
import { renderSettingsStudio } from '../components/SettingsStudio.js';
import { showQuickCaptureModal } from '../components/QuickCaptureModal.js';

export function initNotesSystemDashboard(containerEl) {
    const templateEngine = new TemplateEngine();
    const relationshipEngine = new RelationshipEngine(templateEngine);
    const ifThenRuleEngine = new IfThenRuleEngine();
    const todayEngine = new TodayEngine();
    const settingsEngine = new SettingsEngine();
    const noteCreationEngine = new NoteCreationEngine(templateEngine, relationshipEngine, ifThenRuleEngine, settingsEngine);

    let activeTab = 'today';

    function renderMain() {
        containerEl.innerHTML = '';

        // Container shell. Colours and spacing come from notes-system.css so the
        // page tracks whichever Trilium theme is active.
        const shell = document.createElement('div');
        shell.className = 'notes-system-shell';

        // Top navigation: an underlined tab strip, the way Trilium marks a selected
        // view, rather than filled pills.
        const nav = document.createElement('div');
        nav.className = 'ns-tabs';
        nav.setAttribute('role', 'tablist');

        const tabs = [
            { id: 'today', label: 'Today', icon: 'home-alt' },
            { id: 'templates', label: 'Template Studio', icon: 'layer' },
            { id: 'settings', label: 'Settings', icon: 'slider-alt' },
        ];

        for (const t of tabs) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `ns-tab ${activeTab === t.id ? 'active' : ''}`;
            btn.setAttribute('role', 'tab');
            btn.setAttribute('aria-selected', String(activeTab === t.id));
            btn.innerHTML = `<span class="bx bx-${t.icon}"></span> ${t.label}`;
            btn.addEventListener('click', () => {
                activeTab = t.id;
                renderMain();
            });
            nav.appendChild(btn);
        }

        shell.appendChild(nav);

        // View Content Area
        const contentArea = document.createElement('div');
        contentArea.className = 'notes-system-content';

        if (activeTab === 'today') {
            renderTodayHomepage(contentArea, todayEngine, templateEngine, (templateId) => {
                showQuickCaptureModal(templateId, templateEngine, noteCreationEngine, (plan) => {
                    const cloneTarget = plan.autoCloneContainers.length
                        ? plan.autoCloneContainers.join(', ')
                        : (plan.journalClone ? "Today's Journal" : 'None');
                    alert(`🎉 Created ${templateId.toUpperCase()} Note!\n\nFormatted Title: ${plan.formattedTitle}\nLabels: ${plan.labelsToCreate.map(l => '#' + l.name + '=' + l.value).join(', ')}\nAuto-Clone Target: ${cloneTarget}`);
                });
            });
        } else if (activeTab === 'templates') {
            renderTemplateStudio(contentArea, templateEngine, ifThenRuleEngine, () => {
                console.log('Templates & Automations updated!');
            });

        } else if (activeTab === 'relationships') {
            renderRelationshipManager(contentArea, templateEngine, relationshipEngine, () => {
                console.log('Relationships updated!');
            });
        } else if (activeTab === 'ifThen') {
            renderIfThenRuleTree(contentArea, ifThenRuleEngine, () => {
                console.log('If/Then rules updated!');
            });
        } else if (activeTab === 'settings') {
            renderSettingsStudio(contentArea, todayEngine, templateEngine, relationshipEngine, ifThenRuleEngine, settingsEngine, (yamlSpec) => {
                console.log('YAML settings package saved:', yamlSpec);
            });
        }


        shell.appendChild(contentArea);
        containerEl.appendChild(shell);
    }

    renderMain();

    // Automation settings load from the package's manifest note asynchronously
    // (or resolve immediately outside Trilium); re-render once they land so the
    // Settings tab and NoteCreationEngine reflect the saved values rather than
    // the defaults they were constructed with.
    loadAutomationSettings().then((loaded) => {
        for (const key of Object.keys(loaded)) {
            settingsEngine.set(key, loaded[key]);
        }
        renderMain();
    });
}

// Auto-initialize inside Trilium render note or browser window
if (typeof api !== 'undefined' || typeof window !== 'undefined') {
    const init = () => {
        const container = (typeof api !== 'undefined' && api.$container && (api.$container[0] || api.$container))
            || document.querySelector('.notes-system-root')
            || document.body;
        if (container) {
            initNotesSystemDashboard(container);
        }
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
