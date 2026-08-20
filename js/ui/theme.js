/* =====================================================
   THEME
   Light / Dark / System with persistence.
===================================================== */

import { store } from "../state/store.js";
import { EVENTS } from "../config/constants.js";
import { setIcon } from "./icons.js";

const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

function systemPrefersDark() {
  return mediaQuery.matches;
}

/** Resolve the effective theme and apply it to <html>. */
export function applyTheme() {
  const { theme } = store.get("settings");

  const resolved = theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme;

  document.documentElement.setAttribute("data-theme", resolved);
}

/** Quick toggle used by the header button: light <-> dark. */
export function cycleTheme() {
  const settings = store.get("settings");

  const resolved = settings.theme === "system"
    ? (systemPrefersDark() ? "dark" : "light")
    : settings.theme;

  settings.theme = resolved === "dark" ? "light" : "dark";

  store.update("settings", { theme: settings.theme }, EVENTS.SETTINGS);

  store.persistSettings();
}

/** Initialize theme, subscribe to changes, sync header icon. */
export function initTheme() {
  applyTheme();

  store.on(EVENTS.SETTINGS, () => applyTheme());

  mediaQuery.addEventListener?.("change", () => applyTheme());

  syncThemeIcon();
}

export function syncThemeIcon() {
  const btn = document.getElementById("themeBtn");

  const icon = btn?.querySelector("i");

  if (!icon) return;

  const { theme } = store.get("settings");

  const resolved = theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme;

  setIcon(icon, resolved === "dark" ? "sun" : "moon");

  btn.setAttribute(
    "aria-label",
    resolved === "dark" ? "Switch to light theme" : "Switch to dark theme"
  );
}