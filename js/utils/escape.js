/* =====================================================
   ESCAPE
   HTML escaping for all user-generated content.
===================================================== */

const ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

export function escapeHTML(text) {
  return String(text).replace(/[&<>"']/g, char => ESCAPE_MAP[char]);
}

/** Plain-text version of escapeHTML, also used for attributes. */
export function escapeAttr(text) {
  return escapeHTML(text);
}
