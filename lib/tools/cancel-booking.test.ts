import { cancelBookingArgs } from "@/lib/tools/cancel-booking";

describe("cancelBookingArgs", () => {
    it("accepts a non-empty booking ID", () => {
        expect(cancelBookingArgs.safeParse({ bookingId: "booking-123" }).success).toBe(true);
    });

    it.each([
        {},
        { bookingId: "" },
        { bookingId: 123 },
        { bookingId: null },
        { bookingId: "   " },
    ])("rejects invalid input %p", (input) => {
        expect(cancelBookingArgs.safeParse(input).success).toBe(false);
    });
});
