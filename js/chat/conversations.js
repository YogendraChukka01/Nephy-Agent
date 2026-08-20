/* =====================================================
   CONVERSATIONS
   Conversation lifecycle + streaming orchestration.
===================================================== */

import { store } from "../state/store.js";
import { EVENTS, HISTORY_LIMIT } from "../config/constants.js";
import { chatCompletion } from "../api/chat.js";
import { renderer, renderStream, scrollToEnd as scrollToEndNow } from "./renderer.js";
import { renderMarkdown as renderMarkdownNow } from "./markdown.js";
import { titleFromContent } from "./messages.js";
import { uid } from "../utils/format.js";

let lastUserPayload = null;

export const conversations = {

  init() {
    store.on(EVENTS.STREAM, streaming => {
      if (!streaming) lastUserPayload = null;
    });
  },

  /**
   * Send the composer payload and stream a response.
   * @param {{ text: string, attachments: Array<{file: File, kind: string, dataUrl?: string, text?: string}> }} payload
   */
  send({ text, attachments = [] }) {
    if (store.get("streaming")) return;

    const settings = store.get("settings");

    if (!settings.baseUrl.trim()) {
      renderer.showError("API base URL is not configured. Open Settings to add one.");
      store.update("status", { state: "error", text: "Not configured" }, EVENTS.STATUS);
      return;
    }

    const content = buildContent(text, attachments);

    if (!content.trim() && !attachments.length) return;

    // Create the conversation on first message.
    let currentId = store.get("currentId");

    if (!currentId) {
      currentId = uid("c");

      const chat = {
        id: currentId,
        title: "New chat",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
      };

      const history = [chat, ...store.get("history")].slice(0, HISTORY_LIMIT);

      store.set("currentId", currentId);
      store.set("history", history, EVENTS.HISTORY);
      store.persistHistory();
    }

    const storedContent = simplifyContent(text, attachments);

    const userMessage = {
      id: uid("m"),
      role: "user",
      content: storedContent,
      timestamp: Date.now()
    };

    const conversation = [...store.get("conversation"), userMessage];

    store.set("conversation", conversation);

    const chat = store.get("history").find(c => c.id === currentId);

    if (chat) {
      if (chat.title === "New chat") chat.title = titleFromContent(storedContent);

      chat.updatedAt = Date.now();

      store.persistHistory();

      store.emit(EVENTS.HISTORY);
    }


    lastUserPayload = { text, attachments };

    this._runStream();
  },

  /** Stop the in-flight generation. */
  stop() {
    const controller = store.get("controller");

    controller?.abort();
  },

  /** Re-request the last assistant turn. */
  regenerateLast() {
    if (store.get("streaming")) return;

    const conversation = store.get("conversation");

    // Remove the last assistant message (and any error rows).
    const cleaned = conversation.filter(m => m.role !== "assistant");

    const last = cleaned[cleaned.length - 1];

    if (!last || last.role !== "user") return;

    store.set("conversation", cleaned);

    renderer.removeErrors();


    this._runStream();
  },

  /** Retry after an error: replay the last user turn. */
  retryLast() {
    if (store.get("streaming")) return;

    const conversation = store.get("conversation").filter(m => m.role !== "assistant");

    store.set("conversation", conversation);

    renderer.removeErrors();


    if (conversation.length) this._runStream();
  },

  newChat() {
    if (store.get("streaming")) this.stop();

    store.set("currentId", null);
    store.set("conversation", []);

  },

  open(id) {
    if (store.get("streaming")) this.stop();

    const chat = store.get("history").find(c => c.id === id);

    if (!chat) return;

    store.set("currentId", id);
    store.set("conversation", chat.messages || []);

  },

  remove(id) {
    const history = store.get("history").filter(c => c.id !== id);

    store.set("history", history, EVENTS.HISTORY);
    store.persistHistory();

    if (store.get("currentId") === id) this.newChat();
  },

  rename(id, title) {
    const chat = store.get("history").find(c => c.id === id);

    const clean = String(title).trim().slice(0, 120);

    if (!chat || !clean) return;

    chat.title = clean;

    store.persistHistory();
    store.emit(EVENTS.HISTORY);
  },

  clearCurrent() {
    const currentId = store.get("currentId");

    if (!currentId) return;

    const chat = store.get("history").find(c => c.id === currentId);

    if (chat) {
      chat.messages = [];
      chat.title = "New chat";
      chat.updatedAt = Date.now();
      store.persistHistory();
    }

    store.set("conversation", []);

  },

  clearAll() {
    if (store.get("streaming")) this.stop();

    store.set("history", [], EVENTS.HISTORY);
    store.set("currentId", null);
    store.set("conversation", []);

    store.persistHistory();

  },

  /** Download the current conversation. */
  export(format = "md") {
    const conversation = store.get("conversation");

    const title = store.get("history").find(c => c.id === store.get("currentId"))?.title || "conversation";

    if (!conversation.length) return;

    let blob;
    let filename;

    if (format === "json") {
      const data = {
        app: "Leazed AI",
        version: 1,
        exportedAt: new Date().toISOString(),
        title,
        messages: conversation
      };

      blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      filename = `${slug(title)}.json`;
    }
    else {
      const md = conversation
        .map(msg => {
          const prefix = msg.role === "user" ? "**You:**" : "**Leazed AI:**";
          return `${prefix}\n\n${msg.content}`;
        })
        .join("\n\n---\n\n");

      blob = new Blob([`# ${title}\n\n${md}\n`], { type: "text/markdown" });
      filename = `${slug(title)}.md`;
    }

    downloadBlob(blob, filename);
  },

  /** Import an exported JSON conversation dump. */
  importData(jsonText) {
    const data = JSON.parse(jsonText);

    const messages = (data.messages || [])
      .filter(m => ["user", "assistant"].includes(m.role) && typeof m.content === "string")
      .map(m => ({
        id: uid("m"),
        role: m.role,
        content: m.content,
        timestamp: Date.now()
      }));

    if (!messages.length) throw new Error("No valid messages found in file.");

    const chat = {
      id: uid("c"),
      title: String(data.title || "Imported chat").slice(0, 120),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages
    };

    const history = [chat, ...store.get("history")].slice(0, HISTORY_LIMIT);

    store.set("history", history, EVENTS.HISTORY);
    store.persistHistory();

    return chat;
  },

  /* ---- internal ---- */

  _runStream() {
    const conversation = store.get("conversation");

    if (!conversation.length) return;

    const settings = store.get("settings");

    const payloadMessages = buildPayload(conversation, settings);

    const controller = new AbortController();

    store.set("controller", controller);
    store.set("streaming", true, EVENTS.STREAM);

    store.update("status", { state: "connecting", text: "Generating…" }, EVENTS.STATUS);

    renderer.showTyping();

    const contentEl = renderer.beginAssistantMessage();

    let fullText = "";

    chatCompletion({
      messages: payloadMessages,
      signal: controller.signal,
      onDelta: (_delta, full) => {
        fullText = full;
        renderer.hideTyping();
        renderStream(contentEl, full);
      },
      onDone: (text) => {
        fullText = text;

        contentEl.innerHTML = renderMarkdownNow(text);

        scrollToEndNow();

        // Persist the completed assistant message.
        const assistantMessage = {
          id: uid("m"),
          role: "assistant",
          content: text || "(empty response)",
          timestamp: Date.now()
        };

        const conversation = [...store.get("conversation"), assistantMessage];

        store.set("conversation", conversation);

        const chat = store.get("history").find(c => c.id === store.get("currentId"));

        if (chat) {
          chat.messages = conversation;
          chat.updatedAt = Date.now();
          store.persistHistory();
        }

        store.emit(EVENTS.HISTORY);

        store.update("status", { state: "online", text: "Online" }, EVENTS.STATUS);
      },
      onError: (err) => {
        contentEl.closest(".message")?.remove();

        const offline = !navigator.onLine;

        const message = offline
          ? "You appear to be offline. Check your connection and try again."
          : (err.message || "Request failed");

        renderer.showError(message, {
          onRetry: () => conversations.retryLast()
        });

        store.update("status", { state: "error", text: offline ? "Offline" : "Error" }, EVENTS.STATUS);
      },
      onStop: () => {
        contentEl.closest(".message")?.remove();

        // Keep partial output if any was produced.
        if (fullText.trim()) {
          const assistantMessage = {
            id: uid("m"),
            role: "assistant",
            content: fullText,
            timestamp: Date.now()
          };

          const conversation = [...store.get("conversation"), assistantMessage];

          store.set("conversation", conversation);

          const chat = store.get("history").find(c => c.id === store.get("currentId"));

          if (chat) {
            chat.messages = conversation;
            chat.updatedAt = Date.now();
            store.persistHistory();
          }

          store.emit(EVENTS.HISTORY);
        }

        store.update("status", { state: "idle", text: "Stopped" }, EVENTS.STATUS);
      }
    }).finally(() => {
      renderer.hideTyping();

      store.set("controller", null);
      store.set("streaming", false, EVENTS.STREAM);
    });
  }
};

/* ---- helpers ---- */

function buildContent(text, attachments) {
  const lines = [];

  if (text) lines.push(text);

  attachments.forEach(a => {
    if (a.kind === "image") lines.push(`[Image: ${a.file.name}]`);
    else lines.push(`[File: ${a.file.name}]`);
  });

  return lines.join("\n");
}

function simplifyContent(text, attachments) {
  const lines = [];

  if (text) lines.push(text);

  attachments.forEach(a => {
    if (a.kind === "image") lines.push(`📎 ${a.file.name}`);
    else lines.push(`[File: ${a.file.name}]`);
  });

  return lines.join("\n");
}

/** Build the OpenAI messages payload (system + history). */
function buildPayload(conversation, settings) {
  const messages = [];

  if (settings.systemPrompt?.trim()) {
    messages.push({ role: "system", content: settings.systemPrompt.trim() });
  }

  // Reconstruct the last user turn with attachment parts when possible.
  conversation.forEach((msg, index) => {
    const isLastUser = index === conversation.length - 1 && msg.role === "user";

    if (isLastUser && lastUserPayload) {
      const parts = [];

      if (lastUserPayload.text) parts.push({ type: "text", text: lastUserPayload.text });

      lastUserPayload.attachments.forEach(a => {
        if (a.kind === "image" && a.dataUrl) {
          parts.push({ type: "image_url", image_url: { url: a.dataUrl } });
        }
        else if (a.kind === "text" && a.text) {
          parts.push({ type: "text", text: `[File: ${a.file.name}]\n${a.text}` });
        }
        else {
          parts.push({ type: "text", text: `📎 ${a.file.name}` });
        }
      });

      messages.push({
        role: "user",
        content: parts.length === 1 && parts[0].type === "text" ? parts[0].text : parts
      });

      return;
    }

    messages.push({ role: msg.role, content: msg.content });
  });

  return messages;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function slug(title) {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "conversation";
}