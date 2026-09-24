import { groq } from "@ai-sdk/groq";
import { convertToModelMessages, createUIMessageStreamResponse, stepCountIs, streamText, type UIMessage } from "ai";
import { z } from "zod";
import { ERROR_NOTICE, OFFLINE_NOTICE, offlineStreamResponse } from "@/lib/ai/offline-stream";
import { cancelBookingTool } from "@/lib/tools/cancel-booking";
import { searchShowtimes } from "@/lib/tools/search-showtimes";
import { bookShowTime } from "@/lib/tools/book-showtime";

export const runtime = "nodejs"; // Prisma needs Node, not Edge.
export const maxDuration = 30;


const SYSTEM_PROMPT = [
  "You are ReelBot, the booking assistant for CineSeat, a cinema chain.",
  "Answer in two or three short sentences. No markdown headings.",
  "Use the searchShowtimes tool whenever the user asks what is playing.",
  "To book a seat for a film, call the bookShowTime tool with the film title.",
  "To cancel a booking, call the cancelBooking tool with the exact booking id.",
  "Never claim a booking is cancelled until the tool has returned a result -",
  "the customer has to confirm it first, and they may say no.",
  "If you do not know something, say so. Do not infer.",
].join(" ");

export async function POST(req: Request) {

  const { messages }: { messages: UIMessage[] } = await req.json();


  // Fallback #1: no key, no crash. The chat still streams a real answer.
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "") {
    return offlineStreamResponse(OFFLINE_NOTICE);
  }

  try {
    const result = streamText({
      model: groq(process.env.GROQ_MODEL ?? "openai/gpt-oss-120b"),
      system: SYSTEM_PROMPT,
      messages: convertToModelMessages(messages as unknown as UIMessage[]),
      tools: {
        searchShowtimes,
        cancelBooking: cancelBookingTool,
        bookShowTime,
      },
      stopWhen: stepCountIs(3)
    });

    return createUIMessageStreamResponse({
      stream: result.toUIMessageStream({
        onError: () => ERROR_NOTICE,
      }),
      // Never leak a provider stack trace to a customer in a cinema lobby.
      //getErrorMessage: () => ERROR_NOTICE,
    });
  } catch (error) {
    // Fallback #2: Groq unreachable, rate limited, model retired.
    console.error("[reelbot] falling back:", error);
    return offlineStreamResponse(ERROR_NOTICE);
  }
}
