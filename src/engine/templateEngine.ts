/**
 * Template Engine: Template registry, schema generator, parser & title formatter.
 * Contains 100% complete original template definitions, attributes, relations, and HTML content skeletons.
 */

import { TemplateDefinition, PromotedAttributeDef, TemplateRelationshipDef } from './types.js';

export const BUILTIN_TEMPLATES: TemplateDefinition[] = [
    {
        id: 'task',
        marker: 'extTask',
        title: 'Task',
        icon: 'check-square',
        category: 'work',
        rootContainerMarker: 'taskRoot',
        titlePattern: '{title}',
        defaultContent: '<p>Task description and notes...</p>',
        projectScoped: true,
        isBuiltin: true,
        attributes: [
            { name: 'priority', type: 'label', dataType: 'select', options: ['high', 'medium', 'low'], defaultValue: 'medium', isPromoted: true, label: 'Priority' },
            { name: 'status', type: 'label', dataType: 'select', options: ['todo', 'in_progress', 'done', 'cancelled'], defaultValue: 'todo', isPromoted: true, label: 'Status' },
            { name: 'dueDate', type: 'label', dataType: 'date', isPromoted: true, label: 'Due Date' },
            { name: 'doneDate', type: 'label', dataType: 'date', isPromoted: true, label: 'Done Date' },
            { name: 'duration', type: 'label', dataType: 'string', isPromoted: true, label: 'Duration' },
            { name: 'complexity', type: 'label', dataType: 'select', options: ['simple', 'multi'], isPromoted: true, label: 'Complexity' },
        ],
        relationships: [
            {
                id: 'rel_task_project',
                name: 'Project Hub',
                relationName: 'project',
                targetTemplateId: 'projectHub',
                targetTemplateName: 'Project Hub',
                isMulti: false,
                autoCloneToParent: true,
                inheritTopics: true,
                direction: 'parent',
            },
        ],
    },
    {
        id: 'projectTask',
        marker: 'extTask',
        title: 'Project Task',
        icon: 'list-check',
        category: 'work',
        rootContainerMarker: 'taskRoot',
        titlePattern: '{title}',
        defaultContent: '<p>Project task details and sub-action items...</p>',
        projectScoped: true,
        isBuiltin: true,
        attributes: [
            { name: 'priority', type: 'label', dataType: 'select', options: ['high', 'medium', 'low'], defaultValue: 'medium', isPromoted: true, label: 'Priority' },
            { name: 'status', type: 'label', dataType: 'select', options: ['todo', 'in_progress', 'done'], defaultValue: 'todo', isPromoted: true, label: 'Status' },
            { name: 'dueDate', type: 'label', dataType: 'date', isPromoted: true, label: 'Due Date' },
        ],
        relationships: [
            {
                id: 'rel_projtask_project',
                name: 'Project Hub',
                relationName: 'project',
                targetTemplateId: 'projectHub',
                targetTemplateName: 'Project Hub',
                isMulti: false,
                autoCloneToParent: true,
                inheritTopics: true,
                direction: 'parent',
            },
        ],
    },
    {
        id: 'meeting',
        marker: 'extMeeting',
        title: 'Meeting',
        icon: 'calendar-event',
        category: 'work',
        rootContainerMarker: 'meetingRoot',
        titlePattern: 'Meeting: {title}',
        defaultContent: '<h2>AGENDA</h2><ul><li></li></ul><h2>NOTES</h2><p></p><h2>ACTION ITEMS</h2><ul><li>[ ] </li></ul>',
        projectScoped: true,
        isBuiltin: true,
        attributes: [
            { name: 'startDate', type: 'label', dataType: 'date', isPromoted: true, label: 'Start Date' },
            { name: 'startTime', type: 'label', dataType: 'string', isPromoted: true, label: 'Start Time' },
            { name: 'attendee', type: 'relation', dataType: 'relation', targetTemplateId: 'person', isPromoted: true, label: 'Attendees' },
            { name: 'client', type: 'relation', dataType: 'relation', targetTemplateId: 'organization', isPromoted: true, label: 'Client' },
            { name: 'companyOnBehalf', type: 'relation', dataType: 'relation', targetTemplateId: 'organization', isPromoted: true, label: 'On Behalf Of' },
        ],
        relationships: [
            {
                id: 'rel_meeting_project',
                name: 'Project Hub',
                relationName: 'project',
                targetTemplateId: 'projectHub',
                targetTemplateName: 'Project Hub',
                isMulti: false,
                autoCloneToParent: true,
                inheritTopics: true,
                direction: 'parent',
            },
        ],
    },
    {
        id: 'meetingPrep',
        marker: 'extMeeting',
        title: 'Meeting Prep',
        icon: 'calendar-edit',
        category: 'work',
        rootContainerMarker: 'meetingRoot',
        titlePattern: 'Meeting Prep: {title}',
        defaultContent: '<h2>BACKGROUND</h2><p></p><h2>TALKING POINTS</h2><ul><li></li></ul><h2>QUESTIONS TO ASK</h2><ul><li></li></ul>',
        projectScoped: true,
        isBuiltin: true,
        attributes: [
            { name: 'attendee', type: 'relation', dataType: 'relation', targetTemplateId: 'person', isPromoted: true, label: 'Attendees' },
            { name: 'client', type: 'relation', dataType: 'relation', targetTemplateId: 'organization', isPromoted: true, label: 'Client' },
        ],
        relationships: [
            {
                id: 'rel_meetingprep_project',
                name: 'Project Hub',
                relationName: 'project',
                targetTemplateId: 'projectHub',
                targetTemplateName: 'Project Hub',
                isMulti: false,
                autoCloneToParent: true,
                inheritTopics: true,
                direction: 'parent',
            },
        ],
    },
    {
        id: 'story',
        marker: 'extStoryDraft',
        title: 'Story Project',
        icon: 'news',
        category: 'drafts',
        rootContainerMarker: 'storyDraftRoot',
        titlePattern: '{title}',
        defaultContent: '<h2>HED</h2><ul><li></li><li></li><li></li></ul><h2>DEK</h2><ul><li></li><li></li><li></li></ul><h2>BYLINE</h2><p>By Ian Sherr (+1 415.347.6397)</p><h2>STORYBODY</h2><p></p><p>--ENDIT--</p>',
        projectScoped: true,
        isBuiltin: true,
        attributes: [
            { name: 'status', type: 'label', dataType: 'select', options: ['drafting', 'review', 'published'], defaultValue: 'drafting', isPromoted: true, label: 'Status' },
            { name: 'workflow', type: 'label', dataType: 'string', defaultValue: 'project', isPromoted: true, label: 'Workflow' },
            { name: 'kind', type: 'label', dataType: 'string', defaultValue: 'project', isPromoted: true, label: 'Kind' },
            { name: 'client', type: 'relation', dataType: 'relation', targetTemplateId: 'organization', isPromoted: true, label: 'Client Organization' },
            { name: 'writer', type: 'relation', dataType: 'relation', targetTemplateId: 'person', isPromoted: true, label: 'Writer / Reporter' },
        ],
        relationships: [
            {
                id: 'rel_story_project',
                name: 'Project Hub',
                relationName: 'project',
                targetTemplateId: 'projectHub',
                targetTemplateName: 'Project Hub',
                isMulti: false,
                autoCloneToParent: true,
                inheritTopics: true,
                direction: 'parent',
            },
        ],
    },
    {
        id: 'edit',
        marker: 'extStoryDraft',
        title: 'Edit Package',
        icon: 'edit',
        category: 'drafts',
        rootContainerMarker: 'storyDraftRoot',
        titlePattern: 'Edit: {title}',
        defaultContent: '<h2>LINKS</h2><ul><li></li></ul><h2>OPEN QUESTIONS</h2><ul><li></li></ul><h2>EDITORIAL NOTES</h2><p></p><h2>REQUESTED CHANGES</h2><ul><li></li></ul><h2>HED</h2><ul><li></li><li></li><li></li></ul><h2>BYLINE</h2><p>By Ian Sherr (+1 415.347.6397)</p><h2>STORYBODY</h2><p></p><p>--ENDIT--</p><h2>WRITER RESPONSE</h2><p></p>',
        projectScoped: true,
        isBuiltin: true,
        attributes: [
            { name: 'status', type: 'label', dataType: 'select', options: ['editing', 'approved', 'returned'], defaultValue: 'editing', isPromoted: true, label: 'Status' },
            { name: 'workflow', type: 'label', dataType: 'string', defaultValue: 'edit', isPromoted: true, label: 'Workflow' },
            { name: 'round', type: 'label', dataType: 'string', defaultValue: 'Round 1 Edit', isPromoted: true, label: 'Round' },
            { name: 'writer', type: 'relation', dataType: 'relation', targetTemplateId: 'person', isPromoted: true, label: 'Writer / Reporter' },
        ],
        relationships: [
            {
                id: 'rel_edit_story',
                name: 'Parent Story Draft',
                relationName: 'storyDraft',
                targetTemplateId: 'story',
                targetTemplateName: 'Story Project',
                isMulti: false,
                autoCloneToParent: true,
                inheritTopics: true,
                direction: 'parent',
            },
        ],
    },
    {
        id: 'projectHub',
        marker: 'extProjectHub',
        title: 'Project Hub',
        icon: 'book',
        category: 'work',
        rootContainerMarker: 'projectRoot',
        titlePattern: '{title}',
        defaultContent: '<h2>OVERVIEW</h2><p></p><h2>GOALS</h2><ul><li></li></ul><div class="project-hub-dashboard-placeholder" data-project-hub-dashboard="true"></div>',
        isBuiltin: true,
        attributes: [
            { name: 'status', type: 'label', dataType: 'select', options: ['active', 'archived', 'on_hold'], defaultValue: 'active', isPromoted: true, label: 'Status' },
            { name: 'kind', type: 'label', dataType: 'select', options: ['project', 'edit', 'client', 'internal'], isPromoted: true, label: 'Kind' },
            { name: 'client', type: 'relation', dataType: 'relation', targetTemplateId: 'organization', isPromoted: true, label: 'Client Organization' },
            { name: 'companyOnBehalf', type: 'relation', dataType: 'relation', targetTemplateId: 'organization', isPromoted: true, label: 'On Behalf Of' },
        ],
        relationships: [
            {
                id: 'rel_project_client',
                name: 'Client Organization',
                relationName: 'client',
                targetTemplateId: 'organization',
                targetTemplateName: 'Organization',
                isMulti: false,
                autoCloneToParent: false,
                inheritTopics: true,
                direction: 'parent',
            },
        ],
    },
    {
        id: 'reportingNotes',
        marker: 'extReportingNotes',
        title: 'Reporting Notes',
        icon: 'file-find',
        category: 'work',
        rootContainerMarker: 'reportingRoot',
        titlePattern: '{title} (Reporting & Notes)',
        defaultContent: '<h2>LINKS</h2><ul><li></li></ul><h2>OPEN QUESTIONS</h2><ul><li></li></ul><h2>IDEA / ANGLE</h2><p></p><h2>REPORTING NOTES</h2><p></p><div class="reporting-note-actions-placeholder" data-reporting-note-actions="true"></div>',
        projectScoped: true,
        isBuiltin: true,
        attributes: [
            { name: 'status', type: 'label', dataType: 'select', options: ['active', 'archived'], defaultValue: 'active', isPromoted: true, label: 'Status' },
        ],
        relationships: [
            {
                id: 'rel_reporting_project',
                name: 'Project Hub',
                relationName: 'project',
                targetTemplateId: 'projectHub',
                targetTemplateName: 'Project Hub',
                isMulti: false,
                autoCloneToParent: true,
                inheritTopics: true,
                direction: 'parent',
            },
        ],
    },
    {
        id: 'person',
        marker: 'extPerson',
        title: 'Person',
        icon: 'user',
        category: 'people',
        rootContainerMarker: 'peopleRoot',
        titlePattern: '{title}',
        defaultContent: '<h2>CONTACT INFO</h2><p></p><h2>NOTES</h2><p></p>',
        isBuiltin: true,
        attributes: [
            { name: 'email', type: 'label', dataType: 'string', isPromoted: true, label: 'Email' },
            { name: 'phone', type: 'label', dataType: 'string', isPromoted: true, label: 'Phone' },
            { name: 'organization', type: 'relation', dataType: 'relation', targetTemplateId: 'organization', isPromoted: true, label: 'Organization' },
        ],
        relationships: [
            {
                id: 'rel_person_org',
                name: 'Organization',
                relationName: 'organization',
                targetTemplateId: 'organization',
                targetTemplateName: 'Organization',
                isMulti: false,
                autoCloneToParent: true,
                inheritTopics: true,
                direction: 'parent',
            },
        ],
    },
    {
        id: 'organization',
        marker: 'extOrganization',
        title: 'Organization',
        icon: 'buildings',
        category: 'people',
        rootContainerMarker: 'orgRoot',
        titlePattern: '{title}',
        defaultContent: '<h2>ABOUT</h2><p></p><h2>KEY CONTACTS</h2><ul><li></li></ul>',
        isBuiltin: true,
        attributes: [
            { name: 'website', type: 'label', dataType: 'string', isPromoted: true, label: 'Website' },
        ],
        relationships: [],
    },
    {
        id: 'topic',
        marker: 'extTopic',
        title: 'Topic',
        icon: 'purchase-tag',
        category: 'system',
        rootContainerMarker: 'topicRoot',
        titlePattern: '{title}',
        defaultContent: '<h2>DESCRIPTION</h2><p></p>',
        noJournalClone: true,
        isBuiltin: true,
        attributes: [
            { name: 'aliasOf', type: 'relation', dataType: 'relation', targetTemplateId: 'topic', isPromoted: true, label: 'Alias Of' },
        ],
        relationships: [],
    },
    {
        id: 'emailDraft',
        marker: 'extEmailDraft',
        title: 'Email Draft',
        icon: 'envelope',
        category: 'drafts',
        rootContainerMarker: 'emailRoot',
        titlePattern: 'Email: {title}',
        defaultContent: '<h2>RECIPIENTS</h2><p></p><h2>SUBJECT</h2><p></p><h2>BODY</h2><p></p>',
        projectScoped: true,
        isBuiltin: true,
        attributes: [
            { name: 'status', type: 'label', dataType: 'select', options: ['draft', 'sent', 'awaiting_reply'], isPromoted: true, label: 'Status' },
            { name: 'waitingOn', type: 'label', dataType: 'string', isPromoted: true, label: 'Waiting On' },
            { name: 'followUpDate', type: 'label', dataType: 'date', isPromoted: true, label: 'Follow-up Date' },
        ],
        relationships: [
            {
                id: 'rel_email_project',
                name: 'Project Hub',
                relationName: 'project',
                targetTemplateId: 'projectHub',
                targetTemplateName: 'Project Hub',
                isMulti: false,
                autoCloneToParent: true,
                inheritTopics: true,
                direction: 'parent',
            },
        ],
    },
];

export class TemplateEngine {
    private templates: Map<string, TemplateDefinition> = new Map();

    constructor(initialTemplates: TemplateDefinition[] = BUILTIN_TEMPLATES) {
        for (const tpl of initialTemplates) {
            this.templates.set(tpl.id, JSON.parse(JSON.stringify(tpl)));
        }
    }

    public getAllTemplates(): TemplateDefinition[] {
        return Array.from(this.templates.values());
    }

    public getTemplate(id: string): TemplateDefinition | undefined {
        return this.templates.get(id);
    }

    public getTemplateByMarker(marker: string): TemplateDefinition | undefined {
        for (const tpl of this.templates.values()) {
            if (tpl.marker === marker) return tpl;
        }
        return undefined;
    }

    public registerTemplate(template: TemplateDefinition): void {
        this.templates.set(template.id, JSON.parse(JSON.stringify(template)));
    }

    public updateTemplate(id: string, updates: Partial<TemplateDefinition>): TemplateDefinition {
        const existing = this.templates.get(id);
        if (!existing) {
            throw new Error(`Template with id '${id}' not found`);
        }
        const updated = { ...existing, ...updates, id };
        this.templates.set(id, updated);
        return updated;
    }

    public deleteTemplate(id: string): boolean {
        const tpl = this.templates.get(id);
        if (!tpl) return false;
        if (tpl.isBuiltin) {
            throw new Error(`Cannot delete built-in template '${id}'`);
        }
        return this.templates.delete(id);
    }

    public formatTitle(templateId: string, rawTitle: string, dateObj: Date = new Date()): string {
        const template = this.getTemplate(templateId);
        const pattern = template ? template.titlePattern : '{title}';
        
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        let formatted = pattern
            .replace('{title}', rawTitle || 'Untitled')
            .replace('YYYY-MM-DD', dateStr)
            .replace('{date}', dateStr);

        return formatted.trim();
    }

    public addPromotedAttribute(templateId: string, attribute: PromotedAttributeDef): TemplateDefinition {
        const template = this.getTemplate(templateId);
        if (!template) throw new Error(`Template '${templateId}' not found`);
        
        const index = template.attributes.findIndex(a => a.name === attribute.name);
        if (index >= 0) {
            template.attributes[index] = attribute;
        } else {
            template.attributes.push(attribute);
        }
        this.registerTemplate(template);
        return template;
    }

    public addRelationship(templateId: string, relationship: TemplateRelationshipDef): TemplateDefinition {
        const template = this.getTemplate(templateId);
        if (!template) throw new Error(`Template '${templateId}' not found`);

        const index = template.relationships.findIndex(r => r.id === relationship.id || r.relationName === relationship.relationName);
        if (index >= 0) {
            template.relationships[index] = relationship;
        } else {
            template.relationships.push(relationship);
        }
        this.registerTemplate(template);
        return template;
    }
}
