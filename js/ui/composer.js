/* =====================================================
   COMPOSER
   Input, attachments, voice, send/stop behavior.
===================================================== */

import { store } from "../state/store.js";
import { EVENTS } from "../config/constants.js";
import { conversations } from "../chat/conversations.js";
import { attachments } from "../files/attachments.js";
import { setIcon } from "./icons.js";
import { toast } from "./toast.js";

let input = null;
let sendBtn = null;
let voiceBtn = null;
let attachBtn = null;
let attachMenu = null;
let fileInput = null;
let imageInput = null;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;
let recording = false;

export const composer = {

  init() {
    input = document.getElementById("composerInput");
    sendBtn = document.getElementById("sendBtn");
    voiceBtn = document.getElementById("voiceBtn");
    attachBtn = document.getElementById("attachBtn");
    attachMenu = document.getElementById("attachMenu");
    fileInput = document.getElementById("fileInput");
    imageInput = document.getElementById("imageInput");

    input?.addEventListener("input", () => {
      autoResize();
      updateSendState();
    });

    input?.addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey) {
        if (!store.get("settings").enterToSend) return;

        event.preventDefault();
        this.submit();
      }
    });

    sendBtn?.addEventListener("click", () => this.submit());

    attachBtn?.addEventListener("click", event => {
      event.stopPropagation();
      attachMenu.classList.toggle("open");
      attachBtn.setAttribute("aria-expanded", attachMenu.classList.contains("open"));
    });

    document.addEventListener("click", event => {
      if (!event.target.closest(".attach-wrap")) {
        attachMenu?.classList.remove("open");
        attachBtn?.setAttribute("aria-expanded", "false");
      }
    });

    attachMenu?.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        attachMenu.classList.remove("open");
        attachBtn.setAttribute("aria-expanded", "false");

        const action = btn.dataset.action;

        if (action === "image") imageInput.click();
        else fileInput.click();
      });
    });

    fileInput?.addEventListener("change", () => {
      attachments.addFromFileList(fileInput.files);
      fileInput.value = "";
    });

    imageInput?.addEventListener("change", () => {
      attachments.addFromFileList(imageInput.files);
      imageInput.value = "";
    });

    voiceBtn?.addEventListener("click", () => this.toggleVoice());

    document.addEventListener("attachments:change", updateSendState);

    store.on(EVENTS.STREAM, streaming => this.syncSendButton(Boolean(streaming)));

    document.addEventListener("composer:insert", event => {
      this.insert(event.detail?.text || "");
    });

    // Focus composer on desktop boot.
    if (!isMobile()) input?.focus();

    updateSendState();
  },

  /** Insert text into the composer and focus it. */
  insert(text) {
    input.value = text;
    autoResize();
    updateSendState();
    input.focus();
  },

  submit() {
    if (store.get("streaming")) {
      conversations.stop();
      return;
    }

    if (attachments.isBusy()) return;

    const text = input.value.trim();

    if (!text && !attachments.count()) return;

    conversations.send({ text, attachments: attachments.getItems() });

    this.reset();
  },

  reset() {
    input.value = "";
    input.style.height = "";
    attachments.clear();
    autoResize();
    updateSendState();
    input.focus();
  },

  syncSendButton(streaming) {
    if (!sendBtn) return;

    const icon = sendBtn.querySelector("i");

    if (streaming) {
      setIcon(icon, "square");
      sendBtn.classList.add("stop");
      sendBtn.setAttribute("aria-label", "Stop generating");
      sendBtn.title = "Stop generating";
      sendBtn.disabled = false;
    }
    else {
      setIcon(icon, "arrow-up");
      sendBtn.classList.remove("stop");
      sendBtn.setAttribute("aria-label", "Send message");
      sendBtn.title = "Send message";
      updateSendState();
    }
  },

  toggleVoice() {
    if (!SpeechRecognition) {
      toast("warning", "Voice input is not supported in this browser.");
      return;
    }

    if (!recognition) {
      recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onresult = event => {
        let transcript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }

        this.insert(transcript);
      };

      recognition.onend = () => this.setRecording(false);
      recognition.onerror = () => this.setRecording(false);
    }

    if (recording) {
      recognition.stop();
    }
    else {
      this.setRecording(true);
      recognition.start();
    }
  },

  setRecording(value) {
    recording = value;

    voiceBtn.classList.toggle("active", value);
    voiceBtn.setAttribute("aria-label", value ? "Stop voice input" : "Voice input");
    setIcon(voiceBtn.querySelector("i"), value ? "square" : "mic");
  }
};

/* ---- helpers ---- */

function autoResize() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 160) + "px";
}

function updateSendState() {
  if (!sendBtn) return;

  if (store.get("streaming")) {
    sendBtn.disabled = false;
    return;
  }

  const hasInput = Boolean(input.value.trim());
  const hasFiles = attachments.count() > 0;
  const busy = attachments.isBusy();

  sendBtn.disabled = busy || (!hasInput && !hasFiles);
}

function isMobile() {
  return window.innerWidth <= 768;
}