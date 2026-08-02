"use strict";
(() => {
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
  function findOnThisDay(notes, today = /* @__PURE__ */ new Date()) {
    const month = today.getMonth();
    const day = today.getDate();
    const thisYear = today.getFullYear();
    return notes.map((note) => {
      const created = new Date(note.dateCreated);
      return { note, created };
    }).filter(
      ({ created }) => created.getMonth() === month && created.getDate() === day && created.getFullYear() < thisYear
    ).map(({ note, created }) => ({
      yearsAgo: thisYear - created.getFullYear(),
      noteId: note.noteId,
      title: note.title
    })).sort((a, b) => a.yearsAgo - b.yearsAgo);
  }
  var KNOWN_NEW_MOON_MS = Date.UTC(2e3, 0, 6, 18, 14);

  // src/artifacts/notes-system-on-this-day.jsx
  function initIkmalOnThisDay(containerEl) {
    const shell = document.createElement("div");
    shell.className = "notes-system-shell p-3";
    const { card } = section(shell, {
      title: "Ikmal Time Machine (On This Day)",
      description: "Notes and journal entries written on this day in past years."
    });
    function loadEntries() {
      if (typeof api === "undefined" || !api.searchForNotes) {
        const sample = [
          { id: "1", title: "Productivity System Draft", yearsAgo: 1 },
          { id: "2", title: "Architecture Refactoring Notes", yearsAgo: 2 }
        ];
        renderList(sample);
        return;
      }
      api.searchForNotes("#extTask, #story, #meeting, #scratch").then((notes) => {
        const summaries = (notes || []).map((n) => ({
          id: n.noteId,
          title: n.title || "Untitled",
          utcDateCreated: (n.labels || []).find((l) => l.name === "utcDateCreated")?.value || (/* @__PURE__ */ new Date()).toISOString()
        }));
        const results = findOnThisDay(summaries, /* @__PURE__ */ new Date());
        renderList(results);
      }).catch(() => {
        renderList([]);
      });
    }
    function renderList(entries) {
      if (!entries.length) {
        card.appendChild(emptyState("No historical notes found from this calendar day in previous years."));
        return;
      }
      for (const entry of entries) {
        card.appendChild(listItem({
          icon: "bx-history",
          title: entry.title,
          description: `${entry.yearsAgo} year${entry.yearsAgo === 1 ? "" : "s"} ago today`,
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
    loadEntries();
  }
  if (typeof api !== "undefined" || typeof window !== "undefined") {
    const init = () => {
      const container = typeof api !== "undefined" && api.$container && (api.$container[0] || api.$container) || document.querySelector(".ikmal-on-this-day-root") || document.body;
      if (container) {
        initIkmalOnThisDay(container);
      }
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }
})();
