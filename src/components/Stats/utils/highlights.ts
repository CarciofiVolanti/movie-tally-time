import { WatchedMovie, DetailedRating, MovieRating } from "../hooks/useStatsData";

export const calculateGroupHighlights = (
  watchedMovies: WatchedMovie[],
  detailedRatings: DetailedRating[],
  movieRatings: MovieRating[]
) => {
  if (watchedMovies.length === 0) return { surprise: null, disappointment: null };

  let biggestSurprise = null;
  let maxSurpriseDiff = -1;
  let biggestDisappointment = null;
  let minDisappointmentDiff = 1;

  watchedMovies.forEach(movie => {
    const scores = detailedRatings.filter(r => r.watched_movie_id === movie.id && r.rating !== null && r.rating > 0);
    const hypes = movieRatings.filter(r => r.rating > 0 && r.watched_movie_id === movie.id);

    if (scores.length >= 2 && hypes.length >= 2) {
      const avgScore = scores.reduce((s, r) => s + r.rating!, 0) / scores.length;
      const avgHype = hypes.reduce((s, r) => s + r.rating, 0) / hypes.length;

      const diff = avgScore - (avgHype * 2);

      if (diff > maxSurpriseDiff) {
        maxSurpriseDiff = diff;
        biggestSurprise = { title: movie.movie_title, avgHype, avgScore, diff };
      }

      if (diff < minDisappointmentDiff) {
        minDisappointmentDiff = diff;
        biggestDisappointment = { title: movie.movie_title, avgHype, avgScore, diff };
      }
    }
  });

  return { surprise: biggestSurprise, disappointment: biggestDisappointment };
};
