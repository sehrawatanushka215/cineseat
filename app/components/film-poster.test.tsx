import { render, screen } from "@testing-library/react";
import { FilmPoster } from "@/app/components/film-poster";

describe("FilmPoster", () => {
  it("renders the film initials in the generated SVG poster", () => {
    render(<FilmPoster film="Dune Part Two" />);

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("width", "96");
    expect(img).toHaveAttribute("height", "140");
    expect(img).toHaveAttribute("class", "poster");
    expect(img.getAttribute("src")).toContain("data:image/svg+xml");
    expect(img.getAttribute("src")).toContain("DP");
  });

  it("uses the first two words when generating initials", () => {
    render(<FilmPoster film="Arrival of the Penguins" />);

    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toContain("AO");
  });
});
