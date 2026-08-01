/**
 * Pure computation behind the local-data Today widgets: the activity heatmap,
 * "On this day", the writing-goal progress bar, moon phase, and the stale-notes
 * panel. Nothing here touches Trilium — callers supply plain note summaries (from
 * `api.searchForNotes` when running inside Trilium) so this stays unit-testable
 * without a live instance, the same split `weatherEngine` uses for the network
 * fetch vs. the WMO-code mapping.
 */

export interface NoteSummary {
    noteId: string;
    title: string;
    /** Epoch millis. */
    dateCreated: number;
    dateModified: number;
    status?: string;
}

// ---------------------------------------------------------------- heatmap

export interface HeatmapDay {
    /** ISO date, `YYYY-MM-DD`. */
    date: string;
    count: number;
}

export interface HeatmapWeek {
    days: HeatmapDay[];
}

/** Local `YYYY-MM-DD`, not UTC — a note created at 11pm should land on that day. */
function toLocalIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Buckets note-creation timestamps into a GitHub-style grid: `weeks` columns of
 * 7 days (Sunday first), ending on the week containing `today`. Weeks are
 * returned oldest first so callers can render left-to-right.
 */
export function buildActivityHeatmap(
    createdTimestamps: number[],
    today: Date = new Date(),
    weeks = 12
): HeatmapWeek[] {
    const counts = new Map<string, number>();
    for (const ts of createdTimestamps) {
        if (!Number.isFinite(ts)) continue;
        const key = toLocalIsoDate(new Date(ts));
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const endOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()));

    const start = new Date(endOfWeek);
    start.setDate(start.getDate() - (weeks * 7 - 1));

    const result: HeatmapWeek[] = [];
    const cursor = new Date(start);
    for (let w = 0; w < weeks; w++) {
        const days: HeatmapDay[] = [];
        for (let d = 0; d < 7; d++) {
            const key = toLocalIsoDate(cursor);
            days.push({ date: key, count: counts.get(key) ?? 0 });
            cursor.setDate(cursor.getDate() + 1);
        }
        result.push({ days });
    }
    return result;
}

// ------------------------------------------------------------- on this day

export interface OnThisDayResult {
    yearsAgo: number;
    noteId: string;
    title: string;
}

/**
 * Notes created on today's month/day in a previous year, most recent year
 * first. `yearsAgo` is computed from the calendar year, not elapsed days, so
 * "today" and the matched note's anniversary agree even across leap years.
 */
export function findOnThisDay(notes: NoteSummary[], today: Date = new Date()): OnThisDayResult[] {
    const month = today.getMonth();
    const day = today.getDate();
    const thisYear = today.getFullYear();

    return notes
        .map((note) => {
            const created = new Date(note.dateCreated);
            return { note, created };
        })
        .filter(({ created }) =>
            created.getMonth() === month &&
            created.getDate() === day &&
            created.getFullYear() < thisYear
        )
        .map(({ note, created }) => ({
            yearsAgo: thisYear - created.getFullYear(),
            noteId: note.noteId,
            title: note.title,
        }))
        .sort((a, b) => a.yearsAgo - b.yearsAgo);
}

// -------------------------------------------------------------- stale notes

export interface StaleNoteResult {
    noteId: string;
    title: string;
    daysSinceModified: number;
}

/**
 * Notes whose status marks them as still open (i.e. not done/cancelled) but
 * that have not been touched in at least `thresholdDays`, oldest first. Status
 * values are treated case-insensitively since templates are user-editable.
 */
export function findStaleNotes(
    notes: NoteSummary[],
    today: Date = new Date(),
    thresholdDays = 14,
    closedStatuses: string[] = ['done', 'cancelled', 'complete', 'completed', 'archived']
): StaleNoteResult[] {
    const closed = new Set(closedStatuses.map((s) => s.toLowerCase()));
    const nowMs = today.getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    return notes
        .filter((note) => !closed.has((note.status ?? '').toLowerCase()))
        .map((note) => ({
            noteId: note.noteId,
            title: note.title,
            daysSinceModified: Math.floor((nowMs - note.dateModified) / dayMs),
        }))
        .filter((n) => n.daysSinceModified >= thresholdDays)
        .sort((a, b) => b.daysSinceModified - a.daysSinceModified);
}

// -------------------------------------------------------------- writing goal

export interface WritingGoalProgress {
    current: number;
    goal: number;
    percent: number;
    remaining: number;
    metGoal: boolean;
}

export function computeWritingGoalProgress(current: number, goal: number): WritingGoalProgress {
    const safeGoal = Math.max(0, Math.floor(goal) || 0);
    const safeCurrent = Math.max(0, Math.floor(current) || 0);
    const percent = safeGoal === 0 ? 0 : Math.min(100, Math.round((safeCurrent / safeGoal) * 100));
    return {
        current: safeCurrent,
        goal: safeGoal,
        percent,
        remaining: Math.max(0, safeGoal - safeCurrent),
        metGoal: safeGoal > 0 && safeCurrent >= safeGoal,
    };
}

/** Splits on whitespace and drops empty tokens left behind by HTML tags. */
export function countWords(htmlOrText: string): number {
    const text = htmlOrText.replace(/<[^>]*>/g, ' ');
    const words = text.split(/\s+/).filter(Boolean);
    return words.length;
}

// -------------------------------------------------------------- moon phase

export interface MoonPhaseResult {
    /** 0 = new moon, 0.5 = full moon, approaching 1 wraps back to new. */
    fraction: number;
    /** 0 (new) to 1 (full) to 0 (new again). */
    illumination: number;
    name: string;
    /** Boxicons class without the `bx-` prefix; phases only distinguish waxing/waning by name, not icon. */
    icon: string;
}

const SYNODIC_MONTH_DAYS = 29.530588853;
// A known new moon: 2000-01-06 18:14 UTC.
const KNOWN_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14);

const MOON_PHASE_NAMES = [
    'New Moon',
    'Waxing Crescent',
    'First Quarter',
    'Waxing Gibbous',
    'Full Moon',
    'Waning Gibbous',
    'Last Quarter',
    'Waning Crescent',
];

export function computeMoonPhase(date: Date = new Date()): MoonPhaseResult {
    const diffDays = (date.getTime() - KNOWN_NEW_MOON_MS) / (24 * 60 * 60 * 1000);
    const fraction = (((diffDays % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS) / SYNODIC_MONTH_DAYS;
    const illumination = (1 - Math.cos(fraction * 2 * Math.PI)) / 2;

    const bucket = Math.floor(fraction * 8 + 0.5) % 8;
    const name = MOON_PHASE_NAMES[bucket];

    return { fraction, illumination, name, icon: 'moon' };
}

// ------------------------------------------------------------------- quote

export interface DailyQuote {
    text: string;
    author: string;
}

/** Public-domain quotes only, so attribution is never a legal question. */
const QUOTE_BANK: DailyQuote[] = [
    { text: 'The unexamined life is not worth living.', author: 'Socrates' },
    { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Aristotle' },
    { text: 'Well begun is half done.', author: 'Aristotle' },
    { text: 'It is not that we have a short time to live, but that we waste a lot of it.', author: 'Seneca' },
    { text: 'Luck is what happens when preparation meets opportunity.', author: 'Seneca' },
    { text: 'Waste no more time arguing about what a good man should be. Be one.', author: 'Marcus Aurelius' },
    { text: 'The impediment to action advances action. What stands in the way becomes the way.', author: 'Marcus Aurelius' },
    { text: 'A journey of a thousand miles begins with a single step.', author: 'Lao Tzu' },
    { text: 'Do the difficult things while they are easy and do the great things while they are small.', author: 'Lao Tzu' },
    { text: 'Nothing great was ever achieved without enthusiasm.', author: 'Ralph Waldo Emerson' },
    { text: 'Write it on your heart that every day is the best day in the year.', author: 'Ralph Waldo Emerson' },
    { text: 'Go confidently in the direction of your dreams. Live the life you have imagined.', author: 'Henry David Thoreau' },
    { text: 'It is not the man who has too little, but the man who craves more, that is poor.', author: 'Seneca' },
    { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
    { text: 'The two most important days in your life are the day you are born and the day you find out why.', author: 'Mark Twain' },
    { text: 'What we think, we become.', author: 'Buddha' },
];

/** Deterministic by calendar day, so the widget agrees with itself across re-renders. */
export function pickDailyQuote(date: Date = new Date()): DailyQuote {
    const dayOfYear = Math.floor(
        (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) /
        (24 * 60 * 60 * 1000)
    );
    return QUOTE_BANK[dayOfYear % QUOTE_BANK.length];
}
