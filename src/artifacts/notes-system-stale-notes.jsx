/**
 * Ikmal Stale Note Reviewer (Standalone JSX Render Note)
 * Displays active untouched notes older than N days as an independent render note widget.
 */

import { SettingsEngine } from '../engine/settingsEngine.js';
import { escapeHtml, section, emptyState, listItem } from '../components/nativeUi.js';
import { findStaleNotes } from '../engine/noteInsightsEngine.js';

export function initIkmalStaleNotes(containerEl) {
    const settingsEngine = new SettingsEngine();
    const shell = document.createElement('div');
    shell.className = 'notes-system-shell p-3';

    const { card } = section(shell, {
        title: 'Ikmal Stale Notes Reviewer',
        description: 'Active tasks and drafts untouched for longer than the configured threshold.',
    });

    function loadNotes() {
        if (typeof api === 'undefined' || !api.searchForNotes) {
            const sample = [
                { id: '1', title: 'Untouched Specification Draft', daysSinceModified: 21 },
                { id: '2', title: 'Legacy Architecture Review', daysSinceModified: 18 },
            ];
            renderList(sample);
            return;
        }

        const threshold = settingsEngine.get('staleThresholdDays') ?? 14;

        api.searchForNotes('#extTask, #story, #meeting, #scratch').then((notes) => {
            const summaries = (notes || []).map((n) => ({
                id: n.noteId,
                title: n.title || 'Untitled',
                utcDateModified: (n.labels || []).find((l) => l.name === 'utcDateModified')?.value || new Date().toISOString(),
                status: (n.labels || []).find((l) => l.name === 'status')?.value || '',
            }));
            const stale = findStaleNotes(summaries, new Date(), threshold);
            renderList(stale);
        }).catch(() => {
            renderList([]);
        });
    }

    function renderList(stale) {
        if (!stale.length) {
            card.appendChild(emptyState('No stale notes found! All active notes are up to date.'));
            return;
        }

        for (const entry of stale.slice(0, 10)) {
            card.appendChild(listItem({
                icon: 'bx-time-five',
                title: entry.title,
                description: `Untouched for ${entry.daysSinceModified} days`,
                actions: typeof api !== 'undefined' && api.openNote ? [{
                    icon: 'bx-link-external',
                    title: `Open ${entry.title}`,
                    onClick: () => api.openNote(entry.id),
                }] : [],
            }));
        }
    }

    shell.appendChild(card);
    containerEl.appendChild(shell);
    loadNotes();
}

if (typeof api !== 'undefined' || typeof window !== 'undefined') {
    const init = () => {
        const container = (typeof api !== 'undefined' && api.$container && (api.$container[0] || api.$container))
            || document.querySelector('.ikmal-stale-notes-root')
            || document.body;
        if (container) {
            initIkmalStaleNotes(container);
        }
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
