"use client";

import type { SeatStatus } from "@/lib/seat-status";

export type SeatProps = {
  row: string;
  number: number;
  status: SeatStatus;
  onSelect?: () => void;
};

export function Seat({ row, number, status, onSelect }: SeatProps) {
  const label = `Row ${row}, Seat ${number}, ${status}`;
  const booked = status === "booked";

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={status === "selected"}
      // NOTE: aria-disabled, not the `disabled` attribute. See the section
      // README - a `disabled` button is skipped by keyboard focus, so a
      // screen reader user would never hear "Row D, Seat 4, booked".
      aria-disabled={booked}
      onClick={() => {
        if (booked) return;
        onSelect?.();
      }}
      className={`seat seat--${status}`}
    >
      <span aria-hidden="true">{number}</span>
    </button>
  );
}
