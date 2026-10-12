import { WatchedMovie } from "../hooks/useStatsData";

export const calculateGenreDistribution = (movies: WatchedMovie[]) => {
  const genreCounts: Record<string, number> = {};
  movies.forEach(movie => {
    if (!movie.genre || movie.genre === "N/A") return;
    const genres = movie.genre.split(",").map(g => g.trim());
    genres.forEach(g => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  });

  return Object.entries(genreCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);
};

