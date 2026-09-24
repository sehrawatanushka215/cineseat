import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { bookSeat } from "@/app/actions/book-seat";

jest.mock("@/auth", () => ({
    auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
    prisma: {
        seat: {
            findUnique: jest.fn(),
        },
        $transaction: jest.fn(),
    },
}));

jest.mock("next/cache", () => ({
    revalidatePath: jest.fn(),
}));

const findUniqueMock = prisma.seat.findUnique as jest.Mock;
const transactionMock = prisma.$transaction as jest.Mock;
const revalidatePathMock = revalidatePath as jest.Mock;

const seat = {
    id: "seat-a1",
    row: "A",
    number: 1,
    status: "available",
    showtimeId: "showtime-1",
};

const transactionClient = {
    seat: {
        updateMany: jest.fn(),
    },
    booking: {
        create: jest.fn(),
    },
};

describe("bookSeat", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (auth as jest.Mock).mockResolvedValue({ user: { email: "customer@example.com" } });
        transactionMock.mockImplementation(async (callback) => callback(transactionClient));
        transactionClient.seat.updateMany.mockResolvedValue({ count: 1 });
        transactionClient.booking.create.mockResolvedValue({});
    });

    it("requires an authenticated user before querying for the seat", async () => {
        (auth as jest.Mock).mockResolvedValueOnce(null);

        await expect(bookSeat("seat-a1")).resolves.toEqual({
            ok: false,
            message: "Sign in before booking a seat.",
        });

        expect(findUniqueMock).not.toHaveBeenCalled();
    });

    it("calls auth before looking up the seat", async () => {
        findUniqueMock.mockResolvedValue(null);

        await bookSeat("seat-a1");

        expect((auth as jest.Mock).mock.invocationCallOrder[0]!).toBeLessThan(
            findUniqueMock.mock.invocationCallOrder[0]!,
        );
    });

    it("returns an error when the seat does not exist", async () => {
        findUniqueMock.mockResolvedValue(null);

        await expect(bookSeat("missing-seat")).resolves.toEqual({
            ok: false,
            message: "That seat no longer exists.",
        });

        expect(transactionMock).not.toHaveBeenCalled();
    });

    it("rethrows a findUnique database error without starting a transaction or revalidating", async () => {
        const error = new Error("Database unavailable");
        findUniqueMock.mockRejectedValue(error);

        await expect(bookSeat("seat-a1")).rejects.toBe(error);

        expect(transactionMock).not.toHaveBeenCalled();
        expect(revalidatePathMock).not.toHaveBeenCalled();
    });

    it("rethrows an updateMany database error without creating a booking or revalidating", async () => {
        const error = new Error("Database unavailable");
        findUniqueMock.mockResolvedValue(seat);

        transactionClient.seat.updateMany.mockRejectedValue(error);

        await expect(bookSeat("seat-a1")).rejects.toBe(error);

        expect(transactionMock).toHaveBeenCalled();
        expect(transactionClient.booking.create).not.toHaveBeenCalled();
        expect(revalidatePathMock).not.toHaveBeenCalled();
    });

    it("rethrows a booking creation database error without revalidating", async () => {
        const error = new Error("Database unavailable");
        findUniqueMock.mockResolvedValue(seat);

        transactionClient.booking.create.mockRejectedValue(error);

        await expect(bookSeat("seat-a1")).rejects.toBe(error);

        expect(transactionMock).toHaveBeenCalled();
        expect(revalidatePathMock).not.toHaveBeenCalled();
    });

    it("returns an error when the seat is already booked", async () => {
        findUniqueMock.mockResolvedValue({ ...seat, status: "booked" });

        await expect(bookSeat(seat.id)).resolves.toEqual({
            ok: false,
            message: "Row A, seat 1 was taken a moment ago. Pick another one.",
        });

        expect(transactionMock).not.toHaveBeenCalled();
    });

    it("books an available seat and revalidates its showtime path", async () => {
        findUniqueMock.mockResolvedValue(seat);

        await expect(bookSeat(seat.id)).resolves.toEqual({
            ok: true,
            message: "Booked row A, seat 1. Enjoy the film.",
        });

        expect(transactionClient.seat.updateMany).toHaveBeenCalledWith({
            where: { id: seat.id, status: "available" },
            data: { status: "booked" },
        });
        expect(transactionClient.booking.create).toHaveBeenCalledWith({
            data: {
                seatId: seat.id,
                showtimeId: seat.showtimeId,
                userEmail: "customer@example.com",
            },
        });
        expect(revalidatePathMock).toHaveBeenCalledWith("/showtimes/showtime-1");
    });

    it("returns a taken message when the conditional seat update affects no rows", async () => {
        findUniqueMock.mockResolvedValue(seat);
        transactionClient.seat.updateMany.mockResolvedValue({ count: 0 });

        await expect(bookSeat(seat.id)).resolves.toEqual({
            ok: false,
            message: "Row A, seat 1 was taken a moment ago. Pick another one.",
        });

        expect(transactionClient.booking.create).not.toHaveBeenCalled();
        expect(revalidatePathMock).not.toHaveBeenCalled();
    });

    it("translates a P2002 transaction error into a taken message", async () => {
        findUniqueMock.mockResolvedValue(seat);
        transactionMock.mockRejectedValue(
            new PrismaClientKnownRequestError("Unique constraint failed", {
                code: "P2002",
                clientVersion: "test",
            }),
        );

        await expect(bookSeat(seat.id)).resolves.toEqual({
            ok: false,
            message: "Row A, seat 1 was taken a moment ago. Pick another one.",
        });

        expect(revalidatePathMock).not.toHaveBeenCalled();
    });

    it("rethrows unexpected transaction errors", async () => {
        findUniqueMock.mockResolvedValue(seat);
        const error = new Error("Database unavailable");
        transactionMock.mockRejectedValue(error);

        await expect(bookSeat(seat.id)).rejects.toBe(error);
        expect(revalidatePathMock).not.toHaveBeenCalled();
    });

    it("when session exist but email is missing, sign in is required", async () => {
        (auth as jest.Mock).mockResolvedValueOnce({ user: {} });

        await expect(bookSeat("seat-a1")).resolves.toEqual({
            ok: false,
            message: "Sign in before booking a seat.",
        });

        expect(findUniqueMock).not.toHaveBeenCalled();
    });
});
