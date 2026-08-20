/* =====================================================
   APP — entry point
   Boots the store, wires all modules and shortcuts.
===================================================== */

import { store } from "./state/store.js";
import { EVENTS } from "./config/constants.js";
import { renderer } from "./chat/renderer.js";
import { conversations } from "./chat/conversations.js";
import { history } from "./chat/history.js";
import { sidebar } from "./ui/sidebar.js";
import { header } from "./ui/header.js";
import { composer } from "./ui/composer.js";
import { initTheme, syncThemeIcon } from "./ui/theme.js";
import { toast } from "./ui/toast.js";
import { refreshIcons } from "./ui/icons.js";

/* ---- boot ---- */

store.init();

initTheme();

applyDensity();

renderer.init();
conversations.init();
history.init();
sidebar.init();
header.init();
composer.init();

renderer.renderConversation();

refreshIcons();

/* ---- sidebar quick actions ---- */

document.getElementById("brandBtn")?.addEventListener("click", () => conversations.newChat());
document.getElementById("newChatBtn")?.addEventListener("click", () => {
  conversations.newChat();

  if (window.innerWidth <= 768) sidebar.closeMobile();

  document.getElementById("composerInput")?.focus();
});

/* ---- message action delegation ---- */

document.getElementById("chatContent")?.addEventListener("click", event => {
  const actionBtn = event.target.closest(".message-action");

  if (!actionBtn) return;

  const { action } = actionBtn.dataset;

  const messageEl = actionBtn.closest(".message");

  const contentEl = messageEl?.querySelector(".message-content");

  if (action === "copy") {
    navigator.clipboard
      .writeText(contentEl?.textContent || "")
      .then(() => toast("success", "Response copied"))
      .catch(() => toast("error", "Could not copy to clipboard"));

    setActionIcon(actionBtn, "check");
    setTimeout(() => setActionIcon(actionBtn, "copy"), 1500);
  }
  else if (action === "like") {
    toggleRate(actionBtn, messageEl, "like");
  }
  else if (action === "dislike") {
    toggleRate(actionBtn, messageEl, "dislike");
  }
  else if (action === "regenerate") {
    conversations.regenerateLast();
  }
});

/* ---- code block copy (delegated) ---- */

document.getElementById("chatContent")?.addEventListener("click", event => {
  const copyBtn = event.target.closest(".copy-code-btn");

  if (!copyBtn) return;

  const code = copyBtn.closest(".code-block")?.querySelector("code")?.textContent || "";

  navigator.clipboard
    .writeText(code)
    .then(() => {
      copyBtn.innerHTML = '<i data-lucide="check"></i> Copied';
      refreshIcons();
      setTimeout(() => {
        copyBtn.innerHTML = '<i data-lucide="copy"></i> Copy';
        refreshIcons();
      }, 1500);
    })
    .catch(() => toast("error", "Could not copy code"));
});

/* ---- keyboard shortcuts ---- */

document.addEventListener("keydown", event => {
  const target = event.target;

  const typing = target instanceof HTMLElement &&
    (target.matches("input, textarea, select") || target.isContentEditable);

  // Ctrl/Cmd + B → toggle sidebar.
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
    event.preventDefault();
    sidebar.toggle();
    return;
  }

  // "/" → focus composer.
  if (event.key === "/" && !typing && !modalOpen()) {
    event.preventDefault();
    document.getElementById("composerInput")?.focus();
    return;
  }

  // Ctrl/Cmd + Shift + E → export Markdown.
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "e") {
    event.preventDefault();
    conversations.export("md");
    toast("success", "Conversation exported");
  }
});

/* ---- helpers ---- */

function setActionIcon(btn, name) {
  const icon = btn.querySelector("i");

  if (icon) {
    icon.setAttribute("data-lucide", name);
    refreshIcons();
  }
}

function toggleRate(btn, messageEl, which) {
  const buttons = messageEl?.querySelectorAll(".message-action") || [];

  buttons.forEach(b => {
    const active = b === btn && b.dataset.action === which;

    b.dataset.active = active ? "true" : "false";
  });
}

function modalOpen() {
  return Boolean(document.querySelector(".modal-overlay.open"));
}

function applyDensity() {
  document.getElementById("app").dataset.density = store.get("settings").density;

  store.on(EVENTS.SETTINGS, () => {
    document.getElementById("app").dataset.density = store.get("settings").density;
  });
}