/* =====================================================
   TOAST
   Non-blocking feedback: success / error / warning / info.
===================================================== */

import { createElement } from "../utils/dom.js";

const TOAST_ICONS = {
  success: "circle-check",
  error: "circle-x",
  warning: "triangle-alert",
  info: "info"
};

const DURATION = 3200;

let region = null;

function getRegion() {
  if (region) return region;

  region = document.getElementById("toastRegion");

  if (!region) {
    region = createElement(
      '<div id="toastRegion" class="toast-region" aria-live="polite" aria-atomic="false"></div>'
    );

    document.body.appendChild(region);
  }

  return region;
}

/**
 * Show a toast message.
 * @param {"success"|"error"|"warning"|"info"} type
 */
export function toast(type, message, duration = DURATION) {
  const el = createElement(`
    <div class="toast" role="${type === "error" ? "alert" : "status"}" data-type="${type}">
      <span class="toast-icon" aria-hidden="true">
        <i data-lucide="${TOAST_ICONS[type] || "info"}"></i>
      </span>
      <span class="toast-message"></span>
    </div>
  `);

  el.querySelector(".toast-message").textContent = message;

  getRegion().appendChild(el);

  refreshIconsIn(el);

  const dismiss = () => {
    el.classList.add("leaving");

    setTimeout(() => el.remove(), 200);
  };

  el.addEventListener("click", dismiss);

  setTimeout(dismiss, duration);
}

function refreshIconsIn(root) {
  try {
    window.lucide?.createIcons?.({ root });
  }
  catch {
    /* no-op */
  }
}