/* =====================================================
   MARKDOWN
   Dependency-free renderer. Input is HTML-escaped before
   any transformation — no raw HTML ever reaches the DOM.
===================================================== */

import { escapeHTML } from "../utils/escape.js";

function renderInline(text) {
  let out = escapeHTML(text);

  // Inline code first (its contents must stay untouched).
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold, then italic.
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");

  // Links (http/https only).
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  return out;
}

function renderBlock(lines) {
  const text = lines.join("\n").trim();

  if (!text) return "";

  if (/^(-{3,}|\*{3,}|_{3,})$/.test(text)) return "<hr>";

  const trimmed = lines.map(line => line.replace(/^\s+/, ""));

  // Heading (single line only).
  const heading = trimmed[0]?.match(/^(#{1,4})\s+(.*)/);

  if (heading && trimmed.length === 1) {
    const level = heading[1].length;
    return `<h${level}>${renderInline(heading[2])}</h${level}>`;
  }

  // Blockquote.
  if (trimmed.every(line => line.startsWith(">"))) {
    const inner = trimmed.map(line => line.replace(/^>\s?/, "")).join("<br>");
    return `<blockquote>${renderInline(inner)}</blockquote>`;
  }

  // Unordered list.
  if (trimmed.every(line => /^[-*+]\s+/.test(line))) {
    const items = trimmed
      .map(line => `<li>${renderInline(line.replace(/^[-*+]\s+/, ""))}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  }

  // Ordered list.
  if (trimmed.every(line => /^\d+\.\s+/.test(line))) {
    const items = trimmed
      .map(line => `<li>${renderInline(line.replace(/^\d+\.\s+/, ""))}</li>`)
      .join("");
    return `<ol>${items}</ol>`;
  }

  // Paragraph.
  return `<p>${renderInline(text.replace(/\n/g, "<br>"))}</p>`;
}

export function renderCodeBlock(lines, lang) {
  const safeLang = escapeHTML(lang || "code");

  return `
    <div class="code-block">
      <div class="code-head">
        <span class="code-lang">${safeLang}</span>
        <button class="copy-code-btn" type="button" aria-label="Copy code">
          <i data-lucide="copy"></i>
          Copy
        </button>
      </div>
      <code class="language-${safeLang}">${escapeHTML(lines.join("\n"))}</code>
    </div>
  `;
}

export function renderMarkdown(src) {
  const html = [];
  const lines = String(src || "").split("\n");

  let inCode = false;
  let codeLang = "";
  let codeBuf = [];
  let blockBuf = [];

  const flushBlock = () => {
    const rendered = renderBlock(blockBuf);

    if (rendered) html.push(rendered);

    blockBuf = [];
  };

  for (const line of lines) {
    const fence = line.match(/^\s*```+\s*(\S*)\s*$/);

    if (fence) {
      if (inCode) {
        html.push(renderCodeBlock(codeBuf, codeLang));
        codeBuf = [];
        inCode = false;
      }
      else {
        flushBlock();
        inCode = true;
        codeLang = fence[1] || "code";
      }
      continue;
    }

    if (inCode) {
      codeBuf.push(line);
    }
    else {
      blockBuf.push(line);
    }
  }

  if (inCode) {
    html.push(renderCodeBlock(codeBuf, codeLang));
  }
  else {
    flushBlock();
  }

  return html.join("");
}