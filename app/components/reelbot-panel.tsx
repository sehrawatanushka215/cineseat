"use client";

import { useChat } from "@ai-sdk/react";
import { MessageBubble } from "@/app/components/message-bubble";
import { DefaultChatTransport } from "ai";
import { SubmitEventHandler, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type React from "react";

function isSuccessfulBookingOutput(output: unknown): boolean {
  return (
    typeof output === "object" &&
    output !== null &&
    "ok" in output &&
    output.ok === true
  );
}

export function ReelBotPanel() {
  const router = useRouter();
  const lastSubmittedCancelId = useRef<string>("");
  const lastRefreshedBookingId = useRef<string>("");
  const handleApprovalCancelId = useRef<string | null>(null);

  const {
    messages,
    sendMessage,
    addToolOutput,
    status,
    stop,
    regenerate
  } = useChat({
    transport: new DefaultChatTransport({ api: '/api/reelbot' }),
    sendAutomaticallyWhen: ({ messages }) => {
      // messages.at(-1) gets the last message in the conversation.
      const cancelPart = messages.at(-1)?.parts.find(part => part.type === "tool-cancelBooking" && part.state === "output-available");
      if (!cancelPart || cancelPart.type !== "tool-cancelBooking" ||
        cancelPart.state !== "output-available" || lastSubmittedCancelId.current === cancelPart.toolCallId) {
        return false;
      }
      lastSubmittedCancelId.current = cancelPart.toolCallId;
      return true;
    }
  });

  const [input, setInput] = useState<string>("");

  // The below code is added to automatically refresh the booking list when a successful booking output is detected via bot.
  useEffect(() => {
    const latestBookingPart = messages
      .at(-1)
      ?.parts
      .slice()
      .reverse()
      .find(
        (part) =>
          part.type === "tool-bookShowTime" &&
          "state" in part &&
          part.state === "output-available" &&
          "toolCallId" in part,
      );

    if (
      !latestBookingPart ||
      latestBookingPart.type !== "tool-bookShowTime" ||
      lastRefreshedBookingId.current === latestBookingPart.toolCallId
    ) {
      return;
    }

    if ("output" in latestBookingPart && isSuccessfulBookingOutput(latestBookingPart.output)) {
      lastRefreshedBookingId.current = latestBookingPart.toolCallId;
      router.refresh();
    }
  }, [messages, router]);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    if (!input.trim()) return;

    sendMessage({ text: input });
    setInput("");
  };

  async function approveCancel(toolCallId: string, bookingId: string) {
    if (handleApprovalCancelId.current === toolCallId) {
      return;
    }

    handleApprovalCancelId.current = toolCallId;

    try {
      const response = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const output = (await response.json()) as { message: string; ok: boolean };
      addToolOutput({
        tool: "cancelBooking",
        toolCallId,
        output
      });
      if (output.ok) {
        router.refresh();
      }
    } catch {
      addToolOutput({
        tool: "cancelBooking",
        toolCallId,
        output: { ok: false, message: "The cancellation request did not go through." },
      });
      handleApprovalCancelId.current = null;
    }
  }

  function rejectCancel(toolCallId: string) {
    if (handleApprovalCancelId.current === toolCallId) {
      return;
    }

    handleApprovalCancelId.current = toolCallId;
    // The safe default. Nothing is cancelled, and the model is told why.
    addToolOutput({
      tool: "cancelBooking",
      toolCallId,
      output: { skipped: true, message: "The customer declined. The booking is unchanged." },
    });
  }

  return (
    <section aria-labelledby="reelbot-heading" className="reelbot">
      <h2 id="reelbot-heading">ReelBot </h2>
      <p className="muted">
        Ask what is playing, or ask to cancel a booking by its id.
      </p>

      <div className="reelbot__log" role="log" aria-label="ReelBot conversation log" aria-live="polite" aria-atomic="false" aria-busy={status === "streaming"}>
        {messages.length === 0 && (
          <p className="muted">Try: &ldquo;What is playing tonight?&rdquo;</p>
        )}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onApproveCancel={approveCancel}
            onRejectCancel={rejectCancel}
          />
        ))}
        {(status === "submitted" || status === "streaming") && (
          <>
            <p className="muted typing">
              {status === "submitted" ? "ReelBot is thinking..." : "ReelBot is typing..."}
            </p>
            {status === "streaming" && (
              <button type="button" className="button button--quiet" onClick={() => stop()}>
                Abort
              </button>
            )}
          </>
        )}
      </div>

      {/* Fallback behaviour, visible: partial content stays on screen and a
          Retry button appears. Slide 18, first row. */}
      {status === "error" && (
        <div className="reelbot__error" role="alert">
          <p>ReelBot stopped mid-answer. Nothing was changed.</p>
          <button type="button" className="button button--quiet" onClick={() => regenerate()}>
            Retry
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="reelbot__form">
        {/* AUDIT NOTE (Section G): this input has no associated label.
            Deliberate - axe-core is meant to find it. Do not fix it early. */}
        <input
          className="reelbot__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask ReelBot..."
          autoComplete="off"
        />
        <button type="submit" className="button" disabled={status !== "ready"}>
          Send
        </button>
      </form>
    </section>
  );
}
