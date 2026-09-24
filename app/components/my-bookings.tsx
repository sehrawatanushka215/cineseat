import { auth } from "@/auth";
import { listBookingsForUser } from "@/lib/bookings";

export async function MyBookings() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;

  const bookings = await listBookingsForUser(email);
  if (bookings.length === 0) return null;

  return (
    <section aria-labelledby="my-bookings-heading" className="card my-bookings">
      <h2 id="my-bookings-heading">Your bookings</h2>
      <p className="muted">
        Copy an id and ask ReelBot to cancel it once Section D is in place.
      </p>
      <ul>
        {bookings.map((booking) => (
          <li key={booking.id}>
            <strong>
              Row {booking.seat.row}, seat {booking.seat.number}
            </strong>{" "}
            &mdash; {booking.showtime.film} <code>{booking.id}</code>
          </li>
        ))}
      </ul>
    </section>
  );
}
