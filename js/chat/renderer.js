/* =====================================================
   RENDERER
   Renders the chat view: welcome, conversation,
   streaming, errors. Subscribes to store events.
===================================================== */

import { store } from "../state/store.js";
import { EVENTS, SUGGESTIONS } from "../config/constants.js";
import { renderMarkdown } from "./markdown.js";
import { createUserMessage, createAIMessage, createTypingIndicator, createErrorMessage } from "./messages.js";
import { refreshIcons } from "../ui/icons.js";
import { greeting } from "../utils/format.js";
import { escapeHTML } from "../utils/escape.js";
import { rafThrottle } from "../utils/dom.js";

let chatContent = null;
let scrollEl = null;

export const renderer = {

  init() {
    chatContent = document.getElementById("chatContent");
    scrollEl = document.getElementById("chatScroll");

    store.on(EVENTS.CONVERSATION, () => renderer.renderConversation());
    store.on(EVENTS.STREAM, streaming => {
      const sendBtn = document.getElementById("sendBtn");

      if (sendBtn) {
        sendBtn.classList.toggle("stop", Boolean(streaming));
      }
    });
  },

  renderConversation() {
    const conversation = store.get("conversation");

    if (!chatContent) return;

    chatContent.innerHTML = "";

    if (!conversation.length) {
      chatContent.appendChild(renderWelcome());
      refreshIcons(chatContent);
      return;
    }

    conversation.forEach(msg => {
      if (msg.role === "user") {
        chatContent.appendChild(createUserMessage(msg.content));
      }
      else if (msg.role === "assistant") {
        chatContent.appendChild(createAIMessage(renderMarkdown(msg.content), { contentId: msg.id }));
      }
    });

    refreshIcons(chatContent);

    scrollToEnd(false);
  },

  /** Begin an AI response: returns a mutable content element. */
  beginAssistantMessage() {
    const el = createAIMessage("");

    chatContent.appendChild(el);

    refreshIcons(chatContent);

    scrollToEnd();

    return el.querySelector(".message-content");
  },

  showTyping() {
    const existing = chatContent.querySelector('[data-role="typing"]');

    if (existing) return;

    chatContent.appendChild(createTypingIndicator());

    scrollToEnd();
  },

  hideTyping() {
    chatContent.querySelector('[data-role="typing"]')?.remove();
  },

  showError(detail, { onRetry } = {}) {
    this.hideTyping();

    chatContent.appendChild(createErrorMessage(detail, { onRetry }));

    refreshIcons(chatContent);

    scrollToEnd();
  },

  removeErrors() {
    chatContent.querySelectorAll(".message.error").forEach(el => el.remove());
  }
};

/* Streaming render is rAF-throttled for long responses. */
export const renderStream = rafThrottle((contentEl, fullText) => {
  contentEl.innerHTML = renderMarkdown(fullText);
  scrollToEnd();
});

function renderWelcome() {
  const wrap = document.createElement("div");
  wrap.className = "welcome";

  const name = "Yogi";

  const h = document.createElement("h1");
  h.className = "welcome-greeting";
  h.textContent = `${greeting()}, ${name}`;

  const sub = document.createElement("p");
  sub.className = "welcome-sub";
  sub.textContent = "What would you like to explore?";

  const grid = document.createElement("div");
  grid.className = "suggestions";

  SUGGESTIONS.forEach((s, index) => {
    const btn = document.createElement("button");
    btn.className = "suggestion";
    btn.type = "button";

    btn.innerHTML = `
      <span class="suggestion-icon" aria-hidden="true">
        <i data-lucide="${escapeHTML(s.icon)}"></i>
      </span>
      <span class="suggestion-text">
        <h3>${escapeHTML(s.title)}</h3>
        <p>${escapeHTML(s.text)}</p>
      </span>
    `;

    btn.addEventListener("click", () => {
      document.dispatchEvent(
        new CustomEvent("composer:insert", { detail: { text: s.prompt } })
      );
    });

    grid.appendChild(btn);
  });

  wrap.append(h, sub, grid);

  return wrap;
}

export function scrollToEnd(smooth = true) {
  if (!scrollEl) return;

  requestAnimationFrame(() => {
    scrollEl.scrollTo({
      top: scrollEl.scrollHeight,
      behavior: smooth ? "smooth" : "auto"
    });
  });
}