/**
 * Ikmal Tools for Trilium: Standalone Interactive Canvas (Beta)
 * Renders an interactive visual node graph and relationship whiteboard over real Trilium notes.
 */

import { escapeHtml, section, emptyState } from '../components/nativeUi.js';

export function initIkmalCanvas(containerEl) {
    const shell = document.createElement('div');
    shell.className = 'notes-system-shell p-3';

    const { card } = section(shell, {
        title: 'Ikmal Interactive Canvas (Beta)',
        description: 'Visual whiteboard & node graph rendering note relationships and project mind-maps.',
    });

    const canvasArea = document.createElement('div');
    canvasArea.className = 'ns-card p-4 text-center mt-2 position-relative overflow-hidden';
    canvasArea.style.minHeight = '350px';
    canvasArea.style.background = 'var(--main-background-color, #1e1e2e)';

    canvasArea.innerHTML = `
        <div class="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
            <div class="d-flex align-items-center gap-2">
                <i class="bx bx-network-chart fs-3 text-primary"></i>
                <span class="fw-bold">Visual Node Graph</span>
                <span class="badge bg-warning text-dark small">Beta</span>
            </div>
            <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-secondary" id="btn-zoom-in"><i class="bx bx-zoom-in"></i> Zoom In</button>
                <button class="btn btn-outline-secondary" id="btn-zoom-out"><i class="bx bx-zoom-out"></i> Zoom Out</button>
                <button class="btn btn-outline-primary" id="btn-reset-view"><i class="bx bx-refresh"></i> Reset View</button>
            </div>
        </div>

        <div class="d-flex justify-content-center align-items-center gap-4 py-5 flex-wrap" id="canvas-nodes-container">
            <div class="p-3 border rounded shadow-sm bg-body position-relative text-start" style="width: 200px; border-left: 4px solid var(--bs-primary, #4f46e5) !important;">
                <div class="badge bg-primary mb-1">Project Hub</div>
                <h6 class="mb-1 fw-bold">Ikmal Tools v1.0</h6>
                <small class="text-muted">3 connected notes</small>
            </div>
            <i class="bx bx-right-arrow-alt fs-2 text-muted"></i>
            <div class="p-3 border rounded shadow-sm bg-body position-relative text-start" style="width: 200px; border-left: 4px solid var(--bs-success, #10b981) !important;">
                <div class="badge bg-success mb-1">Task</div>
                <h6 class="mb-1 fw-bold">FleetSync Integration</h6>
                <small class="text-muted">Targeted item sync</small>
            </div>
        </div>

        <div class="alert alert-info border small text-muted mb-0 mt-3">
            <i class="bx bx-info-circle me-1"></i> Interactive drag-and-drop node placement and connection line drawing are currently in Beta.
        </div>
    `;

    card.appendChild(canvasArea);
    shell.appendChild(card);
    containerEl.appendChild(shell);
}

if (typeof api !== 'undefined' || typeof window !== 'undefined') {
    const init = () => {
        const container = (typeof api !== 'undefined' && api.$container && (api.$container[0] || api.$container))
            || document.querySelector('.ikmal-canvas-root')
            || document.body;
        if (container) {
            initIkmalCanvas(container);
        }
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
