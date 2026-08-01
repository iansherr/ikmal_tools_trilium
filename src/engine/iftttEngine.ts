/**
 * IF-THIS-THEN-THAT (IFTTT) Engine: Automation rule engine for Trilium Notes.
 */

import { IftttRuleDef, IftttCondition, IftttAction, TriggerType } from './types.js';

export const BUILTIN_IFTTT_RULES: IftttRuleDef[] = [
    {
        id: 'rule_task_done_date',
        name: 'Auto-Set Task Done Date',
        description: 'When a Task status is marked as done, automatically record the current date in #doneDate.',
        enabled: true,
        isBuiltin: true,
        trigger: {
            type: 'onAttributeChanged',
            targetTemplateId: 'task',
            attributeName: 'status',
        },
        conditions: [
            { field: 'status', operator: 'equals', value: 'done' },
        ],
        actions: [
            { type: 'setLabel', params: { labelName: 'doneDate', labelValue: '{TODAY}' } },
        ],
    },
    {
        id: 'rule_project_autoclone',
        name: 'Auto-Clone to Project Container',
        description: 'When a note is created with a ~project relation, automatically clone it under the target Project Hub container note.',
        enabled: true,
        isBuiltin: true,
        trigger: {
            type: 'onNoteCreated',
        },
        conditions: [
            { field: 'project', operator: 'isSet', value: true },
        ],
        actions: [
            { type: 'cloneToContainer', params: { relationName: 'project' } },
        ],
    },
    {
        id: 'rule_high_priority_highlight',
        name: 'Highlight High Priority Tasks',
        description: 'When a Task priority is set to high, highlight it with color.',
        enabled: true,
        isBuiltin: true,
        trigger: {
            type: 'onAttributeChanged',
            attributeName: 'priority',
        },
        conditions: [
            { field: 'priority', operator: 'equals', value: 'high' },
        ],
        actions: [
            { type: 'setLabel', params: { labelName: 'color', labelValue: '#e74c3c' } },
        ],
    },
    {
        id: 'rule_derived_topic_sync',
        name: 'Sync Derived Topics',
        description: 'When a note is created or linked to a project/client, automatically recalculate and set derived topics.',
        enabled: true,
        isBuiltin: true,
        trigger: {
            type: 'onNoteCreated',
        },
        conditions: [],
        actions: [
            { type: 'syncDerivedTopics', params: {} },
        ],
    },
];

export interface NoteContext {
    noteId: string;
    title: string;
    templateId?: string;
    category?: string;
    attributes: Record<string, any>;
    relations: Record<string, string | string[]>;
}

export interface RuleExecutionResult {
    ruleId: string;
    ruleName: string;
    matched: boolean;
    executedActions: IftttAction[];
}

export class IftttEngine {
    private rules: Map<string, IftttRuleDef> = new Map();

    constructor(initialRules: IftttRuleDef[] = BUILTIN_IFTTT_RULES) {
        for (const rule of initialRules) {
            this.rules.set(rule.id, JSON.parse(JSON.stringify(rule)));
        }
    }

    public getAllRules(): IftttRuleDef[] {
        return Array.from(this.rules.values());
    }

    public getRule(id: string): IftttRuleDef | undefined {
        return this.rules.get(id);
    }

    public registerRule(rule: IftttRuleDef): void {
        this.rules.set(rule.id, JSON.parse(JSON.stringify(rule)));
    }

    public updateRule(id: string, updates: Partial<IftttRuleDef>): IftttRuleDef {
        const existing = this.rules.get(id);
        if (!existing) throw new Error(`Rule with id '${id}' not found`);
        const updated = { ...existing, ...updates, id };
        this.rules.set(id, updated);
        return updated;
    }

    public toggleRule(id: string, enabled?: boolean): boolean {
        const rule = this.rules.get(id);
        if (!rule) return false;
        rule.enabled = enabled !== undefined ? enabled : !rule.enabled;
        return rule.enabled;
    }

    public deleteRule(id: string): boolean {
        const rule = this.rules.get(id);
        if (!rule) return false;
        if (rule.isBuiltin) throw new Error(`Cannot delete built-in rule '${id}'`);
        return this.rules.delete(id);
    }

    public evaluateEvent(
        eventType: TriggerType,
        context: NoteContext,
        changedAttribute?: string
    ): RuleExecutionResult[] {
        const results: RuleExecutionResult[] = [];

        for (const rule of this.rules.values()) {
            if (!rule.enabled) continue;

            // 1. Trigger matching
            if (rule.trigger.type !== eventType) continue;

            if (rule.trigger.targetCategory && rule.trigger.targetCategory !== context.category) {
                continue;
            }

            if (rule.trigger.targetTemplateId && rule.trigger.targetTemplateId !== context.templateId) {
                continue;
            }

            if (eventType === 'onAttributeChanged' && rule.trigger.attributeName && rule.trigger.attributeName !== changedAttribute) {
                continue;
            }


            // 2. Conditions matching
            const conditionsMet = this.evaluateConditions(rule.conditions, context);

            if (conditionsMet) {
                const processedActions = rule.actions.map(action => this.processActionTemplates(action, context));
                results.push({
                    ruleId: rule.id,
                    ruleName: rule.name,
                    matched: true,
                    executedActions: processedActions,
                });
            }
        }

        return results;
    }

    private evaluateConditions(conditions: IftttCondition[], context: NoteContext): boolean {
        for (const cond of conditions) {
            const fieldValue = context.attributes[cond.field] ?? context.relations[cond.field] ?? (context as any)[cond.field];

            switch (cond.operator) {
                case 'equals':
                    if (fieldValue !== cond.value) return false;
                    break;
                case 'notEquals':
                    if (fieldValue === cond.value) return false;
                    break;
                case 'contains':
                    if (typeof fieldValue === 'string' && !fieldValue.includes(String(cond.value))) return false;
                    if (Array.isArray(fieldValue) && !fieldValue.includes(cond.value)) return false;
                    break;
                case 'isSet':
                    const isSet = fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
                    if (isSet !== Boolean(cond.value)) return false;
                    break;
                case 'isEmpty':
                    const isEmpty = fieldValue === undefined || fieldValue === null || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);
                    if (isEmpty !== Boolean(cond.value)) return false;
                    break;
                case 'greaterThan':
                    if (Number(fieldValue) <= Number(cond.value)) return false;
                    break;
                case 'lessThan':
                    if (Number(fieldValue) >= Number(cond.value)) return false;
                    break;
            }
        }
        return true;
    }

    private processActionTemplates(action: IftttAction, context: NoteContext): IftttAction {
        const actionCopy: IftttAction = JSON.parse(JSON.stringify(action));
        const todayStr = new Date().toISOString().split('T')[0];

        for (const key of Object.keys(actionCopy.params)) {
            if (typeof actionCopy.params[key] === 'string') {
                actionCopy.params[key] = actionCopy.params[key]
                    .replace('{TODAY}', todayStr)
                    .replace('{NOTE_TITLE}', context.title)
                    .replace('{NOTE_ID}', context.noteId);
            }
        }

        return actionCopy;
    }
}
