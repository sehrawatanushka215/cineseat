import { prisma } from "@/lib/prisma";
import { searchShowtimes } from "@/lib/tools/search-showtimes";

jest.mock("@/lib/prisma", () => ({
    prisma: {
        showtime: {
            findMany: jest.fn(),
        },
    },
}));

const findManyMock = prisma.showtime.findMany as jest.Mock;
const executeSearch = searchShowtimes.execute as NonNullable<typeof searchShowtimes.execute>;

describe("searchShowtimes", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("searches by film and returns serializable showtime summaries", async () => {
        const time = new Date("2026-09-24T19:30:00.000Z");
        findManyMock.mockResolvedValue([
            {
                film: "Arrival",
                screen: "Screen 1",
                time,
                seats: [{ id: "seat-1" }, { id: "seat-2" }],
            },
        ]);

        await expect(executeSearch({ film: "Arr" }, {} as never)).resolves.toEqual([
            {
                film: "Arrival",
                screen: "Screen 1",
                time: "2026-09-24T19:30:00.000Z",
                seatsAvailable: 2,
            },
        ]);

        expect(findManyMock).toHaveBeenCalledWith({
            where: { film: { contains: "Arr" } },
            include: { seats: { where: { status: "available" }, select: { id: true } } },
            orderBy: { time: "asc" },
            take: 10,
        });
    });

    it("lists all showtimes when film is omitted", async () => {
        findManyMock.mockResolvedValue([
            {
                film: "Arrival",
                screen: "Screen 1",
                time: new Date("2026-09-24T19:30:00.000Z"),
                seats: [{ id: "seat-1" }, { id: "seat-2" }],
            },
        ]);

        await expect(executeSearch({}, {} as never)).resolves.toEqual([
            {
                film: "Arrival",
                screen: "Screen 1",
                time: "2026-09-24T19:30:00.000Z",
                seatsAvailable: 2,
            },
        ]); //The second parameter is the AI SDK tool execution context, not another film value.

        expect(findManyMock).toHaveBeenCalledWith({
            where: {},
            include: { seats: { where: { status: "available" }, select: { id: true } } },
            orderBy: { time: "asc" },
            take: 10,
        });
    });

    it("returns no available seats when the database returns no available seat rows", async () => {
        findManyMock.mockResolvedValue([
            {
                film: "Arrival",
                screen: "Screen 1",
                time: new Date("2026-09-24T19:30:00.000Z"),
                seats: [],
            },
        ]);

        await expect(executeSearch({ film: "Arrival" }, {} as never)).resolves.toEqual([
            {
                film: "Arrival",
                screen: "Screen 1",
                time: "2026-09-24T19:30:00.000Z",
                seatsAvailable: 0,
            },
        ]);
    });

    it("returns empty array when no showtimes are available", async () => {
        findManyMock.mockResolvedValue([]);

        await expect(executeSearch({ film: "Arrival" }, {} as never)).resolves.toEqual([]);
    });

    it("propagates database errors", async () => {
        const error = new Error("Database unavailable");
        findManyMock.mockRejectedValue(error);

        await expect(executeSearch({}, {} as never)).rejects.toBe(error);
    });
});
