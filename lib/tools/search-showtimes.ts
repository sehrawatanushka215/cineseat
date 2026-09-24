import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

/**
 * Read-only, so no confirmation gate. Session 5's exact rule.
 * Same shape as Session 5's searchOrders: Zod parameters + a Prisma query.
 */
export const searchShowtimes = tool({
  description:
    "Search CineSeat showtimes by film name. Use this whenever the user asks " +
    "what is playing, when a film is on, or how many seats are left.",
  inputSchema: z.object({
    film: z
      .string()
      .optional()
      .describe("Part of a film title. Omit to list everything playing today."),
  }),
  execute: async ({ film }) => {
    const showtimes = await prisma.showtime.findMany({
      where: film ? { film: { contains: film } } : {},
      include: { seats: { where: { status: "available" }, select: { id: true } } },
      orderBy: { time: "asc" },
      take: 10,
    });

    // Return small, plain, serialisable data. Never hand the model a Date
    // object or a full row it does not need.
    return showtimes.map((showtime) => ({
      film: showtime.film,
      screen: showtime.screen,
      time: showtime.time.toISOString(),
      seatsAvailable: showtime.seats.length,
    }));
  },
});
