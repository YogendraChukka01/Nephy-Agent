/* =====================================================
   MESSAGES
   DOM construction for user / AI / error messages.
===================================================== */

import { createElement } from "../utils/dom.js";
import { refreshIcons } from "../ui/icons.js";

/** Simple plain-text message (user). */
export function createUserMessage(content) {
  const el = createElement(`
    <div class="message user">
      <div class="message-avatar" aria-hidden="true">
        <i data-lucide="user"></i>
      </div>
      <div class="message-body">
        <div class="message-content"></div>
      </div>
    </div>
  `);

  el.querySelector(".message-content").textContent = content;

  refreshIcons(el);

  return el;
}

/** Markdown message with actions (AI). */
export function createAIMessage(markdown, { contentId } = {}) {
  const el = createElement(`
    <div class="message ai">
      <div class="message-avatar" aria-hidden="true">
        <i data-lucide="sparkles"></i>
      </div>
      <div class="message-body">
        <div class="message-content"></div>
        <div class="message-actions">
          <button class="message-action" data-action="copy" title="Copy response" aria-label="Copy response">
            <i data-lucide="copy"></i>
          </button>
          <button class="message-action" data-action="like" title="Good response" aria-label="Rate as good">
            <i data-lucide="thumbs-up"></i>
          </button>
          <button class="message-action" data-action="dislike" title="Bad response" aria-label="Rate as bad">
            <i data-lucide="thumbs-down"></i>
          </button>
          <button class="message-action" data-action="regenerate" title="Regenerate response" aria-label="Regenerate response">
            <i data-lucide="rotate-cw"></i>
          </button>
        </div>
      </div>
    </div>
  `);

  const content = el.querySelector(".message-content");

  if (contentId) content.dataset.messageId = contentId;

  if (markdown) content.innerHTML = markdown;

  refreshIcons(el);

  return el;
}

/** Typing indicator row. */
export function createTypingIndicator() {
  const el = createElement(`
    <div class="message ai" data-role="typing">
      <div class="message-avatar" aria-hidden="true">
        <i data-lucide="sparkles"></i>
      </div>
      <div class="typing" aria-label="AI is typing">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    </div>
  `);

  refreshIcons(el);

  return el;
}

/** Error message with retry action. */
export function createErrorMessage(detail, { onRetry } = {}) {
  const el = createElement(`
    <div class="message error">
      <div class="message-avatar" aria-hidden="true">
        <i data-lucide="triangle-alert"></i>
      </div>
      <div class="message-body">
        <div class="message-content">Could not get a response.</div>
        <div class="error-box"></div>
        <button class="retry-btn" type="button">
          <i data-lucide="refresh-cw"></i>
          Retry
        </button>
      </div>
    </div>
  `);

  el.querySelector(".error-box").textContent = detail;

  const retryBtn = el.querySelector(".retry-btn");

  if (onRetry) retryBtn.addEventListener("click", onRetry);
  else retryBtn.remove();

  refreshIcons(el);

  return el;
}

/** Strip file markers from a stored user message for display. */
function summarizeUserContent(content) {
  return String(content)
    .replace(/\[File: [^\]]*\]/g, "")
    .replace(/\[Image: [^\]]*\]/g, "")
    .replace(/📎[^\n]*/g, "")
    .trim();
}

/** Escape + summarize; used for storing clean titles. */
export function titleFromContent(content) {
  return summarizeUserContent(content)
    .replace(/\s+/g, " ")
    .slice(0, 60) || "New chat";
}