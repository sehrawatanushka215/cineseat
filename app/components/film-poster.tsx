function initials(film: string) {
  return film
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
}

export function FilmPoster({ film }: { film: string }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="140">
    <rect width="96" height="140" rx="8" fill="#232936"/>
    <text x="48" y="80" font-family="sans-serif" font-size="30" fill="#ffb703"
      text-anchor="middle">${initials(film)}</text>
  </svg>`;

  const src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  // AUDIT NOTE (Section G): no `alt` attribute. Deliberate - Lighthouse is
  // meant to find this on slide 47. Do not fix it early.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="poster" src={src} width={96} height={140} alt={`Poster for ${film}`} />;
}
