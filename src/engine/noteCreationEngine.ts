/**
 * Note Creation Engine: Unified pipeline for note instantiation, title formatting,
 * relation mapping, auto-cloning, and if/then rule execution.
 * Faithfully implements original startStory logic for 'story' (mode: project) vs 'edit' (mode: edit).
 */

import { TemplateEngine } from './templateEngine.js';
import { RelationshipEngine } from './relationshipEngine.js';
import { IfThenRuleEngine } from './ifThenRuleEngine.js';
import { SettingsEngine } from './settingsEngine.js';

export interface NoteCreationRequest {
    type: string; // Template ID (e.g. task, meeting, projectHub, story, edit)
    title: string;
    attributes?: Record<string, any>;
    relations?: Record<string, string | string[]>;
    targetContainerId?: string;
    date?: Date;
    mode?: 'project' | 'edit';
}

export const EDIT_ROUND_CONTENT =
    '<h2>LINKS</h2><ul><li></li></ul>'
    + '<h2>OPEN QUESTIONS</h2><ul><li></li></ul>'
    + '<h2>EDITORIAL NOTES</h2><p></p>'
    + '<h2>REQUESTED CHANGES</h2><ul><li></li></ul>'
    + '<h2>HED</h2><ul><li></li><li></li><li></li></ul>'
    + '<h2>BYLINE</h2><p>By Ian Sherr (+1 415.347.6397)</p>'
    + '<h2>STORYBODY</h2><p></p><p>--ENDIT--</p>'
    + '<h2>WRITER RESPONSE</h2><p></p>';

export const STORY_DRAFT_CONTENT =
    '<h2>HED</h2><ul><li></li><li></li><li></li></ul>'
    + '<h2>DEK</h2><ul><li></li><li></li><li></li></ul>'
    + '<h2>BYLINE</h2><p>By Ian Sherr (+1 415.347.6397)</p>'
    + '<h2>STORYBODY</h2><p></p><p>--ENDIT--</p>';

export const REPORTING_NOTES_CONTENT =
    '<h2>LINKS</h2><ul><li></li></ul>'
    + '<h2>OPEN QUESTIONS</h2><ul><li></li></ul>'
    + '<h2>IDEA / ANGLE</h2><p></p>'
    + '<h2>REPORTING NOTES</h2><p></p>'
    + "<div class='reporting-note-actions-placeholder' data-reporting-note-actions='true'></div>";

export interface ChildNoteToCreate {
    title: string;
    templateId: string;
    content?: string;
    labels: Array<{ name: string; value: string }>;
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
    executedIfThenRules: Array<{ ruleId: string; ruleName: string }>;
    childNotesToCreate?: ChildNoteToCreate[];
    noteType?: string;
    /**
     * Whether this note should be referenced under today's journal note. True
     * only when nothing else already claims it (no relation-based auto-clone
     * container), the template and its category both allow it, and the
     * "File new notes under today's journal note" setting is on.
     */
    journalClone: boolean;
}

export class NoteCreationEngine {
    constructor(
        private templateEngine: TemplateEngine,
        private relationshipEngine: RelationshipEngine,
        private ifThenRuleEngine: IfThenRuleEngine,
        private settingsEngine: SettingsEngine = new SettingsEngine()
    ) {}

    public planNoteCreation(request: NoteCreationRequest): NoteCreationPlan {
        const isStoryOrEdit = request.type === 'story' || request.type === 'edit';
        const relValues = request.relations || {};
        const hasExistingProject = Boolean(relValues.project || request.targetContainerId);

        let templateId = request.type;
        let rootContainerMarker = '';

        if (isStoryOrEdit && !hasExistingProject) {
            templateId = 'projectHub';
            rootContainerMarker = 'activeProjectRoot';
        } else if (isStoryOrEdit) {
            templateId = 'story';
        }

        const template = this.templateEngine.getTemplate(templateId);
        if (!template) {
            throw new Error(`Unknown note template type: '${request.type}'`);
        }

        const mode: 'project' | 'edit' = request.mode || (request.type === 'edit' ? 'edit' : 'project');
        const date = request.date || new Date();
        const formattedTitle = this.templateEngine.formatTitle(template.id, request.title, date);
        const labelsToCreate: Array<{ name: string; value: string }> = [];
        const relationsToCreate: Array<{ name: string; value: string }> = [];
        const childNotesToCreate: ChildNoteToCreate[] = [];

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

        // Original Bespoke System Contract for Story vs Edit Project Hub creation:
        if (isStoryOrEdit && !hasExistingProject) {
            labelsToCreate.push({ name: 'kind', value: mode });
            labelsToCreate.push({ name: 'status', value: 'active' });
            labelsToCreate.push({ name: 'extHubIcon', value: mode });
            labelsToCreate.push({ name: 'iconClass', value: mode === 'edit' ? 'bx bx-edit-alt' : 'bx bx-book' });

            const draftTitle = `${request.title} — ${mode === 'edit' ? 'Round' : 'Draft'} 1`;
            childNotesToCreate.push({
                title: draftTitle,
                templateId: 'story',
                content: mode === 'edit' ? EDIT_ROUND_CONTENT : STORY_DRAFT_CONTENT,
                labels: [
                    { name: 'extStoryDraft', value: '' },
                    { name: 'round', value: '1' },
                    { name: 'status', value: mode === 'edit' ? 'editing' : 'drafting' },
                    { name: 'workflow', value: mode },
                    { name: 'kind', value: mode },
                ],
            });

            if (mode === 'project') {
                childNotesToCreate.push({
                    title: `${request.title} — Reporting Notes`,
                    templateId: 'reportingNotes',
                    content: REPORTING_NOTES_CONTENT,
                    labels: [
                        { name: 'extReportingNotes', value: '' },
                        { name: 'extReportingTitleManaged', value: '' },
                        { name: 'status', value: 'active' },
                    ],
                });
            }
        } else if (isStoryOrEdit) {
            labelsToCreate.push({ name: 'workflow', value: mode });
            labelsToCreate.push({ name: 'status', value: mode === 'edit' ? 'editing' : 'drafting' });
            labelsToCreate.push({ name: 'kind', value: mode });
        }

        // 2. Process Relationships & Auto-Cloning via RelationshipEngine
        const resolved = this.relationshipEngine.resolveCreationRelations(template.id, relValues);
        const autoCloneContainers = resolved.autoCloneContainers;
        // Derived topic propagation is an opt-out: the relation graph is still
        // resolved above (it also drives auto-cloning), but nothing is inherited
        // when the setting is off.
        const inheritedTopicSources = this.settingsEngine.get('enableDerivedTopics')
            ? resolved.inheritedTopicSources
            : [];

        for (const relLabel of resolved.relationLabels) {
            relationsToCreate.push(relLabel);
        }

        // 3. Evaluate if/then automation rules, unless disabled in settings
        const noteContext = {
            noteId: 'PREVIEW_ID',
            title: formattedTitle,
            templateId: template.id,
            attributes: { ...attrValues, ...Object.fromEntries(labelsToCreate.map(l => [l.name, l.value])) },
            relations: relValues,
        };

        const executedIfThenRules: Array<{ ruleId: string; ruleName: string }> = [];

        let content = template.defaultContent;
        if (template.id === 'story' && (mode === 'edit' || attrValues.workflow === 'edit' || attrValues.kind === 'edit')) {
            content = EDIT_ROUND_CONTENT;
        }

        if (this.settingsEngine.get('autoRunIfThenRulesOnCreation')) {
            const ruleResults = this.ifThenRuleEngine.evaluateEvent('onNoteCreated', noteContext);
            for (const res of ruleResults) {
                if (res.matched) {
                    executedIfThenRules.push({ ruleId: res.ruleId, ruleName: res.ruleName });
                    for (const action of res.executedActions) {
                        if (action.type === 'setLabel' && action.params.labelName) {
                            labelsToCreate.push({
                                name: action.params.labelName,
                                value: action.params.labelValue || '',
                            });
                        } else if (action.type === 'removeLabel' && action.params.labelName) {
                            const idx = labelsToCreate.findIndex((l) => l.name === action.params.labelName);
                            if (idx !== -1) labelsToCreate.splice(idx, 1);
                        } else if (action.type === 'setRelation' && action.params.relationName && action.params.targetNoteId) {
                            relationsToCreate.push({
                                name: action.params.relationName,
                                value: action.params.targetNoteId,
                            });
                        } else if (action.type === 'archiveNote') {
                            labelsToCreate.push({ name: 'archived', value: '' });
                            if (action.params.containerMarker && !autoCloneContainers.includes(action.params.containerMarker)) {
                                autoCloneContainers.push(action.params.containerMarker);
                            }
                        } else if (action.type === 'prependContent' && action.params.content) {
                            content = `${action.params.content}\n${content}`;
                        }
                    }
                }
            }
        }

        // 4. Journal auto-clone: enabled for non-hub/non-system notes when setting is on and not claimed elsewhere.
        const category = this.templateEngine.getCategory(template.category);
        const journalClone =
            this.settingsEngine.get('autoJournalClone') &&
            !template.noJournalClone &&
            template.id !== 'projectHub' &&
            category?.autoJournalClone !== false &&
            autoCloneContainers.length === 0;

        return {
            templateId: template.id,
            mode: isStoryOrEdit ? mode : undefined,
            formattedTitle,
            rootContainerMarker: rootContainerMarker || template.rootContainerMarker,
            targetContainerId: request.targetContainerId,
            content,
            labelsToCreate,
            relationsToCreate,
            autoCloneContainers,
            inheritedTopicSources,
            executedIfThenRules,
            childNotesToCreate: childNotesToCreate.length > 0 ? childNotesToCreate : undefined,
            journalClone,
            noteType: template.noteType,
        };
    }
}
