/**
 * Primitives that mirror Trilium's own settings UI.
 *
 * Trilium builds its options pages from a small vocabulary — a page header, a
 * titled section wrapping a card, a row per setting, a toggle — and every page in
 * the app is assembled from those four things. These helpers are the plain-DOM
 * equivalents, producing the same markup shape and the same class contract as
 * `apps/client/src/widgets/type_widgets/options/components/*` so plugin pages look
 * like part of the app instead of a Bootstrap dashboard hosted inside it.
 *
 * The matching styles live in `src/artifacts/notes-system.css`.
 */

/** Escapes text before it is interpolated into an innerHTML template. */
export function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export interface PageHeaderOptions {
    /** Boxicons class without the `bx ` prefix, e.g. `bx-slider-alt`. */
    icon: string;
    title: string;
    subtitle?: string;
    /** Buttons rendered on the trailing edge of the title row. */
    actions?: HTMLElement[];
}

/** The sticky title bar a page renders above its sections. */
export function pageHeader({ icon, title, subtitle, actions }: PageHeaderOptions): HTMLElement {
    // The bar spans the full pane so its bottom border does, but its contents are
    // held to the same column as the sections below — as Trilium's own
    // `.options-page-header-inner` does — so the title and actions line up with the
    // cards instead of drifting to the pane edge.
    const header = document.createElement('div');
    header.className = 'ns-page-header';

    const inner = document.createElement('div');
    inner.className = 'ns-page-header-inner';
    inner.innerHTML = `
        <span class="ns-page-header-icon bx ${escapeHtml(icon)}" aria-hidden="true"></span>
        <div class="ns-page-header-titles">
            <h2 class="ns-page-header-title">${escapeHtml(title)}</h2>
            ${subtitle ? `<p class="ns-page-header-subtitle">${escapeHtml(subtitle)}</p>` : ''}
        </div>
    `;

    if (actions?.length) {
        const actionsEl = document.createElement('div');
        actionsEl.className = 'ns-page-header-actions';
        actions.forEach((a) => actionsEl.appendChild(a));
        inner.appendChild(actionsEl);
    }

    header.appendChild(inner);
    return header;
}

export interface SectionOptions {
    /** Rendered above the card in uppercase micro-caps, as Trilium does. */
    title?: string;
    /** Explanatory paragraph rendered as the first thing inside the card. */
    description?: string;
    /** Controls rendered beside the title, outside the card. */
    actions?: HTMLElement[];
}

/**
 * A titled settings section. Returns the card so callers can append rows to it;
 * the section itself is already attached to `parent`.
 */
export function section(parent: HTMLElement, { title, description, actions }: SectionOptions = {}): {
    section: HTMLElement;
    card: HTMLElement;
} {
    const sectionEl = document.createElement('div');
    sectionEl.className = 'ns-section';

    if (title || actions?.length) {
        const header = document.createElement('div');
        header.className = 'ns-section-header';
        header.innerHTML = `<h4 class="ns-section-title">${escapeHtml(title ?? '')}</h4>`;

        if (actions?.length) {
            const actionsEl = document.createElement('div');
            actionsEl.className = 'ns-actions';
            actions.forEach((a) => actionsEl.appendChild(a));
            header.appendChild(actionsEl);
        }
        sectionEl.appendChild(header);
    }

    const card = document.createElement('div');
    card.className = 'ns-section-card';

    if (description) {
        const p = document.createElement('p');
        p.className = 'ns-section-description';
        p.textContent = description;
        card.appendChild(p);
    }

    sectionEl.appendChild(card);
    parent.appendChild(sectionEl);

    return { section: sectionEl, card };
}

export interface RowOptions {
    label: string;
    description?: string;
    /** Associates the label with the control for screen readers and click-to-focus. */
    htmlFor?: string;
    /**
     * Keeps the row inline on narrow panes. Use for rows whose control is small
     * (a toggle or a button); wide controls read better stacked.
     */
    compact?: boolean;
    /** Puts the control on its own full-width line beneath the label. */
    stacked?: boolean;
}

/** One setting: label and description leading, a single control trailing. */
export function row(control: HTMLElement | string, { label, description, htmlFor, compact, stacked }: RowOptions): HTMLElement {
    const rowEl = document.createElement('div');
    rowEl.className = `ns-row${compact ? ' ns-row-compact' : ''}${stacked ? ' ns-row-stacked' : ''}`;
    rowEl.innerHTML = `
        <div class="ns-row-label">
            <label${htmlFor ? ` for="${escapeHtml(htmlFor)}"` : ''}>${escapeHtml(label)}</label>
            ${description ? `<small class="ns-row-desc">${escapeHtml(description)}</small>` : ''}
        </div>
    `;

    const input = document.createElement('div');
    input.className = 'ns-row-input';
    if (typeof control === 'string') {
        input.innerHTML = control;
    } else {
        input.appendChild(control);
    }
    rowEl.appendChild(input);

    return rowEl;
}

/** Trilium's toggle switch, markup-compatible with the app's own `FormToggle`. */
export function toggle(id: string, checked: boolean, onChange?: (checked: boolean) => void): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'ns-switch';
    wrapper.innerHTML = `
        <label>
            <div class="ns-switch-button${checked ? ' on' : ''}">
                <input type="checkbox" id="${escapeHtml(id)}"${checked ? ' checked' : ''}>
            </div>
        </label>
    `;

    const input = wrapper.querySelector('input') as HTMLInputElement;
    const track = wrapper.querySelector('.ns-switch-button') as HTMLElement;
    input.addEventListener('change', () => {
        track.classList.toggle('on', input.checked);
        onChange?.(input.checked);
    });

    return wrapper;
}

export interface SwitchRowOptions extends Omit<RowOptions, 'htmlFor' | 'compact'> {
    id: string;
    checked: boolean;
    onChange?: (checked: boolean) => void;
}

/** The common case: a labelled setting whose control is a toggle. */
export function switchRow({ id, checked, onChange, ...rest }: SwitchRowOptions): HTMLElement {
    return row(toggle(id, checked, onChange), { ...rest, htmlFor: id, compact: true });
}

export interface ListItemOptions {
    /** Boxicons class without the `bx ` prefix. */
    icon?: string;
    title: string;
    description?: string;
    /** Dims the item to show it is inactive, instead of adding a status badge. */
    disabled?: boolean;
    actions?: HTMLElement[];
}

/**
 * One entry in a list of peers (a rule, a template, an attribute). Rendered as a
 * hairline-separated row inside the section card rather than as its own card, so
 * lists never turn into a stack of nested boxes.
 */
export function listItem({ icon, title, description, disabled, actions }: ListItemOptions): HTMLElement {
    const item = document.createElement('div');
    item.className = `ns-list-item${disabled ? ' is-disabled' : ''}`;
    item.innerHTML = `
        <div class="ns-list-item-main">
            ${icon ? `<span class="ns-list-item-icon bx ${escapeHtml(icon)}" aria-hidden="true"></span>` : ''}
            <div>
                <span class="ns-list-item-title">${escapeHtml(title)}</span>
                ${description ? `<div class="ns-list-item-desc">${escapeHtml(description)}</div>` : ''}
            </div>
        </div>
    `;

    if (actions?.length) {
        const actionsEl = document.createElement('div');
        actionsEl.className = 'ns-list-item-actions';
        actions.forEach((a) => actionsEl.appendChild(a));
        item.appendChild(actionsEl);
    }

    return item;
}

/** Placeholder text for an empty list, in the same muted register as descriptions. */
export function emptyState(text: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'ns-empty';
    el.textContent = text;
    return el;
}

export interface ButtonOptions {
    text: string;
    /** Boxicons class without the `bx ` prefix. */
    icon?: string;
    /** Trilium uses `btn-primary` for the one affirmative action and `btn-secondary` elsewhere. */
    kind?: 'primary' | 'secondary';
    size?: 'normal' | 'small' | 'micro';
    title?: string;
    className?: string;
    onClick?: () => void;
}

/** A button using Trilium's own button classes and size scale. */
export function button({ text, icon, kind = 'secondary', size = 'small', title, className, onClick }: ButtonOptions): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    const sizeClass = size === 'small' ? ' btn-sm' : size === 'micro' ? ' btn-micro' : '';
    btn.className = `btn btn-${kind}${sizeClass}${className ? ` ${className}` : ''}`;
    if (title) btn.title = title;
    btn.innerHTML = `${icon ? `<span class="bx ${escapeHtml(icon)}"></span> ` : ''}${escapeHtml(text)}`;
    if (onClick) btn.addEventListener('click', onClick);
    return btn;
}

export interface IconActionOptions {
    /** Boxicons class without the `bx ` prefix. */
    icon: string;
    /** Tooltip and accessible name — an icon action carries no visible label. */
    title: string;
    onClick: () => void;
}

/**
 * An icon-only button using Trilium's `.icon-action`, the app's affordance for
 * per-row and section-header actions. Text buttons carry a min-width that makes a
 * row of them dominate a dense list; these stay out of the way.
 */
export function iconAction({ icon, title, onClick }: IconActionOptions): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-action';
    btn.title = title;
    btn.setAttribute('aria-label', title);
    btn.innerHTML = `<span class="bx ${escapeHtml(icon)}"></span>`;
    btn.addEventListener('click', onClick);
    return btn;
}

export interface ModalOptions {
    title: string;
    /** Boxicons class without the `bx ` prefix. */
    icon?: string;
    /** Body markup. Callers are responsible for escaping any interpolated values. */
    body: string;
    /** Label of the affirmative action. */
    confirmText: string;
    confirmKind?: 'primary' | 'secondary';
    cancelText?: string;
}

/**
 * A dialog painted with Trilium's modal tokens, so it matches the app's own
 * dialogs in every theme rather than picking its own light/dark colours.
 *
 * Mounted on `<body>` rather than inside the page: the note pane is a container
 * and so would become the containing block for a fixed-position backdrop, and
 * re-rendering the page would tear the dialog down mid-edit.
 *
 * `onConfirm` returning `false` keeps the dialog open (e.g. failed validation).
 */
export function openModal(
    { title, icon, body, confirmText, confirmKind = 'primary', cancelText = 'Cancel' }: ModalOptions,
    onConfirm: (content: HTMLElement) => boolean | void
): HTMLElement {
    const backdrop = document.createElement('div');
    backdrop.className = 'ns-modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'ns-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
        <div class="ns-modal-header">
            <h5 class="ns-modal-title">${icon ? `<span class="bx ${escapeHtml(icon)}"></span> ` : ''}${escapeHtml(title)}</h5>
            <button type="button" class="btn-close ns-close" aria-label="Close"></button>
        </div>
        <div class="ns-modal-body">${body}</div>
        <div class="ns-modal-footer">
            <button type="button" class="btn btn-sm btn-secondary ns-close">${escapeHtml(cancelText)}</button>
            <button type="button" class="btn btn-sm btn-${confirmKind} ns-confirm">${escapeHtml(confirmText)}</button>
        </div>
    `;

    const close = () => {
        document.removeEventListener('keydown', onKeyDown);
        backdrop.remove();
    };

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape') close();
    }

    modal.querySelectorAll('.ns-close').forEach((btn) => btn.addEventListener('click', close));
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) close();
    });
    document.addEventListener('keydown', onKeyDown);

    modal.querySelector<HTMLButtonElement>('.ns-confirm')!.addEventListener('click', () => {
        if (onConfirm(modal) !== false) close();
    });

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    modal.querySelector<HTMLElement>('input, select, textarea')?.focus();

    return modal;
}
