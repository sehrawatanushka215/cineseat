import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SeatMap } from "@/app/components/seat-map";

describe("SeatMap", () => {
    const seats = [
        { id: "a1", row: "A", number: 1, status: "available" as const },
        { id: "a2", row: "A", number: 2, status: "booked" as const },
        { id: "b1", row: "B", number: 1, status: "available" as const },
    ];


    it("groups seats by row and allows selecting an available seat", () => {
        render(<SeatMap seats={seats} />);

        const seatButton = screen.getByRole("button", { name: /row a, seat 1, available/i });
        fireEvent.click(seatButton);

        expect(screen.getByText("Book row A, seat 1")).toBeInTheDocument();

    });

    it("renders rows in alphabetical order and seats in numeric order within each row", () => {
        const orderedSeats = [
            { id: "b2", row: "B", number: 2, status: "available" as const },
            { id: "a2", row: "A", number: 2, status: "available" as const },
            { id: "a1", row: "A", number: 1, status: "available" as const },
            { id: "b1", row: "B", number: 1, status: "available" as const },
        ];

        render(<SeatMap seats={orderedSeats} />);

        const rowLabels = screen.getAllByText(/^[A-Z]$/i).map((element) => element.textContent);
        expect(rowLabels).toEqual(["A", "B"]);

        const rowButtons = screen.getAllByRole("button").filter((button) =>
            button.getAttribute("aria-label")?.startsWith("Row A, Seat") ||
            button.getAttribute("aria-label")?.startsWith("Row B, Seat"),
        );

        expect(rowButtons.map((button) => button.getAttribute("aria-label"))).toEqual([
            "Row A, Seat 1, available",
            "Row A, Seat 2, available",
            "Row B, Seat 1, available",
            "Row B, Seat 2, available",
        ]);
    });

    it("button is disabled when no seat is selected and no onBook callback is provided", () => {
        render(<SeatMap seats={seats} />);

        const button = screen.getByRole("button", { name: /book selected seat/i });
        expect(button).toBeDisabled();
    });

    it("keeps the booking button disabled when a seat is selected without an onBook callback", () => {
        render(<SeatMap seats={seats} />);

        fireEvent.click(screen.getByRole("button", { name: /row a, seat 1, available/i }));

        const button = screen.getByRole("button", { name: /book row a, seat 1/i });
        expect(button).toBeDisabled();
    });


    it("When no seat is selected, button text should be 'Book selected seat'", () => {
        const onBook = jest.fn();
        render(<SeatMap seats={seats} onBook={onBook} />);

        const button = screen.getByRole("button", { name: /book selected seat/i });
        expect(button).toBeInTheDocument();
    });


    it("shows Booking... while the booking request is pending", async () => {
        let resolveBooking: (value: { ok: boolean; message: string }) => void;
        const onBook = jest.fn().mockImplementation(
            () =>
                new Promise<{ ok: boolean; message: string }>((resolve) => {
                    resolveBooking = resolve;
                }),
        );

        render(<SeatMap seats={seats} onBook={onBook} />);

        fireEvent.click(screen.getByRole("button", { name: /row a, seat 1, available/i }));
        fireEvent.click(screen.getByRole("button", { name: /book row a, seat 1/i }));

        expect(screen.getByRole("button", { name: /booking.../i })).toBeInTheDocument();

        resolveBooking!({ ok: true, message: "Booked row A, seat 1. Enjoy the film." });
        // Wait for the booking promise to resolve
        await waitFor(() => {
            expect(onBook).toHaveBeenCalledWith("a1");
            expect(screen.getByRole("status")).toHaveTextContent("Booked row A, seat 1. Enjoy the film.");
        });

    });

    it("does not call onBook more than once while booking is pending", async () => {
        let resolveBooking: (value: { ok: boolean; message: string }) => void;

        const onBook = jest.fn().mockImplementation(
            () =>
                new Promise<{ ok: boolean; message: string }>((resolve) => {
                    resolveBooking = resolve;
                }),
        );

        render(<SeatMap seats={seats} onBook={onBook} />);

        fireEvent.click(screen.getByRole("button", { name: /row a, seat 1, available/i }));
        fireEvent.click(screen.getByRole("button", { name: /book row a, seat 1/i }));

        const button = screen.getByRole("button", { name: /booking\.\.\./i });
        expect(button).toBeDisabled();

        fireEvent.click(button);
        expect(onBook).toHaveBeenCalledTimes(1);

        resolveBooking!({ ok: true, message: "Booked row A, seat 1." });

        await waitFor(() => {
            expect(screen.getByRole("status")).toHaveTextContent("Booked row A, seat 1.");
        });
    });

    it("clears the selected seat and shows success message when booking succeeds", async () => {
        const onBook = jest.fn().mockResolvedValue({ ok: true, message: "Booked row A, seat 1. Enjoy the film." });

        render(<SeatMap seats={seats} onBook={onBook} />);

        fireEvent.click(screen.getByRole("button", { name: /row a, seat 1, available/i }));
        fireEvent.click(screen.getByRole("button", { name: /book row a, seat 1/i }));

        // Wait for the booking promise to resolve
        await waitFor(() => {
            expect(onBook).toHaveBeenCalledWith("a1");
            expect(screen.getByRole("button", { name: /book selected seat/i })).toBeInTheDocument(); // Check if selected is set back to null after onBook returns success response
        });

        expect(screen.getByRole("status")).toHaveTextContent("Booked row A, seat 1. Enjoy the film.");
    });

    it("moves focus to the announcement after a successful booking", async () => {
        const onBook = jest.fn().mockResolvedValue({ ok: true, message: "Booked row A, seat 1. Enjoy the film." });

        render(<SeatMap seats={seats} onBook={onBook} />);

        fireEvent.click(screen.getByRole("button", { name: /row a, seat 1, available/i }));
        fireEvent.click(screen.getByRole("button", { name: /book row a, seat 1/i }));

        await waitFor(() => {
            const announcement = screen.getByRole("status");

            expect(announcement).toHaveTextContent("Booked row A, seat 1. Enjoy the film.");
            expect(announcement).toHaveFocus();
        });
    });

    it("moves focus to the announcement after a failure in booking", async () => {
        const onBook = jest.fn().mockRejectedValue(new Error("Network error"));

        render(<SeatMap seats={seats} onBook={onBook} />);

        fireEvent.click(screen.getByRole("button", { name: /row a, seat 1, available/i }));
        fireEvent.click(screen.getByRole("button", { name: /book row a, seat 1/i }));

        await waitFor(() => {
            const announcement = screen.getByRole("status");

            expect(announcement).toHaveTextContent("Unable to book row A, seat 1. Please try again.");
            expect(announcement).toHaveFocus();
        });
    });

    it("shows the failure message and keeps the selected seat when booking fails", async () => {
        const onBook = jest.fn().mockResolvedValue({ ok: false, message: "Failed to book row A, seat 1." });

        render(<SeatMap seats={seats} onBook={onBook} />);

        fireEvent.click(screen.getByRole("button", { name: /row a, seat 1, available/i }));
        fireEvent.click(screen.getByRole("button", { name: /book row a, seat 1/i }));

        await waitFor(() => {
            expect(onBook).toHaveBeenCalledWith("a1");
            expect(screen.getByRole("button", { name: /row a, seat 1, selected/i })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /book row a, seat 1/i })).toBeInTheDocument();
        });

        expect(screen.getByRole("status")).toHaveTextContent("Failed to book row A, seat 1.");
    });

    it("shows a retry message and keeps the selected seat when booking rejects", async () => {
        const onBook = jest.fn().mockRejectedValue(new Error("Network error"));

        render(<SeatMap seats={seats} onBook={onBook} />);

        fireEvent.click(screen.getByRole("button", { name: /row a, seat 1, available/i }));
        fireEvent.click(screen.getByRole("button", { name: /book row a, seat 1/i }));

        await waitFor(() => {
            expect(onBook).toHaveBeenCalledWith("a1");
            expect(screen.getByRole("button", { name: /row a, seat 1, selected/i })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /book row a, seat 1/i })).toBeInTheDocument();
        });

        expect(screen.getByRole("status")).toHaveTextContent(
            "Unable to book row A, seat 1. Please try again.",
        );
    });

    it("selecting the second seat replaces the first selected seat", () => {

        render(<SeatMap seats={seats} />);

        fireEvent.click(screen.getByRole("button", { name: /row a, seat 1, available/i }));
        expect(screen.getByRole("button", { name: /row a, seat 1, selected/i })).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /row b, seat 1, available/i }));
        expect(screen.getByRole("button", { name: /row b, seat 1, selected/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /row a, seat 1, available/i })).toBeInTheDocument();
    });

    it("clicking or trying to select booked seat does not select the seat or enabled the book button", () => {

        render(<SeatMap seats={seats} />);

        fireEvent.click(screen.getByRole("button", { name: /row a, seat 2, booked/i }));

        const button = screen.getByRole("button", { name: /Book selected seat/i })
        expect(button).toBeInTheDocument();
        expect(button).toBeDisabled();
    });

    it("renders an empty seat list with the booking button disabled", () => {
        render(<SeatMap seats={[]} />);

        const button = screen.getByRole("button", { name: /book selected seat/i });

        expect(button).toBeDisabled();
    });

    it("keeps the selected seat when a booked seat is clicked", () => {
        render(<SeatMap seats={seats} />);

        fireEvent.click(screen.getByRole("button", { name: /row a, seat 1, available/i }));
        fireEvent.click(screen.getByRole("button", { name: /row a, seat 2, booked/i }));

        expect(screen.getByRole("button", { name: /row a, seat 1, selected/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /book row a, seat 1/i })).toBeInTheDocument();
    });

    it("clears the selection when the parent removes the selected seat", () => {
        const { rerender } = render(<SeatMap seats={seats} />);

        fireEvent.click(screen.getByRole("button", { name: /row a, seat 1, available/i }));
        rerender(<SeatMap seats={seats.filter((seat) => seat.id !== "a1")} />);

        expect(screen.getByRole("button", { name: /book selected seat/i })).toBeDisabled();
    });
});
