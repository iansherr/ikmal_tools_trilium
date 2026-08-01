/**
 * Relationship Manager Component: Visual tree, explanatory help banner, and matrix for template relationships.
 * Styled natively with Trilium Boxicons and design tokens.
 */

import { TemplateEngine } from '../engine/templateEngine.js';
import { RelationshipEngine } from '../engine/relationshipEngine.js';
import { TemplateRelationshipDef } from '../engine/types.js';

export function renderRelationshipManager(
    container: HTMLElement,
    templateEngine: TemplateEngine,
    relationshipEngine: RelationshipEngine,
    onChange: () => void
): void {
    function refresh() {
        container.innerHTML = '';

        const card = document.createElement('div');
        card.className = 'card border shadow-sm';
        card.style.backgroundColor = 'var(--sub-background-color, transparent)';
        card.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';

        const header = document.createElement('div');
        header.className = 'card-header bg-transparent border-bottom d-flex align-items-center justify-content-between p-3';
        header.innerHTML = `
            <div class="d-flex align-items-center gap-2">
                <i class="bx bx-git-repo-forked h5 m-0 text-info"></i>
                <h5 class="m-0 h6 font-weight-bold">Template Relationship Tree & Dependency Matrix</h5>
            </div>
            <button type="button" class="btn btn-sm btn-primary add-rel-btn d-flex align-items-center gap-1">
                <i class="bx bx-plus"></i> Add Relationship Rule
            </button>
        `;

        const addRelBtn = header.querySelector('.add-rel-btn') as HTMLButtonElement;
        addRelBtn.addEventListener('click', () => showAddRelationshipModal());

        const body = document.createElement('div');
        body.className = 'card-body p-4 d-flex flex-column gap-4';

        // Explanatory Help Banner: Relationships vs If/Then Rules
        const helpBanner = document.createElement('div');
        helpBanner.className = 'p-3 rounded border bg-body';
        helpBanner.style.backgroundColor = 'var(--main-background-color, transparent)';
        helpBanner.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';
        helpBanner.innerHTML = `
            <div class="d-flex align-items-center justify-content-between mb-2">
                <h6 class="m-0 font-weight-bold text-info small d-flex align-items-center gap-1.5">
                    <i class="bx bx-help-circle"></i> Understanding Relationships vs. If/Then Automation
                </h6>
            </div>
            <div class="row g-3 small">
                <div class="col-md-6">
                    <div class="p-2.5 rounded border" style="background-color: var(--sub-background-color, transparent);">
                        <strong class="text-primary d-flex align-items-center gap-1 mb-1">
                            <i class="bx bx-git-repo-forked"></i> Relationships (Structural Rules)
                        </strong>
                        <p class="text-muted m-0">
                            Defines how notes connect and inherit context. Example: A <strong>Project Task</strong> links to a <strong>Project Hub</strong> via <code>~project</code>, automatically cloning under the Hub and inheriting its topic tags.
                        </p>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="p-2.5 rounded border" style="background-color: var(--sub-background-color, transparent);">
                        <strong class="text-warning d-flex align-items-center gap-1 mb-1">
                            <i class="bx bx-git-commit"></i> If/Then Rules (Event Automations)
                        </strong>
                        <p class="text-muted m-0">
                            Defines what happens when actions occur. Example: <em>IF</em> a task is marked High Priority, <em>THEN</em> automatically assign the <code>#dueSoon</code> label and run a repair script.
                        </p>
                    </div>
                </div>
            </div>
        `;
        body.appendChild(helpBanner);

        const templates = templateEngine.getAllTemplates();

        // 1. Visual Relationship Tree Flow
        const treeSection = document.createElement('div');
        treeSection.className = 'p-3 rounded border';
        treeSection.style.backgroundColor = 'var(--main-background-color, transparent)';
        treeSection.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';
        treeSection.innerHTML = '<h6 class="text-primary font-weight-bold mb-3 small d-flex align-items-center gap-1"><i class="bx bx-sitemap"></i> Live Relationship Graph</h6>';

        const graphContainer = document.createElement('div');
        graphContainer.className = 'd-flex flex-wrap gap-3';

        for (const tpl of templates) {
            if (tpl.relationships.length === 0) continue;

            const nodeCard = document.createElement('div');
            nodeCard.className = 'p-3 rounded border flex-grow-1';
            nodeCard.style.minWidth = '280px';
            nodeCard.style.backgroundColor = 'var(--sub-background-color, transparent)';
            nodeCard.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';

            const title = document.createElement('h6');
            title.className = 'font-weight-bold mb-2 text-warning small d-flex align-items-center gap-1';
            title.innerHTML = `<i class="bx bx-${tpl.icon}"></i> ${tpl.title}`;
            nodeCard.appendChild(title);

            const list = document.createElement('ul');
            list.className = 'list-unstyled m-0 small';

            for (const rel of tpl.relationships) {
                const target = templateEngine.getTemplate(rel.targetTemplateId);
                const item = document.createElement('li');
                item.className = 'd-flex align-items-center justify-content-between py-1.5 border-bottom';
                item.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.1))';
                item.innerHTML = `
                    <span>
                        <i class="bx bx-right-arrow-alt text-success"></i>
                        <code>~${rel.relationName}</code> &rarr; <strong>${target ? target.title : rel.targetTemplateName}</strong>
                    </span>
                    <span class="badge ${rel.autoCloneToParent ? 'bg-success bg-opacity-20 text-success' : 'bg-secondary bg-opacity-20 text-muted'}">
                        ${rel.autoCloneToParent ? 'Auto-clone' : 'Link only'}
                    </span>
                `;
                list.appendChild(item);
            }

            nodeCard.appendChild(list);
            graphContainer.appendChild(nodeCard);
        }

        treeSection.appendChild(graphContainer);
        body.appendChild(treeSection);

        // 2. Full Relationship Table Matrix
        const tableSection = document.createElement('div');
        tableSection.innerHTML = '<h6 class="font-weight-bold mb-2 small d-flex align-items-center gap-1"><i class="bx bx-table"></i> Defined Relationships Matrix</h6>';

        const table = document.createElement('table');
        table.className = 'table table-hover table-sm align-middle small m-0 border';
        table.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';
        table.innerHTML = `
            <thead>
                <tr class="text-muted border-bottom">
                    <th>Source Template</th>
                    <th>Relation Name</th>
                    <th>Target Template</th>
                    <th>Auto-Clone</th>
                    <th>Inherit Topics</th>
                </tr>
            </thead>
            <tbody>
                ${templates.flatMap(tpl => tpl.relationships.map(rel => ({ tpl, rel }))).map(({ tpl, rel }) => `
                    <tr>
                        <td><i class="bx bx-${tpl.icon}"></i> <strong>${tpl.title}</strong></td>
                        <td><code>~${rel.relationName}</code></td>
                        <td><strong>${rel.targetTemplateName}</strong></td>
                        <td>
                            <span class="badge ${rel.autoCloneToParent ? 'bg-success bg-opacity-20 text-success' : 'bg-secondary bg-opacity-20 text-muted'}">
                                ${rel.autoCloneToParent ? 'Yes' : 'No'}
                            </span>
                        </td>
                        <td>
                            <span class="badge ${rel.inheritTopics ? 'bg-info bg-opacity-20 text-info' : 'bg-secondary bg-opacity-20 text-muted'}">
                                ${rel.inheritTopics ? 'Yes' : 'No'}
                            </span>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;

        tableSection.appendChild(table);
        body.appendChild(tableSection);

        card.append(header, body);
        container.appendChild(card);
    }

    function showAddRelationshipModal() {
        const templates = templateEngine.getAllTemplates();
        const sourceId = prompt(`Choose Source Template ID:\n${templates.map(t => t.id).join(', ')}`);
        if (!sourceId) return;
        const relName = prompt('Enter relation name (e.g. project, client, organization):');
        if (!relName) return;
        const targetId = prompt(`Choose Target Template ID:\n${templates.map(t => t.id).join(', ')}`);
        if (!targetId) return;

        const targetTpl = templateEngine.getTemplate(targetId);
        templateEngine.addRelationship(sourceId, {
            id: `rel_${sourceId}_${targetId}_${Date.now()}`,
            name: `${relName} link`,
            relationName: relName,
            targetTemplateId: targetId,
            targetTemplateName: targetTpl ? targetTpl.title : targetId,
            isMulti: false,
            autoCloneToParent: true,
            inheritTopics: true,
            direction: 'parent',
        });
        onChange();
        refresh();
    }

    refresh();
}
