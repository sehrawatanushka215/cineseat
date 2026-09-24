import { POST } from "@/app/api/reelbot/route";
import { offlineStreamResponse } from "@/lib/ai/offline-stream";
import {
    convertToModelMessages,
    createUIMessageStreamResponse,
    stepCountIs,
    streamText,
} from "ai";

jest.mock("ai", () => ({
    convertToModelMessages: jest.fn(),
    createUIMessageStreamResponse: jest.fn(),
    stepCountIs: jest.fn(),
    streamText: jest.fn(),
}));

jest.mock("@/lib/ai/offline-stream", () => ({
    ERROR_NOTICE: "error notice",
    OFFLINE_NOTICE: "offline notice",
    offlineStreamResponse: jest.fn(),
}));

jest.mock("@/lib/tools/cancel-booking", () => ({
    cancelBookingTool: {},
}));

jest.mock("@/lib/tools/search-showtimes", () => ({
    searchShowtimes: {},
}));

jest.mock("@/lib/tools/book-showtime", () => ({
    bookShowTime: {},
}));

const streamTextMock = streamText as jest.Mock;
const offlineStreamResponseMock = offlineStreamResponse as jest.Mock;
const convertToModelMessagesMock = convertToModelMessages as jest.Mock;
const createUIMessageStreamResponseMock = createUIMessageStreamResponse as jest.Mock;
const stepCountIsMock = stepCountIs as jest.Mock;

function requestWithMessages(messages: unknown[] = []): Request {
    return {
        json: jest.fn().mockResolvedValue({ messages }),
    } as unknown as Request;
}

describe("POST /api/reelbot", () => {
    const originalGroqApiKey = process.env.GROQ_API_KEY;

    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.GROQ_API_KEY;
        offlineStreamResponseMock.mockReturnValue("offline response");
    });

    afterAll(() => {
        if (originalGroqApiKey === undefined) {
            delete process.env.GROQ_API_KEY;
        } else {
            process.env.GROQ_API_KEY = originalGroqApiKey;
        }
    });

    it("returns the offline response when GROQ_API_KEY is missing", async () => {
        const response = await POST(requestWithMessages());

        expect(response).toBe("offline response");
        expect(offlineStreamResponseMock).toHaveBeenCalledWith(expect.stringContaining("offline notice"));
        expect(streamTextMock).not.toHaveBeenCalled();
    });

    it("propagates an error when the request body cannot be parsed", async () => {
        const error = new Error("Invalid request body");
        const request = {
            json: jest.fn().mockRejectedValue(error),
        } as unknown as Request;

        await expect(POST(request)).rejects.toBe(error);
        expect(streamTextMock).not.toHaveBeenCalled();
        expect(offlineStreamResponseMock).not.toHaveBeenCalled();
    });

    it("returns the offline error response when streamText throws", async () => {
        process.env.GROQ_API_KEY = "test-key";
        streamTextMock.mockImplementation(() => {
            throw new Error("Groq unavailable");
        });
        offlineStreamResponseMock.mockReturnValue("error response");

        const response = await POST(requestWithMessages());

        expect(response).toBe("error response");
        expect(offlineStreamResponseMock).toHaveBeenCalledWith(expect.stringContaining("error notice"));
    });

    it("uses streamText and returns its UI stream response when GROQ_API_KEY exists", async () => {
        process.env.GROQ_API_KEY = "test-key";
        const modelMessages = [{ role: "user", content: "Hello" }];
        const uiStreamResponse = "ui stream response";
        const uiStream = { toUIMessageStream: jest.fn().mockReturnValue("ui stream") };

        convertToModelMessagesMock.mockReturnValue(modelMessages);
        stepCountIsMock.mockReturnValue("step-count-condition");
        streamTextMock.mockReturnValue({ toUIMessageStream: uiStream.toUIMessageStream });
        createUIMessageStreamResponseMock.mockReturnValue(uiStreamResponse);

        const response = await POST(requestWithMessages([{ type: "text", text: "Hello" }]));

        expect(streamTextMock).toHaveBeenCalledWith(expect.objectContaining({
            system: expect.stringContaining("You are ReelBot"),
            messages: modelMessages,
            tools: expect.objectContaining({
                searchShowtimes: {},
                cancelBooking: {},
                bookShowTime: {},
            }),
            stopWhen: "step-count-condition",
        }));
        expect(uiStream.toUIMessageStream).toHaveBeenCalledWith({ onError: expect.any(Function) });
        expect(createUIMessageStreamResponseMock).toHaveBeenCalledWith({ stream: "ui stream" });
        expect(response).toBe(uiStreamResponse);
    });

    it("returns ERROR_NOTICE from the UI stream on provider errors", async () => {
        process.env.GROQ_API_KEY = "test-key";
        const modelMessages = [{ role: "user", content: "Hello" }];
        const uiStreamResponse = "ui stream response";
        let onError: ((error: unknown) => string) | undefined;
        const uiStream = {
            toUIMessageStream: jest.fn((options) => {
                onError = options.onError;
                return "ui stream";
            }),
        };

        convertToModelMessagesMock.mockReturnValue(modelMessages);
        stepCountIsMock.mockReturnValue("step-count-condition");
        streamTextMock.mockReturnValue({ toUIMessageStream: uiStream.toUIMessageStream });
        createUIMessageStreamResponseMock.mockReturnValue(uiStreamResponse);

        const response = await POST(requestWithMessages([{ type: "text", text: "Hello" }]));

        expect(streamTextMock).toHaveBeenCalledWith(expect.objectContaining({
            system: expect.stringContaining("You are ReelBot"),
            messages: modelMessages,
            tools: expect.objectContaining({
                searchShowtimes: {},
                cancelBooking: {},
                bookShowTime: {},
            }),
            stopWhen: "step-count-condition",
        }));
        expect(uiStream.toUIMessageStream).toHaveBeenCalledWith({ onError: expect.any(Function) });
        expect(onError).toBeDefined();
        expect(onError!(new Error("Test error"))).toBe("error notice");
        expect(createUIMessageStreamResponseMock).toHaveBeenCalledWith({ stream: "ui stream" });
        expect(response).toBe(uiStreamResponse);
    });
});
