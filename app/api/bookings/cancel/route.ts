import { auth } from "@/auth";
import { cancelBookingForUser } from "@/lib/bookings";
import { cancelBookingArgs } from "@/lib/tools/cancel-booking";

export const runtime = "nodejs";

/**
 * The only route that can cancel anything.
 *
 * Three checks, in this order, every time:
 *   1. Is there a session?           (auth)
 *   2. Is the body the right shape?  (Zod)
 *   3. Does this booking belong to this user? (inside cancelBookingForUser)
 *
 * ReelBot cannot call this. The browser calls it, after the user clicks
 * Confirm. If someone finds this URL with curl, they still have to get past
 * all three checks.
 */
export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return Response.json({ ok: false, message: "Sign in first." }, { status: 401 });
  }

  const parsed = cancelBookingArgs.safeParse(await req.json().catch(() => null));

  if (!parsed.success) {
    return Response.json(
      { ok: false, message: "A bookingId is required." },
      { status: 400 },
    );
  }
  try {
    const result = await cancelBookingForUser(parsed.data.bookingId, email);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { ok: false, message: "Failed to cancel booking." },
      { status: 500 },
    );
  }
}
