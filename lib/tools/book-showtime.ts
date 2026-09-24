import { tool } from "ai";
import { z } from "zod";
import { prisma } from "../prisma";
import { bookSeat } from "@/app/actions/book-seat";

/**
 * The destructive tool - and the most important twelve lines of the session.
 *
 * Notice what is NOT here: an `execute` function.
 *
 * Slide 39 shows `execute` on the tool and gates it in the UI. We go one step
 * further: with no `execute`, the SDK physically cannot run this. The tool
 * call is forwarded to the browser, where the user has to click Confirm
 * before anything reaches /api/bookings/cancel.
 *
 * The confirmation gate stops being a UI convention and becomes the shape of
 * the code. That is the "Tool Result -> Database" trust boundary from slide
 * 16, made structural.
 */
export const bookShowTime = tool({
  description:
    "Book a showtime for the signed-in customer. " +
    "customer must confirm before this takes effect. Ask for the showtime id " +
    "if you do not have one; never guess it.",
  inputSchema: z.object({
    film: z
      .string()
      .describe("Part of a film title or the entire film title for which we want to book the seat."),
    seat: z
      .string()
      .describe("The seat identifier for the seat we want to book."),
  }),
  execute: async ({ film, seat }) => {
    try {
      const seatRecord = await prisma.seat.findFirst({
        where: {
          row: seat[0],
          number: Number(seat.slice(1)),
          status: "available",
          showtime: {
            film: {
              contains: film,
              mode: "insensitive",
            },
          },
        },
        select: {
          id: true,
        },
      });
      if (!seatRecord) {
        return {
          ok: false,
          error: "No available seats found for the specified film and seat."
        }
      }

      return await bookSeat(seatRecord.id);
    } catch (error) {
      return {
        ok: false,
        error: "An unexpected error occurred while booking the seat."
      };
    }
  },
});

