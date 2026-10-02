import { WatchedMovie, DetailedRating, MovieRating, Person, MovieProposal } from "../hooks/useStatsData";
import { calculateTotalRuntime, formatRuntime, parseRuntime } from "./runtime";
import { calculateGenreRadarData } from "./genre";

export const calculatePearsonCorrelation = (x: number[], y: number[]): number | null => {
  if (x.length !== y.length || x.length < 2) return null;
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);
  const sumY2 = y.reduce((a, b) => a + b * b, 0);

  const numerator = n * sumXY - sumX * sumY;
  const varianceProduct = (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY);
  if (varianceProduct <= 0) return 0;
  
  const denominator = Math.sqrt(varianceProduct);
  return numerator / denominator;
};

export const getLengthPreference = (correlation: number | null): string => {
  if (correlation === null) return "Not enough data";
  if (correlation > 0.3) return "Prefers longer movies";
  if (correlation < -0.3) return "Prefers shorter movies";
  return "No strong preference";
};

export const calculatePersonStats = (
  personId: string,
  watchedMovies: WatchedMovie[],
  detailedRatings: DetailedRating[],
  movieRatings: MovieRating[],
  proposals: MovieProposal[],
  people: Person[]
) => {
  const attendedMovies = watchedMovies.filter(m =>
    detailedRatings.some(r => r.watched_movie_id === m.id && r.person_id === personId && r.present)
  );

  const personRatings = detailedRatings.filter(r => r.person_id === personId && r.rating !== null && r.rating > 0);
  const avgRatingGiven = personRatings.length > 0
    ? personRatings.reduce((sum, r) => sum + r.rating!, 0) / personRatings.length
    : 0;
  
  const sortedRatings = personRatings.map(r => r.rating!).sort((a, b) => a - b);
  const midRating = Math.floor(sortedRatings.length / 2);
  const medianRating = sortedRatings.length > 0
    ? (sortedRatings.length % 2 !== 0 ? sortedRatings[midRating] : (sortedRatings[midRating - 1] + sortedRatings[midRating]) / 2)
    : 0;

  const personHype = movieRatings.filter(r => r.person_id === personId && r.rating > 0);
  const avgHypeGiven = personHype.length > 0
    ? personHype.reduce((sum, r) => sum + r.rating, 0) / personHype.length
    : 0;
    
  const sortedHype = personHype.map(r => r.rating).sort((a, b) => a - b);
  const midHype = Math.floor(sortedHype.length / 2);
  const medianHype = sortedHype.length > 0
    ? (sortedHype.length % 2 !== 0 ? sortedHype[midHype] : (sortedHype[midHype - 1] + sortedHype[midHype]) / 2)
    : 0;

  const totalRuntimeMinutes = calculateTotalRuntime(attendedMovies);

  const scoreScatterData: { runtime: number; score: number; title: string }[] = [];
  const ratingRuntimes: number[] = [];
  const ratingValues: number[] = [];
  personRatings.forEach(r => {
    const movie = watchedMovies.find(m => m.id === r.watched_movie_id);
    if (movie && movie.runtime) {
      const mins = parseRuntime(movie.runtime);
      if (mins > 0) {
        ratingRuntimes.push(mins);
        ratingValues.push(r.rating!);
        scoreScatterData.push({ runtime: mins, score: r.rating!, title: movie.movie_title });
      }
    }
  });

  const hypeScatterData: { runtime: number; score: number; title: string }[] = [];
  const hypeRuntimes: number[] = [];
  const hypeValues: number[] = [];
  personHype.forEach(r => {
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
  });

  const scoreLengthCorrelation = calculatePearsonCorrelation(ratingRuntimes, ratingValues);
  const hypeLengthCorrelation = calculatePearsonCorrelation(hypeRuntimes, hypeValues);

  const genreScores: Record<string, { sum: number, count: number }> = {};
  personRatings.forEach(r => {
    const movie = watchedMovies.find(m => m.id === r.watched_movie_id);
    if (movie?.genre && movie.genre !== "N/A") {
      const genres = movie.genre.split(",").map(g => g.trim());
      genres.forEach(g => {
        if (!genreScores[g]) genreScores[g] = { sum: 0, count: 0 };
        genreScores[g].sum += r.rating!;
        genreScores[g].count += 1;
      });
    }
  });

  const genreStats = Object.entries(genreScores)
    .map(([name, data]) => ({ name, avg: data.sum / data.count, count: data.count }))
    .filter(g => g.count >= 2)
    .sort((a, b) => a.avg - b.avg);

  const topGenre = genreStats.length > 0 ? genreStats[genreStats.length - 1] : null;
  const bottomGenre = genreStats.length > 1 ? genreStats[0] : null;

  const hypeGenreScores: Record<string, { sum: number, count: number }> = {};
  personHype.forEach(r => {
    let movieGenre = null;
    if (r.watched_movie_id) {
      movieGenre = watchedMovies.find(m => m.id === r.watched_movie_id)?.genre;
    } else if (r.proposal_id) {
      movieGenre = proposals.find(p => p.id === r.proposal_id)?.genre;
    }

    if (movieGenre && movieGenre !== "N/A") {
      const genres = movieGenre.split(",").map(g => g.trim());
      genres.forEach(g => {
        if (!hypeGenreScores[g]) hypeGenreScores[g] = { sum: 0, count: 0 };
        hypeGenreScores[g].sum += r.rating;
        hypeGenreScores[g].count += 1;
      });
    }
  });

  const hypeGenreStats = Object.entries(hypeGenreScores)
    .map(([name, data]) => ({ name, avg: data.sum / data.count, count: data.count }))
    .filter(g => g.count >= 2)
    .sort((a, b) => a.avg - b.avg);

  const topHypeGenre = hypeGenreStats.length > 0 ? hypeGenreStats[hypeGenreStats.length - 1] : null;
  const bottomHypeGenre = hypeGenreStats.length > 1 ? hypeGenreStats[0] : null;

  let totalAlignmentDiff = 0;
  let alignmentCount = 0;
  personRatings.forEach(r => {
    const groupRatings = detailedRatings.filter(dr => dr.watched_movie_id === r.watched_movie_id && dr.rating !== null && dr.rating > 0);
    if (groupRatings.length > 1) {
      const groupAvg = groupRatings.reduce((s, dr) => s + dr.rating!, 0) / groupRatings.length;
      totalAlignmentDiff += Math.abs(r.rating! - groupAvg);
      alignmentCount += 1;
    }
  });

  const alignmentScore = alignmentCount > 0 ? totalAlignmentDiff / alignmentCount : null;

  let totalHypeAlignmentDiff = 0;
  let hypeAlignmentCount = 0;
  personHype.forEach(r => {
    const groupHypeRatings = movieRatings.filter(mr =>
      mr.rating > 0 && (
        (r.watched_movie_id && mr.watched_movie_id === r.watched_movie_id) ||
        (r.proposal_id && mr.proposal_id === r.proposal_id)
      )
    );
    if (groupHypeRatings.length > 1) {
      const groupAvgHype = groupHypeRatings.reduce((s, mr) => s + mr.rating, 0) / groupHypeRatings.length;
      totalHypeAlignmentDiff += Math.abs(r.rating - groupAvgHype);
      hypeAlignmentCount += 1;
    }
  });

  const alignmentHypeScore = hypeAlignmentCount > 0 ? totalHypeAlignmentDiff / hypeAlignmentCount : null;

  const personSynergy: { name: string, avgHypeDiff: number | null, avgScoreDiff: number | null, totalComparisons: number }[] = [];
  people.forEach(other => {
    if (other.id === personId) return;

    let totalHypeDiff = 0;
    let hypeDiffCount = 0;
    personHype.forEach(r => {
      const otherRating = movieRatings.find(mr =>
        mr.person_id === other.id && mr.rating > 0 && (
          (r.watched_movie_id && mr.watched_movie_id === r.watched_movie_id) ||
          (r.proposal_id && mr.proposal_id === r.proposal_id)
        )
      );
      if (otherRating) {
        totalHypeDiff += Math.abs(r.rating - otherRating.rating);
        hypeDiffCount += 1;
      }
    });

    let totalScoreDiff = 0;
    let scoreDiffCount = 0;
    personRatings.forEach(r => {
      const otherRating = detailedRatings.find(dr => dr.person_id === other.id && dr.watched_movie_id === r.watched_movie_id && dr.rating !== null && dr.rating > 0);
      if (otherRating) {
        totalScoreDiff += Math.abs(r.rating! - otherRating.rating!);
        scoreDiffCount += 1;
      }
    });

    if (hypeDiffCount >= 2 || scoreDiffCount >= 2) {
      personSynergy.push({
        name: other.name,
        avgHypeDiff: hypeDiffCount > 0 ? totalHypeDiff / hypeDiffCount : null,
        avgScoreDiff: scoreDiffCount > 0 ? totalScoreDiff / scoreDiffCount : null,
        totalComparisons: hypeDiffCount + scoreDiffCount
      });
    }
  });

  const bestSynergy = personSynergy.length > 0 ? [...personSynergy].sort((a, b) => {
    const aDiff = (a.avgScoreDiff ?? (a.avgHypeDiff ?? 0) * 2);
    const bDiff = (b.avgScoreDiff ?? (b.avgHypeDiff ?? 0) * 2);
    return aDiff - bDiff;
  })[0] : null;

  const worstSynergy = personSynergy.length > 0 ? [...personSynergy].sort((a, b) => {
    const aDiff = (a.avgScoreDiff ?? (a.avgHypeDiff ?? 0) * 2);
    const bDiff = (b.avgScoreDiff ?? (b.avgHypeDiff ?? 0) * 2);
    return bDiff - aDiff;
  })[0] : null;

  let biggestSurprise = null;
  let maxSurpriseDiff = -1;
  let biggestDisappointment = null;
  let minDisappointmentDiff = 1;

  personRatings.forEach(pr => {
    const hype = movieRatings.find(mr => mr.person_id === personId && mr.watched_movie_id === pr.watched_movie_id);
    if (hype && hype.rating > 0 && pr.rating! > 0) {
      const normalizedHype = hype.rating * 2;
      const diff = pr.rating! - normalizedHype;

      const movie = watchedMovies.find(m => m.id === pr.watched_movie_id);
      if (!movie) return;

      if (diff > maxSurpriseDiff) {
        maxSurpriseDiff = diff;
        biggestSurprise = { title: movie.movie_title, hype: hype.rating, score: pr.rating!, diff };
      }

      if (diff < minDisappointmentDiff) {
        minDisappointmentDiff = diff;
        biggestDisappointment = { title: movie.movie_title, hype: hype.rating, score: pr.rating!, diff };
      }
    }
  });

  const radarData = calculateGenreRadarData(watchedMovies, detailedRatings, movieRatings, personId);

  return {
    moviesWatched: attendedMovies.length,
    totalWatchTime: formatRuntime(totalRuntimeMinutes),
    avgRatingGiven: avgRatingGiven.toFixed(2),
    medianRating: medianRating.toFixed(1),
    avgHypeGiven: avgHypeGiven.toFixed(2),
    medianHype: medianHype.toFixed(1),
    topGenre,
    bottomGenre,
    topHypeGenre,
    bottomHypeGenre,
    alignmentScore: alignmentScore !== null ? alignmentScore.toFixed(2) : "N/A",
    alignmentHypeScore: alignmentHypeScore !== null ? alignmentHypeScore.toFixed(2) : "N/A",
    totalRatings: personRatings.length,
    totalHypeRatings: personHype.length,
    bestSynergy,
    worstSynergy,
    biggestSurprise,
    biggestDisappointment,
    radarData,
    scoreLengthPreference: getLengthPreference(scoreLengthCorrelation),
    hypeLengthPreference: getLengthPreference(hypeLengthCorrelation),
    scoreScatterData,
    hypeScatterData,
  };
};
