/**
 * Settings Studio Component: Package preferences, global toggles, and YAML Specification Manager.
 *
 * Laid out the way Trilium's own options pages are: a sticky page header, then
 * sections whose uppercase title sits above a card, and inside each card one row
 * per setting with the label and description on the leading edge and the control
 * on the trailing edge. See notes-system.css for the shared primitives.
 */

import { TodayEngine } from '../engine/todayEngine.js';
import { TemplateEngine } from '../engine/templateEngine.js';
import { RelationshipEngine } from '../engine/relationshipEngine.js';
import { IfThenRuleEngine } from '../engine/ifThenRuleEngine.js';
import { AutomationSettings, SettingsEngine } from '../engine/settingsEngine.js';
import { saveAutomationSetting } from '../engine/packagePersistence.js';
import { dumpYamlSpec, parseAndApplyYamlSpec } from '../engine/yamlSpec.js';
import { escapeHtml, pageHeader, row, section, switchRow } from './nativeUi.js';

export function renderSettingsStudio(
    container: HTMLElement,
    todayEngine: TodayEngine,
    templateEngine: TemplateEngine,
    relationshipEngine: RelationshipEngine,
    ifThenRuleEngine: IfThenRuleEngine,
    settingsEngine: SettingsEngine,
    onSaveSettings?: (yamlSpec: string) => Promise<void>
): void {
    let importError = '';
    let importSuccess = '';
    let settingsError = '';

    function render() {
        container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'settings-studio-container';

        wrapper.appendChild(pageHeader({
            icon: 'bx-slider-alt',
            title: 'Package Settings',
            subtitle: 'Automation preferences and the YAML specification for this package.',
        }));

        renderPreferences(wrapper);
        renderYamlSpecification(wrapper);

        container.appendChild(wrapper);
    }

    function renderPreferences(parent: HTMLElement) {
        const { card } = section(parent, {
            title: 'Automation',
            description: 'Saved to this package’s manifest note, so they persist across reloads and are visible from Trilium’s Plugins settings too.',
        });

        if (settingsError) {
            const status = document.createElement('div');
            status.className = 'alert alert-danger';
            status.textContent = settingsError;
            card.appendChild(status);
        }

        card.appendChild(switchRow({
            id: 'ifThenRulesToggle',
            label: 'Auto-execute if/then automation rules',
            description: 'Evaluate if/then automation rules when creating tasks, story drafts, or project hubs.',
            checked: settingsEngine.get('autoRunIfThenRulesOnCreation'),
            onChange: (checked) => applySetting('autoRunIfThenRulesOnCreation', checked),
        }));

        card.appendChild(switchRow({
            id: 'derivedTopicsToggle',
            label: 'Enable derived topic propagation',
            description: 'Inherit topic tags from parent project hubs, organizations, or person relations.',
            checked: settingsEngine.get('enableDerivedTopics'),
            onChange: (checked) => applySetting('enableDerivedTopics', checked),
        }));

        card.appendChild(switchRow({
            id: 'autoJournalCloneToggle',
            label: "File new notes under today's journal note",
            description: "Master switch for the per-category setting in Template Studio. Off disables journal filing everywhere; on, each category still decides for itself, and a note already auto-cloned to a project never also files under the journal.",
            checked: settingsEngine.get('autoJournalClone'),
            onChange: (checked) => applySetting('autoJournalClone', checked),
        }));

        const tplInput = document.createElement('input');
        tplInput.type = 'text';
        tplInput.className = 'form-control form-control-sm';
        tplInput.id = 'default-capture-tpl';
        tplInput.value = settingsEngine.get('defaultQuickCaptureTemplate') || 'task';
        tplInput.addEventListener('change', () => applySetting('defaultQuickCaptureTemplate', tplInput.value.trim() || 'task'));
        card.appendChild(row(tplInput, {
            label: 'Default Quick Capture template ID',
            description: 'Template ID opened by default when clicking the global header Quick Capture button (e.g. task, meeting, story).',
            htmlFor: 'default-capture-tpl',
        }));

        const staleInput = document.createElement('input');
        staleInput.type = 'number';
        staleInput.className = 'form-control form-control-sm';
        staleInput.id = 'stale-threshold-input';
        staleInput.value = String(settingsEngine.get('staleThresholdDays') ?? 14);
        staleInput.addEventListener('change', () => applySetting('staleThresholdDays', Math.max(1, parseInt(staleInput.value, 10) || 14)));
        card.appendChild(row(staleInput, {
            label: 'Stale Notes inactivity threshold (days)',
            description: 'Active notes unmodified for longer than this threshold appear in the Stale Notes review list.',
            htmlFor: 'stale-threshold-input',
        }));

        const goalInput = document.createElement('input');
        goalInput.type = 'number';
        goalInput.className = 'form-control form-control-sm';
        goalInput.id = 'writing-goal-input';
        goalInput.value = String(settingsEngine.get('writingGoalWords') ?? 500);
        goalInput.addEventListener('change', () => applySetting('writingGoalWords', Math.max(50, parseInt(goalInput.value, 10) || 500)));
        card.appendChild(row(goalInput, {
            label: 'Daily writing target (words)',
            description: 'Word count target for the Writing Goal progress bar and activity heatmap on the Today Homepage.',
            htmlFor: 'writing-goal-input',
        }));
    }

    function applySetting<K extends keyof AutomationSettings>(key: K, value: AutomationSettings[K]): void {
        const previous = settingsEngine.get(key);
        settingsEngine.set(key, value);
        settingsError = '';
        saveAutomationSetting(key, value as any).catch((err: Error) => {
            settingsEngine.set(key, previous);
            settingsError = `Could not save this setting: ${err.message}`;
            render();
        });
    }

    function renderYamlSpecification(parent: HTMLElement) {
        const yamlContent = dumpYamlSpec(
            todayEngine.getLayout(),
            templateEngine,
            relationshipEngine,
            ifThenRuleEngine
        );

        const { card } = section(parent, {
            title: 'Specification',
            description:
                'The complete package as YAML: Today Homepage layout, every template, relationship rules, and automation trees. Edit and save to apply.',
        });

        const status = document.createElement('div');
        if (importError) {
            status.className = 'alert alert-danger';
            status.textContent = importError;
            card.appendChild(status);
        } else if (importSuccess) {
            status.className = 'alert alert-success';
            status.textContent = importSuccess;
            card.appendChild(status);
        }

        const field = document.createElement('div');
        field.className = 'ns-field';
        field.innerHTML = `
            <textarea class="form-control ns-code" rows="18" spellcheck="false">${escapeHtml(yamlContent)}</textarea>
        `;
        card.appendChild(field);

        const actions = document.createElement('div');
        actions.className = 'ns-actions ns-actions-end';
        actions.style.marginTop = '14px';
        actions.innerHTML = `
            <button type="button" class="btn btn-sm btn-secondary copy-yaml-btn"><span class="bx bx-copy"></span> Copy</button>
            <button type="button" class="btn btn-sm btn-primary save-yaml-btn"><span class="bx bx-save"></span> Save specification</button>
        `;
        card.appendChild(actions);

        const textarea = field.querySelector('textarea') as HTMLTextAreaElement;

        actions.querySelector<HTMLButtonElement>('.copy-yaml-btn')!.addEventListener('click', () => {
            navigator.clipboard.writeText(textarea.value);
            importSuccess = 'Specification copied to clipboard.';
            importError = '';
            render();
        });

        actions.querySelector<HTMLButtonElement>('.save-yaml-btn')!.addEventListener('click', () => {
            const res = parseAndApplyYamlSpec(textarea.value, todayEngine, templateEngine, ifThenRuleEngine);
            if (!res.success) {
                importError = res.message;
                importSuccess = '';
                render();
                return;
            }

            importSuccess = res.message;
            importError = '';
            render();

            if (onSaveSettings) {
                onSaveSettings(textarea.value).catch((err: Error) => {
                    importError = `Applied in this session, but could not save to the manifest note: ${err.message}`;
                    importSuccess = '';
                    render();
                });
            }
        });
    }

    render();
}
