/* =====================================================
   ICONS
   Central lucide wrapper. App continues to work even
   if the icon library fails to load.
===================================================== */

export function refreshIcons(root = document) {
  try {
    if (window.lucide?.createIcons) {
      window.lucide.createIcons({ root });
    }
  }
  catch {
    /* icons are decorative — never crash the app */
  }
}

/** Replace an icon on an existing element by data-lucide name. */
export function setIcon(el, name) {
  if (!el) return;

  el.setAttribute("data-lucide", name);

  refreshIcons();
}