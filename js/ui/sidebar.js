/* =====================================================
   SIDEBAR
   Desktop collapse (persisted) + mobile drawer.
===================================================== */

import { store } from "../state/store.js";
import { EVENTS } from "../config/constants.js";

const isMobile = () => window.innerWidth <= 768;

export const sidebar = {

  init() {
    const toggleBtn = document.getElementById("sidebarToggle");
    const overlay = document.getElementById("sidebarOverlay");

    toggleBtn?.addEventListener("click", () => this.toggle());

    overlay?.addEventListener("click", () => this.closeMobile());

    store.on(EVENTS.UI, () => {
      const app = document.getElementById("app");
      app.dataset.sidebar = store.get("ui").sidebarCollapsed ? "collapsed" : "expanded";
    });

    // Apply persisted state on boot.
    const app = document.getElementById("app");
    app.dataset.sidebar = store.get("ui").sidebarCollapsed ? "collapsed" : "expanded";

    // Close drawer when resizing to desktop.
    window.addEventListener("resize", () => {
      if (!isMobile()) this.closeMobile();
    });

    // Escape closes the mobile drawer.
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && isMobile()) this.closeMobile();
    });
  },

  toggle() {
    if (isMobile()) {
      this.toggleMobile();
    }
    else {
      this.toggleCollapsed();
    }
  },

  toggleCollapsed() {
    const ui = store.get("ui");

    ui.sidebarCollapsed = !ui.sidebarCollapsed;

    store.update("ui", ui, EVENTS.UI);

    store.persistUI();
  },

  toggleMobile() {
    const sidebarEl = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");

    const open = sidebarEl.classList.toggle("open");

    overlay.hidden = !open;
    overlay.classList.toggle("open", open);

    if (open) {
      sidebarEl.querySelector(".new-chat-btn")?.focus();
    }
    else {
      document.getElementById("sidebarToggle")?.focus();
    }
  },

  closeMobile() {
    const sidebarEl = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");

    sidebarEl.classList.remove("open");
    overlay.classList.remove("open");
    overlay.hidden = true;
  }
};