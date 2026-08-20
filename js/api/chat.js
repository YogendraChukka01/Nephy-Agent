/* =====================================================
   CHAT COMPLETIONS
   OpenAI-compatible request/response handling.
===================================================== */

import { apiFetch, getApiConfig } from "./client.js";
import { consumeSSE } from "./streaming.js";

/**
 * Send a chat-completions request.
 *
 * @param {object}   opts
 * @param {object[]} opts.messages  Normalized OpenAI message array.
 * @param {object}   [opts.extra]   Extra payload fields (e.g. temperature).
 * @param {AbortSignal} [opts.signal]
 * @param {(delta: string, full: string) => void} [opts.onDelta]
 * @param {(full: string) => void} [opts.onDone]
 * @param {(err: Error) => void} [opts.onError]
 * @param {() => void} [opts.onStop]
 */
export async function chatCompletion({
  messages,
  extra = {},
  signal,
  onDelta,
  onDone,
  onError,
  onStop
}) {
  const config = getApiConfig();

  const payload = {
    model: config.model,
    messages,
    stream: config.stream,
    temperature: config.temperature,
    ...extra
  };

  try {
    const res = await apiFetch("chat/completions", {
      method: "POST",
      body: JSON.stringify(payload),
      signal
    });

    const contentType = res.headers.get("content-type") || "";

    if (config.stream && contentType.includes("text/event-stream")) {
      try {
        await consumeSSE(res, { onDelta, onDone });
      }
      catch (err) {
        if (err.name === "AbortError") return onStop?.();
        onError?.(err);
      }
      return;
    }

    // Non-streaming response (some proxies buffer the stream).
    const data = await res.json();

    const text =
      data.choices?.[0]?.message?.content ??
      data.choices?.[0]?.text ??
      data.output_text ??
      "";

    if (text) onDelta?.(text, text);

    onDone?.(text);
  }
  catch (err) {
    if (err.name === "AbortError") return onStop?.();

    onError?.(err);
  }
}