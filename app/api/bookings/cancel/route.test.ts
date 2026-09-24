import { auth } from "@/auth";
import { cancelBookingForUser } from "@/lib/bookings";
import { POST } from "@/app/api/bookings/cancel/route";

jest.mock("@/auth", () => ({
    auth: jest.fn(),
}));

jest.mock("@/lib/bookings", () => ({
    cancelBookingForUser: jest.fn(),
}));

const authMock = auth as jest.Mock;
const cancelBookingForUserMock = cancelBookingForUser as jest.Mock;

function requestWithBody(body: unknown): Request {
    return {
        json: jest.fn().mockResolvedValue(body),
    } as unknown as Request;
}

function requestWithInvalidJson(): Request {
    return {
        json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
    } as unknown as Request;
}

describe("POST /api/bookings/cancel", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        authMock.mockResolvedValue({ user: { email: "customer@example.com" } });
    });

    it("returns 401 and does not cancel when the user is unauthenticated", async () => {
        authMock.mockResolvedValueOnce(null);

        const response = await POST(requestWithBody({ bookingId: "booking-123" }));

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({
            ok: false,
            message: "Sign in first.",
        });
        expect(cancelBookingForUserMock).not.toHaveBeenCalled();
    });

    it("returns 401 when the session has no email", async () => {
        authMock.mockResolvedValueOnce({ user: {} });

        const response = await POST(requestWithBody({ bookingId: "booking-123" }));

        expect(response.status).toBe(401);
        expect(cancelBookingForUserMock).not.toHaveBeenCalled();
    });

    it.each([
        ["invalid JSON", requestWithInvalidJson()],
        ["missing bookingId", requestWithBody({})],
        ["empty bookingId", requestWithBody({ bookingId: "" })],
        ["non-string bookingId", requestWithBody({ bookingId: 123 })],
    ])("returns 400 for %s", async (_description, request) => {
        const response = await POST(request);

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            ok: false,
            message: "A bookingId is required.",
        });
        expect(cancelBookingForUserMock).not.toHaveBeenCalled();
    });

    it("delegates a valid request with the booking ID and authenticated email", async () => {
        cancelBookingForUserMock.mockResolvedValue({
            ok: true,
            message: "Cancelled row A, seat 1. The seat is free again.",
        });

        const response = await POST(requestWithBody({ bookingId: "booking-123" }));

        expect(response.status).toBe(200);
        expect(cancelBookingForUserMock).toHaveBeenCalledWith(
            "booking-123",
            "customer@example.com",
        );
        await expect(response.json()).resolves.toEqual({
            ok: true,
            message: "Cancelled row A, seat 1. The seat is free again.",
        });
    });

    it("forwards a failed cancellation result from the booking service", async () => {
        cancelBookingForUserMock.mockResolvedValue({
            ok: false,
            message: "That booking was already cancelled.",
        });

        const response = await POST(requestWithBody({ bookingId: "booking-123" }));

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            ok: false,
            message: "That booking was already cancelled.",
        });
    });

    it("returns 500 if the booking service throws an error", async () => {
        cancelBookingForUserMock.mockRejectedValue(new Error("Service error"));

        const response = await POST(requestWithBody({ bookingId: "booking-123" }));

        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toEqual({
            ok: false,
            message: "Failed to cancel booking.",
        });
    });
});
