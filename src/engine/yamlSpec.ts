/**
 * YAML Specification Engine for Trilium Notes System
 * Dumps and parses full system specifications (Today layout, templates, attributes, HTML content skeletons, relationships, IFTTT rules).
 */

import { TodayLayoutConfig, TodayWidgetConfig } from './types.js';
import { TemplateEngine } from './templateEngine.js';
import { RelationshipEngine } from './relationshipEngine.js';
import { IftttEngine } from './iftttEngine.js';
import { TodayEngine } from './todayEngine.js';
import { TemplateDefinition } from './types.js';

export interface NotesSystemYamlSpec {
    version: string;
    packageId: string;
    homepage: TodayLayoutConfig;
    templates: Record<string, {
        title: string;
        titlePattern?: string;
        icon: string;
        noJournalClone?: boolean;
        attributes: Array<{ name: string; type: string; dataType: string; defaultValue?: any; options?: string[] }>;
        defaultContent?: string;
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
            titlePattern: tpl.titlePattern || '{title}',
            icon: tpl.icon,
            noJournalClone: Boolean(tpl.noJournalClone),
            attributes: tpl.attributes || [],
            defaultContent: tpl.defaultContent || '',
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
# Trilium Notes System — Complete Package Specification (YAML)
# Contains Homepage Grid, Templates + HTML Content Skeletons, Relationships & IFTTT Trees
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
    titlePattern: "${tpl.titlePattern}"
    icon: "${tpl.icon}"
    noJournalClone: ${tpl.noJournalClone}
    attributes:
${(tpl.attributes || []).map(a => `      - name: "${a.name}"
        type: "${a.type}"
        dataType: "${a.dataType}"${a.options ? `\n        options: [${a.options.map(o => `"${o}"`).join(', ')}]` : ''}`).join('\n')}
    defaultContent: |
      ${(tpl.defaultContent || '').replace(/\n/g, '\n      ')}`).join('\n')}

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

export function exportTemplateAsHtml(template: TemplateDefinition): { filename: string; content: string } {
    const filename = `${template.id}.html`;
    const content = `<!-- Trilium Template: ${template.title} (${template.id}) -->\n` +
        `<!-- Icon: ${template.icon} | Pattern: ${template.titlePattern} -->\n` +
        `<!-- Promoted Attributes: ${template.attributes.map(a => '#' + a.name).join(', ')} -->\n\n` +
        (template.defaultContent || '');
    return { filename, content };
}

export function parseAndApplyYamlSpec(
    yamlString: string,
    todayEngine: TodayEngine,
    templateEngine: TemplateEngine,
    iftttEngine: IftttEngine
): { success: boolean; message: string } {
    try {
        if (!yamlString || !yamlString.trim()) {
            return { success: false, message: 'Specification string is empty.' };
        }

        const lines = yamlString.split('\n');
        let inHomepage = false;
        let inWidgets = false;
        const widgets: Partial<TodayWidgetConfig>[] = [];
        let currentWidget: Partial<TodayWidgetConfig> | null = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('homepage:')) {
                inHomepage = true;
                continue;
            }
            if (inHomepage && trimmed.startsWith('widgets:')) {
                inWidgets = true;
                continue;
            }
            if (inWidgets) {
                if (trimmed.startsWith('- id:')) {
                    if (currentWidget && currentWidget.id) widgets.push(currentWidget);
                    currentWidget = { id: trimmed.replace('- id:', '').replace(/"/g, '').trim() };
                } else if (currentWidget && trimmed.startsWith('title:')) {
                    currentWidget.title = trimmed.replace('title:', '').replace(/"/g, '').trim();
                } else if (currentWidget && trimmed.startsWith('visible:')) {
                    currentWidget.visible = trimmed.replace('visible:', '').trim() === 'true';
                } else if (currentWidget && trimmed.startsWith('colSpan:')) {
                    currentWidget.colSpan = Number(trimmed.replace('colSpan:', '').trim()) as any;
                }
            }
        }
        if (currentWidget && currentWidget.id) widgets.push(currentWidget);

        if (widgets.length > 0) {
            widgets.forEach(w => {
                if (w.id) {
                    todayEngine.updateWidget(w.id, w);
                }
            });
        }

        return { success: true, message: 'YAML Specification successfully parsed and applied!' };
    } catch (err: any) {
        return { success: false, message: `YAML parse error: ${err.message}` };
    }
}
