# Architecture Overview — Ikmal Tools for Trilium

**Ikmal Tools for Trilium** (`iansherr/ikmal_tools_trilium`) is engineered with a strict separation between pure TypeScript engine logic and browser UI render artifacts. It is also separate from the Trilium host: the package manager, Plugins settings tab, and host-side tests live in the experimental [`integration/plugins` branch](https://github.com/iansherr/Trilium/tree/integration/plugins).

---

## Directory Structure

```
src/
├── engine/                   # Pure TypeScript engines (0% DOM coupling, 100% unit-tested)
│   ├── templateEngine.ts     # Schema registry, template parsing, title formatting
│   ├── relationshipEngine.ts # Parent link auto-cloning & derived topic calculation
│   ├── ifThenRuleEngine.ts   # Event trigger matching & action execution pipelines
│   ├── todayEngine.ts        # Dashboard layout management & state persistence
│   ├── noteCreationEngine.ts # Unified note instantiation planning
│   ├── noteMaterializer.ts   # ETAPI / frontend script API note creation
│   ├── fleetBridge.ts        # Targeted FleetSync sync payload formatting [BETA / IN DEVELOPMENT]
│   ├── weatherEngine.ts      # Open-Meteo weather API parsing
│   └── noteInsightsEngine.ts # Word count, heatmaps, anniversaries, stale notes
│
├── components/               # Pure UI components (Vanilla JS + Bootstrap 5 + Boxicons)
│   ├── TodayHomepage.tsx     # Workspace dashboard & widget grid
│   ├── TemplateStudio.tsx    # Schema & rule editor UI
│   ├── SettingsStudio.tsx    # Package settings & micro-tools catalog UI
│   └── nativeUi.ts           # Native Trilium look-and-feel UI primitives
│
└── artifacts/                # Standalone IIFE bundled entrypoints declared in trilium-package.json
    ├── notes-system-dashboard.jsx    # Main workspace dashboard
    ├── notes-system-kanban.jsx       # Task Kanban board
    ├── notes-system-insights.jsx     # Productivity insights
    ├── notes-system-quick-capture.jsx# Quick capture toolbar
    ├── notes-system-weather.jsx      # Weather card
    ├── notes-system-on-this-day.jsx  # Time Machine
    ├── notes-system-stale-notes.jsx  # Stale notes reviewer
    ├── notes-system-canvas.jsx       # Interactive canvas (Beta)
    ├── notes-system-launcher.js      # Global header bar & hotkey
    ├── notes-system-word-count.js    # Live editor status bar counter
    └── notes-system.css              # Theme & UI stylesheet
```

---

## Manifest & SRI Integrity

`trilium-package.json` declares all 11 package artifacts. When running `npm run build`, `tools/build.mjs` automatically computes the Subresource Integrity (`sha256-...`) hash for every compiled JS/CSS file and updates `trilium-package.json` automatically.
