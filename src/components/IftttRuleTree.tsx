/**
 * IFTTT Rule Tree Component: Interactive IF-THIS-THEN-THAT automation rule visualizer & editor.
 * Supports Category-wide rules vs Template-specific rules vs Global rules.
 * Styled natively with Trilium Boxicons and design tokens.
 */

import { IftttEngine } from '../engine/iftttEngine.js';
import { IftttRuleDef, IftttCondition, IftttAction, TriggerType } from '../engine/types.js';

export function renderIftttRuleTree(
    container: HTMLElement,
    iftttEngine: IftttEngine,
    onRuleChange: () => void
): void {
    function refresh() {
        container.innerHTML = '';

        const card = document.createElement('div');
        card.className = 'card border shadow-sm';
        card.style.backgroundColor = 'var(--sub-background-color, transparent)';
        card.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';

        const header = document.createElement('div');
        header.className = 'card-header bg-transparent border-bottom d-flex align-items-center justify-content-between p-3.5';
        header.innerHTML = `
            <div class="d-flex align-items-center gap-2">
                <i class="bx bx-git-commit h5 m-0 text-warning"></i>
                <div>
                    <h5 class="m-0 h6 font-weight-bold">IF-THIS-THEN-THAT (IFTTT) Automation Trees</h5>
                    <p class="text-muted small m-0 mt-0.5">Automate rules across Category Scopes (Work, Drafts, People) or specific Templates.</p>
                </div>
            </div>
            <button type="button" class="btn btn-sm btn-success add-rule-btn d-flex align-items-center gap-1">
                <i class="bx bx-plus"></i> New Automation Rule
            </button>
        `;

        const addRuleBtn = header.querySelector('.add-rule-btn') as HTMLButtonElement;
        addRuleBtn.addEventListener('click', () => showAddRuleModal());

        const body = document.createElement('div');
        body.className = 'card-body p-4 d-flex flex-column gap-4';

        // Explanatory Help & Quick Preset Chips
        const helpBanner = document.createElement('div');
        helpBanner.className = 'p-3.5 rounded border bg-body';
        helpBanner.style.backgroundColor = 'var(--main-background-color, transparent)';
        helpBanner.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';
        helpBanner.innerHTML = `
            <div class="d-flex align-items-center justify-content-between mb-2">
                <h6 class="m-0 font-weight-bold text-info small d-flex align-items-center gap-1.5">
                    <i class="bx bx-bolt-circle"></i> Quick Preset Automations (Category-Wide & Template-Specific)
                </h6>
            </div>
            <div class="d-flex flex-wrap gap-2">
                <button type="button" class="btn btn-sm btn-outline-warning preset-chip-1 d-flex align-items-center gap-1">
                    <i class="bx bx-plus"></i> Category-Wide Drafts Rule: Auto-Sync Editorial Round
                </button>
                <button type="button" class="btn btn-sm btn-outline-info preset-chip-2 d-flex align-items-center gap-1">
                    <i class="bx bx-plus"></i> High Priority Task &rarr; Due Soon Label
                </button>
                <button type="button" class="btn btn-sm btn-outline-success preset-chip-3 d-flex align-items-center gap-1">
                    <i class="bx bx-plus"></i> Meeting Created &rarr; Clone to Journal
                </button>
            </div>
        `;

        const chip1 = helpBanner.querySelector('.preset-chip-1') as HTMLButtonElement;
        chip1.addEventListener('click', () => {
            iftttEngine.registerRule({
                id: `preset_category_draft_${Date.now()}`,
                name: 'Category-Wide Draft Rule -> Sync Round',
                description: 'Triggers for ALL templates in the Drafts category (story, edit, emailDraft, scratch).',
                enabled: true,
                isBuiltin: false,
                trigger: { type: 'onNoteCreated', targetCategory: 'drafts' },
                conditions: [{ field: 'status', operator: 'equals', value: 'editing' }],
                actions: [{ type: 'setLabel', params: { labelName: 'round', labelValue: 'Round 1 Review' } }],
            });
            onRuleChange();
            refresh();
        });

        const chip2 = helpBanner.querySelector('.preset-chip-2') as HTMLButtonElement;
        chip2.addEventListener('click', () => {
            iftttEngine.registerRule({
                id: `preset_dueSoon_${Date.now()}`,
                name: 'High Priority Task -> Due Soon',
                description: 'Automatically assigns #dueSoon tag when a task priority is set to high.',
                enabled: true,
                isBuiltin: false,
                trigger: { type: 'onNoteCreated', targetCategory: 'work' },
                conditions: [{ field: 'priority', operator: 'equals', value: 'high' }],
                actions: [{ type: 'setLabel', params: { labelName: 'dueSoon', labelValue: 'true' } }],
            });
            onRuleChange();
            refresh();
        });

        const chip3 = helpBanner.querySelector('.preset-chip-3') as HTMLButtonElement;
        chip3.addEventListener('click', () => {
            iftttEngine.registerRule({
                id: `preset_journal_${Date.now()}`,
                name: 'Meeting Created -> Clone to Journal',
                description: 'Clones new meeting notes into today\'s Journal day note.',
                enabled: true,
                isBuiltin: false,
                trigger: { type: 'onNoteCreated', targetTemplateId: 'meeting' },
                conditions: [],
                actions: [{ type: 'cloneToContainer', params: { containerMarker: 'calendarRoot' } }],
            });
            onRuleChange();
            refresh();
        });

        body.appendChild(helpBanner);

        const rules = iftttEngine.getAllRules();

        const rulesContainer = document.createElement('div');
        rulesContainer.className = 'd-flex flex-column gap-3';

        for (const rule of rules) {
            const ruleCard = document.createElement('div');
            ruleCard.className = `card border ${rule.enabled ? 'border-success' : 'border-secondary'} shadow-sm`;
            ruleCard.style.backgroundColor = 'var(--main-background-color, transparent)';
            ruleCard.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';

            const ruleHeader = document.createElement('div');
            ruleHeader.className = 'card-header d-flex align-items-center justify-content-between bg-transparent p-3';

            const titleBox = document.createElement('div');
            titleBox.className = 'd-flex align-items-center gap-2';

            const toggle = document.createElement('input');
            toggle.type = 'checkbox';
            toggle.className = 'form-check-input cursor-pointer';
            toggle.checked = rule.enabled;
            toggle.addEventListener('change', () => {
                iftttEngine.toggleRule(rule.id, toggle.checked);
                onRuleChange();
                refresh();
            });

            const name = document.createElement('h6');
            name.className = 'm-0 font-weight-bold small';
            name.textContent = rule.name;

            const badge = document.createElement('span');
            badge.className = `badge ${rule.isBuiltin ? 'bg-secondary' : 'bg-info'} bg-opacity-20 text-muted`;
            badge.textContent = rule.isBuiltin ? 'Built-in' : 'Custom';

            const scopeBadge = document.createElement('span');
            scopeBadge.className = 'badge bg-primary bg-opacity-10 text-primary small';
            if (rule.trigger.targetCategory) {
                scopeBadge.textContent = `Category Scope: ${rule.trigger.targetCategory}`;
            } else if (rule.trigger.targetTemplateId) {
                scopeBadge.textContent = `Template Scope: ${rule.trigger.targetTemplateId}`;
            } else {
                scopeBadge.textContent = 'Global System Scope';
            }

            titleBox.append(toggle, name, badge, scopeBadge);
            ruleHeader.appendChild(titleBox);

            if (!rule.isBuiltin) {
                const delBtn = document.createElement('button');
                delBtn.className = 'btn btn-sm btn-outline-danger d-flex align-items-center gap-1';
                delBtn.innerHTML = '<i class="bx bx-trash"></i> Delete';
                delBtn.addEventListener('click', () => {
                    iftttEngine.deleteRule(rule.id);
                    onRuleChange();
                    refresh();
                });
                ruleHeader.appendChild(delBtn);
            }

            const ruleBody = document.createElement('div');
            ruleBody.className = 'card-body p-3';

            const desc = document.createElement('p');
            desc.className = 'text-muted small mb-3';
            desc.textContent = rule.description;
            ruleBody.appendChild(desc);

            // Trigger -> Condition -> Action Tree View
            const treeRow = document.createElement('div');
            treeRow.className = 'row g-3 align-items-center text-center small';

            // 1. IF (Trigger & Conditions)
            const ifCol = document.createElement('div');
            ifCol.className = 'col-md-5 p-3 rounded border';
            ifCol.style.backgroundColor = 'rgba(231, 76, 60, 0.05)';
            ifCol.style.borderColor = 'rgba(231, 76, 60, 0.2)';
            ifCol.innerHTML = `
                <div class="font-weight-bold text-danger mb-1"><i class="bx bx-play-circle"></i> WHEN / IF</div>
                <div>Trigger Event: <code>${rule.trigger.type}</code></div>
                ${rule.trigger.targetCategory ? `<div class="text-primary font-weight-bold mt-1">Applies to All Templates in '${rule.trigger.targetCategory}' Category</div>` : ''}
                ${rule.conditions.length > 0
                    ? `<div class="mt-1 text-muted">Conditions: ${rule.conditions.map(c => `<code>${c.field} ${c.operator} ${c.value}</code>`).join(' AND ')}</div>`
                    : '<div class="mt-1 text-muted">No additional conditions</div>'}
            `;

            // Arrow
            const arrowCol = document.createElement('div');
            arrowCol.className = 'col-md-2 font-weight-bold text-warning h4 m-0';
            arrowCol.innerHTML = '<i class="bx bx-right-arrow-alt"></i>';

            // 2. THEN (Actions)
            const thenCol = document.createElement('div');
            thenCol.className = 'col-md-5 p-3 rounded border';
            thenCol.style.backgroundColor = 'rgba(46, 204, 113, 0.05)';
            thenCol.style.borderColor = 'rgba(46, 204, 113, 0.2)';
            thenCol.innerHTML = `
                <div class="font-weight-bold text-success mb-1"><i class="bx bx-check-circle"></i> THEN</div>
                ${rule.actions.map(a => `
                    <div>Action: <code>${a.type}</code> (${Object.entries(a.params).map(([k, v]) => `${k}=${v}`).join(', ')})</div>
                `).join('')}
            `;

            treeRow.appendChild(ifCol);
            treeRow.appendChild(arrowCol);
            treeRow.appendChild(thenCol);
            ruleBody.appendChild(treeRow);

            ruleCard.appendChild(ruleHeader);
            ruleCard.appendChild(ruleBody);
            rulesContainer.appendChild(ruleCard);
        }

        body.appendChild(rulesContainer);
        card.appendChild(header);
        card.appendChild(body);
        container.appendChild(card);
    }

    function showAddRuleModal() {
        const name = prompt('Rule Name:');
        if (!name) return;
        const scopeType = prompt('Scope Type: (1) Category-Wide, (2) Template-Specific, or (3) Global System:', '1');
        
        let targetCategory: string | undefined = undefined;
        let targetTemplateId: string | undefined = undefined;

        if (scopeType === '1') {
            targetCategory = prompt('Category ID (work, drafts, people, system, custom):', 'work') || 'work';
        } else if (scopeType === '2') {
            targetTemplateId = prompt('Template ID (e.g. story, projectTask, meeting):', 'story') || 'story';
        }

        const attrName = prompt('Attribute name trigger (optional, e.g. status, priority):');

        iftttEngine.registerRule({
            id: `custom_rule_${Date.now()}`,
            name,
            description: `Custom automation rule for ${targetCategory ? `category '${targetCategory}'` : (targetTemplateId ? `template '${targetTemplateId}'` : 'global scope')}.`,
            enabled: true,
            isBuiltin: false,
            trigger: {
                type: attrName ? 'onAttributeChanged' : 'onNoteCreated',
                targetCategory,
                targetTemplateId,
                attributeName: attrName || undefined,
            },
            conditions: [],
            actions: [{ type: 'setLabel', params: { labelName: 'processed', labelValue: 'true' } }],
        });
        onRuleChange();
        refresh();
    }

    refresh();
}
