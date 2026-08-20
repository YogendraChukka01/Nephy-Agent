/* =====================================================
   HISTORY
   Sidebar conversation list, search, rename, delete.
===================================================== */

import { store } from "../state/store.js";
import { EVENTS } from "../config/constants.js";
import { conversations } from "./conversations.js";
import { refreshIcons } from "../ui/icons.js";
import { debounce } from "../utils/dom.js";
import { toast } from "../ui/toast.js";

let listEl = null;
let searchEl = null;
let clearBtn = null;
let query = "";

export const history = {

  init() {
    listEl = document.getElementById("historyList");
    searchEl = document.getElementById("historySearch");
    clearBtn = document.getElementById("searchClear");

    searchEl?.addEventListener("input", debounce(() => {
      query = searchEl.value.trim();

      clearBtn.hidden = !query;

      this.render();
    }, 120));

    clearBtn?.addEventListener("click", () => {
      searchEl.value = "";
      query = "";
      clearBtn.hidden = true;
      this.render();
      searchEl.focus();
    });

    store.on(EVENTS.HISTORY, () => this.render());
    store.on(EVENTS.CONVERSATION, () => this.render());
  },

  render() {
    if (!listEl) return;

    const history = store.get("history");
    const currentId = store.get("currentId");

    const matches = history.filter(chat =>
      !query ||
      chat.title.toLowerCase().includes(query) ||
      chat.messages.some(m => m.content.toLowerCase().includes(query))
    );

    listEl.innerHTML = "";

    if (!matches.length) {
      listEl.appendChild(emptyRow(query ? "No matching conversations." : "No conversations yet."));
      return;
    }

    matches.forEach(chat => {
      listEl.appendChild(this._item(chat, chat.id === currentId));
    });

    refreshIcons(listEl);
  },

  _item(chat, active) {
    const item = document.createElement("div");
    item.className = "history-item";
    item.dataset.tooltip = chat.title;
    item.setAttribute("aria-current", active ? "true" : "false");

    item.innerHTML = `
      <i data-lucide="message-square" aria-hidden="true"></i>
      <span class="history-item-title"></span>
      <span class="history-item-actions">
        <button class="rename-btn" type="button" title="Rename" aria-label="Rename conversation">
          <i data-lucide="pencil"></i>
        </button>
        <button class="delete-btn danger" type="button" title="Delete" aria-label="Delete conversation">
          <i data-lucide="trash-2"></i>
        </button>
      </span>
    `;

    item.querySelector(".history-item-title").textContent = chat.title;

    item.addEventListener("click", event => {
      if (event.target.closest(".history-item-actions")) return;

      conversations.open(chat.id);
    });

    item.querySelector(".rename-btn").addEventListener("click", () => this._rename(item, chat));

    item.querySelector(".delete-btn").addEventListener("click", () => {
      conversations.remove(chat.id);
      toast("info", "Conversation deleted");
    });

    return item;
  },

  _rename(item, chat) {
    const titleEl = item.querySelector(".history-item-title");

    const input = document.createElement("input");
    input.className = "rename-input";
    input.value = chat.title;
    input.setAttribute("aria-label", "Conversation title");
    input.maxLength = 120;

    titleEl.replaceWith(input);

    input.focus();
    input.select();

    const commit = () => {
      conversations.rename(chat.id, input.value);

      const span = document.createElement("span");
      span.className = "history-item-title";
      span.textContent = input.value.trim() || chat.title;

      input.replaceWith(span);
    };

    let cancelled = false;

    input.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        commit();
      }
      else if (event.key === "Escape") {
        cancelled = true;
        input.blur();
      }
    });

    input.addEventListener("blur", () => {
      if (cancelled) {
        const span = document.createElement("span");
        span.className = "history-item-title";
        span.textContent = chat.title;
        input.replaceWith(span);
        return;
      }

      if (document.contains(input)) commit();
    });
  }
};

function emptyRow(text) {
  const el = document.createElement("div");
  el.className = "empty-state";
  el.textContent = text;
  return el;
}