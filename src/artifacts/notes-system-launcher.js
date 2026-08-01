/**
 * Notes System Launcher Bar script.
 * Registers global Quick Capture launcher button into Trilium's top header app bar,
 * allowing instant note creation from any note in Trilium.
 */

import { TemplateEngine } from '../engine/templateEngine.js';
import { RelationshipEngine } from '../engine/relationshipEngine.js';
import { IfThenRuleEngine } from '../engine/ifThenRuleEngine.js';
import { NoteCreationEngine } from '../engine/noteCreationEngine.js';
import { SettingsEngine } from '../engine/settingsEngine.js';
import { showQuickCaptureModal } from '../components/QuickCaptureModal.js';

(function initLauncherBar() {
    if (typeof document === 'undefined') return;

    function mountLauncherButton() {
        const existingBtn = document.getElementById('ns-launcher-quick-capture');
        if (existingBtn) existingBtn.remove();

        const container =
            document.querySelector('#launcher-container') ||
            document.querySelector('.launcher-container') ||
            document.querySelector('.header-widgets') ||
            document.querySelector('.header-widget-container') ||
            document.querySelector('.header');

        if (!container) return false;

        const templateEngine = new TemplateEngine();
        const relationshipEngine = new RelationshipEngine(templateEngine);
        const ifThenRuleEngine = new IfThenRuleEngine();
        const settingsEngine = new SettingsEngine();
        const noteCreationEngine = new NoteCreationEngine(templateEngine, relationshipEngine, ifThenRuleEngine, settingsEngine);

        const buttonEl = document.createElement('button');
        buttonEl.id = 'ns-launcher-quick-capture';
        buttonEl.type = 'button';
        buttonEl.className = 'btn btn-sm btn-secondary ns-launcher-btn d-inline-flex align-items-center gap-1 me-1';
        buttonEl.title = 'Quick Capture Note (Trilium Notes System)';
        buttonEl.innerHTML = '<i class="bx bx-plus-circle text-primary"></i> <span class="d-none d-md-inline font-weight-bold">Quick Capture</span>';

        buttonEl.addEventListener('click', (e) => {
            e.preventDefault();
            showQuickCaptureModal('task', templateEngine, noteCreationEngine);
        });

        container.prepend(buttonEl);
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
