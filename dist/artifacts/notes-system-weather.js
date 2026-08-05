"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/engine/todayEngine.ts
  var DEFAULT_WEATHER = {
    label: "",
    latitude: 0,
    longitude: 0,
    units: "metric"
  };
  var DEFAULT_TODAY_WIDGETS = [
    {
      id: "weather",
      title: "Weather",
      marker: "weather",
      visible: false,
      order: 0,
      colSpan: 1,
      columns: [],
      emptyMessage: "Set a location to show the local forecast."
    },
    {
      id: "openTasks",
      title: "Open Tasks",
      marker: "openTasks",
      visible: true,
      order: 1,
      colSpan: 2,
      columns: [["Due", "dueDate"], ["Priority", "priority"], ["Project", "project"]],
      emptyMessage: "No open tasks. All caught up!",
      actionType: "task",
      actionLabel: "New Task"
    },
    {
      id: "overdue",
      title: "Overdue Work",
      marker: "overdue",
      visible: true,
      order: 2,
      colSpan: 1,
      columns: [["Due", "dueDate"], ["Priority", "priority"], ["Project", "project"]],
      emptyMessage: "No overdue tasks.",
      actionType: "task",
      actionLabel: "New Task"
    },
    {
      id: "dueSoon",
      title: "Due Soon",
      marker: "dueSoon",
      visible: true,
      order: 3,
      colSpan: 1,
      columns: [["Due", "dueDate"], ["Priority", "priority"], ["Project", "project"]],
      emptyMessage: "No tasks due soon.",
      actionType: "task",
      actionLabel: "New Task"
    },
    {
      id: "activeProjects",
      title: "Active Projects",
      marker: "activeProjects",
      visible: true,
      order: 4,
      colSpan: 1,
      columns: [["Kind", "kind"], ["Status", "status"]],
      emptyMessage: "No active projects.",
      actionType: "projectHub",
      actionLabel: "New Project"
    },
    {
      id: "highPriority",
      title: "High Priority",
      marker: "highPriority",
      visible: true,
      order: 5,
      colSpan: 1,
      columns: [["Priority", "priority"], ["Due", "dueDate"], ["Project", "project"]],
      emptyMessage: "No unfinished high-priority work.",
      actionType: "task",
      actionLabel: "New Task"
    },
    {
      id: "followUpsDue",
      title: "Follow-ups & Replies",
      marker: "followUpsDue",
      visible: true,
      order: 6,
      colSpan: 1,
      columns: [["Follow-up", "followUpDate"], ["Waiting on", "waitingOn"]],
      emptyMessage: "No follow-ups due soon.",
      actionType: "email",
      actionLabel: "New Email"
    },
    {
      id: "openDrafts",
      title: "Stories & Drafts",
      marker: "openDrafts",
      visible: true,
      order: 7,
      colSpan: 1,
      columns: [["Status", "status"], ["Round", "round"], ["Project", "project"]],
      emptyMessage: "No open drafts.",
      actionType: "story",
      actionLabel: "New Story"
    },
    {
      id: "recentlyTouched",
      title: "Recently Touched",
      marker: "recentlyTouched",
      visible: true,
      order: 8,
      colSpan: 2,
      columns: [["Kind", "kind"], ["Status", "status"], ["Project", "project"]],
      emptyMessage: "Nothing touched in the last seven days."
    },
    {
      id: "activityHeatmap",
      title: "Activity",
      marker: "activityHeatmap",
      visible: false,
      order: 9,
      colSpan: 3,
      columns: [],
      emptyMessage: "No notes created yet."
    },
    {
      id: "onThisDay",
      title: "On This Day",
      marker: "onThisDay",
      visible: false,
      order: 10,
      colSpan: 1,
      columns: [],
      emptyMessage: "Nothing from this day in previous years."
    },
    {
      id: "writingGoal",
      title: "Writing Goal",
      marker: "writingGoal",
      visible: false,
      order: 11,
      colSpan: 1,
      columns: [],
      emptyMessage: "Set a daily word goal under Layout to track progress."
    },
    {
      id: "moonPhase",
      title: "Moon & Daylight",
      marker: "moonPhase",
      visible: false,
      order: 12,
      colSpan: 1,
      columns: [],
      emptyMessage: "Set a location under Weather to show sunrise, sunset, and daylight."
    },
    {
      id: "staleNotes",
      title: "Needs Attention",
      marker: "staleNotes",
      visible: false,
      order: 13,
      colSpan: 1,
      columns: [],
      emptyMessage: "Nothing has gone stale."
    }
  ];
  var TodayEngine = class {
    constructor(initialLayout) {
      __publicField(this, "layout");
      const base = initialLayout ?? {
        journalWidthPercent: 65,
        showQuickCaptureBar: true,
        widgets: JSON.parse(JSON.stringify(DEFAULT_TODAY_WIDGETS))
      };
      this.layout = {
        ...base,
        columns: base.columns ?? "auto",
        density: base.density ?? "comfortable",
        weather: { ...DEFAULT_WEATHER, ...base.weather ?? {} },
        writingGoalWords: base.writingGoalWords ?? 500,
        staleThresholdDays: base.staleThresholdDays ?? 14
      };
    }
    getLayout() {
      return JSON.parse(JSON.stringify(this.layout));
    }
    getVisibleWidgets() {
      return this.layout.widgets.filter((w) => w.visible).sort((a, b) => a.order - b.order);
    }
    toggleWidgetVisibility(widgetId, visible) {
      const widget = this.layout.widgets.find((w) => w.id === widgetId);
      if (widget) {
        widget.visible = visible !== void 0 ? visible : !widget.visible;
      }
      return this.getLayout();
    }
    reorderWidgets(orderedIds) {
      orderedIds.forEach((id, index) => {
        const widget = this.layout.widgets.find((w) => w.id === id);
        if (widget) {
          widget.order = index + 1;
        }
      });
      return this.getLayout();
    }
    setColumns(columns) {
      this.layout.columns = columns;
      return this.getLayout();
    }
    setDensity(density) {
      this.layout.density = density;
      return this.getLayout();
    }
    setWeather(updates) {
      this.layout.weather = { ...DEFAULT_WEATHER, ...this.layout.weather, ...updates };
      return this.getLayout();
    }
    setQuickCaptureBar(visible) {
      this.layout.showQuickCaptureBar = visible;
      return this.getLayout();
    }
    setJournalWidth(percent) {
      this.layout.journalWidthPercent = Math.min(85, Math.max(35, percent));
      return this.getLayout();
    }
    setWritingGoalWords(words) {
      this.layout.writingGoalWords = Math.max(0, Math.round(words) || 0);
      return this.getLayout();
    }
    setStaleThresholdDays(days) {
      this.layout.staleThresholdDays = Math.max(1, Math.round(days) || 1);
      return this.getLayout();
    }
    updateWidget(widgetId, updates) {
      const widget = this.layout.widgets.find((w) => w.id === widgetId);
      if (widget) {
        Object.assign(widget, updates);
      }
      return this.getLayout();
    }
  };

  // src/components/nativeUi.ts
  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function section(parent, { title, description, actions, collapsible } = {}) {
    const sectionEl = document.createElement("div");
    sectionEl.className = "ns-section";
    const card = document.createElement("div");
    card.className = "ns-section-card";
    if (title || actions?.length || collapsible) {
      const header = document.createElement("div");
      header.className = "ns-section-header d-flex justify-content-between align-items-center";
      header.innerHTML = `<h4 class="ns-section-title m-0">${escapeHtml(title ?? "")}</h4>`;
      const headerRight = document.createElement("div");
      headerRight.className = "ns-actions d-flex align-items-center gap-2";
      if (actions?.length) {
        actions.forEach((a) => headerRight.appendChild(a));
      }
      if (collapsible) {
        const toggleBtn = iconAction({
          icon: "bx-chevron-up",
          title: "Collapse section",
          onClick: () => {
            const isHidden = card.hidden;
            card.hidden = !isHidden;
            toggleBtn.querySelector("span")?.setAttribute("class", `bx ${card.hidden ? "bx-chevron-down" : "bx-chevron-up"}`);
          }
        });
        headerRight.appendChild(toggleBtn);
      }
      header.appendChild(headerRight);
      sectionEl.appendChild(header);
    }
    if (description) {
      const p = document.createElement("p");
      p.className = "ns-section-description";
      p.textContent = description;
      card.appendChild(p);
    }
    sectionEl.appendChild(card);
    parent.appendChild(sectionEl);
    return { section: sectionEl, card };
  }
  function iconAction({ icon, title, onClick }) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "icon-action";
    btn.title = title;
    btn.setAttribute("aria-label", title);
    btn.innerHTML = `<span class="bx ${escapeHtml(icon)}"></span>`;
    btn.addEventListener("click", onClick);
    return btn;
  }
  function showToast(opts, typeArg, durationArg) {
    if (typeof document === "undefined") return;
    const message = typeof opts === "string" ? opts : opts.message;
    const type = typeof opts === "string" ? typeArg || "success" : opts.type || "success";
    const durationMs = typeof opts === "string" ? durationArg ?? 3500 : opts.durationMs ?? 3500;
    const undoAction = typeof opts === "string" ? void 0 : opts.undoAction;
    let container = document.querySelector(".ns-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "ns-toast-container";
      container.style.cssText = "position: fixed; bottom: 20px; right: 20px; z-index: 1060; display: flex; flex-direction: column; gap: 8px; max-width: 360px; pointer-events: none;";
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    const bgClass = type === "success" ? "bg-success" : type === "warning" ? "bg-warning text-dark" : type === "danger" ? "bg-danger" : "bg-primary";
    const icon = type === "success" ? "bx-check-circle" : type === "warning" ? "bx-error" : type === "danger" ? "bx-x-circle" : "bx-info-circle";
    toast.className = `toast show align-items-center text-white ${bgClass} border-0 shadow-lg`;
    toast.style.cssText = "pointer-events: auto; transition: all 0.3s ease; opacity: 1; transform: translateY(0);";
    toast.innerHTML = `
        <div class="d-flex p-2.5">
            <div class="toast-body d-flex align-items-center gap-2 small">
                <i class="bx ${icon} fs-6"></i>
                <span>${escapeHtml(message)}</span>
                ${undoAction ? `<button type="button" class="btn btn-micro btn-light text-dark ms-2 undo-btn">Undo</button>` : ""}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto close-toast-btn" aria-label="Close"></button>
        </div>
    `;
    if (undoAction) {
      toast.querySelector(".undo-btn")?.addEventListener("click", () => {
        undoAction();
        removeToast();
      });
    }
    const removeToast = () => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      setTimeout(() => toast.remove(), 300);
    };
    toast.querySelector(".close-toast-btn")?.addEventListener("click", removeToast);
    container.appendChild(toast);
    if (durationMs > 0) {
      setTimeout(removeToast, durationMs);
    }
  }
  if (typeof window !== "undefined") {
    window.__ikmalToast = showToast;
  }

  // src/engine/noteInsightsEngine.ts
  var SYNODIC_MONTH_DAYS = 29.530588853;
  var KNOWN_NEW_MOON_MS = Date.UTC(2e3, 0, 6, 18, 14);
  var MOON_PHASE_NAMES = [
    "New Moon",
    "Waxing Crescent",
    "First Quarter",
    "Waxing Gibbous",
    "Full Moon",
    "Waning Gibbous",
    "Last Quarter",
    "Waning Crescent"
  ];
  function computeMoonPhase(date = /* @__PURE__ */ new Date()) {
    const diffDays = (date.getTime() - KNOWN_NEW_MOON_MS) / (24 * 60 * 60 * 1e3);
    const fraction = (diffDays % SYNODIC_MONTH_DAYS + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS / SYNODIC_MONTH_DAYS;
    const illumination = (1 - Math.cos(fraction * 2 * Math.PI)) / 2;
    const bucket = Math.floor(fraction * 8 + 0.5) % 8;
    const name = MOON_PHASE_NAMES[bucket];
    return { fraction, illumination, name, icon: "moon" };
  }

  // src/artifacts/notes-system-weather.jsx
  function initIkmalWeather(containerEl) {
    const todayEngine = new TodayEngine();
    const shell = document.createElement("div");
    shell.className = "notes-system-shell p-3";
    const { card } = section(shell, {
      title: "Ikmal Weather & Climate Card",
      description: "Live local weather, condition forecast, and moon phase illumination."
    });
    const phase = computeMoonPhase(/* @__PURE__ */ new Date());
    const weatherBox = document.createElement("div");
    weatherBox.className = "ns-card p-3 mt-2";
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
  if (typeof api !== "undefined" || typeof window !== "undefined") {
    const init = () => {
      const container = typeof api !== "undefined" && api.$container && (api.$container[0] || api.$container) || document.querySelector(".ikmal-weather-root") || document.body;
      if (container) {
        initIkmalWeather(container);
      }
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }
})();
