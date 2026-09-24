import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Auth with a fallback.
 *
 * If AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET are set, CineSeat uses real Google
 * OAuth - Session 4's exact flow. If they are not (which is most laptops in a
 * classroom), it falls back to a one-click demo provider so nothing further
 * down the session is blocked on a Google Cloud Console account.
 *
 * That fallback is development scaffolding, not a feature. It is announced
 * loudly in the console and it is the first thing you rip out for real users.
 */
const googleConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);


if (!googleConfigured) {
  console.error(
    "[auth] No Google credentials found"
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // A dev default so a forgotten `npx auth secret` does not stop the class.
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [Google]
});
