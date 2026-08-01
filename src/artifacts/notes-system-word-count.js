/**
 * Ikmal Notes for Trilium: Live Editor Status Bar Word Count Script
 * Displays real-time word count, character count, and estimated reading time
 * in Trilium's editor status bar while editing note bodies.
 */

import { countWords } from '../engine/noteInsightsEngine.js';
import { escapeHtml } from '../components/nativeUi.js';

(function initLiveWordCount() {
    if (typeof document === 'undefined') return;

    let updateTimeout = null;

    function updateWordCountPill() {
        const editor = document.querySelector('.ck-content') || document.querySelector('.note-detail-editable-text-editor');
        if (!editor) return;

        const textContent = editor.innerHTML || editor.textContent || '';
        const words = countWords(textContent);
        const chars = (editor.textContent || '').length;
        const readingTimeMin = Math.max(1, Math.ceil(words / 200));

        let pill = document.getElementById('ikmal-editor-word-count');
        if (!pill) {
            const statusBar = document.querySelector('.note-status-bar') || document.querySelector('.status-bar') || document.querySelector('.note-detail-page') || document.body;
            pill = document.createElement('div');
            pill.id = 'ikmal-editor-word-count';
            pill.className = 'ikmal-word-count-pill badge bg-light text-dark border d-inline-flex align-items-center gap-1 px-2 py-1 small me-2';
            statusBar.appendChild(pill);
        }

        pill.innerHTML = `<i class="bx bx-text text-primary"></i> ${words} words &middot; ${chars} chars &middot; ${readingTimeMin} min read`;
    }

    function scheduleUpdate() {
        if (updateTimeout) clearTimeout(updateTimeout);
        updateTimeout = setTimeout(updateWordCountPill, 300);
    }

    // Attach listeners to document input & mutation
    document.addEventListener('input', scheduleUpdate, true);
    document.addEventListener('keyup', scheduleUpdate, true);

    const observer = new MutationObserver(scheduleUpdate);
    observer.observe(document.body, { childList: true, subtree: true });

    scheduleUpdate();
    console.log('[Ikmal Notes] Live Editor Status Bar Word Count active.');
})();
