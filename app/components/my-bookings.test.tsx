import { render, screen } from "@testing-library/react";
import { MyBookings } from "@/app/components/my-bookings";
import { auth } from "@/auth";
import { listBookingsForUser } from "@/lib/bookings";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/bookings", () => ({
  listBookingsForUser: jest.fn(),
}));

describe("MyBookings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when there is no signed-in user", async () => {
    (auth as jest.Mock).mockResolvedValueOnce(null);

    const result = await MyBookings();

    expect(result).toBeNull();
  });

  it("renders the user bookings when a signed-in user has bookings", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({
      user: { email: "viewer@example.com" },
    });

    (listBookingsForUser as jest.Mock).mockResolvedValueOnce([
      {
        id: "bk-123",
        seat: { row: "C", number: 7 },
        showtime: { film: "Arrival" },
      },
    ]);

    const result = await MyBookings();
    render(result);

    expect(screen.getByText("Your bookings")).toBeInTheDocument();
    expect(screen.getByText(/Row C, seat 7/i)).toBeInTheDocument();
    expect(screen.getByText(/Arrival/i)).toBeInTheDocument();
    expect(screen.getByText("bk-123")).toBeInTheDocument();
  });

  it("returns null when the signed-in user has no bookings", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({
      user: { email: "viewer@example.com" },
    });

    (listBookingsForUser as jest.Mock).mockResolvedValueOnce([]);

    const result = await MyBookings();

    expect(result).toBeNull();
  });
});
