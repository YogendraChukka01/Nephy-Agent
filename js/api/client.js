/* =====================================================
   API CLIENT
   Endpoint construction, auth headers, request helpers.
   Configuration is read from the store and never baked in.
===================================================== */

import { store } from "../state/store.js";
import { DEFAULT_SETTINGS } from "../config/defaults.js";

/**
 * Resolve the active API configuration from the store.
 * Kept separate from requests so a backend proxy can
 * override these later without touching call sites.
 */
export function getApiConfig() {
  const s = store.get("settings");

  return {
    baseUrl: (s.baseUrl || DEFAULT_SETTINGS.baseUrl).trim().replace(/\/+$/, ""),
    apiKey: s.apiKey || "",
    model: s.model || DEFAULT_SETTINGS.model,
    temperature: Number.isFinite(s.temperature) ? s.temperature : DEFAULT_SETTINGS.temperature,
    stream: s.stream !== false,
    systemPrompt: s.systemPrompt || ""
  };
}

/**
 * Build a path against the configured base URL without
 * creating double slashes. Accepts either a provider-style
 * path ("chat/completions") or an absolute URL (proxy).
 */
export function buildUrl(path) {
  const { baseUrl } = getApiConfig();

  if (/^https?:\/\//i.test(path)) return path;

  return `${baseUrl}/${String(path).replace(/^\/+/, "")}`;
}

export function authHeaders() {
  const { apiKey } = getApiConfig();

  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

/** Read a structured error message from a failed response. */
export async function readErrorBody(res) {
  const contentType = res.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const data = await res.json();

      return data.error?.message || data.message || JSON.stringify(data);
    }

    const text = await res.text();

    return text ? text.slice(0, 500) : "";
  }
  catch {
    return "";
  }
}

/** Generic JSON fetch against the configured API. */
export async function apiFetch(path, options = {}) {
  const { apiKey } = getApiConfig();

  const headers = {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(buildUrl(path), {
    ...options,
    headers
  });

  if (!res.ok) {
    const detail = await readErrorBody(res);

    const error = new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
    error.status = res.status;
    throw error;
  }

  return res;
}