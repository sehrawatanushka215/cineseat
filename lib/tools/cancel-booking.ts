import { tool } from "ai";
import { z } from "zod";

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
export const cancelBookingTool = tool({
  description:
    "Cancel one of the signed-in customer's bookings. DESTRUCTIVE - the " +
    "customer must confirm before this takes effect. Ask for the booking id " +
    "if you do not have one; never guess it.",
  inputSchema: z.object({
    bookingId: z.string().min(1).describe("The exact booking id to cancel."),
  }),
  // no execute - on purpose. See above.
});

/** The shape the browser validates before it calls the cancel route. */
export const cancelBookingArgs = z.object({ bookingId: z.string().trim().min(1) });
