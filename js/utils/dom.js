/* =====================================================
   DOM HELPERS
===================================================== */

/** Query a single element, throwing on missing (catches typos early). */
export function $(selector, root = document) {
  const el = root.querySelector(selector);

  if (!el) {
    console.error(`[dom] Element not found: ${selector}`);
    return null;
  }

  return el;
}

/** Create an element from an HTML template string. */
export function createElement(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

/** Small debounce helper. */
export function debounce(fn, wait = 200) {
  let timer = null;

  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

/** rAF-throttled function. */
export function rafThrottle(fn) {
  let queued = false;

  return function throttled(...args) {
    if (queued) return;

    queued = true;

    requestAnimationFrame(() => {
      queued = false;
      fn.apply(this, args);
    });
  };
}
