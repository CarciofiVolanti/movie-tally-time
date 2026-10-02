import { WatchedMovie, DetailedRating, MovieRating } from "../hooks/useStatsData";
import { calculatePearsonCorrelation, getLengthPreference } from "./person";
import { parseRuntime } from "./runtime";

export const calculateOverallAverageRating = (ratings: DetailedRating[]) => {
  const validRatings = ratings.filter(r => r.rating !== null && r.rating > 0);
  if (validRatings.length === 0) return { average: 0, count: 0, median: 0 };
  const average = validRatings.reduce((sum, r) => sum + r.rating!, 0) / validRatings.length;
  
  const sorted = validRatings.map(r => r.rating!).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  return { average, count: validRatings.length, median };
};

export const calculateOverallHype = (ratings: MovieRating[]) => {
  const validRatings = ratings.filter(r => r.rating > 0);
  if (validRatings.length === 0) return { average: 0, count: 0, median: 0 };
  const average = validRatings.reduce((sum, r) => sum + r.rating, 0) / validRatings.length;
  
  const sorted = validRatings.map(r => r.rating).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  return { average, count: validRatings.length, median };
};

export const calculateGroupLengthPreferences = (
  watchedMovies: WatchedMovie[],
  detailedRatings: DetailedRating[],
  movieRatings: MovieRating[],
  proposals: { id: string, runtime?: string | null }[]
) => {
  const ratingRuntimes: number[] = [];
  const ratingValues: number[] = [];
  const scoreScatterData: { runtime: number; score: number; title: string }[] = [];
  const hypeScatterData: { runtime: number; score: number; title: string }[] = [];

  detailedRatings.forEach(r => {
    if (r.rating !== null && r.rating > 0) {
      const movie = watchedMovies.find(m => m.id === r.watched_movie_id);
      if (movie && movie.runtime) {
        const mins = parseRuntime(movie.runtime);
        if (mins > 0) {
          ratingRuntimes.push(mins);
          ratingValues.push(r.rating);
          scoreScatterData.push({ runtime: mins, score: r.rating, title: movie.movie_title });
        }
      }
    }
  });

  movieRatings.forEach(r => {
    if (r.rating > 0) {
      let movie = null;
      let title = "";
      if (r.watched_movie_id) {
        movie = watchedMovies.find(m => m.id === r.watched_movie_id);
        title = movie?.movie_title || "";
      } else if (r.proposal_id) {
        movie = proposals.find(p => p.id === r.proposal_id);
        title = movie?.movie_title || "";
      }
      if (movie && movie.runtime && title) {
        const mins = parseRuntime(movie.runtime);
        if (mins > 0) {
          hypeRuntimes.push(mins);
          hypeValues.push(r.rating);
          hypeScatterData.push({ runtime: mins, score: r.rating, title });
        }
      }
    }
  });

  return {
    scorePreference: getLengthPreference(calculatePearsonCorrelation(ratingRuntimes, ratingValues)),
    hypePreference: getLengthPreference(calculatePearsonCorrelation(hypeRuntimes, hypeValues)),
    scoreScatterData,
    hypeScatterData,
  };
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
