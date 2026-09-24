/**
 * The bounded set of seat states, in one place.
 *
 * Section C will explain why this list lives here in TypeScript rather than
 * as a database enum. For now it is simply the single source of truth that
 * both the UI and (later) the database agree on.
 */
export const SEAT_STATUSES = ["available", "selected", "booked"] as const;

export type SeatStatus = (typeof SEAT_STATUSES)[number]; // means the type of any numeric index in that tuple.

export function isSeatStatus(value: unknown): value is SeatStatus {  // If the value is true, the value is a valid SeatStatus.
  return (
    typeof value === "string" &&
    (SEAT_STATUSES as readonly string[]).includes(value)
  );
}

/** Narrow an untrusted string (e.g. a database column) to a SeatStatus. */
export function toSeatStatus(value: unknown): SeatStatus {
  return isSeatStatus(value) ? value : "available";
}
