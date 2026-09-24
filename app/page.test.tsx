import { render, screen } from "@testing-library/react";
import Home from "@/app/page";
import { prisma } from "@/lib/prisma";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("@/app/components/auth-buttons", () => ({
  AuthButtons: () => <div>Auth area</div>,
}));

jest.mock("@/app/components/film-poster", () => ({
  FilmPoster: ({ film }: { film: string }) => <div>{film} poster</div>,
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    showtime: {
      findMany: jest.fn(),
    },
  },
}));

describe("Home page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the database setup fallback when Prisma fails", async () => {
    (prisma.showtime.findMany as jest.Mock).mockRejectedValueOnce(new Error("DB down"));

    const result = await Home();
    render(result);

    expect(screen.getByText("Database not ready")).toBeInTheDocument();
    expect(screen.getByText(/Run these two commands, then reload/i)).toBeInTheDocument();
  });

  it("renders showtimes when data loads successfully", async () => {
    (prisma.showtime.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: "show-1",
        film: "Dune",
        time: new Date("2026-09-22T18:00:00Z"),
        screen: 3,
        seats: [{ id: "seat-1" }, { id: "seat-2" }],
      },
    ]);

    const result = await Home();
    render(result);

    expect(screen.getByText("What’s playing today")).toBeInTheDocument();
    expect(screen.getByText("Dune")).toBeInTheDocument();
    expect(screen.getByText(/Screen 3/i)).toBeInTheDocument();
    expect(screen.getByText(/2 seats free/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Choose a seat for Dune/i })).toHaveAttribute(
      "href",
      "/showtimes/show-1",
    );
  });
});
