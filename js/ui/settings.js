/* =====================================================
   SETTINGS
   AI provider, appearance, chat, data sections.
===================================================== */

import { store } from "../state/store.js";
import { EVENTS, STORAGE_KEYS } from "../config/constants.js";
import { DEFAULT_SETTINGS } from "../config/defaults.js";
import { openModal } from "./modal.js";
import { toast } from "./toast.js";
import { testConnection } from "../api/models.js";
import { syncThemeIcon } from "./theme.js";
import { storage } from "../utils/storage.js";
import { refreshIcons } from "./icons.js";
import { conversations } from "../chat/conversations.js";
import { escapeAttr } from "../utils/escape.js";

let modalRef = null;
let busy = false;

export const settings = {

  open() {
    const body = buildSettingsBody();

    modalRef = openModal({
      title: "Settings",
      body,
      actions: [
        { label: "Cancel", class: "btn-ghost" },
        { label: "Save", class: "btn-primary", onClick: () => this.save(modalRef.modal) }
      ]
    });

    const modal = modalRef.modal;

    // Enter in any text input saves (textarea keeps its newlines).
    modal.addEventListener("keydown", event => {
      if (event.key !== "Enter") return;

      const target = event.target;

      if (target instanceof HTMLElement && target.matches("input:not([type=checkbox]):not([type=range])")) {
        event.preventDefault();
        this.save(modal);
      }
    });

    modal.querySelector("[data-test]").addEventListener("click", () => this.test(modal));

    modal.querySelector("[data-reset]").addEventListener("click", () => this.reset());

    modal.querySelectorAll("[data-export]").forEach(el => {
      el.addEventListener("click", () => {
        const format = el.dataset.export;
        const conversation = store.get("conversation");

        if (!conversation.length) {
          toast("info", "Nothing to export yet.");
          return;
        }

        conversations.export(format);
        toast("success", `Exported as ${format.toUpperCase()}`);
      });
    });

    modal.querySelector("[data-import]").addEventListener("click", () => {
      modal.querySelector("[data-import-file]").click();
    });

    modal.querySelector("[data-import-file]").addEventListener("change", event => {
      const file = event.target.files[0];

      if (!file) return;

      const reader = new FileReader();

      reader.onload = () => this.import(reader.result);

      reader.onerror = () => toast("error", "Could not read the file.");

      reader.readAsText(file);

      event.target.value = "";
    });

    modal.querySelector("[data-clear-history]").addEventListener("click", () => {
      const overlay = modalRef.overlay;

      overlay.remove();
      modalRef = null;

      openModal({
        title: "Clear all history",
        body: '<p class="confirm-text">Delete every saved conversation from this browser? This cannot be undone.</p>',
        size: "sm",
        actions: [
          { label: "Cancel", class: "btn-ghost" },
          {
            label: "Delete all",
            class: "btn-danger",
            onClick: () => {
              conversations.clearAll();
              toast("info", "Chat history cleared");
            }
          }
        ]
      });
    });

    // Theme radio wiring.
    modal.querySelectorAll("[data-theme-option]").forEach(radio => {
      radio.addEventListener("click", () => {
        modal.querySelectorAll("[data-theme-option]").forEach(r => {
          r.setAttribute("aria-pressed", String(r === radio));
        });
      });
    });

    // Density wiring.
    modal.querySelectorAll("[data-density-option]").forEach(radio => {
      radio.addEventListener("click", () => {
        modal.querySelectorAll("[data-density-option]").forEach(r => {
          r.setAttribute("aria-pressed", String(r === radio));
        });
      });
    });

    initSettingsTextarea(modal);

    refreshIcons();
  },

  save(modal) {
    const get = id => modal.querySelector(`#${id}`);

    const settings = store.get("settings");

    settings.baseUrl = get("settingBaseUrl").value.trim().replace(/\/+$/, "");
    settings.apiKey = get("settingApiKey").value.trim();
    settings.model = get("settingModel").value.trim() || DEFAULT_SETTINGS.model;
    settings.customModels = get("settingCustomModels").value.trim();
    settings.systemPrompt = get("settingSystemPrompt").value;
    settings.temperature = clamp(parseFloat(get("settingTemperature").value), 0, 2, 0.7);
    settings.stream = get("settingStream").checked;
    settings.enterToSend = get("settingEnterToSend").checked;
    settings.theme = modal.querySelector('[data-theme-option][aria-pressed="true"]')?.dataset.themeOption || settings.theme;
    settings.density = modal.querySelector('[data-density-option][aria-pressed="true"]')?.dataset.densityOption || settings.density;

    if (!settings.baseUrl) {
      toast("error", "API base URL is required.");
      return;
    }

    store.update("settings", settings, EVENTS.SETTINGS);
    store.persistSettings();

    syncThemeIcon();
    applyDensity();

    close();

    toast("success", "Settings saved");
  },

  async test(modal) {
    if (busy) return;

    busy = true;

    const testBtn = modal.querySelector("[data-test]");
    const result = modal.querySelector("[data-test-result]");

    testBtn.disabled = true;
    result.textContent = "Testing connection…";
    result.dataset.state = "";

    store.update("status", { state: "connecting", text: "Testing…" }, EVENTS.STATUS);

    const { ok, models, message } = await testConnection();

    if (ok) {
      result.textContent = models.length
        ? `Connected — ${models.length} model${models.length === 1 ? "" : "s"} available.`
        : "Connected. The endpoint responded.";
      result.dataset.state = "ok";

      store.update("status", { state: "online", text: "Connected" }, EVENTS.STATUS);

      toast("success", "API connection successful");
    }
    else {
      result.textContent = `Connection failed: ${message || "unknown error"}`;
      result.dataset.state = "fail";

      store.update("status", { state: "error", text: "Connection failed" }, EVENTS.STATUS);

      toast("error", "API connection failed");
    }

    testBtn.disabled = false;
    busy = false;
  },

  reset() {
    const overlay = modalRef?.overlay;

    overlay?.remove();
    modalRef = null;

    openModal({
      title: "Reset settings",
      body: '<p class="confirm-text">Restore every setting to its default value? Your saved conversations are kept.</p>',
      size: "sm",
      actions: [
        { label: "Cancel", class: "btn-ghost" },
        {
          label: "Reset",
          class: "btn-danger",
          onClick: () => {
            storage.remove(STORAGE_KEYS.settings);

            const fresh = { ...DEFAULT_SETTINGS };

            store.update("settings", fresh, EVENTS.SETTINGS);
            store.persistSettings();

            syncThemeIcon();
            applyDensity();

            store.update("status", { state: "idle", text: "Not configured" }, EVENTS.STATUS);

            toast("info", "Settings reset to defaults");
          }
        }
      ]
    });
  },

  import(text) {
    try {
      const chat = conversations.importData(text);

      toast("success", `Imported "${chat.title}"`);
    }
    catch (err) {
      toast("error", `Import failed: ${err.message}`);
    }
  }
};

/* ---- body builder ---- */

function buildSettingsBody() {
  const s = store.get("settings");

  const themeOptions = ["light", "dark", "system"].map(t => `
    <button
      type="button"
      class="radio-chip"
      data-theme-option="${t}"
      aria-pressed="${s.theme === t}"
    >${t[0].toUpperCase() + t.slice(1)}</button>
  `).join("");

  const densityOptions = ["comfortable", "compact"].map(d => `
    <button
      type="button"
      class="radio-chip"
      data-density-option="${d}"
      aria-pressed="${s.density === d}"
    >${d[0].toUpperCase() + d.slice(1)}</button>
  `).join("");

  return `
    <div class="settings-body">

      <div class="security-note">
        <i data-lucide="shield-alert" aria-hidden="true"></i>
        <span>
          This is a client-side demo: the API key is stored only in this
          browser's local storage. For a public deployment, route requests
          through a backend proxy and keep keys server-side.
        </span>
      </div>

      <section class="settings-section">
        <h3 class="settings-section-title">AI Provider</h3>

        <div class="form-group">
          <label class="form-label" for="settingBaseUrl">API Base URL</label>
          <input class="form-input" type="url" id="settingBaseUrl" value="${escapeAttr(s.baseUrl)}" placeholder="https://api.openai.com/v1" spellcheck="false" autocomplete="off">
          <p class="form-hint">Any OpenAI-compatible endpoint. Requests go to <code>/chat/completions</code> on this URL. Trailing slashes are handled automatically.</p>
        </div>

        <div class="form-group">
          <label class="form-label" for="settingApiKey">API Key</label>
          <input class="form-input" type="password" id="settingApiKey" value="${escapeAttr(s.apiKey)}" placeholder="sk-..." spellcheck="false" autocomplete="off">
          <p class="form-hint">Sent as a <code>Bearer</code> token. Leave empty for local servers without authentication.</p>
        </div>

        <div class="form-group">
          <label class="form-label" for="settingModel">Model</label>
          <input class="form-input" type="text" id="settingModel" value="${escapeAttr(s.model)}" placeholder="gpt-4o" spellcheck="false">
        </div>

        <div class="form-group">
          <label class="form-label" for="settingCustomModels">Extra models (comma separated)</label>
          <input class="form-input" type="text" id="settingCustomModels" value="${escapeAttr(s.customModels)}" placeholder="llama-3.1-70b, qwen2.5:14b, ..." spellcheck="false">
          <p class="form-hint">Added to the header selector. The selector is also populated from <code>/models</code> when the endpoint exposes it.</p>
        </div>

        <div class="form-group">
          <label class="form-label" for="settingSystemPrompt">System prompt</label>
          <textarea class="form-textarea" id="settingSystemPrompt" spellcheck="false"></textarea>
        </div>

        <div class="form-group">
          <label class="form-label" for="settingTemperature">Temperature: <span id="settingTempValue">${s.temperature}</span></label>
          <input class="form-range" type="range" id="settingTemperature" min="0" max="2" step="0.1" value="${s.temperature}" oninput="document.getElementById('settingTempValue').textContent = this.value">
        </div>

        <div class="form-group">
          <label class="form-label form-inline" for="settingStream">
            <span>Stream responses</span>
            <input type="checkbox" id="settingStream" ${s.stream ? "checked" : ""}>
          </label>
        </div>

        <p class="test-result" data-test-result></p>

        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" data-test>Test connection</button>
          <span class="spacer"></span>
          <button class="btn btn-ghost" type="button" data-reset>Reset</button>
        </div>
      </section>

      <section class="settings-section">
        <h3 class="settings-section-title">Appearance</h3>

        <div class="form-group">
          <label class="form-label">Theme</label>
          <div class="radio-group" role="group" aria-label="Theme">${themeOptions}</div>
        </div>

        <div class="form-group">
          <label class="form-label">Message density</label>
          <div class="radio-group" role="group" aria-label="Message density">${densityOptions}</div>
        </div>
      </section>

      <section class="settings-section">
        <h3 class="settings-section-title">Chat</h3>

        <div class="form-group">
          <label class="form-label form-inline" for="settingEnterToSend">
            <span>Press Enter to send (Shift+Enter for a new line)</span>
            <input type="checkbox" id="settingEnterToSend" ${s.enterToSend ? "checked" : ""}>
          </label>
        </div>
      </section>

      <section class="settings-section">
        <h3 class="settings-section-title">Data</h3>

        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" data-export="md">Export Markdown</button>
          <button class="btn btn-ghost" type="button" data-export="json">Export JSON</button>
          <button class="btn btn-ghost" type="button" data-import>Import JSON</button>
          <input type="file" accept="application/json,.json" data-import-file hidden>
          <span class="spacer"></span>
          <button class="btn btn-danger" type="button" data-clear-history>Clear all history</button>
        </div>
      </section>

    </div>
  `;
}

function close() {
  modalRef?.close();
  modalRef = null;
}

function clamp(value, min, max, fallback) {
  const num = Number(value);

  if (!Number.isFinite(num)) return fallback;

  return Math.min(max, Math.max(min, num));
}

function applyDensity() {
  document.getElementById("app").dataset.density = store.get("settings").density;
}

/* Textarea content is set via property to avoid escaping issues. */
export function initSettingsTextarea(modal) {
  const textarea = modal.querySelector("#settingSystemPrompt");

  if (textarea) textarea.value = store.get("settings").systemPrompt;
}