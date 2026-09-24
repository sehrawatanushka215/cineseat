import { render, screen } from "@testing-library/react";
import ShowtimePage from "@/app/showtimes/[id]/page";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { notFound } from "next/navigation";

jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ href, children, ...props }: any) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

jest.mock("next/navigation", () => ({
    notFound: jest.fn(() => {
        throw new Error("NEXT_NOT_FOUND");
    }),
}));

jest.mock("@/auth", () => ({
    auth: jest.fn(),
}));

jest.mock("@/app/actions/book-seat", () => ({
    bookSeat: jest.fn(),
}));

jest.mock("@/lib/seat-status", () => ({
    toSeatStatus: jest.fn(),
}));

jest.mock("@/app/components/auth-buttons", () => ({
    AuthButtons: () => <div>Auth area</div>,
}));

jest.mock("@/app/components/my-bookings", () => ({
    MyBookings: () => <div>My bookings</div>,
}));

jest.mock("@/app/components/seat-map", () => ({
    SeatMap: ({ seats, onBook }: { seats: Array<{ id: string; row: string; number: number }>; onBook?: unknown }) => (
        <div data-testid="seat-map" />
    ),
}));

jest.mock("@/lib/prisma", () => ({
    prisma: {
        showtime: {
            findUnique: jest.fn(),
        },
    },
}));

describe("Showtime detail page", () => {
    const mockedNotFound = jest.mocked(notFound);
    beforeEach(() => {
        jest.clearAllMocks();
        (mockedNotFound as jest.Mock).mockImplementation(() => {
            throw new Error("NEXT_NOT_FOUND");
        });
        (auth as jest.Mock).mockReset();
    });

    it("calls notFound when the showtime does not exist", async () => {
        (prisma.showtime.findUnique as jest.Mock).mockResolvedValueOnce(null);
        (auth as jest.Mock).mockResolvedValueOnce(null);

        await expect(ShowtimePage({ params: Promise.resolve({ id: "missing" }) })).rejects.toThrow("NEXT_NOT_FOUND");

        expect(mockedNotFound).toHaveBeenCalledTimes(1);
    });

    it("renders the showtime details, sign-in notice, and passes seat data to SeatMap for guest users", async () => {
        (prisma.showtime.findUnique as jest.Mock).mockResolvedValueOnce({
            id: "show-1",
            film: "Dune",
            screen: 7,
            seats: [
                { id: "seat-1", row: "A", number: 1, status: "available" },
                { id: "seat-2", row: "A", number: 2, status: "booked" },
            ],
        });
        (auth as jest.Mock).mockResolvedValueOnce(null);

        const result = await ShowtimePage({ params: Promise.resolve({ id: "show-1" }) });
        render(result);
        expect(screen.getByText("Sign in to book a seat. Browsing works either way.")).toBeInTheDocument();
    });

    it("hides the sign-in notice when a signed-in user is present", async () => {
        (prisma.showtime.findUnique as jest.Mock).mockResolvedValueOnce({
            id: "show-2",
            film: "Arrival",
            screen: 2,
            seats: [{ id: "seat-3", row: "B", number: 5, status: "available" }],
        });
        (auth as jest.Mock).mockResolvedValueOnce({ user: { email: "viewer@example.com" } });

        const result = await ShowtimePage({ params: Promise.resolve({ id: "show-2" }) });
        render(result);

        expect(screen.queryByText(/Sign in to book a seat/i)).not.toBeInTheDocument();
    });
});
