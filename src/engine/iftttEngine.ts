/**
 * IF-THIS-THEN-THAT (IFTTT) Engine: Automation rule engine for Trilium Notes.
 */

import { IftttRuleDef, IftttCondition, IftttAction, TriggerType } from './types.js';

export const BUILTIN_IFTTT_RULES: IftttRuleDef[] = [
    // 1. Global System Rules
    {
        id: 'rule_project_autoclone',
        name: 'Global -> Auto-Clone to Parent Container',
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
        id: 'rule_derived_topic_sync',
        name: 'Global -> Sync Derived Topics',
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

    // 2. Category-Wide Rules (Work, Drafts, People)
    {
        id: 'rule_work_category_done_date',
        name: 'Work Category -> Record Completion Date',
        description: 'Applies to ALL notes in the Work category. When status is marked done, automatically sets #doneDate.',
        enabled: true,
        isBuiltin: true,
        trigger: {
            type: 'onAttributeChanged',
            targetCategory: 'work',
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
        id: 'rule_drafts_category_editorial_round',
        name: 'Drafts Category -> Auto-Sync Review Round',
        description: 'Applies to ALL notes in the Drafts category (story, edit, emailDraft, scratch). Syncs editorial review round.',
        enabled: true,
        isBuiltin: true,
        trigger: {
            type: 'onNoteCreated',
            targetCategory: 'drafts',
        },
        conditions: [],
        actions: [
            { type: 'setLabel', params: { labelName: 'round', labelValue: 'Round 1 Review' } },
        ],
    },
    {
        id: 'rule_people_category_followup',
        name: 'People Category -> Auto-Tag Contact Follow-up',
        description: 'Applies to ALL notes in People category (person, organization). Auto-tags contact entries when followUpDate is set.',
        enabled: true,
        isBuiltin: true,
        trigger: {
            type: 'onAttributeChanged',
            targetCategory: 'people',
            attributeName: 'followUpDate',
        },
        conditions: [],
        actions: [
            { type: 'setLabel', params: { labelName: 'followUpNeeded', labelValue: 'true' } },
        ],
    },

    // 3. Template-Specific Rules
    {
        id: 'rule_task_done_date',
        name: 'Task Template -> High Priority Highlight',
        description: 'When a Task priority is set to high, highlight it with color.',
        enabled: true,
        isBuiltin: true,
        trigger: {
            type: 'onAttributeChanged',
            targetTemplateId: 'task',
            attributeName: 'priority',
        },
        conditions: [
            { field: 'priority', operator: 'equals', value: 'high' },
        ],
        actions: [
            { type: 'setLabel', params: { labelName: 'color', labelValue: '#e74c3c' } },
        ],
    },
];

export interface NoteContext {
    noteId: string;
    title: string;
    templateId: string;
    category?: string;
    attributes: Record<string, any>;
    relations: Record<string, string[]>;
}

export class IftttEngine {
    private rules: Map<string, IftttRuleDef> = new Map();

    constructor(initialRules: IftttRuleDef[] = BUILTIN_IFTTT_RULES) {
        for (const rule of initialRules) {
            this.rules.set(rule.id, rule);
        }
    }

    public registerRule(rule: IftttRuleDef): void {
        this.rules.set(rule.id, rule);
    }

    public getRule(ruleId: string): IftttRuleDef | undefined {
        return this.rules.get(ruleId);
    }

    public getAllRules(): IftttRuleDef[] {
        return Array.from(this.rules.values());
    }

    public toggleRule(ruleId: string, enabled: boolean): void {
        const rule = this.rules.get(ruleId);
        if (rule) {
            rule.enabled = enabled;
        }
    }

    public deleteRule(ruleId: string): boolean {
        return this.rules.delete(ruleId);
    }

    public evaluateEvent(
        eventType: TriggerType,
        context: NoteContext,
        changedAttribute?: string
    ): IftttAction[] {
        const triggeredActions: IftttAction[] = [];

        for (const rule of this.rules.values()) {
            if (!rule.enabled) continue;

            if (rule.trigger.type !== eventType) continue;

            if (rule.trigger.targetTemplateId && rule.trigger.targetTemplateId !== context.templateId) {
                continue;
            }

            if (rule.trigger.targetCategory && context.category && rule.trigger.targetCategory !== context.category) {
                continue;
            }

            if (rule.trigger.attributeName && rule.trigger.attributeName !== changedAttribute) {
                continue;
            }

            if (this.checkConditions(rule.conditions, context)) {
                triggeredActions.push(...rule.actions);
            }
        }

        return triggeredActions;
    }

    private checkConditions(conditions: IftttCondition[], context: NoteContext): boolean {
        for (const cond of conditions) {
            const val = context.attributes[cond.field] ?? context.relations[cond.field];

            switch (cond.operator) {
                case 'equals':
                    if (val !== cond.value) return false;
                    break;
                case 'notEquals':
                    if (val === cond.value) return false;
                    break;
                case 'contains':
                    if (typeof val === 'string' && !val.includes(String(cond.value))) return false;
                    if (Array.isArray(val) && !val.includes(cond.value)) return false;
                    break;
                case 'isSet':
                    if (cond.value && (val === undefined || val === null || val === '')) return false;
                    if (!cond.value && val !== undefined && val !== null && val !== '') return false;
                    break;
            }
        }
        return true;
    }
}
