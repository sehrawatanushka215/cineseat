import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AuthButtons } from "@/app/components/auth-buttons";
import { FilmPoster } from "@/app/components/film-poster";
import { ReelBotPanel } from "./components/reelbot-panel";

export const dynamic = "force-dynamic";

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function Home() {
  let showtimes;

  try {
    showtimes = await prisma.showtime.findMany({
      orderBy: { time: "asc" },
      include: { seats: { where: { status: "available" }, select: { id: true } } },
    });
  } catch {
    return (
      <div className="card">
        <h1>Database not ready</h1>
        <p className="muted">Run these two commands, then reload:</p>
        <pre>npm run db:migrate{"\n"}npm run db:seed</pre>
      </div>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>What&rsquo;s playing today</h1>
          <p className="muted">Pick a showtime, then pick your seat.</p>
        </div>
        <AuthButtons />
      </div>
        <ul className="showtime-list">
          {showtimes.map((showtime) => (
            <li key={showtime.id} className="card showtime">
              <FilmPoster film={showtime.film} />
              <div>
                <h2 className="showtime__film">{showtime.film}</h2>
                <p className="muted">
                  {formatTime(showtime.time)} &middot; Screen {showtime.screen} &middot;{" "}
                  {showtime.seats.length} seats free
                </p>
                <Link className="button" href={`/showtimes/${showtime.id}`}>
                  Choose a seat for {showtime.film}
                </Link>
              </div>
            </li>
          ))}
        </ul>
    </>
  );
}
