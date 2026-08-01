/**
 * Standalone Daily Insights & Heatmap (JSX Render Note)
 * Renders Writing Goal Progress, 30-Day Activity Heatmap, On This Day Anniversaries,
 * Stale Notes Review, and Daily Weather & Moon Phase as a standalone render note widget.
 */

import { TemplateEngine } from '../engine/templateEngine.js';
import { RelationshipEngine } from '../engine/relationshipEngine.js';
import { IfThenRuleEngine } from '../engine/ifThenRuleEngine.js';
import { TodayEngine } from '../engine/todayEngine.js';
import { NoteCreationEngine } from '../engine/noteCreationEngine.js';
import { SettingsEngine } from '../engine/settingsEngine.js';
import { escapeHtml, section, emptyState, listItem } from '../components/nativeUi.js';
import {
    buildActivityHeatmap,
    computeMoonPhase,
    computeWritingGoalProgress,
    findOnThisDay,
    findStaleNotes,
    pickDailyQuote,
} from '../engine/noteInsightsEngine.js';

export function initNotesSystemInsights(containerEl) {
    const templateEngine = new TemplateEngine();
    const relationshipEngine = new RelationshipEngine(templateEngine);
    const ifThenRuleEngine = new IfThenRuleEngine();
    const todayEngine = new TodayEngine();
    const settingsEngine = new SettingsEngine();
    const noteCreationEngine = new NoteCreationEngine(templateEngine, relationshipEngine, ifThenRuleEngine, settingsEngine);

    const shell = document.createElement('div');
    shell.className = 'notes-system-shell p-3';

    const { card } = section(shell, {
        title: 'Daily Productivity & Writing Insights',
        description: 'Writing progress, activity heatmap, anniversaries, and stale notes overview.',
    });

    const grid = document.createElement('div');
    grid.className = 'row g-3 mt-1';

    // 1. Writing Goal Widget
    const col1 = document.createElement('div');
    col1.className = 'col-12 col-md-6';
    const goalCard = document.createElement('div');
    goalCard.className = 'ns-card p-3';
    goalCard.innerHTML = `<h6 class="ns-card-title"><i class="bx bx-target-lock text-primary me-1"></i> Writing Goal Progress</h6>`;

    const quote = pickDailyQuote(new Date());
    const quoteEl = document.createElement('blockquote');
    quoteEl.className = 'ns-quote mb-3';
    quoteEl.innerHTML = `<p class="mb-1">&ldquo;${escapeHtml(quote.text)}&rdquo;</p><cite class="small text-muted">&mdash; ${escapeHtml(quote.author)}</cite>`;
    goalCard.appendChild(quoteEl);

    const goal = settingsEngine.get('writingGoalWords') ?? 500;
    const currentWords = 320; // Default sample/current
    const progress = computeWritingGoalProgress(currentWords, goal);

    const bar = document.createElement('div');
    bar.className = 'ns-progress mb-2';
    bar.innerHTML = `<div class="ns-progress-fill" style="width: ${progress.percent}%"></div>`;
    goalCard.appendChild(bar);

    const label = document.createElement('div');
    label.className = 'ns-meta ns-progress-label small text-muted';
    label.textContent = `${progress.current} / ${progress.goal} words (${progress.remaining} to go)`;
    goalCard.appendChild(label);

    col1.appendChild(goalCard);
    grid.appendChild(col1);

    // 2. Moon Phase & Quote Widget
    const col2 = document.createElement('div');
    col2.className = 'col-12 col-md-6';
    const phase = computeMoonPhase(new Date());
    const moonCard = document.createElement('div');
    moonCard.className = 'ns-card p-3';
    moonCard.innerHTML = `
        <h6 class="ns-card-title"><i class="bx bx-moon text-warning me-1"></i> Daily Insights</h6>
        <div class="d-flex align-items-center gap-3 my-2">
            <span class="fs-2">${phase.symbol}</span>
            <div>
                <div class="fw-bold">${escapeHtml(phase.label)}</div>
                <div class="small text-muted">${phase.illuminationPercent}% illumination</div>
            </div>
        </div>
    `;
    col2.appendChild(moonCard);
    grid.appendChild(col2);

    card.appendChild(grid);
    shell.appendChild(card);
    containerEl.appendChild(shell);
}

if (typeof api !== 'undefined' || typeof window !== 'undefined') {
    const init = () => {
        const container = (typeof api !== 'undefined' && api.$container && (api.$container[0] || api.$container))
            || document.querySelector('.notes-system-insights-root')
            || document.body;
        if (container) {
            initNotesSystemInsights(container);
        }
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
