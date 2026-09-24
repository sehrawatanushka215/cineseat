
import Link from "next/link";
import { notFound } from "next/navigation";
import { bookSeat } from "@/app/actions/book-seat";
import { auth } from "@/auth";
import { AuthButtons } from "@/app/components/auth-buttons";
import { MyBookings } from "@/app/components/my-bookings";
import { SeatMap, type SeatData } from "@/app/components/seat-map";
import { prisma } from "@/lib/prisma";
import { toSeatStatus } from "@/lib/seat-status";

export const dynamic = "force-dynamic"; // Fresh render on every request.

export default async function ShowtimePage({
  params,
}: {
  // Next 15: params is a Promise. Await it.
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const showtime = await prisma.showtime.findUnique({
    where: { id },
    include: { seats: { orderBy: [{ row: "asc" }, { number: "asc" }] } },
  });

  if (!showtime) notFound();

  const session = await auth();

  // The database column is a string. `toSeatStatus` narrows it to the union
  // the UI understands - validation at the boundary, Module 1.2's rule.
  const seats: SeatData[] = showtime.seats.map((seat) => ({
    id: seat.id,
    row: seat.row,
    number: seat.number,
    status: toSeatStatus(seat.status),
  }));


  return (
    <>
      <div className="page-head">
        <div>
          <Link href="/">&larr; All showtimes</Link>
          <h1>{showtime.film}</h1>
          <p className="muted">Screen {showtime.screen}</p>
        </div>
        <AuthButtons />
      </div>

      {!session?.user?.email && (
        <p className="notice">Sign in to book a seat. Browsing works either way.</p>
      )}

      <SeatMap seats={seats} onBook={bookSeat} />

      <MyBookings />
    </>
  );
}
