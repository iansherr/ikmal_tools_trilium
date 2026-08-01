/**
 * Notes System Launcher Bar script.
 * Registers global Quick Capture launcher button and keyboard shortcut (Cmd/Ctrl+Shift+K)
 * into Trilium, allowing instant note creation from anywhere in Trilium.
 */

import { TemplateEngine } from '../engine/templateEngine.js';
import { RelationshipEngine } from '../engine/relationshipEngine.js';
import { IfThenRuleEngine } from '../engine/ifThenRuleEngine.js';
import { NoteCreationEngine } from '../engine/noteCreationEngine.js';
import { SettingsEngine } from '../engine/settingsEngine.js';
import { showQuickCaptureModal } from '../components/QuickCaptureModal.js';

(function initLauncherBar() {
    if (typeof document === 'undefined') return;

    const templateEngine = new TemplateEngine();
    const relationshipEngine = new RelationshipEngine(templateEngine);
    const ifThenRuleEngine = new IfThenRuleEngine();
    const settingsEngine = new SettingsEngine();
    const noteCreationEngine = new NoteCreationEngine(templateEngine, relationshipEngine, ifThenRuleEngine, settingsEngine);

    function triggerQuickCapture(templateId) {
        const targetTpl = templateId || settingsEngine.get('defaultQuickCaptureTemplate') || 'task';
        showQuickCaptureModal(targetTpl, templateEngine, noteCreationEngine);
    }

    // Register global keyboard shortcut (Cmd+Shift+K / Ctrl+Shift+K)
    if (!window.__ns_keyboard_shortcut_registered) {
        window.__ns_keyboard_shortcut_registered = true;
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'K' || e.key === 'k')) {
                e.preventDefault();
                e.stopPropagation();
                triggerQuickCapture();
            }
        }, true);
        console.log('[Notes System Plugin] Global keyboard shortcut (Cmd/Ctrl+Shift+K) registered.');
    }

    function mountLauncherButton() {
        const existingContainer = document.getElementById('ns-launcher-group');
        if (existingContainer) existingContainer.remove();

        const headerContainer =
            document.querySelector('#launcher-container') ||
            document.querySelector('.launcher-container') ||
            document.querySelector('.header-widgets') ||
            document.querySelector('.header-widget-container') ||
            document.querySelector('.header');

        if (!headerContainer) return false;

        const groupEl = document.createElement('div');
        groupEl.id = 'ns-launcher-group';
        groupEl.className = 'btn-group btn-group-sm ns-launcher-group me-1';

        const mainBtn = document.createElement('button');
        mainBtn.type = 'button';
        mainBtn.className = 'btn btn-secondary btn-sm ns-launcher-btn d-inline-flex align-items-center gap-1';
        mainBtn.title = 'Quick Capture Note (Cmd/Ctrl+Shift+K)';
        mainBtn.innerHTML = '<i class="bx bx-plus-circle text-primary"></i> <span class="d-none d-md-inline font-weight-bold">Quick Capture</span>';
        mainBtn.addEventListener('click', (e) => {
            e.preventDefault();
            triggerQuickCapture();
        });
        groupEl.appendChild(mainBtn);

        headerContainer.prepend(groupEl);
        console.log('[Notes System Plugin] Global Quick Capture launcher button mounted in header bar.');
        return true;
    }

    if (!mountLauncherButton()) {
        const observer = new MutationObserver(() => {
            if (mountLauncherButton()) {
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => observer.disconnect(), 10000);
    }
})();
