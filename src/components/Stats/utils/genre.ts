import { WatchedMovie, DetailedRating, MovieRating } from "../hooks/useStatsData";

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

export const calculateGenreRadarData = (
  watchedMovies: WatchedMovie[],
  detailedRatings: DetailedRating[],
  movieRatings: MovieRating[],
  personId?: string
) => {
  const genreStats: Record<string, { hypeSum: number, hypeCount: number, scoreSum: number, scoreCount: number }> = {};

  watchedMovies.forEach(movie => {
    if (!movie.genre || movie.genre === "N/A") return;
    const genres = movie.genre.split(",").map(g => g.trim());

    const relevantDetailed = personId
      ? detailedRatings.filter(r => r.watched_movie_id === movie.id && r.person_id === personId && r.rating !== null && r.rating > 0)
      : detailedRatings.filter(r => r.watched_movie_id === movie.id && r.rating !== null && r.rating > 0);

    const relevantHype = personId
      ? movieRatings.filter(r => r.watched_movie_id === movie.id && r.person_id === personId && r.rating > 0)
      : movieRatings.filter(r => r.watched_movie_id === movie.id && r.rating > 0);

    if (relevantDetailed.length === 0 && relevantHype.length === 0) return;

    const avgScore = relevantDetailed.length > 0 ? relevantDetailed.reduce((s, r) => s + r.rating!, 0) / relevantDetailed.length : null;
    const avgHype = relevantHype.length > 0 ? relevantHype.reduce((s, r) => s + r.rating, 0) / relevantHype.length : null;

    genres.forEach(genre => {
      if (!genreStats[genre]) {
        genreStats[genre] = { hypeSum: 0, hypeCount: 0, scoreSum: 0, scoreCount: 0 };
      }
      if (avgHype !== null) {
        genreStats[genre].hypeSum += avgHype;
        genreStats[genre].hypeCount += 1;
      }
      if (avgScore !== null) {
        genreStats[genre].scoreSum += avgScore;
        genreStats[genre].scoreCount += 1;
      }
    });
  });

  return Object.entries(genreStats)
    .map(([genre, stats]) => ({
      subject: genre,
      hype: stats.hypeCount > 0 ? (stats.hypeSum / stats.hypeCount) * 2 : 0,
      score: stats.scoreCount > 0 ? (stats.scoreSum / stats.scoreCount) : 0,
      fullMark: 10
    }))
    .filter(d => d.hype > 0 || d.score > 0)
    .sort((a, b) => (b.hype + b.score) - (a.hype + a.score))
    .slice(0, 8);
};
