/**
 * Turns a NoteCreationPlan (see noteCreationEngine.ts) into a real note in
 * Trilium's note tree: creates it under its root container with its computed
 * labels/relations, clones it under every auto-clone target and today's
 * journal note when the plan calls for it, and creates its child notes.
 *
 * `api.createNote` is the only piece of this exposed on the frontend script
 * API. Cloning a note to a second parent isn't — Trilium's own client uses
 * `PUT notes/{childNoteId}/clone-to-note/{parentNoteId}` (branches.ts) for
 * that, which this replicates with the same authenticated-fetch-plus-CSRF-
 * retry convention packagePersistence.ts uses for the same reason (no
 * `runOnBackend`, since backendScriptingEnabled is commonly off).
 */

import { NoteCreationPlan } from './noteCreationEngine.js';
import { RelationshipEngine } from './relationshipEngine.js';
import { TemplateEngine } from './templateEngine.js';

interface TriliumFNote {
    noteId: string;
    title: string;
    attributes?: Array<{ type?: 'label' | 'relation'; name: string; value?: string; targetNoteId?: string }>;
    getRelations?: (name: string) => Array<{ targetNoteId?: string; value?: string }>;
}

interface CreateNoteOpts {
    title?: string;
    content?: string;
    type?: string;
    activate?: boolean;
    attributes?: Array<{ type: 'label' | 'relation'; name: string; value?: string; isInheritable?: boolean }>;
}

interface TriliumFrontendApi {
    searchForNote(searchString: string): Promise<TriliumFNote | null>;
    searchForNotes(searchString: string): Promise<TriliumFNote[]>;
    getNote?(noteId: string): Promise<TriliumFNote | null>;
    createNote(parentNotePath: string, opts?: CreateNoteOpts): Promise<{ note: TriliumFNote | null }>;
    getTodayNote(): Promise<TriliumFNote | null>;
}

function triliumApi(): TriliumFrontendApi | null {
    const a = (globalThis as any).api;
    return a && typeof a.createNote === 'function' ? a : null;
}

async function fetchNoteTopics(api: TriliumFrontendApi, noteId: string): Promise<string[]> {
    try {
        if (typeof api.getNote !== 'function') return [];
        const note = await api.getNote(noteId);
        if (!note) return [];
        const topics: string[] = [];

        if (typeof note.getRelations === 'function') {
            const rels = note.getRelations('topic') || [];
            for (const rel of rels) {
                const targetId = rel.targetNoteId || rel.value;
                if (targetId) topics.push(targetId);
            }
        }

        if (Array.isArray(note.attributes)) {
            for (const attr of note.attributes) {
                if (attr.name === 'topic') {
                    const targetId = attr.targetNoteId || attr.value;
                    if (targetId && !topics.includes(targetId)) {
                        topics.push(targetId);
                    }
                }
            }
        }

        return topics;
    } catch {
        return [];
    }
}

/**
 * Merges derived topics into the plan's relationsToCreate array using RelationshipEngine.
 * Pure/isolated logic so it can be called and tested independently.
 */
export function applyDerivedTopics(
    plan: NoteCreationPlan,
    parentTopicMap: Record<string, string[]>,
    relEngine: RelationshipEngine = new RelationshipEngine(new TemplateEngine())
): void {
    if (!plan.inheritedTopicSources || plan.inheritedTopicSources.length === 0) return;

    const explicitTopicIds = plan.relationsToCreate
        .filter((r) => r.name === 'topic')
        .map((r) => r.value);

    const derivedRes = relEngine.computeDerivedTopics(explicitTopicIds, parentTopicMap);

    for (const derivedTopicId of derivedRes.derivedTopics) {
        if (!plan.relationsToCreate.some((r) => r.name === 'topic' && r.value === derivedTopicId)) {
            plan.relationsToCreate.push({ name: 'topic', value: derivedTopicId });
        }
    }
}

async function cloneNoteToParentNote(childNoteId: string, parentNoteId: string): Promise<void> {
    const glob = (globalThis as any).glob;
    if (!glob) throw new Error('Not running inside Trilium.');

    const headers: Record<string, string> = {
        'x-csrf-token': glob.csrfToken,
        'trilium-component-id': glob.componentId,
        'content-type': 'application/json',
    };
    const path = `${glob.baseApiUrl}notes/${childNoteId}/clone-to-note/${parentNoteId}`;
    const send = () => (globalThis as any).fetch(path, {
        method: 'PUT',
        credentials: 'same-origin',
        headers,
        body: JSON.stringify({}),
    });

    let response = await send();
    if (response.status === 403) {
        const bootstrapUrl = `./bootstrap${(globalThis as any).location?.search ?? ''}`;
        const bootstrap = await (globalThis as any).fetch(bootstrapUrl, { credentials: 'same-origin', cache: 'no-store' });
        if (bootstrap.ok) {
            const refreshed = await bootstrap.json();
            glob.csrfToken = refreshed.csrfToken;
            headers['x-csrf-token'] = refreshed.csrfToken;
            response = await send();
        }
    }

    if (!response.ok) {
        throw new Error(`Failed to file the note under ${parentNoteId} (HTTP ${response.status})`);
    }
}

/** Pure — the part of "where does this note go" that doesn't need Trilium, so it's unit-testable. */
export function buildAttributeRows(plan: NoteCreationPlan): Array<{ type: 'label' | 'relation'; name: string; value: string }> {
    return [
        ...plan.labelsToCreate.map((l) => ({ type: 'label' as const, name: l.name, value: l.value })),
        ...plan.relationsToCreate.map((r) => ({ type: 'relation' as const, name: r.name, value: r.value })),
    ];
}

export interface MaterializeResult {
    noteId: string;
    title: string;
    /** Container noteIds the note ended up filed under, beyond its root container — auto-clone targets plus today's journal, in that order. */
    clonedUnder: string[];
    childNoteIds: string[];
}

/** Resolves where a plan's note goes: an explicit target, or a search for its root container's marker. */
async function resolveParentNoteId(api: TriliumFrontendApi, plan: NoteCreationPlan): Promise<string> {
    if (plan.targetContainerId) return plan.targetContainerId;

    const container = await api.searchForNote(`#${plan.rootContainerMarker}`);
    if (!container) {
        throw new Error(`Could not find a container note tagged #${plan.rootContainerMarker}.`);
    }
    return container.noteId;
}

export async function materializeNoteCreation(
    plan: NoteCreationPlan,
    options?: {
        relationshipEngine?: RelationshipEngine;
        topicFetcher?: (noteId: string) => Promise<string[]>;
    }
): Promise<MaterializeResult> {
    const api = triliumApi();
    if (!api) throw new Error('Not running inside Trilium.');

    if (plan.inheritedTopicSources && plan.inheritedTopicSources.length > 0) {
        const parentTopicMap: Record<string, string[]> = {};
        for (const sourceId of plan.inheritedTopicSources) {
            parentTopicMap[sourceId] = options?.topicFetcher
                ? await options.topicFetcher(sourceId)
                : await fetchNoteTopics(api, sourceId);
        }
        const relEngine = options?.relationshipEngine ?? new RelationshipEngine(new TemplateEngine());
        applyDerivedTopics(plan, parentTopicMap, relEngine);
    }

    const parentNoteId = await resolveParentNoteId(api, plan);

    const { note } = await api.createNote(parentNoteId, {
        title: plan.formattedTitle,
        content: plan.content,
        type: 'text',
        activate: false,
        attributes: buildAttributeRows(plan),
    });
    if (!note) throw new Error('Trilium did not return the created note.');

    const clonedUnder: string[] = [];
    for (const containerId of plan.autoCloneContainers) {
        await cloneNoteToParentNote(note.noteId, containerId);
        clonedUnder.push(containerId);
    }

    if (plan.journalClone) {
        const journalNote = await api.getTodayNote();
        if (journalNote) {
            await cloneNoteToParentNote(note.noteId, journalNote.noteId);
            clonedUnder.push(journalNote.noteId);
        }
    }

    const childNoteIds: string[] = [];
    for (const child of plan.childNotesToCreate ?? []) {
        const { note: childNote } = await api.createNote(note.noteId, {
            title: child.title,
            activate: false,
            attributes: child.labels.map((l) => ({ type: 'label' as const, name: l.name, value: l.value })),
        });
        if (childNote) childNoteIds.push(childNote.noteId);
    }

    return { noteId: note.noteId, title: note.title, clonedUnder, childNoteIds };
}
