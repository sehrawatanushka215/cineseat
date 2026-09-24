import { fireEvent, render, screen } from "@testing-library/react";
import type { UIMessage } from "ai";
import { MessageBubble } from "@/app/components/message-bubble";

function messageWithParts(parts: unknown[], role: "user" | "assistant" = "assistant"): UIMessage {
    return {
        id: "message-1",
        role,
        parts,
    } as unknown as UIMessage;
}

describe("MessageBubble", () => {
    const onApproveCancel = jest.fn();
    const onRejectCancel = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders text parts and applies the message role class", () => {
        render(
            <MessageBubble
                message={messageWithParts([{ type: "text", text: "Hello there" }], "user")}
                onApproveCancel={onApproveCancel}
                onRejectCancel={onRejectCancel}
            />,
        );

        expect(screen.getByText("Hello there")).toBeInTheDocument();
        expect(screen.getByText("Hello there")).toHaveClass("bubble__text");
        const bubble = document.querySelector(".bubble");
        expect(bubble).toHaveClass("bubble", "bubble--user");
    });

    it("renders cancel confirmation and forwards approve and reject actions", () => {
        render(
            <MessageBubble
                message={messageWithParts([
                    {
                        type: "tool-cancelBooking",
                        state: "input-available",
                        toolCallId: "tool-call-1",
                        input: { bookingId: "booking-123" },
                    },
                ])}
                onApproveCancel={onApproveCancel}
                onRejectCancel={onRejectCancel}
            />,
        );

        expect(screen.getByRole("heading", { name: "Cancel booking booking-123?" })).toBeInTheDocument();
        expect(screen.getByText("This frees the seat for someone else. It cannot be undone.")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Approve" }));
        fireEvent.click(screen.getByRole("button", { name: "Reject" }));

        expect(onApproveCancel).toHaveBeenCalledWith("tool-call-1", "booking-123");
        expect(onRejectCancel).toHaveBeenCalledWith("tool-call-1");
    });

    it("renders a rejected cancellation when the cancellation output is skipped", () => {
        render(
            <MessageBubble
                message={messageWithParts([
                    {
                        type: "tool-cancelBooking",
                        state: "output-available",
                        toolCallId: "tool-call-1",
                        output: { skipped: true },
                    },
                ])}
                onApproveCancel={onApproveCancel}
                onRejectCancel={onRejectCancel}
            />,
        );

        expect(screen.getByText("Cancel Booking Rejected..")).toBeInTheDocument();
        expect(screen.queryByText("Cancel Booking Completed..")).not.toBeInTheDocument();
    });

    it("renders a completed cancellation when the cancellation output is skipped = false", () => {
        render(
            <MessageBubble
                message={messageWithParts([
                    {
                        type: "tool-cancelBooking",
                        state: "output-available",
                        toolCallId: "tool-call-1",
                        output: { skipped: false },
                    },
                ])}
                onApproveCancel={onApproveCancel}
                onRejectCancel={onRejectCancel}
            />,
        );

        expect(screen.getByText("Cancel Booking Completed..")).toBeInTheDocument();
        expect(screen.queryByText("Cancel Booking Rejected..")).not.toBeInTheDocument();
    });

    it("renders a completed cancellation when the cancellation output is not skipped", () => {
        render(
            <MessageBubble
                message={messageWithParts([
                    {
                        type: "tool-cancelBooking",
                        state: "output-available",
                        toolCallId: "tool-call-1",
                        output: { success: true },
                    },
                ])}
                onApproveCancel={onApproveCancel}
                onRejectCancel={onRejectCancel}
            />,
        );

        expect(screen.getByText("Cancel Booking Completed..")).toBeInTheDocument();
        expect(screen.queryByText("Cancel Booking Rejected..")).not.toBeInTheDocument();
    });

    it.each([
        ["input-streaming", "Search Showtimes is running..."],
        ["input-available", "Search Showtimes is running..."],
        ["output-available", "Search Showtimes completed."],
    ])("renders the generic tool state %s", (state, expectedText) => {
        render(
            <MessageBubble
                message={messageWithParts([
                    {
                        type: "tool-searchShowtimes",
                        state,
                        toolCallId: "tool-call-2",
                    },
                ])}
                onApproveCancel={onApproveCancel}
                onRejectCancel={onRejectCancel}
            />,
        );

        expect(screen.getByText(expectedText)).toBeInTheDocument();
    });

    it("renders text, a tool display, and a cancellation result in one message", () => {
        render(
            <MessageBubble
                message={messageWithParts([
                    { type: "text", text: "Your booking update:" },
                    {
                        type: "tool-searchShowtimes",
                        state: "input-available",
                        toolCallId: "tool-call-2",
                    },
                    {
                        type: "tool-cancelBooking",
                        state: "output-available",
                        toolCallId: "tool-call-1",
                        output: { success: true },
                    },
                ])}
                onApproveCancel={onApproveCancel}
                onRejectCancel={onRejectCancel}
            />,
        );

        expect(screen.getByText("Your booking update:")).toBeInTheDocument();
        expect(screen.getByText("Search Showtimes is running...")).toBeInTheDocument();
        expect(screen.getByText("Cancel Booking Completed..")).toBeInTheDocument();
    });

    it("ignores unsupported message parts", () => {
        const { container } = render(
            <MessageBubble
                message={messageWithParts([{ type: "image", image: "image-data" }])}
                onApproveCancel={onApproveCancel}
                onRejectCancel={onRejectCancel}
            />,
        );

        expect(container.querySelector(".bubble")?.textContent).toBe("");
    });

    it("empty message.parts render no content", () => {
        const { container } = render(
            <MessageBubble
                message={messageWithParts([], "user")}
                onApproveCancel={onApproveCancel}
                onRejectCancel={onRejectCancel}
            />,
        );

        expect(container.querySelector(".bubble")?.textContent).toBe("");
    });

    it("By clicking Approve does not call reject", () => {
        render(
            <MessageBubble
                message={messageWithParts([{
                    type: "tool-cancelBooking",
                    state: "input-available",
                    toolCallId: "tool-call-1",
                    input: { bookingId: "booking-123" },
                }], "user")}
                onApproveCancel={onApproveCancel}
                onRejectCancel={onRejectCancel}
            />,
        );

        fireEvent.click(screen.getByText("Approve"));
        expect(onRejectCancel).not.toHaveBeenCalled();

    });

    it("By clicking Reject does not call Approve", () => {
        render(
            <MessageBubble
                message={messageWithParts([{
                    type: "tool-cancelBooking",
                    state: "input-available",
                    toolCallId: "tool-call-1",
                    input: { bookingId: "booking-123" },
                }], "user")}
                onApproveCancel={onApproveCancel}
                onRejectCancel={onRejectCancel}
            />,
        );

        fireEvent.click(screen.getByText("Reject"));
        expect(onApproveCancel).not.toHaveBeenCalled();

    });

    it.each([null, "cancelled", 0])(
        "renders cancellation as completed when output is %p",
        (output) => {
            render(
                <MessageBubble
                    message={messageWithParts([{
                        type: "tool-cancelBooking",
                        state: "output-available",
                        toolCallId: "tool-call-1",
                        output,
                    }])}
                    onApproveCancel={onApproveCancel}
                    onRejectCancel={onRejectCancel}
                />,
            );

            expect(screen.getByText("Cancel Booking Completed..")).toBeInTheDocument();
            expect(screen.queryByText("Cancel Booking Rejected..")).not.toBeInTheDocument();
        },
    );

    it("renders an unsupported cancellation state through the generic tool display", () => {
        render(
            <MessageBubble
                message={messageWithParts([{
                    type: "tool-cancelBooking",
                    state: "input-streaming",
                    toolCallId: "tool-call-1",
                }])}
                onApproveCancel={onApproveCancel}
                onRejectCancel={onRejectCancel}
            />,
        );

        expect(screen.getByText("Cancel Booking is running...")).toBeInTheDocument();
    });

    it("renders nothing for a generic tool part without a state", () => {
        const { container } = render(
            <MessageBubble
                message={messageWithParts([{
                    type: "tool-searchShowtimes",
                    toolCallId: "tool-call-2",
                }])}
                onApproveCancel={onApproveCancel}
                onRejectCancel={onRejectCancel}
            />
        );

        expect(container.querySelector(".bubble")?.textContent).toBe("");
    });
});
