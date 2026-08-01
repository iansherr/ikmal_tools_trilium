/**
 * Quick Capture Modal Component: Interactive modal for creating Notes, Tasks, Meetings, Stories, and Edits.
 * Styled natively with Trilium Boxicons and design tokens.
 * Accurately implements original system contract for New Story (project) vs New Edit (edit).
 */

import { TemplateEngine } from '../engine/templateEngine.js';
import { NoteCreationEngine, NoteCreationPlan } from '../engine/noteCreationEngine.js';

export function showQuickCaptureModal(
    templateId: string,
    templateEngine: TemplateEngine,
    noteCreationEngine: NoteCreationEngine,
    onCreated?: (plan: NoteCreationPlan) => void
): void {
    const isStoryOrEdit = templateId === 'story' || templateId === 'edit';
    const activeTplId = isStoryOrEdit ? 'story' : templateId;
    const template = templateEngine.getTemplate(activeTplId);
    if (!template) return;

    const isEditMode = templateId === 'edit';

    // Explanations matching original bespoke contract
    const descriptions: Record<string, string> = {
        task: 'Creates an actionable task item with priority, due date, and status labels.',
        meeting: 'Creates a meeting notes document linked to participants, clients, or organizations.',
        story: 'Starts a full Story Project from scratch. Creates a Project Hub (#kind=project), a Story Draft (#status=drafting), and a dedicated Reporting & Notes child note. Auto-cloned to today\'s Journal.',
        edit: 'Starts a Quick Edit Package. Creates an Edit Project Hub (#kind=edit) and a Story Draft (#status=editing, #workflow=edit) for fast copy editing/proofreading, skipping extra reporting notes. Auto-cloned to today\'s Journal.',
        dailyNote: 'Creates today\'s daily journal note.',
        projectHub: 'Creates a new Project Hub root folder to organize tasks, stories, and meetings.',
    };

    const description = descriptions[templateId] || `Creates a new ${template.title} note.`;
    const modalTitle = isEditMode ? 'New Edit Package' : (templateId === 'story' ? 'New Story Project' : `New ${template.title}`);

    // Modal overlay container
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    backdrop.style.zIndex = '1050';

    const modal = document.createElement('div');
    modal.className = 'modal fade show d-block';
    modal.tabIndex = -1;
    modal.style.zIndex = '1055';

    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content border shadow-lg" style="background-color: var(--sub-background-color, transparent); color: var(--main-text-color, inherit); border-color: var(--border-color, rgba(128,128,128,0.3)) !important;">
                <div class="modal-header border-bottom p-3">
                    <h5 class="modal-title h6 font-weight-bold d-flex align-items-center gap-2">
                        <i class="bx bx-${isEditMode ? 'edit' : template.icon} text-primary"></i>
                        <span>${modalTitle}</span>
                    </h5>
                    <button type="button" class="btn-close close-btn" aria-label="Close"></button>
                </div>
                <div class="modal-body p-4 d-flex flex-column gap-3">
                    <div class="p-3 rounded border" style="background-color: var(--main-background-color, transparent); border-color: var(--border-color, rgba(128,128,128,0.2)) !important;">
                        <div class="small font-weight-bold text-info d-flex align-items-center gap-1.5 mb-1">
                            <i class="bx bx-info-circle"></i> Original System Contract: ${modalTitle}
                        </div>
                        <p class="small text-muted m-0">${description}</p>
                    </div>

                    <div>
                        <label class="form-label small font-weight-bold">${modalTitle} Title</label>
                        <input type="text" class="form-control title-input" placeholder="e.g. ${isEditMode ? 'Round 1 Edit Package' : 'Investigative Report Title'}" value="">
                    </div>

                    ${template.attributes.length > 0 ? `
                        <div class="border-top pt-3">
                            <label class="form-label small font-weight-bold d-flex align-items-center gap-1 mb-2">
                                <i class="bx bx-slider-alt text-success"></i> Promoted Form Attributes
                            </label>
                            <div class="row g-2 attr-form">
                                ${template.attributes.map(a => `
                                    <div class="col-md-6">
                                        <label class="form-label tiny text-muted font-weight-bold">#${a.name}</label>
                                        ${a.options ? `
                                            <select class="form-select form-select-sm attr-input" data-attr="${a.name}">
                                                ${a.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                                            </select>
                                        ` : `
                                            <input type="text" class="form-control form-control-sm attr-input" data-attr="${a.name}" value="${a.defaultValue ?? ''}" placeholder="Value...">
                                        `}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Creation Plan Summary Box -->
                    <div class="plan-summary-box border-top pt-3 d-none">
                        <label class="form-label small font-weight-bold text-success d-flex align-items-center gap-1 mb-1">
                            <i class="bx bx-check-circle"></i> Note Creation Plan
                        </label>
                        <div class="p-2.5 rounded border small font-monospace plan-details" style="background-color: var(--main-background-color, transparent); font-size: 11.5px;"></div>
                    </div>
                </div>
                <div class="modal-footer border-top p-3 d-flex justify-content-between">
                    <button type="button" class="btn btn-sm btn-outline-secondary close-btn">Cancel</button>
                    <button type="button" class="btn btn-sm btn-primary create-btn d-flex align-items-center gap-1">
                        <i class="bx bx-plus"></i> Create ${modalTitle}
                    </button>
                </div>
            </div>
        </div>
    `;

    const closeButtons = modal.querySelectorAll('.close-btn');
    closeButtons.forEach(btn => btn.addEventListener('click', closeModal));

    function closeModal() {
        if (modal.parentNode) modal.parentNode.removeChild(modal);
        if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    }

    const titleInput = modal.querySelector('.title-input') as HTMLInputElement;
    const createBtn = modal.querySelector('.create-btn') as HTMLButtonElement;

    createBtn.addEventListener('click', () => {
        const rawTitle = titleInput.value.trim() || `Untitled ${modalTitle}`;
        const attrInputs = modal.querySelectorAll('.attr-input');
        const attributes: Record<string, any> = {};

        attrInputs.forEach((input: any) => {
            const attrName = input.dataset.attr;
            if (attrName) attributes[attrName] = input.value;
        });

        const plan = noteCreationEngine.planNoteCreation({
            type: templateId,
            title: rawTitle,
            attributes,
            mode: isEditMode ? 'edit' : 'project',
        });

        closeModal();

        if (onCreated) {
            onCreated(plan);
        }
    });

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
}
