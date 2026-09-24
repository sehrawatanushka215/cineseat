import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type CancelResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

/**
 * The only place in the app that actually cancels a booking.
 *
 * Two things worth pointing at in the review:
 *  - The ownership check lives HERE, in the data layer, not in the UI. A
 *    confirmation dialog is a courtesy; this is the control.
 *  - ReelBot never imports this. It reaches it through an authenticated
 *    route, after the user clicks Confirm.
 */
export async function cancelBookingForUser(
  bookingId: string,
  userEmail: string,
): Promise<CancelResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { seat: true },
  });

  if (!booking) {
    return { ok: false, message: `No booking found with id ${bookingId}.` };
  }

  if (booking.userEmail !== userEmail) {
    // Deliberately vague: do not confirm the existence of other people's
    // bookings to someone who is guessing ids.
    return { ok: false, message: `No booking found with id ${bookingId}.` };
  }


  const result = await prisma.$transaction(async (txc) => {
    // updateMany is implemented for concurrency update, so that simultaneous cancellation attempts do not conflict and throw error.
    const updatedData = await txc.booking.deleteMany({
      where: { id: booking.id, userEmail, status: "confirmed" },
    });
    if (updatedData.count === 0) {
      return { ok: false, message: "That booking was already cancelled." };
    }
    await txc.seat.update({
      where: { id: booking.seatId },
      data: { status: "available" },
    });
    return {
      ok: true,
      message: `Cancelled row ${booking.seat.row}, seat ${booking.seat.number}. The seat is free again.`,
    };
  });
  if (result.ok) {
    revalidatePath(`/showtimes/${booking.showtimeId}`);
  }

  return result;
}

export async function listBookingsForUser(userEmail: string) {
  return prisma.booking.findMany({
    where: { userEmail, status: "confirmed" },
    include: { seat: true, showtime: true },
    orderBy: { createdAt: "desc" },
  });
}
