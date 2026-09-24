import type { Metadata } from "next";
// @ts-expect-error - Next.js global CSS is imported for side effects.
import "./globals.css";
import { ReelBotPanel } from "./components/reelbot-panel";
import { SessionProvider } from "next-auth/react";
import { AxeInit } from "./components/axe-init";

export const metadata: Metadata = {
  title: "CineSeat",
  description: "Book a seat at the cinema.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AxeInit />
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <header className="site-header">
          <span className="brand">CineSeat</span>
        </header>
        <div className="showtime-layout">
          <main id="main">{children}</main>
          <ReelBotPanel />
        </div>
      </body>
    </html>
  );
}
