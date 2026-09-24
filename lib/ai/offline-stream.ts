import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

/**
 * ReelBot's fallback behaviour (slide 17-18).
 *
 * When GROQ_API_KEY is missing or Groq itself fails, we do NOT return a 500
 * and leave the chat panel spinning. We return a real, well-formed stream
 * that says what happened. Fail loudly and safely.
 *
 * The response uses the AI SDK v5 UI message stream protocol, so the client
 * can consume this fallback through the same `useChat` transport as Groq.
 */
export function offlineStreamResponse(text: string): Response {
  const chunks = text.match(/\S+\s*/g) ?? [text];

  const stream = createUIMessageStream({
    async execute({ writer }) {
      const textId = "offline-text";
      writer.write({ type: "text-start", id: textId });

      for (const chunk of chunks) {
        writer.write({ type: "text-delta", id: textId, delta: chunk });
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      writer.write({ type: "text-end", id: textId });
    },
  });

  return createUIMessageStreamResponse({ stream });
}

export const OFFLINE_NOTICE =
  "ReelBot is in offline mode - no GROQ_API_KEY is set, so I am replying " +
  "from a script instead of a model. Everything else on this page still " +
  "works: browse showtimes, pick a seat, book it. Add a key to .env.local " +
  "and restart the dev server to bring me online.";

export const ERROR_NOTICE =
  "ReelBot could not reach Groq just now. Nothing was changed. Try again in " +
  "a moment, or carry on booking without me - the seat map does not need me.";
