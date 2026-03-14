import { WatchedMovie, DetailedRating, Person, MovieRating, MovieProposal } from "./hooks/useStatsData";

export const parseRuntime = (runtimeStr?: string | null): number => {
  if (!runtimeStr) return 0;
  const match = runtimeStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

export const calculateTotalRuntime = (movies: WatchedMovie[]): number => {
  return movies.reduce((total, movie) => total + parseRuntime(movie.runtime), 0);
};

export const formatRuntime = (minutes: number): string => {
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
  
  return parts.join(" ");
};

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

  const moviesToProcess = watchedMovies;

  moviesToProcess.forEach(movie => {
    if (!movie.genre || movie.genre === "N/A") return;
    const genres = movie.genre.split(",").map(g => g.trim());

    // Filter ratings if personId is provided
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
      // Normalize hype 0-5 to 0-10
      hype: stats.hypeCount > 0 ? (stats.hypeSum / stats.hypeCount) * 2 : 0,
      score: stats.scoreCount > 0 ? (stats.scoreSum / stats.scoreCount) : 0,
      fullMark: 10
    }))
    .filter(d => d.hype > 0 || d.score > 0)
    .sort((a, b) => (b.hype + b.score) - (a.hype + a.score))
    .slice(0, 8); // Take top 8 most frequent/highly rated genres for radar clarity
};

export const calculateAwards = (movies: WatchedMovie[], ratings: DetailedRating[], people: Person[]) => {
  const awards = {
    cinephile: [] as { name: string, value: string, score: number }[],
    harshestCritic: [] as { name: string, value: string, score: number }[],
    easyPleaser: [] as { name: string, value: string, score: number }[],
    tastemaker: [] as { name: string, value: string, score: number }[]
  };

  if (people.length === 0 || movies.length === 0) return awards;

  // Cinephile: Most movies marked as present or rated
  const attendanceCount: Record<string, number> = {};
  ratings.forEach(r => {
    if (r.present || r.rating !== null) {
      attendanceCount[r.person_id] = (attendanceCount[r.person_id] || 0) + 1;
    }
  });

  awards.cinephile = Object.entries(attendanceCount)
    .map(([personId, count]) => {
      const person = people.find(p => p.id === personId);
      return {
        name: person?.name || "Unknown",
        value: `${count} movies attended`,
        score: count
      };
    })
    .sort((a, b) => b.score - a.score);

  // Harshest Critic / Easy Pleaser: Average rating given across all movies
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

  // Tastemaker: Proposer of highest rated movies (average rating of their proposed movies)
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

  // Hype Man / Skeptic (avg pre-watch rating)
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
      return {
        name: p?.name || "Unknown",
        value: `${avg.toFixed(2)}/5 avg hype`,
        score: avg
      };
    });

  stats.hypeMan = [...hypeRankings].sort((a, b) => b.score - a.score);
  stats.skeptic = [...hypeRankings].sort((a, b) => a.score - b.score);

  // Most Anticipated Ever
  const movieHype: Record<string, { sum: number, count: number, title: string }> = {};
  movieRatings.forEach(r => {
    const id = r.watched_movie_id || r.proposal_id;
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

export const calculateSynergyStats = (
  movieRatings: MovieRating[], 
  detailedRatings: DetailedRating[], 
  people: Person[], 
  watchedMovies: WatchedMovie[],
  proposals: MovieProposal[]
) => {
  const stats = {
    perfectMatch: [] as { name: string, value: string, score: number }[],
    soulmates: [] as { name: string, value: string, score: number }[],
    polarOpposites: [] as { name: string, value: string, score: number }[]
  };

  if (people.length < 2) return stats;

  // 1. Perfect Match (Proposer A, Rater B) - based on Hype
  const synergyMap: Record<string, { sum: number, count: number }> = {}; // key: "proposerName|raterId"
  
  movieRatings.forEach(r => {
    let proposerName = null;
    if (r.watched_movie_id) {
      proposerName = watchedMovies.find(m => m.id === r.watched_movie_id)?.proposed_by;
    } else if (r.proposal_id) {
      const proposerId = proposals.find(p => p.id === r.proposal_id)?.person_id;
      if (proposerId) proposerName = people.find(p => p.id === proposerId)?.name;
    }
    
    if (proposerName && r.person_id) {
      const rater = people.find(p => p.id === r.person_id);
      if (rater && rater.name !== proposerName) {
        const key = `${proposerName}|${rater.id}`;
        if (!synergyMap[key]) synergyMap[key] = { sum: 0, count: 0 };
        synergyMap[key].sum += r.rating;
        synergyMap[key].count += 1;
      }
    }
  });

  stats.perfectMatch = Object.entries(synergyMap)
    .filter(([_, data]) => data.count >= 2)
    .map(([key, data]) => {
      const [proposer, raterId] = key.split("|");
      const raterName = people.find(p => p.id === raterId)?.name || "Unknown";
      const avg = data.sum / data.count;
      return {
        name: `${raterName} ❤️ ${proposer}`,
        value: `${avg.toFixed(2)}/5 avg hype for their proposals`,
        score: avg
      };
    })
    .sort((a, b) => b.score - a.score);

  // 2. Taste Soulmates / Polar Opposites - based on Detailed Ratings
  const pairDifferences: Record<string, { totalDiff: number, count: number }> = {};

  // For each movie, compare every pair of people who rated it
  const movieIds = Array.from(new Set(detailedRatings.map(r => r.watched_movie_id)));
  movieIds.forEach(mid => {
    const movieRatings = detailedRatings.filter(r => r.watched_movie_id === mid && r.rating !== null && r.rating > 0);
    for (let i = 0; i < movieRatings.length; i++) {
      for (let j = i + 1; j < movieRatings.length; j++) {
        const r1 = movieRatings[i];
        const r2 = movieRatings[j];
        const diff = Math.abs(r1.rating! - r2.rating!);
        
        const pairKey = [r1.person_id, r2.person_id].sort().join("|");
        if (!pairDifferences[pairKey]) pairDifferences[pairKey] = { totalDiff: 0, count: 0 };
        pairDifferences[pairKey].totalDiff += diff;
        pairDifferences[pairKey].count += 1;
      }
    }
  });

  const synergyRankings = Object.entries(pairDifferences)
    .filter(([_, data]) => data.count >= 2)
    .map(([pair, data]) => {
      const [p1, p2] = pair.split("|");
      const n1 = people.find(p => p.id === p1)?.name || "Unknown";
      const n2 = people.find(p => p.id === p2)?.name || "Unknown";
      const avgDiff = data.totalDiff / data.count;
      return {
        name: `${n1} & ${n2}`,
        value: `${avgDiff.toFixed(2)} avg rating diff (0-10)`,
        score: avgDiff
      };
    });

  stats.soulmates = [...synergyRankings].sort((a, b) => a.score - b.score);
  stats.polarOpposites = [...synergyRankings].sort((a, b) => b.score - a.score);

  return stats;
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

  const personHype = movieRatings.filter(r => r.person_id === personId && r.rating > 0);
  const avgHypeGiven = personHype.length > 0
    ? personHype.reduce((sum, r) => sum + r.rating, 0) / personHype.length
    : 0;

  const totalRuntimeMinutes = calculateTotalRuntime(attendedMovies);

  // Post-watch Genre performance
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

  // Pre-watch Hype Genre performance
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

  // Alignment with group (Post-watch)
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

  // Hype Alignment (Pre-watch)
  let totalHypeAlignmentDiff = 0;
  let hypeAlignmentCount = 0;
  personHype.forEach(r => {
    const movieId = r.watched_movie_id || r.proposal_id;
    const groupHypeRatings = movieRatings.filter(mr => (mr.watched_movie_id === movieId || mr.proposal_id === movieId) && mr.rating > 0);
    if (groupHypeRatings.length > 1) {
      const groupAvgHype = groupHypeRatings.reduce((s, mr) => s + mr.rating, 0) / groupHypeRatings.length;
      totalHypeAlignmentDiff += Math.abs(r.rating - groupAvgHype);
      hypeAlignmentCount += 1;
    }
  });

  const alignmentHypeScore = hypeAlignmentCount > 0 ? totalHypeAlignmentDiff / hypeAlignmentCount : null;

  // 1. Synergy with others
  const personSynergy: any[] = [];
  people.forEach(other => {
    if (other.id === personId) return;

    // Hype Synergy
    let totalHypeDiff = 0;
    let hypeDiffCount = 0;
    personHype.forEach(r => {
      const movieId = r.watched_movie_id || r.proposal_id;
      const otherRating = movieRatings.find(mr => mr.person_id === other.id && (mr.watched_movie_id === movieId || mr.proposal_id === movieId));
      if (otherRating) {
        totalHypeDiff += Math.abs(r.rating - otherRating.rating);
        hypeDiffCount += 1;
      }
    });

    // Rating Synergy
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
    const aDiff = (a.avgScoreDiff ?? a.avgHypeDiff * 2 ?? 0);
    const bDiff = (b.avgScoreDiff ?? b.avgHypeDiff * 2 ?? 0);
    return aDiff - bDiff;
  })[0] : null;

  const worstSynergy = personSynergy.length > 0 ? [...personSynergy].sort((a, b) => {
    const aDiff = (a.avgScoreDiff ?? a.avgHypeDiff * 2 ?? 0);
    const bDiff = (b.avgScoreDiff ?? b.avgHypeDiff * 2 ?? 0);
    return bDiff - aDiff;
  })[0] : null;

  // 2. Biggest Surprise (Low Hype -> High Rating) & Disappointment (High Hype -> Low Rating)
  let biggestSurprise = null;
  let maxSurpriseDiff = -1;
  let biggestDisappointment = null;
  let minDisappointmentDiff = 1; // Looking for most negative

  personRatings.forEach(pr => {
    const hype = movieRatings.find(mr => mr.person_id === personId && mr.watched_movie_id === pr.watched_movie_id);
    if (hype && hype.rating > 0 && pr.rating! > 0) {
      // Normalize hype to 0-10 for comparison
      const normalizedHype = hype.rating * 2;
      const diff = pr.rating! - normalizedHype;
      
      const movie = watchedMovies.find(m => m.id === pr.watched_movie_id);
      if (!movie) return;

      if (diff > maxSurpriseDiff) {
        maxSurpriseDiff = diff;
        biggestSurprise = {
          title: movie.movie_title,
          hype: hype.rating,
          score: pr.rating!,
          diff
        };
      }
      
      if (diff < minDisappointmentDiff) {
        minDisappointmentDiff = diff;
        biggestDisappointment = {
          title: movie.movie_title,
          hype: hype.rating,
          score: pr.rating!,
          diff
        };
      }
    }
  });

  const radarData = calculateGenreRadarData(watchedMovies, detailedRatings, movieRatings, personId);

  return {
    moviesWatched: attendedMovies.length,
    totalWatchTime: formatRuntime(totalRuntimeMinutes),
    avgRatingGiven: avgRatingGiven.toFixed(2),
    avgHypeGiven: avgHypeGiven.toFixed(2),
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
    radarData
  };
};

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
    const hypes = movieRatings.filter(r => r.watched_movie_id === movie.id && r.rating > 0);

    if (scores.length >= 2 && hypes.length >= 2) {
      const avgScore = scores.reduce((s, r) => s + r.rating!, 0) / scores.length;
      const avgHype = hypes.reduce((s, r) => s + r.rating, 0) / hypes.length;
      
      // Normalize hype 0-5 to 0-10
      const diff = avgScore - (avgHype * 2);

      if (diff > maxSurpriseDiff) {
        maxSurpriseDiff = diff;
        biggestSurprise = {
          title: movie.movie_title,
          avgHype,
          avgScore,
          diff
        };
      }

      if (diff < minDisappointmentDiff) {
        minDisappointmentDiff = diff;
        biggestDisappointment = {
          title: movie.movie_title,
          avgHype,
          avgScore,
          diff
        };
      }
    }
  });

  return { surprise: biggestSurprise, disappointment: biggestDisappointment };
};
