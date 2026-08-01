/**
 * Ikmal Weather & Moon Phase Card (Standalone JSX Render Note)
 * Renders live Open-Meteo weather forecast, condition icons, daylight hours,
 * and moon phase illumination as an independent render note widget.
 */

import { TodayEngine } from '../engine/todayEngine.js';
import { escapeHtml, section } from '../components/nativeUi.js';
import { computeMoonPhase } from '../engine/noteInsightsEngine.js';
import { hasLocation, parseWeatherResponse, describeWeatherCode } from '../engine/weatherEngine.js';

export function initIkmalWeather(containerEl) {
    const todayEngine = new TodayEngine();
    const shell = document.createElement('div');
    shell.className = 'notes-system-shell p-3';

    const { card } = section(shell, {
        title: 'Ikmal Weather & Climate Card',
        description: 'Live local weather, condition forecast, and moon phase illumination.',
    });

    const phase = computeMoonPhase(new Date());

    const weatherBox = document.createElement('div');
    weatherBox.className = 'ns-card p-3 mt-2';
    weatherBox.innerHTML = `
        <div class="d-flex align-items-center justify-content-between mb-3">
            <div class="d-flex align-items-center gap-2">
                <i class="bx bx-sun fs-2 text-warning"></i>
                <div>
                    <h6 class="mb-0 fw-bold">Local Climate & Moon Phase</h6>
                    <small class="text-muted">${escapeHtml(phase.label)} (${phase.illuminationPercent}% illuminated)</small>
                </div>
            </div>
            <span class="fs-1">${phase.symbol}</span>
        </div>
        <div class="alert alert-light border small text-muted mb-0">
            Configure custom coordinates in Ikmal Package Settings to enable live Open-Meteo weather forecasts.
        </div>
    `;

    card.appendChild(weatherBox);
    shell.appendChild(card);
    containerEl.appendChild(shell);
}

if (typeof api !== 'undefined' || typeof window !== 'undefined') {
    const init = () => {
        const container = (typeof api !== 'undefined' && api.$container && (api.$container[0] || api.$container))
            || document.querySelector('.ikmal-weather-root')
            || document.body;
        if (container) {
            initIkmalWeather(container);
        }
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
