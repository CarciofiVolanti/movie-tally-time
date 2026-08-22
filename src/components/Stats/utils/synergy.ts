import { WatchedMovie, DetailedRating, Person, MovieRating, MovieProposal } from "../hooks/useStatsData";

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

  const synergyMap: Record<string, { sum: number, count: number }> = {};

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

  const pairDifferences: Record<string, { totalDiff: number, count: number }> = {};

  const movieIds = Array.from(new Set(detailedRatings.map(r => r.watched_movie_id)));
  movieIds.forEach(mid => {
    const perMovieRatings = detailedRatings.filter(r => r.watched_movie_id === mid && r.rating !== null && r.rating > 0);
    for (let i = 0; i < perMovieRatings.length; i++) {
      for (let j = i + 1; j < perMovieRatings.length; j++) {
        const r1 = perMovieRatings[i];
        const r2 = perMovieRatings[j];
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
