"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/engine/settingsEngine.ts
  var DEFAULT_AUTOMATION_SETTINGS = {
    autoRunIfThenRulesOnCreation: true,
    enableDerivedTopics: true,
    autoJournalClone: true,
    defaultQuickCaptureTemplate: "task",
    staleThresholdDays: 14,
    writingGoalWords: 500
  };
  var SettingsEngine = class {
    constructor(initial) {
      __publicField(this, "settings");
      this.settings = { ...DEFAULT_AUTOMATION_SETTINGS, ...initial };
    }
    get(key) {
      return this.settings[key];
    }
    getAll() {
      return { ...this.settings };
    }
    set(key, value) {
      this.settings[key] = value;
    }
  };

  // src/components/nativeUi.ts
  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function section(parent, { title, description, actions } = {}) {
    const sectionEl = document.createElement("div");
    sectionEl.className = "ns-section";
    if (title || actions?.length) {
      const header = document.createElement("div");
      header.className = "ns-section-header";
      header.innerHTML = `<h4 class="ns-section-title">${escapeHtml(title ?? "")}</h4>`;
      if (actions?.length) {
        const actionsEl = document.createElement("div");
        actionsEl.className = "ns-actions";
        actions.forEach((a) => actionsEl.appendChild(a));
        header.appendChild(actionsEl);
      }
      sectionEl.appendChild(header);
    }
    const card = document.createElement("div");
    card.className = "ns-section-card";
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
  function listItem({ icon, title, description, disabled, actions }) {
    const item = document.createElement("div");
    item.className = `ns-list-item${disabled ? " is-disabled" : ""}`;
    item.innerHTML = `
        <div class="ns-list-item-main">
            ${icon ? `<span class="ns-list-item-icon bx ${escapeHtml(icon)}" aria-hidden="true"></span>` : ""}
            <div>
                <span class="ns-list-item-title">${escapeHtml(title)}</span>
                ${description ? `<div class="ns-list-item-desc">${escapeHtml(description)}</div>` : ""}
            </div>
        </div>
    `;
    if (actions?.length) {
      const actionsEl = document.createElement("div");
      actionsEl.className = "ns-list-item-actions";
      actions.forEach((a) => actionsEl.appendChild(a));
      item.appendChild(actionsEl);
    }
    return item;
  }
  function emptyState(text) {
    const el = document.createElement("div");
    el.className = "ns-empty";
    el.textContent = text;
    return el;
  }

  // src/engine/noteInsightsEngine.ts
  function findStaleNotes(notes, today = /* @__PURE__ */ new Date(), thresholdDays = 14, closedStatuses = ["done", "cancelled", "complete", "completed", "archived"]) {
    const closed = new Set(closedStatuses.map((s) => s.toLowerCase()));
    const nowMs = today.getTime();
    const dayMs = 24 * 60 * 60 * 1e3;
    return notes.filter((note) => !closed.has((note.status ?? "").toLowerCase())).map((note) => ({
      noteId: note.noteId,
      title: note.title,
      daysSinceModified: Math.floor((nowMs - note.dateModified) / dayMs)
    })).filter((n) => n.daysSinceModified >= thresholdDays).sort((a, b) => b.daysSinceModified - a.daysSinceModified);
  }
  var KNOWN_NEW_MOON_MS = Date.UTC(2e3, 0, 6, 18, 14);

  // src/artifacts/notes-system-stale-notes.jsx
  function initIkmalStaleNotes(containerEl) {
    const settingsEngine = new SettingsEngine();
    const shell = document.createElement("div");
    shell.className = "notes-system-shell p-3";
    const { card } = section(shell, {
      title: "Ikmal Stale Notes Reviewer",
      description: "Active tasks and drafts untouched for longer than the configured threshold."
    });
    function loadNotes() {
      if (typeof api === "undefined" || !api.searchForNotes) {
        const sample = [
          { id: "1", title: "Untouched Specification Draft", daysSinceModified: 21 },
          { id: "2", title: "Legacy Architecture Review", daysSinceModified: 18 }
        ];
        renderList(sample);
        return;
      }
      const threshold = settingsEngine.get("staleThresholdDays") ?? 14;
      api.searchForNotes("#extTask, #story, #meeting, #scratch").then((notes) => {
        const summaries = (notes || []).map((n) => ({
          id: n.noteId,
          title: n.title || "Untitled",
          utcDateModified: (n.labels || []).find((l) => l.name === "utcDateModified")?.value || (/* @__PURE__ */ new Date()).toISOString(),
          status: (n.labels || []).find((l) => l.name === "status")?.value || ""
        }));
        const stale = findStaleNotes(summaries, /* @__PURE__ */ new Date(), threshold);
        renderList(stale);
      }).catch(() => {
        renderList([]);
      });
    }
    function renderList(stale) {
      if (!stale.length) {
        card.appendChild(emptyState("No stale notes found! All active notes are up to date."));
        return;
      }
      for (const entry of stale.slice(0, 10)) {
        card.appendChild(listItem({
          icon: "bx-time-five",
          title: entry.title,
          description: `Untouched for ${entry.daysSinceModified} days`,
          actions: typeof api !== "undefined" && api.openNote ? [{
            icon: "bx-link-external",
            title: `Open ${entry.title}`,
            onClick: () => api.openNote(entry.id)
          }] : []
        }));
      }
    }
    shell.appendChild(card);
    containerEl.appendChild(shell);
    loadNotes();
  }
  if (typeof api !== "undefined" || typeof window !== "undefined") {
    const init = () => {
      const container = typeof api !== "undefined" && api.$container && (api.$container[0] || api.$container) || document.querySelector(".ikmal-stale-notes-root") || document.body;
      if (container) {
        initIkmalStaleNotes(container);
      }
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }
})();
