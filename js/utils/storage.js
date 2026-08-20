/* =====================================================
   STORAGE
   Safe localStorage access with validation + recovery.
===================================================== */

export const storage = {

  /** Read + parse JSON. Returns fallback on any failure. */
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);

      if (raw == null) return fallback;

      return JSON.parse(raw);
    }
    catch {
      return fallback;
    }
  },

  /** Serialize + write. Returns false on quota/security errors. */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    }
    catch {
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    }
    catch {
      /* no-op */
    }
  }
};
