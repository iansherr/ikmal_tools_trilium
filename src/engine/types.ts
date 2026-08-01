/**
 * Types for Trilium Notes System & Template Studio Plugin Scaffold
 */

export type AttributeType = 'label' | 'relation';
export type AttributeDataType = 'string' | 'number' | 'date' | 'boolean' | 'select' | 'relation';

export interface PromotedAttributeDef {
    name: string;
    type: AttributeType;
    dataType: AttributeDataType;
    label?: string;
    description?: string;
    defaultValue?: string | number | boolean;
    options?: string[]; // For select type
    targetTemplateId?: string; // For relation type
    isPromoted: boolean;
}

export interface TemplateRelationshipDef {
    id: string;
    name: string;
    relationName: string;
    targetTemplateId: string;
    targetTemplateName: string;
    isMulti: boolean;
    autoCloneToParent: boolean;
    inheritTopics: boolean;
    direction: 'parent' | 'child' | 'peer';
}

export interface TemplateCategoryDef {
    id: string;
    title: string;
    description: string;
    icon: string;
    defaultRootMarker?: string; // e.g. projectRoot, storyDraftRoot, peopleRoot, topicRoot, taskRoot
    autoJournalClone?: boolean;
    inheritParentTopics?: boolean;
    projectScopedDefault?: boolean;
    isBuiltin?: boolean;
}

export interface TemplateDefinition {
    id: string;
    marker: string; // e.g. extTask, extMeeting, extProjectHub
    title: string; // Template display name
    icon: string; // Icon name e.g. 'check-square', 'calendar-event'
    category: string; // Category ID e.g. 'work', 'drafts', 'people', 'system', 'custom'
    rootContainerMarker: string; // e.g. taskRoot, meetingRoot, projectRoot
    titlePattern: string; // e.g. 'YYYY-MM-DD - dddd', 'Project: {title}'
    defaultContent: string; // Default HTML/Markdown skeleton
    attributes: PromotedAttributeDef[];
    relationships: TemplateRelationshipDef[];
    projectScoped?: boolean;
    noJournalClone?: boolean;
    isBuiltin?: boolean;
}

// IF-THIS-THEN-THAT (IFTTT) Engine Types
export type TriggerType = 'onNoteCreated' | 'onAttributeChanged' | 'onManualAction' | 'onScheduledCheck';

export interface IftttTrigger {
    type: TriggerType;
    targetCategory?: string; // Target all templates in a category (e.g. work, drafts, people)
    targetTemplateId?: string; // Limit to specific template
    targetContainerMarker?: string; // Limit to specific root
    attributeName?: string; // For onAttributeChanged
}


export type OperatorType = 'equals' | 'notEquals' | 'contains' | 'isSet' | 'isEmpty' | 'greaterThan' | 'lessThan';

export interface IftttCondition {
    field: string; // Attribute name or system property (e.g. title, type)
    operator: OperatorType;
    value: string | number | boolean;
}

export type ActionType = 
    | 'setLabel'
    | 'removeLabel'
    | 'setRelation'
    | 'cloneToContainer'
    | 'syncDerivedTopics'
    | 'createLinkedNote'
    | 'setTaskStatus'
    | 'runScript';

export interface IftttAction {
    type: ActionType;
    params: {
        labelName?: string;
        labelValue?: string;
        relationName?: string;
        targetNoteId?: string;
        containerMarker?: string;
        templateId?: string;
        scriptMarker?: string;
        [key: string]: any;
    };
}

export interface IftttRuleDef {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    trigger: IftttTrigger;
    conditions: IftttCondition[];
    actions: IftttAction[];
    isBuiltin?: boolean;
}

// Today Homepage Layout Types
export interface TodayWidgetConfig {
    id: string;
    title: string;
    marker: string; // e.g. openTasks, activeProjects, dueSoon, highPriority
    visible: boolean;
    order: number;
    colSpan: 1 | 2 | 3;
    columns: [string, string][]; // Label/property headers and keys
    emptyMessage: string;
    actionType?: string;
    actionLabel?: string;
}

export interface TodayLayoutConfig {
    journalWidthPercent: number;
    showQuickCaptureBar: boolean;
    widgets: TodayWidgetConfig[];
}

export interface NotesSystemConfig {
    version: string;
    templates: TemplateDefinition[];
    categories?: TemplateCategoryDef[];
    iftttRules: IftttRuleDef[];
    todayLayout: TodayLayoutConfig;
}
