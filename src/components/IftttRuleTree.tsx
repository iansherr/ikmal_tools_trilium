/**
 * IFTTT Rule Tree Component: Interactive IF-THIS-THEN-THAT automation rule visualizer & editor.
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
        header.className = 'card-header bg-transparent border-bottom d-flex align-items-center justify-content-between p-3';
        header.innerHTML = `
            <div class="d-flex align-items-center gap-2">
                <i class="bx bx-git-commit h5 m-0 text-warning"></i>
                <h5 class="m-0 h6 font-weight-bold">IF-THIS-THEN-THAT (IFTTT) Automation Trees</h5>
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
        helpBanner.className = 'p-3 rounded border bg-body';
        helpBanner.style.backgroundColor = 'var(--main-background-color, transparent)';
        helpBanner.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';
        helpBanner.innerHTML = `
            <div class="d-flex align-items-center justify-content-between mb-2">
                <h6 class="m-0 font-weight-bold text-info small d-flex align-items-center gap-1.5">
                    <i class="bx bx-bolt-circle"></i> Quick Preset Automations
                </h6>
            </div>
            <div class="d-flex flex-wrap gap-2">
                <button type="button" class="btn btn-xs btn-outline-warning preset-chip-1 d-flex align-items-center gap-1">
                    <i class="bx bx-plus"></i> High Priority Task &rarr; Due Soon Label
                </button>
                <button type="button" class="btn btn-xs btn-outline-info preset-chip-2 d-flex align-items-center gap-1">
                    <i class="bx bx-plus"></i> Story Draft &rarr; Auto-Create Edit Round 1
                </button>
                <button type="button" class="btn btn-xs btn-outline-success preset-chip-3 d-flex align-items-center gap-1">
                    <i class="bx bx-plus"></i> Meeting Created &rarr; Clone to Journal
                </button>
            </div>
        `;

        const chip1 = helpBanner.querySelector('.preset-chip-1') as HTMLButtonElement;
        chip1.addEventListener('click', () => {
            iftttEngine.registerRule({
                id: `preset_dueSoon_${Date.now()}`,
                name: 'High Priority Task -> Due Soon',
                description: 'Automatically assigns #dueSoon tag when a task priority is set to high.',
                enabled: true,
                isBuiltin: false,
                trigger: { type: 'onNoteCreated' },
                conditions: [{ field: 'priority', operator: 'equals', value: 'high' }],
                actions: [{ type: 'setLabel', params: { labelName: 'dueSoon', labelValue: 'true' } }],
            });
            onRuleChange();
            refresh();
        });

        const chip2 = helpBanner.querySelector('.preset-chip-2') as HTMLButtonElement;
        chip2.addEventListener('click', () => {
            iftttEngine.registerRule({
                id: `preset_editRound_${Date.now()}`,
                name: 'Story Draft -> Edit Round 1',
                description: 'Creates a child Edit Round note when a Story Draft is initialized.',
                enabled: true,
                isBuiltin: false,
                trigger: { type: 'onNoteCreated' },
                conditions: [{ field: 'templateId', operator: 'equals', value: 'story' }],
                actions: [{ type: 'createChildNote', params: { title: 'Round 1 Edit', templateId: 'edit' } }],
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
                trigger: { type: 'onNoteCreated' },
                conditions: [{ field: 'templateId', operator: 'equals', value: 'meeting' }],
                actions: [{ type: 'cloneToJournal', params: {} }],
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

            titleBox.append(toggle, name, badge);
            ruleHeader.appendChild(titleBox);

            if (!rule.isBuiltin) {
                const delBtn = document.createElement('button');
                delBtn.className = 'btn btn-xs btn-outline-danger d-flex align-items-center gap-1';
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
            treeRow.className = 'row g-2 align-items-center text-center small';

            // 1. IF (Trigger & Conditions)
            const ifCol = document.createElement('div');
            ifCol.className = 'col-md-5 p-2.5 rounded border';
            ifCol.style.backgroundColor = 'rgba(231, 76, 60, 0.05)';
            ifCol.style.borderColor = 'rgba(231, 76, 60, 0.2)';
            ifCol.innerHTML = `
                <div class="font-weight-bold text-danger mb-1"><i class="bx bx-play-circle"></i> WHEN / IF</div>
                <div>Trigger: <code>${rule.trigger.type}</code></div>
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
            thenCol.className = 'col-md-5 p-2.5 rounded border';
            thenCol.style.backgroundColor = 'rgba(46, 204, 113, 0.05)';
            thenCol.style.borderColor = 'rgba(46, 204, 113, 0.2)';
            thenCol.innerHTML = `
                <div class="font-weight-bold text-success mb-1"><i class="bx bx-check-circle"></i> THEN</div>
                <div>${rule.actions.map(a => `Action: <strong>${a.type}</strong> (${JSON.stringify(a.params)})`).join('<br>')}</div>
            `;

            treeRow.append(ifCol, arrowCol, thenCol);
            ruleBody.appendChild(treeRow);

            ruleCard.append(ruleHeader, ruleBody);
            rulesContainer.appendChild(ruleCard);
        }

        body.appendChild(rulesContainer);
        card.append(header, body);
        container.appendChild(card);
    }

    function showAddRuleModal() {
        const name = prompt('Enter automation rule name (e.g. Auto-Assign Reviewer):');
        if (!name) return;
        const triggerType = (prompt('Enter trigger type (onNoteCreated, onAttributeChanged, onManualAction):') || 'onNoteCreated') as TriggerType;
        const id = `rule_${Date.now()}`;
        iftttEngine.registerRule({
            id,
            name,
            description: 'Custom IFTTT automation rule.',
            enabled: true,
            isBuiltin: false,
            trigger: { type: triggerType },
            conditions: [],
            actions: [
                { type: 'setLabel', params: { labelName: 'customStatus', labelValue: 'active' } },
            ],
        });
        onRuleChange();
        refresh();
    }

    refresh();
}
