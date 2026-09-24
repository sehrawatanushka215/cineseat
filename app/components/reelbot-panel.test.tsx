import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useChat } from "@ai-sdk/react";
import { useRouter } from "next/navigation";
import { ReelBotPanel } from "@/app/components/reelbot-panel";

jest.mock("@ai-sdk/react", () => ({
    useChat: jest.fn(),
}));

jest.mock("next/navigation", () => ({
    useRouter: jest.fn(),
}));

type ChatState = {
    messages: unknown[];
    sendMessage: jest.Mock;
    addToolOutput: jest.Mock;
    status: string;
    stop: jest.Mock;
    regenerate: jest.Mock;
};

const chatState: ChatState = {
    messages: [],
    sendMessage: jest.fn(),
    addToolOutput: jest.fn(),
    status: "ready",
    stop: jest.fn(),
    regenerate: jest.fn(),
};

const refresh = jest.fn();
let useChatOptions: { sendAutomaticallyWhen?: (input: { messages: unknown[] }) => boolean } | undefined;

function renderPanel() {
    return render(<ReelBotPanel />);
}

describe("ReelBotPanel", () => {
    beforeEach(() => {
        chatState.messages = [];
        chatState.status = "ready";
        chatState.sendMessage.mockReset();
        chatState.addToolOutput.mockReset();
        chatState.stop.mockReset();
        chatState.regenerate.mockReset();
        refresh.mockReset();
        useChatOptions = undefined;
        (useChat as jest.Mock).mockImplementation((options) => {
            useChatOptions = options;
            return chatState;
        });
        (useRouter as jest.Mock).mockReturnValue({ refresh });
        global.fetch = jest.fn();
    });

    it("shows the empty conversation prompt and enables Send when ready", () => {
        renderPanel();

        expect(screen.getByText(/Try:.*What is playing tonight\?/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
    });

    it("does not send whitespace-only input", () => {
        renderPanel();
        const input = screen.getByPlaceholderText("Ask ReelBot...");

        fireEvent.change(input, { target: { value: "   " } });
        fireEvent.submit(input.closest("form")!);

        expect(chatState.sendMessage).not.toHaveBeenCalled();
    });

    it("sends trimmed-valid input and clears the field", () => {
        renderPanel();
        const input = screen.getByPlaceholderText("Ask ReelBot...");

        fireEvent.change(input, { target: { value: "  What is playing?  " } });
        fireEvent.submit(input.closest("form")!);

        expect(chatState.sendMessage).toHaveBeenCalledWith({ text: "  What is playing?  " });
        expect(input).toHaveValue("");
    });

    it("does not send a second message while a response is pending", () => {
        const { rerender } = renderPanel();
        const input = screen.getByPlaceholderText("Ask ReelBot...");

        fireEvent.change(input, { target: { value: "What is playing?" } });
        fireEvent.submit(input.closest("form")!);

        chatState.status = "submitted";
        rerender(<ReelBotPanel />);

        const sendButton = screen.getByRole("button", { name: "Send" });
        expect(sendButton).toBeDisabled();
        fireEvent.click(sendButton);

        expect(chatState.sendMessage).toHaveBeenCalledTimes(1);
    });

    it.each([
        ["submitted", "ReelBot is thinking..."],
        ["streaming", "ReelBot is typing..."],
    ])("shows the appropriate progress message for %s status", (status, message) => {
        chatState.status = status;
        renderPanel();

        expect(screen.getByText(message)).toBeInTheDocument();
    });

    it("allows aborting a streaming response", () => {
        chatState.status = "streaming";
        renderPanel();

        fireEvent.click(screen.getByRole("button", { name: "Abort" }));

        expect(chatState.stop).toHaveBeenCalledTimes(1);
    });

    it("shows the error fallback and retries the response", () => {
        chatState.status = "error";
        renderPanel();

        expect(screen.getByRole("alert")).toHaveTextContent(
            "ReelBot stopped mid-answer. Nothing was changed.",
        );
        fireEvent.click(screen.getByRole("button", { name: "Retry" }));

        expect(chatState.regenerate).toHaveBeenCalledTimes(1);
    });

    it("refreshes once for a successful booking in the latest message", async () => {
        chatState.messages = [{
            id: "message-1",
            role: "assistant",
            parts: [{
                type: "tool-bookShowTime",
                state: "output-available",
                toolCallId: "booking-tool-1",
                output: { ok: true, message: "Booked" },
            }],
        }];

        const { rerender } = renderPanel();
        rerender(<ReelBotPanel />);
        rerender(<ReelBotPanel />);

        await waitFor(() => {
            expect(refresh).toHaveBeenCalledTimes(1);
        });
    });

    it("does not refresh for an unsuccessful booking output", () => {
        chatState.messages = [{
            id: "message-1",
            role: "assistant",
            parts: [{
                type: "tool-bookShowTime",
                state: "output-available",
                toolCallId: "booking-tool-1",
                output: { ok: false, message: "Could not book" },
            }],
        }];

        renderPanel();

        expect(refresh).not.toHaveBeenCalled();
    });

    it("approves cancellation, reports the output, and refreshes on success", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            json: jest.fn().mockResolvedValue({ ok: true, message: "Cancelled" }),
        });
        chatState.messages = [{
            id: "message-1",
            role: "assistant",
            parts: [{
                type: "tool-cancelBooking",
                state: "input-available",
                toolCallId: "cancel-tool-1",
                input: { bookingId: "booking-123" },
            }],
        }];

        renderPanel();
        fireEvent.click(screen.getByRole("button", { name: "Approve" }));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith("/api/bookings/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookingId: "booking-123" }),
            });
            expect(chatState.addToolOutput).toHaveBeenCalledWith({
                tool: "cancelBooking",
                toolCallId: "cancel-tool-1",
                output: { ok: true, message: "Cancelled" },
            });
            expect(refresh).toHaveBeenCalledTimes(1);
        });
    });

    it("rejects cancellation without fetching or refreshing", () => {
        chatState.messages = [{
            id: "message-1",
            role: "assistant",
            parts: [{
                type: "tool-cancelBooking",
                state: "input-available",
                toolCallId: "cancel-tool-1",
                input: { bookingId: "booking-123" },
            }],
        }];

        renderPanel();
        fireEvent.click(screen.getByRole("button", { name: "Reject" }));

        expect(global.fetch).not.toHaveBeenCalled();
        expect(chatState.addToolOutput).toHaveBeenCalledWith({
            tool: "cancelBooking",
            toolCallId: "cancel-tool-1",
            output: { skipped: true, message: "The customer declined. The booking is unchanged." },
        });
        expect(refresh).not.toHaveBeenCalled();
    });

    it("when cancellation api returns failure, router refresh is not called", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            json: jest.fn().mockResolvedValue({ ok: false, message: "The booking was already cancelled" }),
        });
        chatState.messages = [{
            id: "message-1",
            role: "assistant",
            parts: [{
                type: "tool-cancelBooking",
                state: "input-available",
                toolCallId: "cancel-tool-1",
                input: { bookingId: "booking-123" },
            }],
        }];

        renderPanel();
        fireEvent.click(screen.getByRole("button", { name: "Approve" }));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith("/api/bookings/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookingId: "booking-123" }),
            });
            expect(chatState.addToolOutput).toHaveBeenCalledWith({
                tool: "cancelBooking",
                toolCallId: "cancel-tool-1",
                output: { ok: false, message: "The booking was already cancelled" },
            });
            expect(refresh).not.toHaveBeenCalled();
        });


    });

    it("when cancellation api fails due to network error, router refresh is not called", async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));
        chatState.messages = [{
            id: "message-1",
            role: "assistant",
            parts: [{
                type: "tool-cancelBooking",
                state: "input-available",
                toolCallId: "cancel-tool-1",
                input: { bookingId: "booking-123" },
            }],
        }];

        renderPanel();
        fireEvent.click(screen.getByRole("button", { name: "Approve" }));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith("/api/bookings/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookingId: "booking-123" }),
            });
            expect(chatState.addToolOutput).toHaveBeenCalledWith({
                tool: "cancelBooking",
                toolCallId: "cancel-tool-1",
                output: { ok: false, message: "The cancellation request did not go through." },
            });
            expect(refresh).not.toHaveBeenCalled();
        });
    });

    it("when cancellation response JSON parsing fails, adds fallback output without refreshing", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
        });
        chatState.messages = [{
            id: "message-1",
            role: "assistant",
            parts: [{
                type: "tool-cancelBooking",
                state: "input-available",
                toolCallId: "cancel-tool-1",
                input: { bookingId: "booking-123" },
            }],
        }];

        renderPanel();
        fireEvent.click(screen.getByRole("button", { name: "Approve" }));

        await waitFor(() => {
            expect(chatState.addToolOutput).toHaveBeenCalledWith({
                tool: "cancelBooking",
                toolCallId: "cancel-tool-1",
                output: { ok: false, message: "The cancellation request did not go through." },
            });
            expect(refresh).not.toHaveBeenCalled();
        });
    });

    it("does not add cancellation output twice when Approve is clicked twice while pending", async () => {
        let resolveFetch: (response: { json: () => Promise<{ ok: boolean; message: string }> }) => void;
        (global.fetch as jest.Mock).mockImplementation(
            () => new Promise((resolve) => {
                resolveFetch = resolve;
            }),
        );
        chatState.messages = [{
            id: "message-1",
            role: "assistant",
            parts: [{
                type: "tool-cancelBooking",
                state: "input-available",
                toolCallId: "cancel-tool-1",
                input: { bookingId: "booking-123" },
            }],
        }];

        renderPanel();
        fireEvent.click(screen.getByRole("button", { name: "Approve" }));
        fireEvent.click(screen.getByRole("button", { name: "Approve" }));

        expect(global.fetch).toHaveBeenCalledTimes(1);

        resolveFetch!({
            json: jest.fn().mockResolvedValue({ ok: true, message: "Cancelled" }),
        });

        await waitFor(() => {
            expect(chatState.addToolOutput).toHaveBeenCalledTimes(1);
        });
    });

    it("does not add cancellation output twice when Approve is clicked after the request completes", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            json: jest.fn().mockResolvedValue({ ok: true, message: "Cancelled" }),
        });
        chatState.messages = [{
            id: "message-1",
            role: "assistant",
            parts: [{
                type: "tool-cancelBooking",
                state: "input-available",
                toolCallId: "cancel-tool-1",
                input: { bookingId: "booking-123" },
            }],
        }];

        renderPanel();
        fireEvent.click(screen.getByRole("button", { name: "Approve" }));

        // Wait for completion of the first approval request and till addOutput is called successfully after the completion of first request.
        await waitFor(() => {
            expect(chatState.addToolOutput).toHaveBeenCalledTimes(1);
        });

        // Attempt to approve again after the first request has completed.
        fireEvent.click(screen.getByRole("button", { name: "Approve" }));

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(chatState.addToolOutput).toHaveBeenCalledTimes(1);
    });

    it("adds cancellation output twice when Approve is clicked after the 1st request errors out", async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));
        chatState.messages = [{
            id: "message-1",
            role: "assistant",
            parts: [{
                type: "tool-cancelBooking",
                state: "input-available",
                toolCallId: "cancel-tool-1",
                input: { bookingId: "booking-123" },
            }],
        }];

        renderPanel();
        fireEvent.click(screen.getByRole("button", { name: "Approve" }));

        // Wait for completion of the first approval request and till addOutput is called successfully after the completion of first request.
        await waitFor(() => {
            expect(chatState.addToolOutput).toHaveBeenCalledWith({
                tool: "cancelBooking",
                toolCallId: "cancel-tool-1",
                output: { ok: false, message: "The cancellation request did not go through." },
            });
        });
        // Attempt to approve again after the first request has failed.
        fireEvent.click(screen.getByRole("button", { name: "Approve" }));
        expect(global.fetch).toHaveBeenCalledTimes(2);

        await waitFor(() => {
            expect(chatState.addToolOutput).toHaveBeenCalledWith({
                tool: "cancelBooking",
                toolCallId: "cancel-tool-1",
                output: {
                    ok: false,
                    message: "The cancellation request did not go through.",
                },
            });
            expect(chatState.addToolOutput).toHaveBeenCalledTimes(2);
        });

    });

    it("does not add cancellation output twice when Reject is clicked twice", () => {
        chatState.messages = [{
            id: "message-1",
            role: "assistant",
            parts: [{
                type: "tool-cancelBooking",
                state: "input-available",
                toolCallId: "cancel-tool-1",
                input: { bookingId: "booking-123" },
            }],
        }];

        renderPanel();
        fireEvent.click(screen.getByRole("button", { name: "Reject" }));
        fireEvent.click(screen.getByRole("button", { name: "Reject" }));

        expect(chatState.addToolOutput).toHaveBeenCalledTimes(1);
    });

    it("automaticallyWhen submits a new completed cancellation only once", () => {
        renderPanel();

        const cancellationMessage = {
            id: "message-1",
            role: "assistant",
            parts: [{
                type: "tool-cancelBooking",
                state: "output-available",
                toolCallId: "cancel-tool-1",
                output: { skipped: true },
            }],
        };

        expect(useChatOptions!.sendAutomaticallyWhen!({ messages: [cancellationMessage] })).toBe(true);
        expect(useChatOptions!.sendAutomaticallyWhen!({ messages: [cancellationMessage] })).toBe(false);
        expect(useChatOptions!.sendAutomaticallyWhen!({ messages: [] })).toBe(false);
    });

    it("does not refresh for a successful booking in an older message", () => {
        chatState.messages = [
            {
                id: "message-1",
                role: "assistant",
                parts: [{
                    type: "tool-bookShowTime",
                    state: "output-available",
                    toolCallId: "booking-tool-1",
                    output: { ok: true, message: "Booked" },
                }],
            },
            {
                id: "message-2",
                role: "assistant",
                parts: [{ type: "text", text: "What would you like to do next?" }],
            },
        ];

        renderPanel();

        expect(refresh).not.toHaveBeenCalled();
    });

    it("when status is streaming aria-busy should be set to true and aria-live should be polite irrespective of other conditions", () => {
        chatState.status = "streaming";

        renderPanel();
        expect(screen.getByRole("log")).toHaveAttribute("aria-busy", "true");
        expect(screen.getByRole("log")).toHaveAttribute("aria-live", "polite");


    });

    it("when status is ready aria-busy should be set to false and aria-live should be polite irrespective of other conditions", () => {
        chatState.status = "ready";
        renderPanel();
        expect(screen.getByRole("log")).toHaveAttribute("aria-busy", "false");
        expect(screen.getByRole("log")).toHaveAttribute("aria-live", "polite");
    });

    it("the router is refreshed for last sucessful booking even when message has multiple parts", () => {
        chatState.messages = [
            {
                id: "message-1",
                role: "assistant",
                parts: [{
                    type: "text",
                    text: "What is playing tonight?",
                }, {
                    type: "tool-bookShowTime",
                    state: "output-available",
                    toolCallId: "booking-tool-1",
                    output: { ok: true, message: "Booked" },
                }],
            }
        ];

        renderPanel();

        expect(refresh).toHaveBeenCalledTimes(1);
    });

    it("automaticallyWhen returns false when the latest message is not related to cancellation", () => {
        renderPanel();

        const messages = [{
            id: "message-1",
            role: "assistant",
            parts: [{
                type: "tool-cancelBooking",
                state: "output-available",
                toolCallId: "cancel-tool-1",
                output: { skipped: true },
            }],
        }, {
            id: "message-2",
            role: "assistant",
            parts: [{ type: "text", text: "What would you like to do next?" }],
        }];

        expect(useChatOptions!.sendAutomaticallyWhen!({ messages: messages })).toBe(false);
    });
});
