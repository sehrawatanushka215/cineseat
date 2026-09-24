"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Seat } from "@/app/components/seat";
import type { SeatStatus } from "@/lib/seat-status";

export type SeatData = {
  id: string;
  row: string;
  number: number;
  status: SeatStatus;
};

export type SeatMapProps = {
  seats: SeatData[];
  /** Supplied from Section C onward. Omitted in Section B's static demo. */
  onBook?: (seatId: string) => Promise<{ ok: boolean; message: string }>;
};

function groupByRow(seats: SeatData[]): Array<[string, SeatData[]]> {
  const rows = new Map<string, SeatData[]>();
  for (const seat of seats) {
    const existing = rows.get(seat.row) ?? [];
    existing.push(seat);
    rows.set(seat.row, existing);
  }
  return [...rows.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function SeatMap({ seats, onBook }: SeatMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [pending, startTransition] = useTransition();
  const announcementRef = useRef<HTMLParagraphElement>(null);

  const rows = useMemo(() => groupByRow(seats), [seats]);
  const selected = seats.find((seat) => seat.id === selectedId) ?? null;

  function select(seat: SeatData) {
    setSelectedId(seat.id);
    setAnnouncement(`Selected row ${seat.row}, seat ${seat.number}.`);
  }

  function book() {
    if (!selected || !onBook) {
      return
    }
    startTransition(async () => {
      try {
        const result = await onBook(selected.id);
        setAnnouncement(result.message);
        if (result.ok) {
          setSelectedId(null);
          // Here it allows React time to:
          //
          // Update announcement state.
          // Render the new message.
          // Let the browser prepare the updated DOM.
          // Move focus to the now-rendered announcement.
          // Without it, the ref may still point to the old DOM state immediately after setAnnouncement(...).
          requestAnimationFrame(() => {
            announcementRef.current?.focus({ preventScroll: true }); // Use a ref and move focus to the booking announcement after the booking completes.
          });
        }
      } catch {
        setAnnouncement(`Unable to book row ${selected.row}, seat ${selected.number}. Please try again.`);
        requestAnimationFrame(() => {
          announcementRef.current?.focus({ preventScroll: true });
        });
      }
    });
  }

  return (
    <section aria-labelledby="seat-map-heading" className="seat-map">
      <h2 id="seat-map-heading">Choose a seat</h2>

      <p className="screen-label" aria-hidden="true">
        S C R E E N
      </p>

      <div className="seat-rows">
        {rows.map(([row, rowSeats]) => (
          <div key={row} className="seat-row">
            <span className="seat-row__label" aria-hidden="true">
              {row}
            </span>
            {rowSeats
              .slice()
              .sort((a, b) => a.number - b.number)
              .map((seat) => (
                <Seat
                  key={seat.id}
                  row={seat.row}
                  number={seat.number}
                  status={seat.id === selectedId ? "selected" : seat.status}
                  onSelect={() => select(seat)}
                />
              ))}
          </div>
        ))}
      </div>

      <ul className="legend">
        <li>
          <span className="legend__swatch legend__swatch--available" /> Available
        </li>
        <li>
          <span className="legend__swatch legend__swatch--selected" /> Selected
        </li>
        <li>
          <span className="legend__swatch legend__swatch--booked" /> Booked
        </li>
      </ul>

      <div className="seat-map__actions">
        <button
          type="button"
          className="button"
          disabled={!selected || !onBook || pending}
          onClick={book}
        >
          {pending
            ? "Booking..."
            : selected
              ? `Book row ${selected.row}, seat ${selected.number}`
              : "Book selected seat"}
        </button>
      </div>

      {/* The live region. Everything the seat map does out loud, it also says
          here - this is how a screen reader user learns the booking worked. */}
      <p role="status" className="announcement" tabIndex={-1} ref={announcementRef}>
        {announcement}
      </p>
    </section>
  );
}
