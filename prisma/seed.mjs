/**
 * Seeds three showtimes, a full seat grid for each, and two bookings that the
 * class needs: Mrs. Fernandes has D4 (slide 11), and the demo user has E5 so
 * there is something for ReelBot to cancel in Section D.
 *
 * Run with:  npm run db:seed
 */
import fs from "node:fs";
import path from "node:path";
import pkg from "@prisma/client";

// `node prisma/seed.mjs` is plain Node - it does not read .env.local the way
// the Next.js dev server does, and PrismaClient needs DATABASE_URL. Same
// reason prisma.config.ts does it. Variables already set in the shell win.
for (const file of [".env.local", ".env"]) {
  const full = path.join(process.cwd(), file);
  if (fs.existsSync(full) && typeof process.loadEnvFile === "function") {
    process.loadEnvFile(full);
  }
}

process.env.DATABASE_URL ??= "file:./dev.db";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

const ROWS = ["A", "B", "C", "D", "E", "F"];
const SEATS_PER_ROW = 8;

const SHOWTIMES = [
  { film: "Interstellar Re-Release", screen: 3, hour: 19, minute: 30 },
  { film: "Pather Panchali (4K)", screen: 1, hour: 18, minute: 0 },
  { film: "Dune: Part Two", screen: 2, hour: 21, minute: 15 },
];

function todayAt(hour, minute) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function main() {
  await prisma.booking.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.showtime.deleteMany();

  for (const entry of SHOWTIMES) {
    const showtime = await prisma.showtime.create({
      data: {
        film: entry.film,
        screen: entry.screen,
        time: todayAt(entry.hour, entry.minute),
        seats: {
          create: ROWS.flatMap((row) =>
            Array.from({ length: SEATS_PER_ROW }, (_, index) => ({
              row,
              number: index + 1,
              status: "available",
            })),
          ),
        },
      },
      include: { seats: true },
    });

    if (entry.film !== "Interstellar Re-Release") continue;

    // Mrs. Fernandes got there first. Slide 11.
    await book(showtime.id, showtime.seats, "D", 4, "mrs.fernandes@example.com");
    // Something for the demo user to cancel in Section D.
    await book(showtime.id, showtime.seats, "E", 5, "demo@cineseat.test");
    // A little visual texture on the map.
    await book(showtime.id, showtime.seats, "B", 2, "someone.else@example.com");
    await book(showtime.id, showtime.seats, "F", 7, "someone.else@example.com");
  }

  const bookings = await prisma.booking.findMany({ include: { seat: true } });
  console.log("Seeded. Bookings you can cancel from ReelBot:");
  for (const booking of bookings) {
    console.log(
      `  ${booking.id}  row ${booking.seat.row} seat ${booking.seat.number}  (${booking.userEmail})`,
    );
  }
}

async function book(showtimeId, seats, row, number, userEmail) {
  const seat = seats.find((candidate) => candidate.row === row && candidate.number === number);
  if (!seat) return;
  await prisma.seat.update({ where: { id: seat.id }, data: { status: "booked" } });
  await prisma.booking.create({
    data: { showtimeId, seatId: seat.id, userEmail, status: "confirmed" },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
