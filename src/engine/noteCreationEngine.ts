/**
 * Note Creation Engine: Unified pipeline for note instantiation, title formatting,
 * relation mapping, auto-cloning, and IFTTT trigger execution.
 * Faithfully implements original startStory logic for 'story' (mode: project) vs 'edit' (mode: edit).
 */

import { TemplateEngine } from './templateEngine.js';
import { RelationshipEngine } from './relationshipEngine.js';
import { IftttEngine } from './iftttEngine.js';

export interface NoteCreationRequest {
    type: string; // Template ID (e.g. task, meeting, projectHub, story, edit)
    title: string;
    attributes?: Record<string, any>;
    relations?: Record<string, string | string[]>;
    targetContainerId?: string;
    date?: Date;
    mode?: 'project' | 'edit';
}

export interface NoteCreationPlan {
    templateId: string;
    mode?: 'project' | 'edit';
    formattedTitle: string;
    rootContainerMarker: string;
    targetContainerId?: string;
    content: string;
    labelsToCreate: Array<{ name: string; value: string }>;
    relationsToCreate: Array<{ name: string; value: string }>;
    autoCloneContainers: string[];
    inheritedTopicSources: string[];
    executedIftttRules: Array<{ ruleId: string; ruleName: string }>;
    childNotesToCreate?: Array<{ title: string; templateId: string; labels: Array<{ name: string; value: string }> }>;
}

export class NoteCreationEngine {
    constructor(
        private templateEngine: TemplateEngine,
        private relationshipEngine: RelationshipEngine,
        private iftttEngine: IftttEngine
    ) {}

    public planNoteCreation(request: NoteCreationRequest): NoteCreationPlan {
        const isStoryOrEdit = request.type === 'story' || request.type === 'edit';
        const templateId = isStoryOrEdit ? 'story' : request.type;
        const mode: 'project' | 'edit' = request.mode || (request.type === 'edit' ? 'edit' : 'project');

        const template = this.templateEngine.getTemplate(templateId);
        if (!template) {
            throw new Error(`Unknown note template type: '${request.type}'`);
        }

        const date = request.date || new Date();
        const formattedTitle = this.templateEngine.formatTitle(template.id, request.title, date);
        const labelsToCreate: Array<{ name: string; value: string }> = [];
        const relationsToCreate: Array<{ name: string; value: string }> = [];
        const childNotesToCreate: Array<{ title: string; templateId: string; labels: Array<{ name: string; value: string }> }> = [];

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

        // Original Bespoke System Contract for Story vs Edit:
        if (isStoryOrEdit) {
            // Set workflow mode and status labels
            labelsToCreate.push({ name: 'workflow', value: mode });
            labelsToCreate.push({ name: 'status', value: mode === 'edit' ? 'editing' : 'drafting' });
            labelsToCreate.push({ name: 'kind', value: mode });

            if (mode === 'project') {
                // New Story creates a dedicated Reporting Notes child note
                childNotesToCreate.push({
                    title: `${request.title} (Reporting & Notes)`,
                    templateId: 'reportingNotes',
                    labels: [
                        { name: 'extReportingNotes', value: '' },
                        { name: 'status', value: 'active' },
                    ],
                });
            }
        }

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
            mode: isStoryOrEdit ? mode : undefined,
            formattedTitle,
            rootContainerMarker: template.rootContainerMarker,
            targetContainerId: request.targetContainerId,
            content: template.defaultContent,
            labelsToCreate,
            relationsToCreate,
            autoCloneContainers,
            inheritedTopicSources,
            executedIftttRules,
            childNotesToCreate,
        };
    }
}
