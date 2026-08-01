/**
 * Relationship Manager Component: Visual tree & matrix for managing relationships between templates.
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
        card.className = 'card shadow-sm border-0';
        card.style.backgroundColor = 'var(--sub-background-color, #252538)';

        const header = document.createElement('div');
        header.className = 'card-header bg-transparent border-bottom d-flex align-items-center justify-content-between';
        header.innerHTML = `
            <h5 class="m-0 d-flex align-items-center gap-2">
                <i class="bx bx-git-repo-forked text-info"></i>
                <span>Template Relationship Tree & Dependency Matrix</span>
            </h5>
        `;

        const addRelBtn = document.createElement('button');
        addRelBtn.type = 'button';
        addRelBtn.className = 'btn btn-sm btn-primary';
        addRelBtn.textContent = '+ Add Relationship Rule';
        addRelBtn.addEventListener('click', () => showAddRelationshipModal());
        header.appendChild(addRelBtn);

        const body = document.createElement('div');
        body.className = 'card-body';

        const templates = templateEngine.getAllTemplates();

        // 1. Visual Relationship Tree Flow
        const treeSection = document.createElement('div');
        treeSection.className = 'mb-4 p-3 rounded';
        treeSection.style.backgroundColor = 'var(--main-background-color, #1e1e2e)';
        treeSection.innerHTML = '<h6 class="text-primary font-weight-bold mb-3"><i class="bx bx-sitemap"></i> Live Relationship Graph</h6>';

        const graphContainer = document.createElement('div');
        graphContainer.className = 'd-flex flex-wrap gap-3';

        for (const tpl of templates) {
            if (tpl.relationships.length === 0) continue;

            const nodeCard = document.createElement('div');
            nodeCard.className = 'p-3 rounded border border-secondary flex-grow-1';
            nodeCard.style.minWidth = '280px';
            nodeCard.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';

            const title = document.createElement('h6');
            title.className = 'font-weight-bold mb-2 text-warning';
            title.innerHTML = `<i class="bx bx-${tpl.icon}"></i> ${tpl.title}`;
            nodeCard.appendChild(title);

            const list = document.createElement('ul');
            list.className = 'list-unstyled m-0 small';

            for (const rel of tpl.relationships) {
                const target = templateEngine.getTemplate(rel.targetTemplateId);
                const item = document.createElement('li');
                item.className = 'd-flex align-items-center justify-content-between py-1 border-bottom border-dark';
                item.innerHTML = `
                    <span>
                        <i class="bx bx-right-arrow-alt text-success"></i>
                        <code>~${rel.relationName}</code> &rarr; <strong>${target ? target.title : rel.targetTemplateName}</strong>
                    </span>
                    <span class="badge ${rel.autoCloneToParent ? 'badge-success' : 'badge-secondary'}">
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
        tableSection.innerHTML = '<h6 class="font-weight-bold mb-2"><i class="bx bx-table"></i> Defined Relationships</h6>';

        const table = document.createElement('table');
        table.className = 'table table-hover table-dark table-sm align-middle small m-0';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Source Template</th>
                    <th>Relation Name</th>
                    <th>Target Template</th>
                    <th>Auto-Clone to Target</th>
                    <th>Inherit Topics</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${templates.flatMap(tpl => tpl.relationships.map(rel => ({ tpl, rel }))).map(({ tpl, rel }) => `
                    <tr>
                        <td><i class="bx bx-${tpl.icon}"></i> <strong>${tpl.title}</strong></td>
                        <td><code>~${rel.relationName}</code></td>
                        <td><strong>${rel.targetTemplateName}</strong></td>
                        <td>
                            <span class="badge ${rel.autoCloneToParent ? 'badge-success' : 'badge-secondary'}">
                                ${rel.autoCloneToParent ? 'Yes' : 'No'}
                            </span>
                        </td>
                        <td>
                            <span class="badge ${rel.inheritTopics ? 'badge-info' : 'badge-secondary'}">
                                ${rel.inheritTopics ? 'Yes' : 'No'}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-xs btn-outline-danger" data-tpl="${tpl.id}" data-rel="${rel.id}">Delete</button>
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
