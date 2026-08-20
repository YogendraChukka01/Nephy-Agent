/* =====================================================
   STREAMING
   Server-Sent-Events parser for /chat/completions streams.
===================================================== */

/**
 * Consume an SSE response body, invoking onDelta with each
 * content token. Resolves with the full concatenated text.
 */
export async function consumeSSE(response, handlers = {}) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");

    buffer = lines.pop() || "";

    for (const raw of lines) {
      const line = raw.trim();

      if (!line.startsWith("data:")) continue;

      const data = line.slice(5).trim();

      if (data === "[DONE]") continue;

      try {
        const json = JSON.parse(data);

        const delta =
          json.choices?.[0]?.delta?.content ??
          json.choices?.[0]?.message?.content ??
          json.content;

        if (delta) {
          fullText += delta;
          handlers.onDelta?.(delta, fullText);
        }
      }
      catch {
        /* ignore partial / non-JSON lines */
      }
    }
  }

  // Flush any remaining buffered data.
  if (buffer.trim()) {
    const line = buffer.trim();

    if (line.startsWith("data:")) {
      const data = line.slice(5).trim();

      if (data !== "[DONE]") {
        try {
          const json = JSON.parse(data);
          const delta =
            json.choices?.[0]?.delta?.content ??
            json.choices?.[0]?.message?.content ??
            json.content;

          if (delta) fullText += delta;
        }
        catch {
          /* ignore */
        }
      }
    }
  }

  handlers.onDone?.(fullText);

  return fullText;
}