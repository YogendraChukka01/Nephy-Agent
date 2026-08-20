/* =====================================================
   HEADER
   Model selector, connection status, global actions.
===================================================== */

import { store } from "../state/store.js";
import { EVENTS, DEFAULT_MODELS } from "../config/constants.js";
import { conversations } from "../chat/conversations.js";
import { cycleTheme, syncThemeIcon } from "./theme.js";
import { openModal } from "./modal.js";
import { toast } from "./toast.js";
import { refreshIcons } from "./icons.js";

let modelSelect = null;
let statusPill = null;
let statusText = null;

export const header = {

  init() {
    modelSelect = document.getElementById("modelSelect");
    statusPill = document.getElementById("statusPill");
    statusText = document.getElementById("statusText");

    this.populateModels();

    store.on(EVENTS.SETTINGS, () => this.populateModels());
    store.on(EVENTS.MODELS, () => this.populateModels());
    store.on(EVENTS.STATUS, () => this.syncStatus());

    modelSelect?.addEventListener("change", () => {
      if (modelSelect.value === "__manage__") {
        openSettingsModal();
        modelSelect.value = store.get("settings").model;
        return;
      }

      const settings = store.get("settings");

      settings.model = modelSelect.value;

      store.update("settings", { model: settings.model }, EVENTS.SETTINGS);
      store.persistSettings();
    });

    document.getElementById("themeBtn")?.addEventListener("click", () => {
      cycleTheme();
      syncThemeIcon();
    });

    document.getElementById("exportBtn")?.addEventListener("click", () => {
      const conversation = store.get("conversation");

      if (!conversation.length) {
        toast("info", "Nothing to export yet.");
        return;
      }

      conversations.export("md");
      toast("success", "Conversation exported as Markdown");
    });

    document.getElementById("clearBtn")?.addEventListener("click", () => {
      if (!store.get("conversation").length) return;

      openModal({
        title: "Clear conversation",
        body: '<p class="confirm-text">This clears the current conversation from the sidebar. This cannot be undone.</p>',
        size: "sm",
        actions: [
          { label: "Cancel", class: "btn-ghost" },
          {
            label: "Clear",
            class: "btn-danger",
            onClick: () => {
              conversations.clearCurrent();
              toast("info", "Conversation cleared");
            }
          }
        ]
      });
    });

    document.getElementById("settingsBtn")?.addEventListener("click", openSettingsModal);
    document.getElementById("profileBtn")?.addEventListener("click", openSettingsModal);

    this.syncStatus();
  },

  populateModels() {
    if (!modelSelect) return;

    const settings = store.get("settings");

    const known = new Set();

    modelSelect.innerHTML = "";

    const add = (value, label) => {
      if (!value || known.has(value)) return;

      known.add(value);

      const option = document.createElement("option");
      option.value = value;
      option.textContent = label || value;
      modelSelect.appendChild(option);
    };

    DEFAULT_MODELS.forEach(m => add(m.value, m.label));

    (settings.customModels || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(m => add(m, m));

    store.get("discoveredModels").forEach(m => add(m, m));

    // Manual model entry lives in Settings; expose a shortcut here.
    if (!known.has(settings.model)) add(settings.model, `${settings.model} (custom)`);

    const manage = document.createElement("option");
    manage.value = "__manage__";
    manage.textContent = "Manage models…";
    modelSelect.appendChild(manage);

    modelSelect.value = settings.model;

    refreshIcons();
  },

  syncStatus() {
    const { state, text } = store.get("status");

    if (!statusPill) return;

    statusPill.dataset.state = state;
    statusText.textContent = text;
  }
};

/** Lazy import of settings to avoid a circular dependency. */
async function openSettingsModal() {
  const { settings } = await import("./settings.js");

  settings.open();
}