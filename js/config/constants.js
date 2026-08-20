/* =====================================================
   CONFIG — constants
===================================================== */

export const STORAGE_KEYS = {
  settings: "leazed.settings.v1",
  history: "leazed.history.v1",
  ui: "leazed.ui.v1"
};

/** Maximum conversations kept in localStorage. */
export const HISTORY_LIMIT = 50;

/** File upload limits. */
export const MAX_IMAGE_MB = 8;
export const MAX_FILE_MB = 20;
export const MAX_TEXT_CHARS = 40000;

/** Extensions treated as readable text (inlined into the prompt). */
export const TEXT_EXTENSIONS = [
  "txt", "md", "markdown", "json", "js", "mjs", "ts", "jsx", "tsx",
  "py", "rb", "go", "rs", "java", "kt", "c", "h", "cpp", "hpp", "cs",
  "css", "scss", "sass", "less", "html", "htm", "xml", "svg", "yaml",
  "yml", "toml", "ini", "cfg", "conf", "sh", "bash", "zsh", "fish",
  "ps1", "bat", "sql", "csv", "tsv", "log", "env", "gitignore",
  "dockerfile", "makefile"
];

/** Image MIME types we accept for vision input. */
export const IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif"
];

/** Default model options shown before discovery. */
export const DEFAULT_MODELS = [
  { label: "GPT-4o", value: "gpt-4o" },
  { label: "GPT-4o mini", value: "gpt-4o-mini" },
  { label: "GPT-4.1", value: "gpt-4.1" },
  { label: "Claude 4.5 Sonnet", value: "claude-sonnet-4-5" },
  { label: "Gemini 2.5 Pro", value: "gemini-2.5-pro" },
  { label: "Llama 3.1 70B", value: "llama-3.1-70b-versatile" }
];

/** UI suggestion cards shown on the welcome screen. */
export const SUGGESTIONS = [
  { icon: "bot", title: "Build an AI Agent", text: "Design an autonomous AI system", prompt: "Help me design an autonomous AI agent" },
  { icon: "folder-search", title: "Analyze a Repository", text: "Understand any codebase", prompt: "Analyze a code repository and summarize its architecture" },
  { icon: "bug", title: "Debug Code", text: "Find and fix issues", prompt: "Help me debug a code problem and explain the root cause" },
  { icon: "layout-template", title: "Design a Product", text: "Plan an interface or feature", prompt: "Help me design a new product feature" },
  { icon: "graduation-cap", title: "Explain a Concept", text: "Learn something clearly", prompt: "Explain a complex concept simply with examples" },
  { icon: "git-branch", title: "Plan a Project", text: "Break work into steps", prompt: "Create a step-by-step plan for a project" }
];

/** Store event names. */
export const EVENTS = {
  SETTINGS: "settings:change",
  HISTORY: "history:change",
  CONVERSATION: "conversation:change",
  STREAM: "stream:change",
  STATUS: "status:change",
  MODELS: "models:change",
  UI: "ui:change"
};