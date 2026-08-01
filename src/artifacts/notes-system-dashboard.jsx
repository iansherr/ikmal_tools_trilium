/**
 * Notes System Dashboard Entrypoint (JSX Render Note)
 * Combines Today Homepage, Template Studio, Relationship Manager, and IFTTT Automation Tree.
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

export function initNotesSystemDashboard(containerEl) {
    const templateEngine = new TemplateEngine();
    const relationshipEngine = new RelationshipEngine(templateEngine);
    const iftttEngine = new IftttEngine();
    const todayEngine = new TodayEngine();
    const noteCreationEngine = new NoteCreationEngine(templateEngine, relationshipEngine, iftttEngine);

    let activeTab: 'today' | 'templates' | 'relationships' | 'ifttt' | 'settings' = 'today';

    function renderMain() {
        containerEl.innerHTML = '';

        // Container Shell
        const shell = document.createElement('div');
        shell.className = 'notes-system-shell p-4';
        shell.style.backgroundColor = 'var(--main-background-color, #181825)';
        shell.style.color = 'var(--main-text-color, #cdd6f4)';
        shell.style.minHeight = '100vh';

        // Top Navigation Bar
        const nav = document.createElement('ul');
        nav.className = 'nav nav-pills mb-4 border-bottom pb-3';

        const tabs = [
            { id: 'today', label: '⚡ Today Homepage', icon: 'home' },
            { id: 'templates', label: '📐 Template Studio', icon: 'layer' },
            { id: 'relationships', label: '🔗 Relationship Tree', icon: 'git-repo-forked' },
            { id: 'ifttt', label: '🤖 IFTTT Automation Rules', icon: 'git-commit' },
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
                activeTab = t.id as any;
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
                const title = prompt(`Create new ${templateId}:`);
                if (!title) return;
                const plan = noteCreationEngine.planNoteCreation({ type: templateId, title });
                alert(`Note creation planned!\nTitle: ${plan.formattedTitle}\nTemplate: ${plan.templateId}\nExecuted IFTTT Rules: ${plan.executedIftttRules.map(r => r.ruleName).join(', ') || 'None'}`);
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
        }

        shell.appendChild(contentArea);
        containerEl.appendChild(shell);
    }

    renderMain();
}
