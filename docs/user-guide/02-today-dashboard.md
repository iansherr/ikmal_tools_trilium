# Today Homepage & Workspace Dashboard

The **Today Homepage** is your daily command center in Trilium Notes. It combines a resizable Journal split-view with a dynamic grid of live productivity widgets.

---

## Layout Structure

```
 ┌───────────────────────────────────────┬───────────────────────────────────────┐
 │ 📝 JOURNAL SIDE-PANEL (Default 65%)   │ 📊 WIDGET GRID (Default 35%)          │
 │                                       │                                       │
 │ • Current day's note content          │ • Open Tasks & Due Soon               │
 │ • Direct editing in CKEditor          │ • Active Project Hubs                 │
 │ • Auto-linked task & meeting references│ • Writing Target & 30-Day Heatmap     │
 │                                       │ • Weather & Moon Phase Card           │
 └───────────────────────────────────────┴───────────────────────────────────────┘
```

---

## Today Widgets

1. **Open Tasks & Due Soon**: Displays active tasks (`#extTask`) queried live via `api.searchForNotes('#extTask')`.
2. **Active Project Hubs**: Lists active project containers (`#extProjectHub`) currently in progress.
3. **Writing Goal & Activity Heatmap**: Tracks your daily word count progress against your configured goal (e.g. 500 words/day) and displays a 30-day activity intensity heatmap.
4. **Local Weather & Climate**: Displays live Open-Meteo weather forecasts, temperature, condition icons, daylight hours, and moon phase illumination.
5. **Time Machine (On This Day)**: Highlights historical journal entries written on the exact calendar day in previous years.
6. **Stale Notes Reviewer**: Identifies active tasks and drafts untouched for longer than your configured threshold (e.g., 14 days).

---

## Customizing Layout Split

Drag the vertical divider between the Journal and Widget grid to resize on the fly. Your preferred split percentage is saved to the package manifest note and persists across restarts.
