/**
 * YAML Specification Engine for Trilium Notes System
 * Converts system state (Today layout, templates, relationships, IFTTT rules)
 * to/from clean, human-readable YAML specifications.
 */

import { TodayLayoutConfig } from './types.js';
import { TemplateEngine } from './templateEngine.js';
import { RelationshipEngine } from './relationshipEngine.js';
import { IftttEngine } from './iftttEngine.js';

export interface NotesSystemYamlSpec {
    version: string;
    packageId: string;
    homepage: TodayLayoutConfig;
    templates: Record<string, {
        title: string;
        icon: string;
        noJournalClone?: boolean;
        fields: Array<{ name: string; type: string; default?: any }>;
    }>;
    relationships: {
        autoCloning: Array<{ parentType: string; childType: string }>;
        derivedTopics: Array<{ relation: string; targetTopic: string }>;
    };
    iftttRules: Array<{
        id: string;
        ruleName: string;
        enabled: boolean;
        trigger: string;
        conditions: Array<{ field: string; operator: string; value: any }>;
        actions: Array<{ actionType: string; target?: string; value?: any }>;
    }>;
    preferences: {
        autoRunIftttOnCreation: boolean;
        enableDerivedTopics: boolean;
        autoJournalClone: boolean;
    };
}

export function dumpYamlSpec(
    todayLayout: TodayLayoutConfig,
    templateEngine: TemplateEngine,
    relationshipEngine: RelationshipEngine,
    iftttEngine: IftttEngine
): string {
    const templatesMap: Record<string, any> = {};
    for (const tpl of templateEngine.getAllTemplates()) {
        templatesMap[tpl.id] = {
            title: tpl.title,
            icon: tpl.icon,
            noJournalClone: Boolean(tpl.noJournalClone),
            fields: tpl.fields,
        };
    }

    const spec: NotesSystemYamlSpec = {
        version: '1.0.0',
        packageId: 'iansherr/notes-system',
        homepage: todayLayout,
        templates: templatesMap,
        relationships: {
            autoCloning: [
                { parentType: 'projectHub', childType: 'projectTask' },
                { parentType: 'projectHub', childType: 'story' },
                { parentType: 'person', childType: 'meeting' },
                { parentType: 'organization', childType: 'meeting' },
            ],
            derivedTopics: [
                { relation: 'project', targetTopic: 'projectTopic' },
                { relation: 'client', targetTopic: 'clientTopic' },
                { relation: 'organization', targetTopic: 'orgTopic' },
            ],
        },
        iftttRules: iftttEngine.getAllRules(),
        preferences: {
            autoRunIftttOnCreation: true,
            enableDerivedTopics: true,
            autoJournalClone: true,
        },
    };

    return `# ==============================================================================
# Trilium Notes System — Package Specification (YAML)
# Edit this specification to customize components, templates, relationships & IFTTT rules.
# ==============================================================================

version: "${spec.version}"
packageId: "${spec.packageId}"

preferences:
  autoRunIftttOnCreation: ${spec.preferences.autoRunIftttOnCreation}
  enableDerivedTopics: ${spec.preferences.enableDerivedTopics}
  autoJournalClone: ${spec.preferences.autoJournalClone}

homepage:
  journalWidthPercent: ${spec.homepage.journalWidthPercent}
  showQuickCaptureBar: ${spec.homepage.showQuickCaptureBar}
  widgets:
${spec.homepage.widgets.map(w => `    - id: "${w.id}"
      title: "${w.title}"
      marker: "${w.marker}"
      visible: ${w.visible}
      order: ${w.order}
      colSpan: ${w.colSpan}`).join('\n')}

templates:
${Object.entries(spec.templates).map(([id, tpl]) => `  ${id}:
    title: "${tpl.title}"
    icon: "${tpl.icon}"
    noJournalClone: ${tpl.noJournalClone}
    fields:
${tpl.fields.map(f => `      - name: "${f.name}"
        type: "${f.type}"`).join('\n')}`).join('\n')}

relationships:
  autoCloning:
${spec.relationships.autoCloning.map(r => `    - parentType: "${r.parentType}"\n      childType: "${r.childType}"`).join('\n')}
  derivedTopics:
${spec.relationships.derivedTopics.map(d => `    - relation: "${d.relation}"\n      targetTopic: "${d.targetTopic}"`).join('\n')}

iftttRules:
${spec.iftttRules.map(rule => `  - id: "${rule.id}"
    ruleName: "${rule.ruleName}"
    enabled: ${rule.enabled}
    trigger: "${rule.trigger}"
    conditions:
${rule.conditions.map(c => `      - field: "${c.field}"\n        operator: "${c.operator}"\n        value: "${c.value}"`).join('\n')}
    actions:
${rule.actions.map(a => `      - actionType: "${a.actionType}"\n        target: "${a.target || ''}"\n        value: "${a.value || ''}"`).join('\n')}`).join('\n')}
`;
}
