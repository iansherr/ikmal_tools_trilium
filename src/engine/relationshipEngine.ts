/**
 * Relationship Engine: Manages relational graphs between templates, parent-child links,
 * auto-cloning destinations, and topic inheritance.
 */

import { TemplateDefinition, TemplateRelationshipDef } from './types.js';
import { TemplateEngine } from './templateEngine.js';

export interface RelationMapping {
    sourceNoteId: string;
    relationName: string;
    targetNoteId: string;
    targetTemplateId?: string;
    autoCloneToTarget: boolean;
    inheritTopics: boolean;
}

export interface DerivedTopicResult {
    noteId: string;
    explicitTopics: string[];
    derivedTopics: string[];
    allTopics: string[];
}

export class RelationshipEngine {
    constructor(private templateEngine: TemplateEngine) {}

    /**
     * Given a source template and relation values, computes where the note should be cloned,
     * what labels/relations should be attached, and what topics should be inherited.
     */
    public resolveCreationRelations(
        templateId: string,
        relationValues: Record<string, string | string[]>
    ): {
        autoCloneContainers: string[];
        inheritedTopicSources: string[];
        relationLabels: Array<{ name: string; value: string }>;
    } {
        const template = this.templateEngine.getTemplate(templateId);
        const autoCloneContainers: string[] = [];
        const inheritedTopicSources: string[] = [];
        const relationLabels: Array<{ name: string; value: string }> = [];

        if (!template) {
            return { autoCloneContainers, inheritedTopicSources, relationLabels };
        }

        for (const relDef of template.relationships) {
            const val = relationValues[relDef.relationName];
            if (!val) continue;

            const targetNoteIds = Array.isArray(val) ? val : [val];
            for (const targetId of targetNoteIds) {
                if (!targetId) continue;
                
                relationLabels.push({ name: relDef.relationName, value: targetId });

                if (relDef.autoCloneToParent) {
                    autoCloneContainers.push(targetId);
                }

                if (relDef.inheritTopics) {
                    inheritedTopicSources.push(targetId);
                }
            }
        }

        return { autoCloneContainers, inheritedTopicSources, relationLabels };
    }

    /**
     * Calculates derived topics for a note based on its explicit topics and
     * the topics assigned to its relational parent notes (e.g. Project, Client, Org).
     */
    public computeDerivedTopics(
        explicitTopicIds: string[],
        parentTopicMap: Record<string, string[]>
    ): DerivedTopicResult {
        const explicitSet = new Set(explicitTopicIds);
        const derivedSet = new Set<string>();

        for (const parentId of Object.keys(parentTopicMap)) {
            const parentTopics = parentTopicMap[parentId] || [];
            for (const topicId of parentTopics) {
                if (!explicitSet.has(topicId)) {
                    derivedSet.add(topicId);
                }
            }
        }

        const derivedTopics = Array.from(derivedSet);
        const allTopics = Array.from(new Set([...explicitTopicIds, ...derivedTopics]));

        return {
            noteId: '',
            explicitTopics: explicitTopicIds,
            derivedTopics,
            allTopics,
        };
    }
}
