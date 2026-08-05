# Today Homepage & Workspace Dashboard

The **Today Homepage** is your daily command center in Trilium Notes. The visible Today page in the file tree provides a focused daily workspace; the Ikmal workspace dashboard retains layout editing, Template Studio, and package settings. Both use the same responsive widget system.

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

## Narrow panes

The dashboard responds to the width of the note pane, not just the size of the application window. This makes it suitable for a preferred narrow split such as 22%:

- The widget grid collapses before its cards reach their minimum readable width.
- Open Tasks becomes a single-column board rather than overflowing into a partial second column.
- Task cards wrap within the pane and do not create horizontal scrolling.
- Quick-capture buttons keep their labels on one line while remaining full-width touch targets.

If a pane is resized after the page has been open for a while, reload the note once so the render artifact and stylesheet are refreshed together.
