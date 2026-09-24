import {
    isSeatStatus,
    SEAT_STATUSES,
    toSeatStatus,
} from "@/lib/seat-status";

describe("seat-status", () => {
    it("defines the supported seat statuses", () => {
        expect(SEAT_STATUSES).toEqual(["available", "selected", "booked"]);
    });

    it.each(["available", "selected", "booked"])(
        "recognizes %s as a valid seat status",
        (value) => {
            expect(isSeatStatus(value)).toBe(true);
        },
    );

    it.each([undefined, null, "reserved", "", 1, {}, []])(
        "rejects %p as an invalid seat status",
        (value) => {
            expect(isSeatStatus(value)).toBe(false);
        },
    );

    it.each(["available", "selected", "booked"])(
        "preserves the valid status %s",
        (value) => {
            expect(toSeatStatus(value)).toBe(value);
        },
    );

    it.each([undefined, null, "reserved", "", 1, {}, []])(
        "falls back to available for invalid value %p",
        (value) => {
            expect(toSeatStatus(value)).toBe("available");
        },
    );

    it("falls back to available for a status with surrounding spaces", () => {
        expect(isSeatStatus(" available ")).toBe(false);
        expect(toSeatStatus(" available ")).toBe("available");
    });
});
