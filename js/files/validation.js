/* =====================================================
   FILE VALIDATION
===================================================== */

import {
  IMAGE_TYPES,
  TEXT_EXTENSIONS,
  MAX_IMAGE_MB,
  MAX_FILE_MB
} from "../config/constants.js";

function extOf(name) {
  const parts = name.toLowerCase().split(".");

  return parts.length > 1 ? parts.pop() : "";
}

export function isImage(file) {
  return (
    IMAGE_TYPES.includes(file.type) ||
    file.type.startsWith("image/")
  );
}

export function isTextFile(file) {
  return (
    file.type.startsWith("text/") ||
    file.type === "application/json" ||
    file.type === "application/xml" ||
    TEXT_EXTENSIONS.includes(extOf(file.name))
  );
}

/**
 * Validate a list of files.
 * @returns {{ok: boolean, errors: string[], items: Array<{file, kind}>}}
 */
export function validateFiles(fileList) {
  const errors = [];
  const items = [];

  for (const file of fileList) {
    const sizeMB = file.size / (1024 * 1024);

    if (isImage(file)) {
      if (sizeMB > MAX_IMAGE_MB) {
        errors.push(`"${file.name}" is too large (max ${MAX_IMAGE_MB} MB).`);
        continue;
      }

      items.push({ file, kind: "image" });
    }
    else if (isTextFile(file)) {
      if (sizeMB > MAX_FILE_MB) {
        errors.push(`"${file.name}" is too large (max ${MAX_FILE_MB} MB).`);
        continue;
      }

      items.push({ file, kind: "text" });
    }
    else {
      if (sizeMB > MAX_FILE_MB) {
        errors.push(`"${file.name}" is too large (max ${MAX_FILE_MB} MB).`);
        continue;
      }

      // Unknown type: attach by name only.
      items.push({ file, kind: "file" });
    }
  }

  return { ok: errors.length === 0, errors, items };
}