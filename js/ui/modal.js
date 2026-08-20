/* =====================================================
   MODAL
   Accessible modal helper: focus trap, escape, overlay
   click-to-close, focus restore.
===================================================== */

import { createElement } from "../utils/dom.js";
import { refreshIcons } from "./icons.js";

let activeModal = null;
let lastFocused = null;

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function trapFocus(event) {
  if (event.key !== "Tab") return;

  const modal = activeModal;

  if (!modal) return;

  const focusables = [...modal.querySelectorAll(FOCUSABLE)].filter(el => !el.disabled);

  if (!focusables.length) return;

  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  }
  else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * Open an accessible modal.
 * @param {string} title
 * @param {string|HTMLElement} body HTML string or element
 * @param {Array<{label, class?, onClick?}>} [actions]
 * @returns {{ close: Function, overlay: HTMLElement, modal: HTMLElement, body: HTMLElement }}
 */
export function openModal({ title, body, actions = [], size = "default" }) {
  const existing = document.querySelector(".modal-overlay");

  if (existing) existing.remove();

  lastFocused = document.activeElement;

  const overlay = createElement(`
    <div class="modal-overlay open" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="modal" style="${size === "sm" ? "width:min(420px,100%)" : ""}">
        <div class="modal-head">
          <h2 class="modal-title"></h2>
          <button class="modal-close" aria-label="Close dialog">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="modal-body"></div>
        <div class="modal-actions"></div>
      </div>
    </div>
  `);

  overlay.querySelector(".modal-title").textContent = title;

  const bodyEl = overlay.querySelector(".modal-body");

  if (typeof body === "string") {
    bodyEl.innerHTML = body;
  }
  else if (body instanceof HTMLElement) {
    bodyEl.appendChild(body);
  }

  const actionsEl = overlay.querySelector(".modal-actions");

  actions.forEach(action => {
    const btn = createElement(`<button class="btn ${action.class || "btn-ghost"}"></button>`);
    btn.textContent = action.label;
    btn.addEventListener("click", () => action.onClick?.());
    actionsEl.appendChild(btn);
  });

  const close = () => {
    overlay.classList.remove("open");

    activeModal = null;

    document.removeEventListener("keydown", handleKeydown);

    setTimeout(() => overlay.remove(), 200);

    if (lastFocused instanceof HTMLElement) lastFocused.focus();
  };

  overlay.querySelector(".modal-close").addEventListener("click", close);

  overlay.addEventListener("mousedown", event => {
    if (event.target === overlay) close();
  });

  document.body.appendChild(overlay);

  activeModal = overlay;

  document.addEventListener("keydown", handleKeydown);

  refreshIcons();

  // Move focus into the dialog.
  const first = overlay.querySelector(FOCUSABLE);

  setTimeout(() => (first || overlay.querySelector(".modal-close")).focus(), 50);

  return { close, overlay, modal: overlay.querySelector(".modal"), body: bodyEl };
}

function handleKeydown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    activeModal?.classList.contains("open") && closeActive();
  }
  else if (event.key === "Tab") {
    trapFocus(event);
  }
}

function closeActive() {
  const overlay = document.querySelector(".modal-overlay.open");

  overlay?.querySelector(".modal-close")?.click();
}

export function closeModal() {
  closeActive();
}