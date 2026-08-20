/* =====================================================
   MODEL DISCOVERY
   Optional /models fetch. Failures are non-fatal.
===================================================== */

import { apiFetch } from "./client.js";
import { store } from "../state/store.js";
import { EVENTS } from "../config/constants.js";

/**
 * Attempt to discover models from the configured endpoint.
 * Silently fails when the endpoint does not implement /models.
 */
export async function discoverModels() {
  try {
    const res = await apiFetch("models");

    const data = await res.json();

    const models = (data.data || [])
      .map(m => m?.id)
      .filter(id => typeof id === "string" && id.trim());

    if (models.length) {
      store.set("discoveredModels", models, EVENTS.MODELS);

      return models;
    }
  }
  catch {
    /* endpoint may not implement /models — not fatal */
  }

  return [];
}

/**
 * Test connectivity by hitting the /models endpoint.
 * Returns { ok, models?, message }.
 */
export async function testConnection() {
  const models = await discoverModels();

  if (models.length) {
    return { ok: true, models };
  }

  // Fall back to a minimal chat-completions ping so servers that
  // omit /models can still be validated.
  try {
    const res = await apiFetch("chat/completions", {
      method: "POST",
      body: JSON.stringify({ model: "test", messages: [{ role: "user", content: "ping" }], max_tokens: 1 })
    });

    return { ok: true, models: [] };
  }
  catch (err) {
    // A 4xx on the ping still proves the endpoint is reachable
    // (e.g. "unknown model"); only auth failures are fatal.
    if (err.status >= 400 && err.status < 500 && err.status !== 401 && err.status !== 403) {
      return { ok: true, models: [], reachable: true };
    }

    return { ok: false, message: err.message };
  }
}