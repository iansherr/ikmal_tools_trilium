/**
 * Note Creation Engine: Unified pipeline for note instantiation, title formatting,
 * relation mapping, auto-cloning, and IFTTT trigger execution.
 */

import { TemplateEngine } from './templateEngine.js';
import { RelationshipEngine } from './relationshipEngine.js';
import { IftttEngine } from './iftttEngine.js';
import { PromotedAttributeDef } from './types.js';

export interface NoteCreationRequest {
    type: string; // Template ID (e.g. task, meeting, projectHub, custom_tpl)
    title: string;
    attributes?: Record<string, any>;
    relations?: Record<string, string | string[]>;
    targetContainerId?: string;
    date?: Date;
}

export interface NoteCreationPlan {
    templateId: string;
    formattedTitle: string;
    rootContainerMarker: string;
    targetContainerId?: string;
    content: string;
    labelsToCreate: Array<{ name: string; value: string }>;
    relationsToCreate: Array<{ name: string; value: string }>;
    autoCloneContainers: string[];
    inheritedTopicSources: string[];
    executedIftttRules: Array<{ ruleId: string; ruleName: string }>;
}

export class NoteCreationEngine {
    constructor(
        private templateEngine: TemplateEngine,
        private relationshipEngine: RelationshipEngine,
        private iftttEngine: IftttEngine
    ) {}

    public planNoteCreation(request: NoteCreationRequest): NoteCreationPlan {
        const template = this.templateEngine.getTemplate(request.type);
        if (!template) {
            throw new Error(`Unknown note template type: '${request.type}'`);
        }

        const date = request.date || new Date();
        const formattedTitle = this.templateEngine.formatTitle(template.id, request.title, date);
        const labelsToCreate: Array<{ name: string; value: string }> = [];
        const relationsToCreate: Array<{ name: string; value: string }> = [];

        // 1. Process Promoted Attributes
        const attrValues = request.attributes || {};
        for (const attrDef of template.attributes) {
            const userVal = attrValues[attrDef.name] ?? attrDef.defaultValue;
            if (userVal !== undefined && userVal !== null && userVal !== '') {
                if (attrDef.type === 'label') {
                    labelsToCreate.push({ name: attrDef.name, value: String(userVal) });
                } else if (attrDef.type === 'relation') {
                    const targets = Array.isArray(userVal) ? userVal : [userVal];
                    for (const t of targets) {
                        relationsToCreate.push({ name: attrDef.name, value: String(t) });
                    }
                }
            }
        }

        // Add template marker label
        labelsToCreate.push({ name: template.marker, value: '' });

        // 2. Process Relationships & Auto-Cloning via RelationshipEngine
        const relValues = request.relations || {};
        const { autoCloneContainers, inheritedTopicSources, relationLabels } =
            this.relationshipEngine.resolveCreationRelations(template.id, relValues);

        for (const relLabel of relationLabels) {
            relationsToCreate.push(relLabel);
        }

        // 3. Evaluate IFTTT Automation Rules
        const noteContext = {
            noteId: 'PREVIEW_ID',
            title: formattedTitle,
            templateId: template.id,
            attributes: { ...attrValues, ...Object.fromEntries(labelsToCreate.map(l => [l.name, l.value])) },
            relations: relValues,
        };

        const iftttResults = this.iftttEngine.evaluateEvent('onNoteCreated', noteContext);
        const executedIftttRules: Array<{ ruleId: string; ruleName: string }> = [];

        for (const res of iftttResults) {
            if (res.matched) {
                executedIftttRules.push({ ruleId: res.ruleId, ruleName: res.ruleName });
                for (const action of res.executedActions) {
                    if (action.type === 'setLabel' && action.params.labelName) {
                        labelsToCreate.push({
                            name: action.params.labelName,
                            value: action.params.labelValue || '',
                        });
                    } else if (action.type === 'setRelation' && action.params.relationName && action.params.targetNoteId) {
                        relationsToCreate.push({
                            name: action.params.relationName,
                            value: action.params.targetNoteId,
                        });
                    }
                }
            }
        }

        return {
            templateId: template.id,
            formattedTitle,
            rootContainerMarker: template.rootContainerMarker,
            targetContainerId: request.targetContainerId,
            content: template.defaultContent,
            labelsToCreate,
            relationsToCreate,
            autoCloneContainers,
            inheritedTopicSources,
            executedIftttRules,
        };
    }
}
