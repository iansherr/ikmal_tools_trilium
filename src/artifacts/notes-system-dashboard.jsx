/**
 * Notes System Dashboard Entrypoint (JSX Render Note)
 * Combines Today Homepage, Template Studio, Relationship Manager, IFTTT Automation Tree, and Package Settings.
 */

import { TemplateEngine } from '../engine/templateEngine.js';
import { RelationshipEngine } from '../engine/relationshipEngine.js';
import { IftttEngine } from '../engine/iftttEngine.js';
import { TodayEngine } from '../engine/todayEngine.js';
import { NoteCreationEngine } from '../engine/noteCreationEngine.js';
import { renderTodayHomepage } from '../components/TodayHomepage.js';
import { renderTemplateStudio } from '../components/TemplateStudio.js';
import { renderRelationshipManager } from '../components/RelationshipManager.js';
import { renderIftttRuleTree } from '../components/IftttRuleTree.js';
import { renderSettingsStudio } from '../components/SettingsStudio.js';
import { showQuickCaptureModal } from '../components/QuickCaptureModal.js';

export function initNotesSystemDashboard(containerEl) {
    const templateEngine = new TemplateEngine();
    const relationshipEngine = new RelationshipEngine(templateEngine);
    const iftttEngine = new IftttEngine();
    const todayEngine = new TodayEngine();
    const noteCreationEngine = new NoteCreationEngine(templateEngine, relationshipEngine, iftttEngine);

    let activeTab = 'today';

    function renderMain() {
        containerEl.innerHTML = '';

        // Container Shell
        const shell = document.createElement('div');
        shell.className = 'notes-system-shell p-4';
        shell.style.backgroundColor = 'var(--main-background-color, transparent)';
        shell.style.color = 'var(--main-text-color, inherit)';

        shell.style.minHeight = '100vh';

        // Top Navigation Bar
        const nav = document.createElement('ul');
        nav.className = 'nav nav-pills mb-4 border-bottom pb-3';

        const tabs = [
            { id: 'today', label: 'Today Homepage', icon: 'home-alt' },
            { id: 'templates', label: 'Template Studio', icon: 'layer' },
            { id: 'ifttt', label: 'IFTTT Automation', icon: 'git-commit' },
            { id: 'settings', label: 'Settings & Spec', icon: 'slider-alt' },
        ];



        for (const t of tabs) {
            const li = document.createElement('li');
            li.className = 'nav-item';

            const a = document.createElement('a');
            a.className = `nav-link ${activeTab === t.id ? 'active' : ''} d-flex align-items-center gap-2 cursor-pointer`;
            a.style.cursor = 'pointer';
            a.style.borderRadius = '6px';
            a.innerHTML = `<i class="bx bx-${t.icon}"></i> ${t.label}`;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                activeTab = t.id;
                renderMain();
            });

            li.appendChild(a);
            nav.appendChild(li);
        }

        shell.appendChild(nav);

        // View Content Area
        const contentArea = document.createElement('div');
        contentArea.className = 'notes-system-content';

        if (activeTab === 'today') {
            renderTodayHomepage(contentArea, todayEngine, templateEngine, (templateId) => {
                showQuickCaptureModal(templateId, templateEngine, noteCreationEngine, (plan) => {
                    alert(`🎉 Created ${templateId.toUpperCase()} Note!\n\nFormatted Title: ${plan.formattedTitle}\nLabels: ${plan.labelsToCreate.map(l => '#' + l.name + '=' + l.value).join(', ')}\nAuto-Clone Target: ${plan.autoCloneContainers.join(', ') || 'Journal'}`);
                });
            });
        } else if (activeTab === 'templates') {
            renderTemplateStudio(contentArea, templateEngine, () => {
                console.log('Templates updated!');
            });
        } else if (activeTab === 'relationships') {
            renderRelationshipManager(contentArea, templateEngine, relationshipEngine, () => {
                console.log('Relationships updated!');
            });
        } else if (activeTab === 'ifttt') {
            renderIftttRuleTree(contentArea, iftttEngine, () => {
                console.log('IFTTT rules updated!');
            });
        } else if (activeTab === 'settings') {
            renderSettingsStudio(contentArea, todayEngine, templateEngine, relationshipEngine, iftttEngine, (yamlSpec) => {
                console.log('YAML settings package saved:', yamlSpec);
            });
        }


        shell.appendChild(contentArea);
        containerEl.appendChild(shell);
    }

    renderMain();
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
