# Leazed AI

A calm, premium, extensible AI chat workspace for **any OpenAI-compatible API**.

Works with OpenAI, local servers (Ollama, LM Studio, vLLM, llama.cpp, LiteLLM),
and any other provider that exposes `/v1/chat/completions` — streaming included.

> **Security note:** this is a client-side demo. API keys are stored in
> `localStorage` and sent from the browser. For a public deployment, route
> requests through a backend proxy and keep provider keys server-side.

---

## Features

- **OpenAI-compatible API layer** — configurable base URL, key, model, temperature, streaming toggle
- **Real streaming** — SSE parsing via `ReadableStream` + `TextDecoder`, stop-generation via `AbortController`
- **Model discovery** — optional `GET /models` population, manual model entry, graceful fallback
- **Conversation management** — create, open, rename, delete, search (titles + message content)
- **Persistence** — conversations and settings stored safely in `localStorage` with corruption recovery
- **Markdown rendering** — headings, lists, quotes, links, inline code, fenced code blocks with copy buttons
- **Attachments** — images (vision parts), text/code files (inlined), any file (by name); validation + previews
- **Voice input** — Web Speech API transcription where supported
- **Theme system** — light / dark / system, persisted
- **Data tools** — export to Markdown or JSON, import JSON conversations
- **Toasts, dialogs, keyboard shortcuts** — `Ctrl/Cmd+B` sidebar, `/` focus composer, `Ctrl/Cmd+Shift+E` export
- **Accessible & responsive** — focus management, aria labels, skip link, reduced-motion support, mobile drawer sidebar

---

## Getting started

Requires **Node.js 18+** (only used for the static dev server — zero dependencies).

```bash
npm start
# or
node server.js
```

Open <http://localhost:3000>.

> The app uses ES modules, so it must be served over HTTP (`npm start`)
> rather than opened directly via `file://`.

No build step. No package installation. Vanilla HTML/CSS/JS with ES modules.

---

## API configuration

Open **Settings** (gear icon) and configure:

| Field | Example | Notes |
| --- | --- | --- |
| API Base URL | `https://api.openai.com/v1` | Any OpenAI-compatible root. Trailing slashes handled. |
| API Key | `sk-...` | Sent as `Bearer`. Leave empty for local servers. |
| Model | `gpt-4o`, `llama3.1:70b`, ... | Any model string your endpoint accepts. |
| Extra models | `qwen2.5:14b, ...` | Added to the header selector. |

Then press **Test connection**. The app:

1. Tries `GET /models` and populates the model selector when available.
2. Falls back to a minimal `POST /chat/completions` ping so servers without `/models` still validate.

All requests go to:

```
POST {baseUrl}/chat/completions
Authorization: Bearer {apiKey}
Content-Type: application/json

{
  "model": "selected-model",
  "messages": [ { "role": "system", ... }, ... ],
  "stream": true,
  "temperature": 0.7
}
```

### Local server examples

- **Ollama:** `http://localhost:11434/v1` (model e.g. `llama3.1`)
- **LM Studio:** `http://localhost:1234/v1`
- **vLLM / LiteLLM / llama.cpp server:** your server's `/v1` address

### Attachment handling (honest by design)

- **Images** are sent as OpenAI vision `image_url` parts (data URLs). Requires a vision-capable model.
- **Text/code files** are read and inlined into the prompt (up to 40k chars each).
- **Other files** are attached by name only — the app never pretends to analyze what the API cannot.

---

## Project structure

```
├── index.html                  Entry point (slim shell)
├── server.js                   Zero-dependency static dev server
├── package.json
├── .env.example                Documents future production proxy vars
│
├── css/
│   ├── tokens.css              Design tokens (colors, spacing, radius, motion)
│   ├── reset.css / base.css    Reset + base, focus, scrollbars, skip link
│   ├── layout.css              App shell, header, buttons, status pill
│   ├── sidebar.css             Sidebar, history, collapsed + tooltips
│   ├── chat.css                Welcome, messages, markdown, code blocks
│   ├── composer.css            Attachments, input, attach menu, send/stop
│   ├── settings.css            Modal, forms, sections
│   ├── toast.css               Toast notifications
│   ├── motion.css              Reduced-motion handling
│   └── responsive.css          Tablet / mobile / small phone
│
├── js/
│   ├── app.js                  Entry: boot, shortcuts, event delegation
│   ├── config/                 constants + defaults
│   ├── state/store.js          Central state + pub/sub event bus
│   ├── api/                    client (URL/auth), chat (completions), streaming (SSE), models (discovery)
│   ├── chat/                   conversations (orchestrator), renderer, messages, markdown, history
│   ├── files/                  attachments, validation
│   ├── ui/                     sidebar, header, composer, settings, theme, modal, toast, icons
│   └── utils/                  storage, dom, escape, format
│
└── assets/
    └── lib/lucide.min.js       Vendored icon library (offline-capable)
```

---

## Architecture

- **State** — `js/state/store.js` holds settings, history, the active conversation and streaming state, with a tiny pub/sub event bus. Modules subscribe to events (`settings:change`, `history:change`, `conversation:change`, `stream:change`, `status:change`) and never reach into each other.
- **API layer** — `js/api/client.js` reads configuration from the store and builds endpoints/headers. `js/api/chat.js` sends the request; `js/api/streaming.js` parses SSE. Configuration and requests are fully separated.
- **Streaming** — `fetch` + `ReadableStream` + `TextDecoder`, deltas rendered with rAF throttling, `AbortController` for stop, non-streaming JSON fallback for buffering proxies.
- **Storage** — all reads/writes go through `js/utils/storage.js`; settings and history are schema-validated on load so corrupted data recovers to clean state instead of crashing.
- **Files** — validation → metadata → preview → processing strategy (vision part / inlined text / name-only). The `attachments` module is the seam where PDF extraction or RAG would plug in.

---

## Environment & security

- No real API keys are committed anywhere.
- Keys live in `localStorage` and are never written to source files.
- `.env.example` documents the variables a future production proxy would use (`AI_PROVIDER_BASE_URL`, `AI_PROVIDER_API_KEY`, `AI_MODEL`, `PORT`).
- All user/API content is HTML-escaped before rendering; the Markdown renderer accepts no raw HTML.

---

## Limitations

- Client-side API keys are only suitable for local/personal use — a backend proxy is required for production.
- Image attachments are not persisted in conversation history (storage quota); they're included in the request and recorded by filename.
- Attachment analysis depends entirely on the configured model's capabilities.
- Conversation storage is capped at 50 chats.

## Roadmap

- Backend proxy (Node/Fastify) with server-side keys and CORS
- PDF/DOCX text extraction before inlining
- RAG over pasted documents and repositories
- Tool calling / agents
- Provider routing per conversation
- PWA install + offline shell

---

License: MIT