/**
 * IFTTT Rule Tree Component: Interactive IF-THIS-THEN-THAT automation rule visualizer & editor.
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
        card.className = 'card shadow-sm border-0';
        card.style.backgroundColor = 'var(--sub-background-color, #252538)';

        const header = document.createElement('div');
        header.className = 'card-header bg-transparent border-bottom d-flex align-items-center justify-content-between';
        header.innerHTML = `
            <h5 class="m-0 d-flex align-items-center gap-2">
                <i class="bx bx-git-commit text-warning"></i>
                <span>If-This-Then-That (IFTTT) Automation Trees</span>
            </h5>
        `;

        const addRuleBtn = document.createElement('button');
        addRuleBtn.type = 'button';
        addRuleBtn.className = 'btn btn-sm btn-success';
        addRuleBtn.textContent = '+ New Automation Rule';
        addRuleBtn.addEventListener('click', () => showAddRuleModal());
        header.appendChild(addRuleBtn);

        const body = document.createElement('div');
        body.className = 'card-body';

        const rules = iftttEngine.getAllRules();

        const rulesContainer = document.createElement('div');
        rulesContainer.className = 'd-flex flex-column gap-3';

        for (const rule of rules) {
            const ruleCard = document.createElement('div');
            ruleCard.className = `card border ${rule.enabled ? 'border-success' : 'border-secondary'} shadow-sm`;
            ruleCard.style.backgroundColor = 'var(--main-background-color, #1e1e2e)';

            const ruleHeader = document.createElement('div');
            ruleHeader.className = 'card-header d-flex align-items-center justify-content-between bg-transparent';

            const titleBox = document.createElement('div');
            titleBox.className = 'd-flex align-items-center gap-2';

            const toggle = document.createElement('input');
            toggle.type = 'checkbox';
            toggle.className = 'form-check-input';
            toggle.checked = rule.enabled;
            toggle.addEventListener('change', () => {
                iftttEngine.toggleRule(rule.id, toggle.checked);
                onRuleChange();
                refresh();
            });

            const name = document.createElement('h6');
            name.className = 'm-0 font-weight-bold';
            name.textContent = rule.name;

            const badge = document.createElement('span');
            badge.className = `badge ${rule.isBuiltin ? 'badge-secondary' : 'badge-info'}`;
            badge.textContent = rule.isBuiltin ? 'Built-in' : 'Custom';

            titleBox.append(toggle, name, badge);
            ruleHeader.appendChild(titleBox);

            if (!rule.isBuiltin) {
                const delBtn = document.createElement('button');
                delBtn.className = 'btn btn-xs btn-outline-danger';
                delBtn.textContent = 'Delete';
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
            ifCol.className = 'col-md-5 p-2 rounded';
            ifCol.style.backgroundColor = 'rgba(231, 76, 60, 0.1)';
            ifCol.style.border = '1px solid rgba(231, 76, 60, 0.3)';
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
            arrowCol.innerHTML = '&rarr;';

            // 2. THEN (Actions)
            const thenCol = document.createElement('div');
            thenCol.className = 'col-md-5 p-2 rounded';
            thenCol.style.backgroundColor = 'rgba(46, 204, 113, 0.1)';
            thenCol.style.border = '1px solid rgba(46, 204, 113, 0.3)';
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
