/**
 * Ikmal Notes for Trilium: Live Editor Status Bar Word Count Script
 * Displays real-time word count, character count, and estimated reading time
 * in each editable note surface while editing note bodies. A selected passage
 * also gets a compact context menu with selection statistics and local editor
 * diagnostics.
 */

import { countWords } from '../engine/noteInsightsEngine.js';

(function initLiveWordCount() {
    if (typeof document === 'undefined') return;

    let updateTimeout = null;
    const duplicateHighlightName = 'ikmal-duplicate-words';
    const duplicateWordPattern = /\b([A-Za-z][A-Za-z'-]*)\b[ \t]+\b\1\b/gi;

    function editorElements() {
        // Do not filter by geometry here. Trilium keeps inactive split panes in
        // the DOM; attaching to all of them means the footer is ready when a
        // pane becomes active, and also covers editors created after startup.
        return [...document.querySelectorAll('.note-detail-editable-text-editor')];
    }

    function noteWindowFor(editor) {
        return editor.closest('.component.note-split') || editor.closest('.component.scrolling-container') || editor.closest('.component.note-detail') || editor.closest('.note-detail-editable-text');
    }

    function bindEditorActivity(editor) {
        if (editor.dataset.ikmalEditorBound === 'true') return;
        editor.dataset.ikmalEditorBound = 'true';
        const updateActivity = () => {
            const noteWindow = noteWindowFor(editor);
            if (noteWindow) noteWindow.classList.add('ikmal-editor-active');
        };
        const clearActivity = () => {
            setTimeout(() => {
                const activeEditor = document.activeElement?.closest?.('.note-detail-editable-text-editor');
                if (activeEditor !== editor) noteWindowFor(editor)?.classList.remove('ikmal-editor-active');
            }, 0);
        };
        editor.addEventListener('focusin', updateActivity);
        editor.addEventListener('focusout', clearActivity);
        if (editor.matches(':focus') || editor.contains(document.activeElement)) updateActivity();
    }

    function footerFor(editor) {
        const host = editor.closest('.note-detail-editable-text');
        const noteWindow = noteWindowFor(editor);
        if (!host || !noteWindow) return null;
        bindEditorActivity(editor);
        noteWindow.classList.add('ikmal-editor-note-window');
        let footer = noteWindow.querySelector('.ikmal-editor-footer');
        if (!footer) footer = host.querySelector('.ikmal-editor-footer');
        if (!footer) {
            footer = document.createElement('div');
            footer.className = 'ikmal-editor-footer';
            footer.setAttribute('role', 'status');
            footer.setAttribute('aria-live', 'polite');
        }
        // Migrate the earlier inline footer into the full note-window anchor.
        if (footer.parentElement !== noteWindow) noteWindow.appendChild(footer);
        return footer;
    }

    function updateEditorFooter(editor) {
        const footer = footerFor(editor);
        if (!footer) return;

        const textContent = editor.innerHTML || editor.textContent || '';
        const words = countWords(textContent);
        const chars = (editor.textContent || '').length;
        const readingTimeMin = Math.max(1, Math.ceil(words / 200));
        const issues = editorIssues(editor.textContent || '');
        const issueCount = issues.reduce((total, issue) => total + issue.count, 0);
        const issueSummary = issueCount ? `${issueCount} local ${issueCount === 1 ? 'issue' : 'issues'}` : 'OK';
        const goalTarget = 500;
        const goalPct = Math.min(100, Math.round((words / goalTarget) * 100));
        const summary = `ikmal editor · ${words} words (${goalPct}% of ${goalTarget}) · ${chars} chars · ${readingTimeMin} min read · Press ? for shortcuts`;
        const stateKey = `${summary} · ${issueSummary}`;
        if (footer.dataset.summary === stateKey) return;

        const summaryGroup = document.createElement('span');
        summaryGroup.className = 'ikmal-editor-footer-summary d-inline-flex align-items-center gap-1.5';
        const icon = document.createElement('i');
        icon.className = 'bx bx-text';
        icon.setAttribute('aria-hidden', 'true');

        const progressBar = document.createElement('span');
        progressBar.className = 'ikmal-goal-progress-track';
        progressBar.style.cssText = 'display:inline-block;width:36px;height:4px;background:rgba(128,128,128,0.25);border-radius:2px;overflow:hidden;vertical-align:middle;margin:0 2px;';
        const progressFill = document.createElement('span');
        progressFill.className = 'ikmal-goal-progress-fill';
        progressFill.style.cssText = `display:block;height:100%;width:${goalPct}%;background:${goalPct >= 100 ? 'var(--theme-style-success-color, #10b981)' : 'var(--theme-style-accent-color, #3b82f6)'};transition:width 0.3s ease;`;
        progressBar.appendChild(progressFill);

        const label = document.createElement('span');
        label.textContent = summary;
        summaryGroup.append(icon, progressBar, label);

        const status = document.createElement('span');
        status.className = `ikmal-editor-status ${issueCount ? 'ikmal-editor-status-issues' : 'ikmal-editor-status-ok'}`;
        status.setAttribute('role', 'status');
        status.setAttribute('aria-label', issueCount ? `${issueSummary} in ikmal editor` : 'ikmal editor checks clear');
        status.title = issueCount ? issueSummary : 'No local issues detected';
        const statusIcon = document.createElement('i');
        statusIcon.className = issueCount ? 'bx bx-error-circle' : 'bx bx-check-circle';
        statusIcon.setAttribute('aria-hidden', 'true');
        status.append(statusIcon);

        footer.replaceChildren(summaryGroup, status);
        footer.dataset.summary = stateKey;
        footer.title = `${words} words (${goalPct}% of ${goalTarget} target), ${chars} characters, estimated ${readingTimeMin} minute read; ${issueSummary}`;
    }

    function duplicateWordCount(text) {
        duplicateWordPattern.lastIndex = 0;
        return [...text.matchAll(duplicateWordPattern)].length;
    }

    function duplicateWordRanges(editor) {
        const ranges = [];
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node) {
            const text = node.nodeValue || '';
            duplicateWordPattern.lastIndex = 0;
            let match;
            while ((match = duplicateWordPattern.exec(text))) {
                const firstStart = match.index;
                const firstEnd = firstStart + match[1].length;
                const secondStart = firstStart + match[0].length - match[1].length;
                const firstRange = new Range();
                firstRange.setStart(node, firstStart);
                firstRange.setEnd(node, firstEnd);
                const secondRange = new Range();
                secondRange.setStart(node, secondStart);
                secondRange.setEnd(node, secondStart + match[1].length);
                ranges.push(firstRange, secondRange);
            }
            node = walker.nextNode();
        }
        return ranges;
    }

    function updateDuplicateHighlights(editors) {
        const highlights = globalThis.CSS?.highlights;
        const HighlightCtor = globalThis.Highlight;
        if (!highlights || typeof HighlightCtor !== 'function') return;
        const ranges = editors.flatMap(duplicateWordRanges);
        highlights.delete(duplicateHighlightName);
        if (ranges.length) highlights.set(duplicateHighlightName, new HighlightCtor(...ranges));
    }

    function removeLegacyStatusPills() {
        document.querySelectorAll('#ikmal-editor-word-count, .ikmal-word-count-pill').forEach((pill) => {
            if (!pill.closest('.ikmal-editor-footer')) pill.remove();
        });
    }

    function updateWordCountFooters() {
        removeLegacyStatusPills();
        const editors = editorElements();
        editors.forEach(updateEditorFooter);
        updateDuplicateHighlights(editors);
    }

    function selectedEditorText() {
        const selection = window.getSelection?.();
        if (!selection || selection.isCollapsed || !selection.toString().trim()) return null;
        const anchorNode = selection.anchorNode;
        const anchor = anchorNode?.nodeType === Node.ELEMENT_NODE ? anchorNode : anchorNode?.parentElement;
        const editor = anchor?.closest?.('.note-detail-editable-text-editor');
        if (!editor) return null;
        const block = anchor.closest('p, li, blockquote, pre, h1, h2, h3, h4, h5, h6');
        const noteWindow = noteWindowFor(editor);
        return { editor, noteWindow, text: selection.toString(), paragraphText: block?.textContent || selection.toString() };
    }

    function editorIssues(text) {
        const issues = [];
        const duplicateWords = duplicateWordCount(text);
        const repeatedSpaces = text.match(/[ \t]{2,}/g)?.length || 0;
        const trailingWhitespace = text.match(/[ \t]+(?=\n|$)/gm)?.length || 0;
        const repeatedPunctuation = text.match(/([!?.,:;])\1+/g)?.length || 0;
        const longSentences = text
            .split(/[.!?]+/)
            .map((sentence) => countWords(sentence))
            .filter((sentenceWords) => sentenceWords > 40).length;

        if (duplicateWords) issues.push({ count: duplicateWords, text: `${duplicateWords} duplicate-word ${duplicateWords === 1 ? 'pair' : 'pairs'}` });
        if (repeatedSpaces) issues.push({ count: repeatedSpaces, text: `${repeatedSpaces} repeated-space ${repeatedSpaces === 1 ? 'run' : 'runs'}` });
        if (trailingWhitespace) issues.push({ count: trailingWhitespace, text: `${trailingWhitespace} trailing-whitespace ${trailingWhitespace === 1 ? 'line' : 'lines'}` });
        if (repeatedPunctuation) issues.push({ count: repeatedPunctuation, text: `${repeatedPunctuation} repeated-punctuation ${repeatedPunctuation === 1 ? 'mark' : 'marks'}` });
        if (longSentences) issues.push({ count: longSentences, text: `${longSentences} long ${longSentences === 1 ? 'sentence' : 'sentences'} (>40 words)` });
        return issues;
    }

    function makeMenuElement(tagName, className, textContent) {
        const element = document.createElement(tagName);
        if (className) element.className = className;
        if (textContent !== undefined) element.textContent = textContent;
        return element;
    }

    let selectionMenu = null;
    let selectionMenuOwner = null;

    function closeSelectionMenu() {
        selectionMenu?.remove();
        selectionMenu = null;
        selectionMenuOwner?.classList.remove('ikmal-selection-active');
        selectionMenuOwner = null;
    }

    function showSelectionMenu(text, paragraphText, noteWindow) {
        closeSelectionMenu();
        const menu = makeMenuElement('div', 'ikmal-selection-menu');
        menu.setAttribute('role', 'dialog');
        menu.setAttribute('aria-label', 'ikmal editor selection details');

        const heading = makeMenuElement('div', 'ikmal-selection-menu-title', 'Selection details');
        menu.appendChild(heading);

        const chars = text.length;
        const charsNoSpaces = text.replace(/\s/g, '').length;
        const stats = makeMenuElement(
            'div',
            'ikmal-selection-menu-stats',
            `${countWords(text)} words · ${chars} chars · ${charsNoSpaces} without spaces`,
        );
        menu.appendChild(stats);

        const issueHeading = makeMenuElement('div', 'ikmal-selection-menu-label', 'ikmal editor checks in this paragraph');
        menu.appendChild(issueHeading);
        const issueList = makeMenuElement('ul', 'ikmal-selection-menu-issues');
        const issues = editorIssues(paragraphText);
        if (!issues.length) {
            issueList.appendChild(makeMenuElement('li', 'ikmal-selection-menu-ok', 'No local issues detected'));
        } else {
            issues.forEach((issue) => issueList.appendChild(makeMenuElement('li', '', issue.text)));
        }
        menu.appendChild(issueList);

        noteWindow.classList.add('ikmal-selection-active');
        noteWindow.appendChild(menu);
        selectionMenu = menu;
        selectionMenuOwner = noteWindow;
    }

    function handleEditorContextMenu(event) {
        const selected = selectedEditorText();
        if (!selected) return;
        // Keep Trilium's native context menu intact. Ikmal's details card is a
        // bottom-of-window sidecar, so both menus remain independently useful.
        showSelectionMenu(selected.text, selected.paragraphText, selected.noteWindow);
    }

    function scheduleUpdate() {
        if (updateTimeout) clearTimeout(updateTimeout);
        updateTimeout = setTimeout(updateWordCountFooters, 300);
    }

    // Attach listeners to document input & mutation
    document.addEventListener('input', scheduleUpdate, true);
    document.addEventListener('keyup', scheduleUpdate, true);
    document.addEventListener('contextmenu', handleEditorContextMenu, true);
    document.addEventListener('mousedown', (event) => {
        if (selectionMenu && !selectionMenu.contains(event.target)) closeSelectionMenu();
    }, true);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeSelectionMenu();
    }, true);

    const observer = new MutationObserver(scheduleUpdate);
    observer.observe(document.body, { childList: true, subtree: true });

    scheduleUpdate();
    console.log('[Ikmal Tools] Ikmal Editor word-count footer active.');
})();
