import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import {
    ERROR_NOTICE,
    OFFLINE_NOTICE,
    offlineStreamResponse,
} from "@/lib/ai/offline-stream";

jest.mock("ai", () => ({
    createUIMessageStream: jest.fn(),
    createUIMessageStreamResponse: jest.fn(),
}));

const createUIMessageStreamMock = createUIMessageStream as jest.Mock;
const createUIMessageStreamResponseMock = createUIMessageStreamResponse as jest.Mock;

describe("offlineStreamResponse", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
        createUIMessageStreamMock.mockReturnValue("offline stream");
        createUIMessageStreamResponseMock.mockReturnValue("offline response");
    });

    afterEach(() => {
        jest.useRealTimers(); // If we dont restore real timers, other tests may be affected if we are using waitFor or any timer-based logic
    });

    it("exports the offline and error notices", () => {
        expect(OFFLINE_NOTICE).toContain("offline mode");
        expect(ERROR_NOTICE).toContain("could not reach Groq");
    });

    it("creates a streamed response containing the text protocol events", async () => {
        let execute: ({ writer }: { writer: { write: jest.Mock } }) => Promise<void>;
        const writer = { write: jest.fn() };

        createUIMessageStreamMock.mockImplementation(({ execute: streamExecute }) => {
            execute = streamExecute;
            return "offline stream";
        });

        const response = offlineStreamResponse("Hello world");

        expect(createUIMessageStreamMock).toHaveBeenCalledWith({ execute: expect.any(Function) });
        expect(createUIMessageStreamResponseMock).toHaveBeenCalledWith({ stream: "offline stream" });
        expect(response).toBe("offline response");

        const execution = execute!({ writer });
        await jest.advanceTimersByTimeAsync(50);
        await execution;

        expect(writer.write).toHaveBeenNthCalledWith(1, {
            type: "text-start",
            id: "offline-text",
        });
        expect(writer.write).toHaveBeenNthCalledWith(2, {
            type: "text-delta",
            id: "offline-text",
            delta: "Hello ",
        });
        expect(writer.write).toHaveBeenNthCalledWith(3, {
            type: "text-delta",
            id: "offline-text",
            delta: "world",
        });
        expect(writer.write).toHaveBeenNthCalledWith(4, {
            type: "text-end",
            id: "offline-text",
        });
    });

    it.each(["", "   "])("streams %p as a single text delta", async (text) => {
        let execute: ({ writer }: { writer: { write: jest.Mock } }) => Promise<void>;
        const writer = { write: jest.fn() };

        createUIMessageStreamMock.mockImplementation(({ execute: streamExecute }) => {
            execute = streamExecute;
            return "offline stream";
        });

        offlineStreamResponse(text);

        const execution = execute!({ writer });
        await jest.advanceTimersByTimeAsync(25);
        await execution;
        
        expect(createUIMessageStreamResponseMock).toHaveBeenCalledWith({ stream: "offline stream" });

        expect(writer.write).toHaveBeenNthCalledWith(1, {
            type: "text-start",
            id: "offline-text",
        });
        expect(writer.write).toHaveBeenNthCalledWith(2, {
            type: "text-delta",
            id: "offline-text",
            delta: text,
        });
        expect(writer.write).toHaveBeenNthCalledWith(3, {
            type: "text-end",
            id: "offline-text",
        });
    });
});
