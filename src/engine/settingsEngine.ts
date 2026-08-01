/**
 * Package-level automation settings: the "Automation" toggles on the Settings
 * page, and the runtime gates they control.
 *
 * Defaults here must match the `settings` array in trilium-package.json — a
 * test (`settings defaults match the manifest`) checks that they stay in
 * sync, since nothing at runtime reads the manifest file directly.
 */

export interface AutomationSettings {
    autoRunIfThenRulesOnCreation: boolean;
    enableDerivedTopics: boolean;
    autoJournalClone: boolean;
}

export const DEFAULT_AUTOMATION_SETTINGS: AutomationSettings = {
    autoRunIfThenRulesOnCreation: true,
    enableDerivedTopics: true,
    autoJournalClone: true,
};

export class SettingsEngine {
    private settings: AutomationSettings;

    constructor(initial?: Partial<AutomationSettings>) {
        this.settings = { ...DEFAULT_AUTOMATION_SETTINGS, ...initial };
    }

    public get<K extends keyof AutomationSettings>(key: K): AutomationSettings[K] {
        return this.settings[key];
    }

    public getAll(): AutomationSettings {
        return { ...this.settings };
    }

    public set<K extends keyof AutomationSettings>(key: K, value: AutomationSettings[K]): void {
        this.settings[key] = value;
    }
}
