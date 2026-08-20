/* =====================================================
   STORE
   Central runtime state with a tiny pub/sub event bus.
===================================================== */

import { storage } from "../utils/storage.js";
import { STORAGE_KEYS, EVENTS, HISTORY_LIMIT } from "../config/constants.js";
import { DEFAULT_SETTINGS, DEFAULT_UI } from "../config/defaults.js";

const listeners = new Map();

const state = {
  settings: { ...DEFAULT_SETTINGS },
  ui: { ...DEFAULT_UI },
  history: [],
  currentId: null,
  conversation: [],
  streaming: false,
  controller: null,
  status: { state: "idle", text: "Not configured" },
  discoveredModels: []
};

function emit(event, payload) {
  listeners.get(event)?.forEach(fn => {
    try {
      fn(payload);
    }
    catch (err) {
      console.error(`[store] listener error for "${event}"`, err);
    }
  });
}

export const store = {

  init() {
    const rawSettings = storage.get(STORAGE_KEYS.settings, {});
    const rawUi = storage.get(STORAGE_KEYS.ui, {});

    state.settings = sanitizeSettings({ ...DEFAULT_SETTINGS, ...rawSettings });
    state.ui = { ...DEFAULT_UI, ...rawUi };
    state.history = sanitizeHistory(storage.get(STORAGE_KEYS.history, []));

    if (state.settings.apiKey) {
      state.status = { state: "idle", text: "Configured" };
    }
  },

  get(key) {
    return state[key];
  },

  set(key, value, event) {
    state[key] = value;
    emit(event || `${key}:change`, value);
  },

  update(key, patch, event) {
    state[key] = { ...state[key], ...patch };
    emit(event || `${key}:change`, state[key]);
  },

  on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());

    listeners.get(event).add(fn);

    return () => listeners.get(event)?.delete(fn);
  },

  emit(event, payload) {
    emit(event, payload);
  },

  /* ---- persistence helpers ---- */

  persistSettings() {
    storage.set(STORAGE_KEYS.settings, state.settings);
  },

  persistHistory() {
    storage.set(STORAGE_KEYS.history, state.history.slice(0, HISTORY_LIMIT));
  },

  persistUI() {
    storage.set(STORAGE_KEYS.ui, state.ui);
  }
};

/* ---- Validation / recovery ---- */

function sanitizeSettings(raw) {
  const out = { ...DEFAULT_SETTINGS };

  if (typeof raw.baseUrl === "string") out.baseUrl = raw.baseUrl.trim();
  if (typeof raw.apiKey === "string") out.apiKey = raw.apiKey.trim();
  if (typeof raw.model === "string" && raw.model.trim()) out.model = raw.model.trim();
  if (typeof raw.customModels === "string") out.customModels = raw.customModels;
  if (typeof raw.systemPrompt === "string") out.systemPrompt = raw.systemPrompt;
  if (typeof raw.theme === "string" && ["light", "dark", "system"].includes(raw.theme)) out.theme = raw.theme;
  if (typeof raw.enterToSend === "boolean") out.enterToSend = raw.enterToSend;
  if (raw.density === "compact") out.density = "compact";
  if (typeof raw.stream === "boolean") out.stream = raw.stream;

  const temp = Number(raw.temperature);

  if (Number.isFinite(temp) && temp >= 0 && temp <= 2) out.temperature = Math.round(temp * 10) / 10;

  return out;
}

function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(item => item && typeof item.id === "string")
    .map(item => ({
      id: item.id,
      title: typeof item.title === "string" ? item.title.slice(0, 120) : "New chat",
      createdAt: Number(item.createdAt) || Date.now(),
      updatedAt: Number(item.updatedAt) || Number(item.createdAt) || Date.now(),
      messages: sanitizeMessages(item.messages)
    }));
}

function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(m => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
    .map(m => ({
      id: typeof m.id === "string" ? m.id : `m_${Math.random().toString(36).slice(2, 10)}`,
      role: m.role,
      content: m.content,
      timestamp: Number(m.timestamp) || Date.now()
    }));
}

/* Named re-export keeps imports tidy. */
export { EVENTS };