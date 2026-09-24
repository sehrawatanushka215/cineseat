import { prisma } from "@/lib/prisma";
import { bookSeat } from "@/app/actions/book-seat";
import { bookShowTime } from "@/lib/tools/book-showtime";

jest.mock("@/lib/prisma", () => ({
    prisma: {
        seat: {
            findFirst: jest.fn(),
        },
    },
}));

jest.mock("@/app/actions/book-seat", () => ({
    bookSeat: jest.fn(),
}));

const findFirstMock = prisma.seat.findFirst as jest.Mock;
const bookSeatMock = bookSeat as jest.Mock;
const executeBookShowTime = bookShowTime.execute as NonNullable<typeof bookShowTime.execute>;

describe("bookShowTime", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("finds the requested available seat and delegates the booking", async () => {
        findFirstMock.mockResolvedValue({ id: "seat-a1" });
        bookSeatMock.mockResolvedValue({
            ok: true,
            message: "Booked row A, seat 1. Enjoy the film.",
        });

        await expect(
            executeBookShowTime({ film: "Arrival", seat: "A1" }, {} as never),
        ).resolves.toEqual({
            ok: true,
            message: "Booked row A, seat 1. Enjoy the film.",
        });

        expect(findFirstMock).toHaveBeenCalledWith({
            where: {
                row: "A",
                number: 1,
                status: "available",
                showtime: {
                    film: { contains: "Arrival", mode: "insensitive" },
                },
            },
            select: { id: true },
        });
        expect(bookSeatMock).toHaveBeenCalledWith("seat-a1");
    });

    it("returns an unavailable-seat result without calling bookSeat", async () => {
        findFirstMock.mockResolvedValue(null);

        await expect(
            executeBookShowTime({ film: "Arrival", seat: "A1" }, {} as never),
        ).resolves.toEqual({
            ok: false,
            error: "No available seats found for the specified film and seat.",
        });

        expect(bookSeatMock).not.toHaveBeenCalled();
    });

    it("converts a seat lookup error into a safe booking error", async () => {
        findFirstMock.mockRejectedValue(new Error("Database unavailable"));

        await expect(
            executeBookShowTime({ film: "Arrival", seat: "A1" }, {} as never),
        ).resolves.toEqual({
            ok: false,
            error: "An unexpected error occurred while booking the seat.",
        });

        expect(bookSeatMock).not.toHaveBeenCalled();
    });

    it("converts a booking action error into a safe booking error", async () => {
        findFirstMock.mockResolvedValue({ id: "seat-a1" });
        bookSeatMock.mockRejectedValue(new Error("Booking failed"));

        await expect(
            executeBookShowTime({ film: "Arrival", seat: "A1" }, {} as never),
        ).resolves.toEqual({
            ok: false,
            error: "An unexpected error occurred while booking the seat.",
        });
    });

    it("forwards a failed booking result from bookSeat", async () => {
        findFirstMock.mockResolvedValue({ id: "seat-a1" });
        bookSeatMock.mockResolvedValue({
            ok: false,
            message: "Row A, seat 1 was taken a moment ago. Pick another one.",
        });

        await expect(
            executeBookShowTime({ film: "Arrival", seat: "A1" }, {} as never),
        ).resolves.toEqual({
            ok: false,
            message: "Row A, seat 1 was taken a moment ago. Pick another one.",
        });

        expect(bookSeatMock).toHaveBeenCalledWith("seat-a1");
    });
});
