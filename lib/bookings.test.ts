import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { cancelBookingForUser, listBookingsForUser } from "@/lib/bookings";

jest.mock("@/lib/prisma", () => ({
    prisma: {
        booking: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
        $transaction: jest.fn(),
    },
}));

jest.mock("next/cache", () => ({
    revalidatePath: jest.fn(),
}));

const findUniqueMock = prisma.booking.findUnique as jest.Mock;
const findManyMock = prisma.booking.findMany as jest.Mock;
const transactionMock = prisma.$transaction as jest.Mock;
const revalidatePathMock = revalidatePath as jest.Mock;

const booking = {
    id: "booking-123",
    userEmail: "customer@example.com",
    seatId: "seat-a1",
    showtimeId: "showtime-1",
    seat: { row: "A", number: 1 },
};

const transactionClient = {
    booking: {
        deleteMany: jest.fn(),
    },
    seat: {
        update: jest.fn(),
    },
};

describe("bookings", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        transactionMock.mockImplementation(async (callback) => callback(transactionClient));
        transactionClient.booking.deleteMany.mockResolvedValue({ count: 1 });
        transactionClient.seat.update.mockResolvedValue({});
    });

    describe("cancelBookingForUser", () => {
        it("returns not found when the booking does not exist", async () => {
            findUniqueMock.mockResolvedValue(null);

            await expect(cancelBookingForUser("missing-booking", "customer@example.com")).resolves.toEqual({
                ok: false,
                message: "No booking found with id missing-booking.",
            });

            expect(transactionMock).not.toHaveBeenCalled();
            expect(revalidatePathMock).not.toHaveBeenCalled();
        });

        it("does not reveal a booking owned by another user", async () => {
            findUniqueMock.mockResolvedValue({ ...booking, userEmail: "other@example.com" });

            await expect(cancelBookingForUser(booking.id, "customer@example.com")).resolves.toEqual({
                ok: false,
                message: "No booking found with id booking-123.",
            });

            expect(transactionMock).not.toHaveBeenCalled();
        });

        it("cancels the booking, frees the seat, and revalidates the showtime", async () => {
            findUniqueMock.mockResolvedValue(booking);

            await expect(cancelBookingForUser(booking.id, "customer@example.com")).resolves.toEqual({
                ok: true,
                message: "Cancelled row A, seat 1. The seat is free again.",
            });

            expect(transactionClient.booking.deleteMany).toHaveBeenCalledWith({
                where: { id: booking.id, userEmail: "customer@example.com", status: "confirmed" },
            });
            expect(transactionClient.seat.update).toHaveBeenCalledWith({
                where: { id: booking.seatId },
                data: { status: "available" },
            });
            expect(revalidatePathMock).toHaveBeenCalledWith("/showtimes/showtime-1");
        });

        it("returns already-cancelled when no confirmed booking is deleted", async () => {
            findUniqueMock.mockResolvedValue(booking);
            transactionClient.booking.deleteMany.mockResolvedValue({ count: 0 });

            await expect(cancelBookingForUser(booking.id, "customer@example.com")).resolves.toEqual({
                ok: false,
                message: "That booking was already cancelled.",
            });

            expect(transactionClient.seat.update).not.toHaveBeenCalled();
            expect(revalidatePathMock).not.toHaveBeenCalled();
        });

        it("does not revalidate when the cancellation transaction fails", async () => {
            findUniqueMock.mockResolvedValue(booking);
            const error = new Error("Database unavailable");
            transactionMock.mockRejectedValue(error);

            await expect(cancelBookingForUser(booking.id, "customer@example.com")).rejects.toBe(error);
            expect(revalidatePathMock).not.toHaveBeenCalled();
        });

        it("returns error when find unique booking transaction fails", async () => {
            findUniqueMock.mockRejectedValue(new Error("Database unavailable"));

            await expect(cancelBookingForUser(booking.id, "customer@example.com")).rejects.toThrow("Database unavailable");
            expect(transactionMock).not.toHaveBeenCalled();
            expect(revalidatePathMock).not.toHaveBeenCalled();
        });

        it("propagates a seat update error and does not revalidate", async () => {
            findUniqueMock.mockResolvedValue(booking);
            const error = new Error("Seat update failed");
            transactionClient.seat.update.mockRejectedValue(error);

            await expect(
                cancelBookingForUser(booking.id, "customer@example.com"),
            ).rejects.toBe(error);

            expect(revalidatePathMock).not.toHaveBeenCalled();
        });
    });

    describe("listBookingsForUser", () => {
        it("queries confirmed bookings for the requested user and returns the result", async () => {
            const bookings = [booking];
            findManyMock.mockResolvedValue(bookings);

            await expect(listBookingsForUser("customer@example.com")).resolves.toBe(bookings);

            expect(findManyMock).toHaveBeenCalledWith({
                where: { userEmail: "customer@example.com", status: "confirmed" },
                include: { seat: true, showtime: true },
                orderBy: { createdAt: "desc" },
            });
        });

        it("returns an empty array when no confirmed bookings exist for the requested user", async () => {
            const bookings: typeof booking[] = [];
            findManyMock.mockResolvedValue(bookings);

            await expect(listBookingsForUser("customer@example.com")).resolves.toBe(bookings);

            expect(findManyMock).toHaveBeenCalledWith({
                where: { userEmail: "customer@example.com", status: "confirmed" },
                include: { seat: true, showtime: true },
                orderBy: { createdAt: "desc" },
            });
        });

        it("throws error when findMany fails due to database network error", async () => {
            findManyMock.mockRejectedValue(new Error("Database network error"));

            await expect(listBookingsForUser("customer@example.com")).rejects.toThrow("Database network error");

            expect(findManyMock).toHaveBeenCalledWith({
                where: { userEmail: "customer@example.com", status: "confirmed" },
                include: { seat: true, showtime: true },
                orderBy: { createdAt: "desc" },
            });
        });
    });
});
