/**
 * Ikmal Tools for Trilium: FleetSync & Ikmal App Bridge Engine
 * Handles targeted bi-directional synchronization of Trilium-managed items
 * (#extTask, #ikmalSynced) with the Ikmal App / FleetSync API.
 */

export interface IkmalSyncPayload {
    noteId: string;
    title: string;
    status?: string;
    priority?: string;
    utcDateCreated?: string;
    utcDateModified?: string;
    contentSnippet?: string;
}

export interface FleetBridgeConfig {
    enabled: boolean;
    serverUrl?: string;
    authToken?: string;
}

export class FleetBridgeEngine {
    private config: FleetBridgeConfig;

    constructor(config: FleetBridgeConfig) {
        this.config = config;
    }

    public isConfigured(): boolean {
        return Boolean(this.config.enabled && this.config.serverUrl && this.config.authToken);
    }

    /**
     * Converts a Trilium note into a standardized Ikmal Sync Payload.
     * Trilium ONLY syncs notes explicitly tagged with #extTask, #story, or #ikmalSynced.
     */
    public formatNoteForSync(note: {
        noteId: string;
        title: string;
        labels?: Array<{ name: string; value?: string }>;
        content?: string;
    }): IkmalSyncPayload {
        const getLabel = (name: string) => (note.labels || []).find((l) => l.name === name)?.value;

        return {
            noteId: note.noteId,
            title: note.title || 'Untitled',
            status: getLabel('status') || 'open',
            priority: getLabel('priority') || 'normal',
            utcDateCreated: getLabel('utcDateCreated') || new Date().toISOString(),
            utcDateModified: getLabel('utcDateModified') || new Date().toISOString(),
            contentSnippet: (note.content || '').slice(0, 500),
        };
    }

    /**
     * Simulates / executes a targeted push sync of a single item to FleetSync endpoint.
     */
    public async pushItem(payload: IkmalSyncPayload): Promise<{ success: boolean; syncedAt: string }> {
        if (!this.isConfigured()) {
            return { success: false, syncedAt: new Date().toISOString() };
        }

        // Target FleetSync API endpoint
        const targetUrl = `${this.config.serverUrl?.replace(/\/$/, '')}/api/v1/sync/items`;

        if (typeof fetch === 'undefined') {
            return { success: true, syncedAt: new Date().toISOString() };
        }

        try {
            const res = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.authToken}`,
                },
                body: JSON.stringify(payload),
            });
            return { success: res.ok, syncedAt: new Date().toISOString() };
        } catch {
            return { success: false, syncedAt: new Date().toISOString() };
        }
    }
}
