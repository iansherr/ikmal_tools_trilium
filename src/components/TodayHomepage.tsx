/**
 * Today Homepage: the daily dashboard, plus the settings that shape it.
 *
 * Like the Template Studio, the page has two modes. Edit is a Trilium options page
 * — titled sections of labelled rows — for configuring the layout. Preview is the
 * dashboard itself, with nothing on screen that would not be there when the
 * homepage is opened normally.
 */

import { TodayEngine } from '../engine/todayEngine.js';
import { TemplateEngine } from '../engine/templateEngine.js';
import { DashboardColumns, DashboardDensity, TodayLayoutConfig, TodayWidgetConfig, WeatherConfig } from '../engine/types.js';
import { fetchWeather, hasLocation, WeatherReport } from '../engine/weatherEngine.js';
import {
    buildActivityHeatmap,
    computeMoonPhase,
    computeWritingGoalProgress,
    countWords,
    findOnThisDay,
    findStaleNotes,
    NoteSummary,
    pickDailyQuote,
} from '../engine/noteInsightsEngine.js';
import { button, emptyState, escapeHtml, iconAction, listItem, pageHeader, row, section, switchRow, toggle } from './nativeUi.js';

interface KanbanTask {
    id: string;
    title: string;
    priority: string;
    status: string;
    project: string;
}

/** Stands in for real tasks outside Trilium (this preview harness, tests). */
const SAMPLE_TASKS: KanbanTask[] = [
    { id: 't1', title: 'Review quarterly goals & roadmap', priority: 'high', status: 'todo', project: 'Trilium Extension' },
    { id: 't2', title: 'Publish LanguageTool plugin update', priority: 'medium', status: 'in_progress', project: 'LanguageTool Plugin' },
    { id: 't3', title: 'Setup ETAPI automated test suite', priority: 'high', status: 'done', project: 'Trilium Extension' },
];

const KANBAN_COLUMNS = [
    { id: 'todo', title: 'To do' },
    { id: 'in_progress', title: 'In progress' },
    { id: 'done', title: 'Completed' },
];

export function renderTodayHomepage(
    container: HTMLElement,
    todayEngine: TodayEngine,
    templateEngine: TemplateEngine,
    onQuickCapture: (templateId: string) => void
): void {
    let mode: 'edit' | 'preview' = 'preview';

    // Cached so switching tabs or toggling a widget does not re-request the forecast.
    // Keyed by the location it was fetched for, so changing location invalidates it.
    let weatherCache: { key: string; report: WeatherReport } | null = null;
    let weatherError = '';
    let weatherPending = false;

    // The activity heatmap, On This Day, and Needs Attention widgets all read
    // from the same note search, fetched once per session and shared between
    // them rather than each widget querying Trilium independently.
    let noteSummaryCache: NoteSummary[] | null = null;
    let noteSummaryPending = false;

    let taskCache: KanbanTask[] | null = null;
    let taskPending = false;

    // Words written today, for the Writing Goal widget.
    let wordsTodayCache: number | null = null;
    let wordsTodayPending = false;

    function refresh() {
        container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'today-homepage-wrapper';
        if (todayEngine.getLayout().density === 'compact') {
            wrapper.classList.add('ns-compact');
        }

        wrapper.appendChild(pageHeader({
            icon: 'bx-home-alt',
            title: 'Today Homepage',
            subtitle: 'Daily dashboard with quick capture, live kanban, and a component grid.',
            actions: [modeSwitcher()],
        }));

        if (mode === 'edit') {
            renderEditor(wrapper);
        } else {
            renderDashboard(wrapper);
        }

        container.appendChild(wrapper);
    }

    function modeSwitcher(): HTMLElement {
        const group = document.createElement('div');
        group.className = 'btn-group btn-group-sm';
        group.setAttribute('role', 'group');

        for (const m of [
            { id: 'edit' as const, label: 'Edit', icon: 'bx-slider' },
            { id: 'preview' as const, label: 'Preview', icon: 'bx-show' },
        ]) {
            const btn = button({
                text: m.label,
                icon: m.icon,
                size: 'small',
                className: mode === m.id ? 'active' : undefined,
                onClick: () => {
                    mode = m.id;
                    refresh();
                },
            });
            btn.setAttribute('aria-pressed', String(mode === m.id));
            group.appendChild(btn);
        }

        return group;
    }

    // ------------------------------------------------------------------- edit

    function renderEditor(parent: HTMLElement) {
        const layout = todayEngine.getLayout();

        // --- layout
        const { card } = section(parent, { title: 'Layout' });

        const widthInput = document.createElement('input');
        widthInput.type = 'number';
        widthInput.className = 'form-control form-control-sm';
        widthInput.id = 'journal-width';
        widthInput.min = '35';
        widthInput.max = '85';
        widthInput.value = String(layout.journalWidthPercent);
        widthInput.addEventListener('change', () => {
            todayEngine.setJournalWidth(Number(widthInput.value));
            widthInput.value = String(todayEngine.getLayout().journalWidthPercent);
        });
        card.appendChild(row(widthInput, {
            label: 'Journal split width',
            description: 'Percentage of the homepage given to the journal panel, between 35 and 85.',
            htmlFor: 'journal-width',
        }));

        card.appendChild(switchRow({
            id: 'quick-capture-bar',
            label: 'Show the quick capture bar',
            description: 'Buttons at the top of the dashboard for creating a note from a template.',
            checked: layout.showQuickCaptureBar,
            onChange: (checked) => todayEngine.setQuickCaptureBar(checked),
        }));

        const columns = document.createElement('select');
        columns.className = 'form-select form-select-sm';
        columns.id = 'grid-columns';
        columns.innerHTML = ([
            ['auto', 'Fit to width'],
            ['1', 'One column'],
            ['2', 'Two columns'],
            ['3', 'Three columns'],
        ] as const)
            .map(([value, label]) => `<option value="${value}"${String(layout.columns) === value ? ' selected' : ''}>${label}</option>`)
            .join('');
        columns.addEventListener('change', () => {
            const value = columns.value;
            todayEngine.setColumns(value === 'auto' ? 'auto' : (Number(value) as DashboardColumns));
        });
        card.appendChild(row(columns, {
            label: 'Grid columns',
            description: 'How many widgets sit side by side at full width. Fewer are shown automatically in a narrow pane.',
            htmlFor: 'grid-columns',
        }));

        const density = document.createElement('select');
        density.className = 'form-select form-select-sm';
        density.id = 'grid-density';
        density.innerHTML = `
            <option value="comfortable"${layout.density !== 'compact' ? ' selected' : ''}>Comfortable</option>
            <option value="compact"${layout.density === 'compact' ? ' selected' : ''}>Compact</option>
        `;
        density.addEventListener('change', () => {
            todayEngine.setDensity(density.value as DashboardDensity);
            refresh();
        });
        card.appendChild(row(density, {
            label: 'Density',
            description: 'Compact trades padding for more of the dashboard on screen.',
            htmlFor: 'grid-density',
        }));

        // --- widgets
        const widgets = [...layout.widgets].sort((a, b) => a.order - b.order);
        const { card: widgetCard } = section(parent, {
            title: `Widgets (${widgets.filter((w) => w.visible).length} of ${widgets.length} shown)`,
            description: 'Which panels appear on the dashboard, how wide they are, and in what order.',
        });

        widgets.forEach((widget, idx) => {
            widgetCard.appendChild(widgetRow(widget, idx, widgets));
        });

        renderWeatherSettings(parent, layout.weather);
        renderLocalInsightsSettings(parent, layout);

        // --- explanation, which belongs with the settings rather than on the dashboard
        const { card: guideCard } = section(parent, {
            title: 'How it works',
            description: 'The three engine layers behind everything the dashboard creates.',
        });
        for (const [label, description] of [
            ['1. Pick a template', 'Tasks, meetings, story drafts, and project hubs come pre-formatted with title patterns and promoted fields.'],
            ['2. Connect relationships', 'Notes link to parent hubs and organizations; topic tags are derived and inherited from them.'],
            ['3. Automate with rules', 'If/then rules run on creation, e.g. marking a high-priority task due soon.'],
        ] as const) {
            guideCard.appendChild(row('<span></span>', { label, description, compact: true }));
        }
    }

    function widgetRow(widget: TodayWidgetConfig, idx: number, ordered: TodayWidgetConfig[]): HTMLElement {
        const visibility = toggle(`widget-${widget.id}`, widget.visible, (visible) => {
            todayEngine.toggleWidgetVisibility(widget.id, visible);
            refresh();
        });

        const span = document.createElement('select');
        span.className = 'form-select form-select-sm';
        span.style.width = 'auto';
        span.innerHTML = `
            <option value="1"${widget.colSpan === 1 ? ' selected' : ''}>One column</option>
            <option value="2"${widget.colSpan === 2 ? ' selected' : ''}>Two columns</option>
            <option value="3"${widget.colSpan === 3 ? ' selected' : ''}>Full width</option>
        `;
        span.addEventListener('change', () => {
            todayEngine.updateWidget(widget.id, { colSpan: Number(span.value) as TodayWidgetConfig['colSpan'] });
        });

        const move = (delta: number) => {
            const ids = ordered.map((w) => w.id);
            const target = idx + delta;
            [ids[idx], ids[target]] = [ids[target], ids[idx]];
            todayEngine.reorderWidgets(ids);
            refresh();
        };

        const up = iconAction({ icon: 'bx-up-arrow-alt', title: `Move ${widget.title} up`, onClick: () => move(-1) });
        if (idx === 0) up.classList.add('disabled');

        const down = iconAction({ icon: 'bx-down-arrow-alt', title: `Move ${widget.title} down`, onClick: () => move(1) });
        if (idx === ordered.length - 1) down.classList.add('disabled');

        return listItem({
            title: widget.title,
            // The marker identifies the widget: it is the tag whose notes it collects.
            description: `Collects notes tagged #${widget.marker}.`,
            disabled: !widget.visible,
            actions: [visibility, span, up, down],
        });
    }

    // ---------------------------------------------------------------- weather

    function renderWeatherSettings(parent: HTMLElement, weather: WeatherConfig | undefined) {
        const current: WeatherConfig = weather ?? { label: '', latitude: 0, longitude: 0, units: 'metric' };

        const { card } = section(parent, {
            title: 'Weather',
            description: 'Turn on the Weather widget above to show it. It fetches the forecast from open-meteo.com, which needs no account and receives only these coordinates.',
        });

        const label = document.createElement('input');
        label.type = 'text';
        label.className = 'form-control form-control-sm';
        label.id = 'weather-label';
        label.placeholder = 'Berkeley';
        label.value = current.label;
        label.addEventListener('change', () => todayEngine.setWeather({ label: label.value }));
        card.appendChild(row(label, {
            label: 'Location name',
            description: 'Shown on the widget. Not sent anywhere.',
            htmlFor: 'weather-label',
        }));

        const coords = document.createElement('div');
        coords.className = 'ns-actions';

        const lat = coordinateInput('weather-lat', 'Latitude', current.latitude);
        const lon = coordinateInput('weather-lon', 'Longitude', current.longitude);

        const commitCoordinates = () => {
            todayEngine.setWeather({ latitude: Number(lat.value), longitude: Number(lon.value) });
            // The cached report belongs to the old location.
            weatherCache = null;
            weatherError = '';
        };
        lat.addEventListener('change', commitCoordinates);
        lon.addEventListener('change', commitCoordinates);

        const locate = iconAction({
            icon: 'bx-current-location',
            title: 'Use my current location',
            onClick: () => {
                if (!navigator.geolocation) {
                    window.alert('This browser cannot report a location.');
                    return;
                }
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        lat.value = position.coords.latitude.toFixed(4);
                        lon.value = position.coords.longitude.toFixed(4);
                        commitCoordinates();
                    },
                    (err) => window.alert(`Could not read your location: ${err.message}`)
                );
            },
        });

        coords.append(lat, lon, locate);
        card.appendChild(row(coords, {
            label: 'Coordinates',
            description: 'Decimal degrees, e.g. 37.8715 and -122.2730.',
            htmlFor: 'weather-lat',
            compact: true,
        }));

        const units = document.createElement('select');
        units.className = 'form-select form-select-sm';
        units.id = 'weather-units';
        units.innerHTML = `
            <option value="metric"${current.units !== 'imperial' ? ' selected' : ''}>Celsius, km/h</option>
            <option value="imperial"${current.units === 'imperial' ? ' selected' : ''}>Fahrenheit, mph</option>
        `;
        units.addEventListener('change', () => {
            todayEngine.setWeather({ units: units.value as WeatherConfig['units'] });
            weatherCache = null;
        });
        card.appendChild(row(units, { label: 'Units', htmlFor: 'weather-units' }));
    }

    function coordinateInput(id: string, ariaLabel: string, value: number): HTMLInputElement {
        const input = document.createElement('input');
        input.type = 'number';
        input.step = 'any';
        input.className = 'form-control form-control-sm';
        input.id = id;
        input.style.width = '110px';
        input.setAttribute('aria-label', ariaLabel);
        input.value = value ? String(value) : '';
        return input;
    }

    // ------------------------------------------------------- local insights

    function renderLocalInsightsSettings(parent: HTMLElement, layout: TodayLayoutConfig) {
        const { card } = section(parent, {
            title: 'Local Insights',
            description: 'Settings for Activity, On This Day, Writing Goal, Moon & Daylight, and Needs Attention. All read-only and computed locally, except Moon & Daylight which reuses the Weather location above.',
        });

        const goalInput = document.createElement('input');
        goalInput.type = 'number';
        goalInput.className = 'form-control form-control-sm';
        goalInput.id = 'writing-goal-words';
        goalInput.min = '0';
        goalInput.step = '25';
        goalInput.value = String(layout.writingGoalWords ?? 500);
        goalInput.addEventListener('change', () => {
            todayEngine.setWritingGoalWords(Number(goalInput.value));
            goalInput.value = String(todayEngine.getLayout().writingGoalWords);
        });
        card.appendChild(row(goalInput, {
            label: 'Daily writing goal',
            description: 'Words per day the Writing Goal widget tracks against, from story drafts and edits touched today.',
            htmlFor: 'writing-goal-words',
        }));

        const staleInput = document.createElement('input');
        staleInput.type = 'number';
        staleInput.className = 'form-control form-control-sm';
        staleInput.id = 'stale-threshold-days';
        staleInput.min = '1';
        staleInput.value = String(layout.staleThresholdDays ?? 14);
        staleInput.addEventListener('change', () => {
            todayEngine.setStaleThresholdDays(Number(staleInput.value));
            staleInput.value = String(todayEngine.getLayout().staleThresholdDays);
        });
        card.appendChild(row(staleInput, {
            label: 'Stale after (days)',
            description: 'How long a still-open note can go untouched before Needs Attention flags it.',
            htmlFor: 'stale-threshold-days',
        }));
    }

    /**
     * The widget body. The forecast is requested once per location and then reused,
     * so re-rendering the dashboard does not hit the network again.
     */
    function renderWeatherWidget(card: HTMLElement) {
        const weather = todayEngine.getLayout().weather;

        if (!hasLocation(weather)) {
            card.appendChild(emptyState('No location set. Add coordinates under Weather in Edit.'));
            return;
        }

        const key = `${weather.latitude},${weather.longitude},${weather.units}`;

        if (weatherCache?.key === key) {
            card.appendChild(weatherReport(weatherCache.report, weather));
            return;
        }

        if (weatherError) {
            const failed = document.createElement('div');
            failed.className = 'ns-actions';
            const message = document.createElement('span');
            message.className = 'ns-empty';
            message.textContent = weatherError;
            failed.append(message, button({
                text: 'Retry',
                icon: 'bx-refresh',
                onClick: () => {
                    weatherError = '';
                    refresh();
                },
            }));
            card.appendChild(failed);
            return;
        }

        card.appendChild(emptyState('Loading forecast…'));

        if (weatherPending) return;
        weatherPending = true;

        fetchWeather(weather)
            .then((report) => {
                weatherCache = { key, report };
                weatherError = '';
            })
            .catch((err: Error) => {
                weatherError = `Could not load the forecast: ${err.message}`;
            })
            .finally(() => {
                weatherPending = false;
                if (mode === 'preview') refresh();
            });
    }

    function weatherReport(report: WeatherReport, weather: WeatherConfig): HTMLElement {
        const el = document.createElement('div');

        const now = document.createElement('div');
        now.className = 'ns-weather-now';
        now.innerHTML = `
            <span class="ns-weather-icon bx bx-${escapeHtml(report.condition.icon)}" aria-hidden="true"></span>
            <div>
                <div class="ns-weather-temp">${report.temperature}${escapeHtml(report.temperatureUnit)}</div>
                <div class="ns-meta">
                    ${escapeHtml(report.condition.label)}${weather.label ? ` &middot; ${escapeHtml(weather.label)}` : ''}
                    &middot; wind ${report.windSpeed} ${escapeHtml(report.windUnit)}
                </div>
            </div>
        `;
        el.appendChild(now);

        if (report.days.length) {
            const forecast = document.createElement('div');
            forecast.className = 'ns-weather-forecast';
            forecast.innerHTML = report.days
                .map((day, i) => `
                    <div class="ns-weather-day">
                        <span class="ns-meta">${i === 0 ? 'Today' : escapeHtml(weekday(day.date))}</span>
                        <span class="bx bx-${escapeHtml(day.condition.icon)}" aria-hidden="true" title="${escapeHtml(day.condition.label)}"></span>
                        <span>${day.high}&deg;</span>
                        <span class="ns-meta">${day.low}&deg;</span>
                    </div>
                `)
                .join('');
            el.appendChild(forecast);
        }

        return el;
    }

    function weekday(isoDate: string): string {
        // Parsed as local time rather than UTC, so the label matches the user's day.
        const [year, month, day] = isoDate.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString(undefined, { weekday: 'short' });
    }

    // ---------------------------------------------------------- local data

    /** The Trilium frontend script API, when this is actually running inside Trilium. */
    function triliumApi(): any {
        const g = globalThis as any;
        return g.api && typeof g.api.searchForNotes === 'function' ? g.api : null;
    }

    /**
     * Trilium's own timestamps are "YYYY-MM-DD HH:mm:ss.SSS±ZZZZ", which is not a
     * format the Date constructor is required to parse. Extracting the fields by
     * hand keeps this correct on every engine, not just the ones lenient enough
     * to accept it.
     */
    function parseTriliumTimestamp(value: unknown): number {
        if (typeof value !== 'string') return NaN;
        const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(value);
        if (!match) {
            const parsed = Date.parse(value);
            return Number.isNaN(parsed) ? NaN : parsed;
        }
        const [, y, mo, d, h, mi, s] = match.map(Number);
        return new Date(y, mo - 1, d, h, mi, s).getTime();
    }

    /**
     * Stands in for real note data outside Trilium (this preview harness, tests),
     * anchored to `now` so the demo is meaningful regardless of when it is viewed:
     * varied activity over twelve weeks, an anniversary note for On This Day, and
     * one stale plus one fresh note for Needs Attention.
     */
    function buildSampleNoteSummaries(now: Date): NoteSummary[] {
        const day = 24 * 60 * 60 * 1000;
        const summaries: NoteSummary[] = [];
        let id = 0;

        for (let offset = 0; offset < 84; offset++) {
            const count = Math.round(Math.abs(Math.sin(offset * 1.7)) * 3);
            for (let i = 0; i < count; i++) {
                const ts = now.getTime() - offset * day - i * 3_600_000;
                // Closed, so this history-filler data doesn't also show up as stale.
                summaries.push({ noteId: `sample_${id++}`, title: 'Sample note', dateCreated: ts, dateModified: ts, status: 'done' });
            }
        }

        for (const [yearsAgo, title] of [[1, 'Kickoff meeting notes'], [3, 'First project retro']] as const) {
            const anniversary = new Date(now.getFullYear() - yearsAgo, now.getMonth(), now.getDate(), 10, 0, 0);
            summaries.push({ noteId: `sample_anniversary_${yearsAgo}`, title, dateCreated: anniversary.getTime(), dateModified: anniversary.getTime(), status: 'done' });
        }

        summaries.push({ noteId: 'sample_stale_1', title: 'Vendor contract renewal', dateCreated: now.getTime() - 60 * day, dateModified: now.getTime() - 40 * day, status: 'todo' });
        summaries.push({ noteId: 'sample_fresh_1', title: "This week's planning doc", dateCreated: now.getTime() - 3 * day, dateModified: now.getTime() - 1 * day, status: 'in_progress' });

        return summaries;
    }

    /** Shared by Activity, On This Day, and Needs Attention so they issue one search between them. */
    async function loadNoteSummaries(): Promise<NoteSummary[]> {
        if (noteSummaryCache) return noteSummaryCache;

        const api = triliumApi();
        if (!api) {
            noteSummaryCache = buildSampleNoteSummaries(new Date());
            return noteSummaryCache;
        }

        const markers = templateEngine.getAllTemplates().map((t) => `#${t.marker}`);
        const notes = await api.searchForNotes(markers.length ? markers.join(' OR ') : '#extTask');
        const summaries: NoteSummary[] = notes.map((note: any) => ({
            noteId: note.noteId,
            title: note.title,
            dateCreated: parseTriliumTimestamp(note.dateCreated),
            dateModified: parseTriliumTimestamp(note.dateModified),
            status: typeof note.getLabelValue === 'function' ? (note.getLabelValue('status') ?? undefined) : undefined,
        }));
        noteSummaryCache = summaries;
        return summaries;
    }

    /** Renders a loading placeholder and kicks off the fetch if needed; returns whether the cache is ready to read. */
    function ensureNoteSummariesLoaded(card: HTMLElement): boolean {
        if (noteSummaryCache) return true;

        card.appendChild(emptyState('Loading…'));
        if (!noteSummaryPending) {
            noteSummaryPending = true;
            loadNoteSummaries().finally(() => {
                noteSummaryPending = false;
                if (mode === 'preview') refresh();
            });
        }
        return false;
    }

    /** The Kanban board's own search — task status/priority/project aren't part of NoteSummary. */
    async function loadTasks(): Promise<KanbanTask[]> {
        const api = triliumApi();
        if (!api) return SAMPLE_TASKS;

        const notes = await api.searchForNotes('#extTask');
        const tasks: KanbanTask[] = [];
        for (const note of notes) {
            const status = typeof note.getLabelValue === 'function' ? note.getLabelValue('status') : null;
            const priority = typeof note.getLabelValue === 'function' ? note.getLabelValue('priority') : null;
            const projectNote = typeof note.getRelationTarget === 'function' ? await note.getRelationTarget('project') : null;
            tasks.push({
                id: note.noteId,
                title: note.title,
                status: status ?? 'todo',
                priority: priority ?? 'medium',
                project: projectNote?.title ?? '',
            });
        }
        return tasks;
    }

    /** Renders a loading placeholder and kicks off the fetch if needed; returns whether the cache is ready to read. */
    function ensureTasksLoaded(card: HTMLElement): boolean {
        if (taskCache) return true;

        card.appendChild(emptyState('Loading…'));
        if (!taskPending) {
            taskPending = true;
            loadTasks().then((tasks) => {
                taskCache = tasks;
            }).finally(() => {
                taskPending = false;
                if (mode === 'preview') refresh();
            });
        }
        return false;
    }

    async function loadWordsWrittenToday(): Promise<number> {
        const api = triliumApi();
        if (!api) return 340; // representative sample outside Trilium, where there is no real content to measure

        const notes = await api.searchForNotes('#extStoryDraft OR #extEmailDraft OR #extScratch');
        const todayKey = new Date().toDateString();
        let total = 0;
        for (const note of notes) {
            const modified = parseTriliumTimestamp(note.dateModified);
            if (!Number.isFinite(modified) || new Date(modified).toDateString() !== todayKey) continue;
            const content = typeof note.getContent === 'function' ? await note.getContent() : '';
            total += countWords(content ?? '');
        }
        return total;
    }

    function heatmapLevel(count: number): number {
        if (count <= 0) return 0;
        if (count === 1) return 1;
        if (count <= 3) return 2;
        if (count <= 5) return 3;
        return 4;
    }

    function renderHeatmapWidget(card: HTMLElement) {
        if (!ensureNoteSummariesLoaded(card)) return;

        const timestamps = noteSummaryCache!.map((n) => n.dateCreated).filter((t) => Number.isFinite(t));
        if (!timestamps.length) {
            card.appendChild(emptyState('No notes created yet.'));
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'ns-heatmap';
        for (const week of buildActivityHeatmap(timestamps, new Date(), 12)) {
            const col = document.createElement('div');
            col.className = 'ns-heatmap-week';
            for (const dayCell of week.days) {
                const cell = document.createElement('div');
                cell.className = `ns-heatmap-day level-${heatmapLevel(dayCell.count)}`;
                cell.title = `${dayCell.date}: ${dayCell.count} note${dayCell.count === 1 ? '' : 's'}`;
                col.appendChild(cell);
            }
            grid.appendChild(col);
        }
        card.appendChild(grid);
    }

    function renderOnThisDayWidget(card: HTMLElement) {
        if (!ensureNoteSummariesLoaded(card)) return;

        const results = findOnThisDay(noteSummaryCache!, new Date());
        if (!results.length) {
            card.appendChild(emptyState('Nothing from this day in previous years.'));
            return;
        }
        for (const entry of results) {
            card.appendChild(listItem({
                title: entry.title,
                description: `${entry.yearsAgo} year${entry.yearsAgo === 1 ? '' : 's'} ago today`,
            }));
        }
    }

    function renderStaleNotesWidget(card: HTMLElement) {
        if (!ensureNoteSummariesLoaded(card)) return;

        const threshold = todayEngine.getLayout().staleThresholdDays ?? 14;
        const stale = findStaleNotes(noteSummaryCache!, new Date(), threshold);
        if (!stale.length) {
            card.appendChild(emptyState('Nothing has gone stale.'));
            return;
        }
        for (const entry of stale.slice(0, 8)) {
            card.appendChild(listItem({
                title: entry.title,
                description: `Untouched for ${entry.daysSinceModified} days`,
            }));
        }
    }

    function renderWritingGoalWidget(card: HTMLElement) {
        const quote = pickDailyQuote(new Date());
        const quoteEl = document.createElement('blockquote');
        quoteEl.className = 'ns-quote';
        quoteEl.innerHTML = `<p>&ldquo;${escapeHtml(quote.text)}&rdquo;</p><cite>&mdash; ${escapeHtml(quote.author)}</cite>`;
        card.appendChild(quoteEl);

        if (wordsTodayCache === null) {
            card.appendChild(emptyState('Loading progress…'));
            if (!wordsTodayPending) {
                wordsTodayPending = true;
                loadWordsWrittenToday()
                    .then((count) => { wordsTodayCache = count; })
                    .finally(() => {
                        wordsTodayPending = false;
                        if (mode === 'preview') refresh();
                    });
            }
            return;
        }

        const goal = todayEngine.getLayout().writingGoalWords ?? 500;
        const progress = computeWritingGoalProgress(wordsTodayCache, goal);

        const bar = document.createElement('div');
        bar.className = 'ns-progress';
        bar.innerHTML = `<div class="ns-progress-fill" style="width: ${progress.percent}%"></div>`;
        card.appendChild(bar);

        const label = document.createElement('div');
        label.className = 'ns-meta ns-progress-label';
        label.textContent = progress.metGoal
            ? `${progress.current} / ${progress.goal} words — goal met!`
            : `${progress.current} / ${progress.goal} words (${progress.remaining} to go)`;
        card.appendChild(label);
    }

    function renderMoonPhaseWidget(card: HTMLElement) {
        const phase = computeMoonPhase(new Date());

        const phaseRow = document.createElement('div');
        phaseRow.className = 'ns-weather-now';
        phaseRow.innerHTML = `
            <span class="ns-weather-icon bx bx-moon" aria-hidden="true"></span>
            <div>
                <div class="ns-weather-temp">${escapeHtml(phase.name)}</div>
                <div class="ns-meta">${Math.round(phase.illumination * 100)}% illuminated</div>
            </div>
        `;
        card.appendChild(phaseRow);

        const weather = todayEngine.getLayout().weather;
        if (!hasLocation(weather)) {
            const hint = document.createElement('div');
            hint.className = 'ns-meta ns-progress-label';
            hint.textContent = 'Set a location under Weather to also show sunrise, sunset, and daylight.';
            card.appendChild(hint);
            return;
        }

        const key = `${weather.latitude},${weather.longitude},${weather.units}`;
        if (weatherCache?.key === key) {
            card.appendChild(daylightRow(weatherCache.report));
            return;
        }

        if (weatherError) {
            const hint = document.createElement('div');
            hint.className = 'ns-meta ns-progress-label';
            hint.textContent = 'Daylight unavailable — see the Weather widget for details.';
            card.appendChild(hint);
            return;
        }

        card.appendChild(emptyState('Loading daylight…'));
        if (weatherPending) return;
        weatherPending = true;
        fetchWeather(weather)
            .then((report) => { weatherCache = { key, report }; weatherError = ''; })
            .catch((err: Error) => { weatherError = `Could not load daylight: ${err.message}`; })
            .finally(() => {
                weatherPending = false;
                if (mode === 'preview') refresh();
            });
    }

    function daylightRow(report: WeatherReport): HTMLElement {
        const el = document.createElement('div');
        el.className = 'ns-meta ns-progress-label';
        if (!report.sunrise || !report.sunset) {
            el.textContent = 'Daylight data unavailable for this location.';
            return el;
        }
        el.innerHTML = `Sunrise ${formatClockTime(report.sunrise)} &middot; Sunset ${formatClockTime(report.sunset)}` +
            (report.daylightSeconds ? ` &middot; ${formatDaylight(report.daylightSeconds)} of daylight` : '');
        return el;
    }

    function formatClockTime(isoLocal: string): string {
        const date = new Date(isoLocal);
        if (Number.isNaN(date.getTime())) return isoLocal;
        return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }

    function formatDaylight(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.round((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    // -------------------------------------------------------------- dashboard

    function renderDashboard(parent: HTMLElement) {
        const layout = todayEngine.getLayout();

        if (layout.showQuickCaptureBar) {
            renderQuickCapture(parent);
        }

        const widgets = todayEngine.getVisibleWidgets();
        if (!widgets.length) {
            const { card } = section(parent, { title: 'Dashboard' });
            card.appendChild(emptyState('No widgets are shown. Switch to Edit to turn some on.'));
            return;
        }

        const grid = document.createElement('div');
        grid.className = `ns-grid ${layout.columns === 'auto' || layout.columns === undefined ? 'ns-grid-auto' : `ns-cols-${layout.columns}`}`;

        for (const widget of widgets) {
            const { section: sec, card } = section(grid, {
                title: widget.title,
                actions: widget.actionType
                    ? [iconAction({
                        icon: 'bx-plus',
                        title: widget.actionLabel || `New ${widget.title}`,
                        onClick: () => onQuickCapture(widget.actionType!),
                    })]
                    : undefined,
            });

            if (widget.colSpan === 2) sec.classList.add('ns-span-2');
            if (widget.colSpan === 3) sec.classList.add('ns-span-full');

            if (widget.id === 'openTasks') {
                renderKanban(card);
            } else if (widget.id === 'weather') {
                renderWeatherWidget(card);
            } else if (widget.id === 'activityHeatmap') {
                renderHeatmapWidget(card);
            } else if (widget.id === 'onThisDay') {
                renderOnThisDayWidget(card);
            } else if (widget.id === 'writingGoal') {
                renderWritingGoalWidget(card);
            } else if (widget.id === 'moonPhase') {
                renderMoonPhaseWidget(card);
            } else if (widget.id === 'staleNotes') {
                renderStaleNotesWidget(card);
            } else {
                card.appendChild(emptyState(widget.emptyMessage));
            }
        }

        parent.appendChild(grid);
    }

    function renderQuickCapture(parent: HTMLElement) {
        const templates = templateEngine.getAllTemplates().filter((t) => !t.noJournalClone).slice(0, 4);
        if (!templates.length) return;

        const { card } = section(parent, { title: 'Quick capture' });

        const actions = document.createElement('div');
        actions.className = 'ns-actions';
        for (const tpl of templates) {
            actions.appendChild(button({
                text: tpl.title,
                icon: `bx-${tpl.icon}`,
                onClick: () => onQuickCapture(tpl.id),
            }));
        }
        card.appendChild(actions);
    }

    function renderKanban(parent: HTMLElement) {
        if (!ensureTasksLoaded(parent)) return;

        const board = document.createElement('div');
        board.className = 'ns-kanban';

        for (const column of KANBAN_COLUMNS) {
            const tasks = taskCache!.filter((t) => t.status === column.id);

            const col = document.createElement('div');
            col.className = 'kanban-col';
            col.innerHTML = `
                <div class="ns-kanban-head">
                    <span>${escapeHtml(column.title)}</span>
                    <span class="ns-count">${tasks.length}</span>
                </div>
            `;

            const list = document.createElement('div');
            list.className = 'ns-stack';

            if (!tasks.length) {
                list.appendChild(emptyState('Nothing here.'));
            } else {
                for (const task of tasks) {
                    const card = document.createElement('div');
                    card.className = 'kanban-card';
                    card.innerHTML = `
                        <div>${escapeHtml(task.title)}</div>
                        <div class="ns-meta">${escapeHtml(task.project)} &middot; ${escapeHtml(task.priority)} priority</div>
                    `;
                    list.appendChild(card);
                }
            }

            col.appendChild(list);
            board.appendChild(col);
        }

        parent.appendChild(board);
    }

    refresh();
}
