import { WatchedMovie, DetailedRating } from "../hooks/useStatsData";

export const calculateOverallAverageRating = (ratings: DetailedRating[]) => {
  const validRatings = ratings.filter(r => r.rating !== null && r.rating > 0);
  if (validRatings.length === 0) return { average: 0, count: 0 };
  const average = validRatings.reduce((sum, r) => sum + r.rating!, 0) / validRatings.length;
  return { average, count: validRatings.length };
};

export const calculateMovieAverages = (movies: WatchedMovie[], ratings: DetailedRating[]) => {
  return movies.map(movie => {
    const movieRatings = ratings.filter(r => r.watched_movie_id === movie.id && r.rating !== null && r.rating > 0);
    const avg = movieRatings.length > 0
      ? movieRatings.reduce((sum, r) => sum + r.rating!, 0) / movieRatings.length
      : 0;
    return { ...movie, averageRating: avg, voteCount: movieRatings.length };
  }).filter(m => m.voteCount > 0);
};
