import { WatchedMovie, DetailedRating, Person, MovieRating, MovieProposal } from "../hooks/useStatsData";
import { calculateMovieAverages } from "./ratings";

export const calculateAwards = (movies: WatchedMovie[], ratings: DetailedRating[], people: Person[]) => {
  const awards = {
    cinephile: [] as { name: string, value: string, score: number }[],
    harshestCritic: [] as { name: string, value: string, score: number }[],
    easyPleaser: [] as { name: string, value: string, score: number }[],
    tastemaker: [] as { name: string, value: string, score: number }[]
  };

  if (people.length === 0 || movies.length === 0) return awards;

  const attendanceCount: Record<string, number> = {};
  ratings.forEach(r => {
    if (r.present || r.rating !== null) {
      attendanceCount[r.person_id] = (attendanceCount[r.person_id] || 0) + 1;
    }
  });

  awards.cinephile = Object.entries(attendanceCount)
    .map(([personId, count]) => {
      const person = people.find(p => p.id === personId);
      return { name: person?.name || "Unknown", value: `${count} movies attended`, score: count };
    })
    .sort((a, b) => b.score - a.score);

  const personRatingSums: Record<string, { sum: number, count: number }> = {};
  ratings.forEach(r => {
    if (r.rating !== null && r.rating > 0) {
      if (!personRatingSums[r.person_id]) personRatingSums[r.person_id] = { sum: 0, count: 0 };
      personRatingSums[r.person_id].sum += r.rating;
      personRatingSums[r.person_id].count += 1;
    }
  });

  const criticRankings = Object.entries(personRatingSums)
    .filter(([_, data]) => data.count >= 3 || data.count === movies.length)
    .map(([personId, data]) => {
      const person = people.find(p => p.id === personId);
      const avg = data.sum / data.count;
      return {
        name: person?.name || "Unknown",
        value: `${avg.toFixed(2)}/10 avg rating (${data.count} movies)`,
        score: avg
      };
    });

  awards.harshestCritic = [...criticRankings].sort((a, b) => a.score - b.score);
  awards.easyPleaser = [...criticRankings].sort((a, b) => b.score - a.score);

  const proposerAverages: Record<string, { sum: number, count: number }> = {};
  const movieAverages = calculateMovieAverages(movies, ratings);

  movieAverages.forEach(movie => {
    if (!proposerAverages[movie.proposed_by]) proposerAverages[movie.proposed_by] = { sum: 0, count: 0 };
    proposerAverages[movie.proposed_by].sum += movie.averageRating;
    proposerAverages[movie.proposed_by].count += 1;
  });

  awards.tastemaker = Object.entries(proposerAverages)
    .map(([proposerName, data]) => {
      const avg = data.sum / data.count;
      return {
        name: proposerName,
        value: `${avg.toFixed(2)}/10 avg group rating (${data.count} proposals)`,
        score: avg
      };
    })
    .sort((a, b) => b.score - a.score);

  return awards;
};

export const calculateAnticipationStats = (
  movieRatings: MovieRating[],
  people: Person[],
  watchedMovies: WatchedMovie[],
  proposals: MovieProposal[]
) => {
  const stats = {
    hypeMan: [] as { name: string, value: string, score: number }[],
    skeptic: [] as { name: string, value: string, score: number }[],
    mostAnticipated: [] as { name: string, value: string, score: number }[]
  };

  if (movieRatings.length === 0 || people.length === 0) return stats;

  const personSums: Record<string, { sum: number, count: number }> = {};
  movieRatings.forEach(r => {
    if (r.rating > 0) {
      if (!personSums[r.person_id]) personSums[r.person_id] = { sum: 0, count: 0 };
      personSums[r.person_id].sum += r.rating;
      personSums[r.person_id].count += 1;
    }
  });

  const hypeRankings = Object.entries(personSums)
    .filter(([_, data]) => data.count >= 2)
    .map(([personId, data]) => {
      const p = people.find(p => p.id === personId);
      const avg = data.sum / data.count;
      return { name: p?.name || "Unknown", value: `${avg.toFixed(2)}/5 avg hype`, score: avg };
    });

  stats.hypeMan = [...hypeRankings].sort((a, b) => b.score - a.score);
  stats.skeptic = [...hypeRankings].sort((a, b) => a.score - b.score);

  const movieHype: Record<string, { sum: number, count: number, title: string }> = {};

  const propToWatched: Record<string, string> = {};
  movieRatings.forEach(r => {
    if (r.proposal_id && r.watched_movie_id) {
      propToWatched[r.proposal_id] = r.watched_movie_id;
    }
  });

  movieRatings.forEach(r => {
    const id = r.watched_movie_id || (r.proposal_id ? propToWatched[r.proposal_id] : null) || r.proposal_id;
    if (!id) return;
    if (!movieHype[id]) {
      let title = "Unknown";
      if (r.watched_movie_id) {
        title = watchedMovies.find(m => m.id === r.watched_movie_id)?.movie_title || "Unknown";
      } else if (r.proposal_id) {
        title = proposals.find(p => p.id === r.proposal_id)?.movie_title || "Unknown";
      }

      if (title === "Unknown") return;

      movieHype[id] = { sum: 0, count: 0, title };
    }
    movieHype[id].sum += r.rating;
    movieHype[id].count += 1;
  });

  stats.mostAnticipated = Object.values(movieHype)
    .filter(data => data.count >= 2)
    .map(data => {
      const avg = data.sum / data.count;
      return {
        name: data.title,
        value: `${avg.toFixed(2)}/5 avg hype (${data.count} votes)`,
        score: avg
      };
    })
    .sort((a, b) => b.score - a.score);

  return stats;
};
