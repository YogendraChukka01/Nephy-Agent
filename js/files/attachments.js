/* =====================================================
   ATTACHMENTS
   Upload, validation, previews, metadata.
   Processing strategy: images → vision parts,
   text files → inlined content, others → name only.
===================================================== */

import { validateFiles } from "./validation.js";
import { MAX_TEXT_CHARS } from "../config/constants.js";
import { toast } from "../ui/toast.js";
import { formatBytes } from "../utils/format.js";
import { escapeHTML } from "../utils/escape.js";
import { refreshIcons } from "../ui/icons.js";

const items = [];
let pendingReads = 0;

const listEl = () => document.getElementById("attachmentList");

export const attachments = {

  count: () => items.length,

  isBusy: () => pendingReads > 0,

  getItems: () => items.slice(),

  addFromFileList(fileList) {
    const { ok, errors, items: valid } = validateFiles(fileList);

    errors.forEach(message => toast("error", message));

    if (!valid.length) return;

    valid.forEach(item => {
      items.push(item);

      if (item.kind === "image") readImage(item);
      else if (item.kind === "text") readText(item);
    });

    this.render();
  },

  remove(index) {
    items.splice(index, 1);
    this.render();
  },

  clear() {
    items.length = 0;
    pendingReads = 0;
    this.render();
  },

  render() {
    const el = listEl();

    if (!el) return;

    el.hidden = items.length === 0;

    el.innerHTML = "";

    items.forEach((item, index) => {
      el.appendChild(createPreview(item, index));
    });

    refreshIcons(el);

    document.dispatchEvent(new Event("attachments:change"));
  }
};

/* ---- readers ---- */

function readImage(item) {
  pendingReads++;

  const reader = new FileReader();

  reader.onload = () => {
    item.dataUrl = reader.result;
    pendingReads--;
    attachments.render();
  };

  reader.onerror = () => {
    pendingReads--;
    item.kind = "file";
    attachments.render();
  };

  reader.readAsDataURL(item.file);
}

function readText(item) {
  pendingReads++;

  const reader = new FileReader();

  reader.onload = () => {
    item.text = String(reader.result || "").slice(0, MAX_TEXT_CHARS);
    pendingReads--;
    attachments.render();
  };

  reader.onerror = () => {
    pendingReads--;
    item.kind = "file";
    attachments.render();
  };

  reader.readAsText(item.file);
}

/* ---- previews ---- */

function createPreview(item, index) {
  const el = document.createElement("div");
  el.className = "attachment";

  const iconHtml = item.kind === "image" && item.dataUrl
    ? `<img src="${item.dataUrl}" alt="">`
    : `<i data-lucide="${iconFor(item)}"></i>`;

  el.innerHTML = `
    <span class="attachment-icon" aria-hidden="true">${iconHtml}</span>
    <span class="attachment-info">
      <span class="attachment-name"></span>
      <span class="attachment-meta"></span>
    </span>
    <button class="attachment-remove" type="button" aria-label="Remove attachment">
      <i data-lucide="x"></i>
    </button>
  `;

  el.querySelector(".attachment-name").textContent = item.file.name;

  el.querySelector(".attachment-meta").textContent = kindLabel(item) + " · " + formatBytes(item.file.size);

  el.querySelector(".attachment-remove").addEventListener("click", () => {
    attachments.remove(index);
  });

  return el;
}

function iconFor(item) {
  if (item.kind === "image") return "image";
  if (item.kind === "text") return "file-code";
  if (item.file.type.includes("pdf")) return "file-text";
  return "file";
}

function kindLabel(item) {
  if (item.kind === "image") return "Image";
  if (item.kind === "text") return "Text";
  return "File";
}