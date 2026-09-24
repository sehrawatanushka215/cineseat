"use client";

import type { UIMessage } from "ai";
import { ToolCallDisplay } from "./tool-call-display";
import { ToolConfirmation } from "./tool-confirmation";

function wasCancellationSkipped(output: unknown): boolean {
  return (
    typeof output === "object" &&
    output !== null &&
    "skipped" in output &&
    output.skipped === true
  );
}


export type MessageBubbleProps = {
  message: UIMessage;
  onApproveCancel: (toolCallId: string, bookingId: string) => void;
  onRejectCancel: (toolCallId: string) => void;
};

export function MessageBubble({
  message,
  onApproveCancel,
  onRejectCancel,
}: MessageBubbleProps) {
  return (
    <div className={`bubble bubble--${message.role}`}>
      {
        message.parts.map((part, index) => {
          if (part.type == 'text') {
            return <span key={index} className="bubble__text">{part.text}</span>;
          }

          if (part.type == "tool-cancelBooking") {
            if (part.state == 'input-available') {
              const input = part.input as { bookingId: string }
              return (
                <ToolConfirmation
                  key={index}
                  toolCallId={part.toolCallId}
                  title={`Cancel booking ${input.bookingId}?`}
                  description="This frees the seat for someone else. It cannot be undone."
                  onApprove={() => onApproveCancel(part.toolCallId, input.bookingId)}
                  onReject={() => onRejectCancel(part.toolCallId)}
                />
              )
            }
            if (part.state == 'output-available') {
              if (wasCancellationSkipped(part.output)) {
                return (
                  <div key={index} >
                    <span aria-hidden="true"> ✗ </span>
                    <span> Cancel Booking Rejected.. </span>
                  </div>
                )
              }
              return (
                <div key={index} >
                  <span aria-hidden="true"> ✓ </span>
                  <span> Cancel Booking Completed.. </span>
                </div>
              )
            }
          }

          if (typeof part.type === "string" && part.type.startsWith("tool-") && "state" in part) {
            return (
              <ToolCallDisplay
                key={index}
                toolName={part.type.replace("tool-", "")}
                state={part.state ?? ""}
              />
            );
          }

          return null;
        })
      }
    </div>
  );
}
