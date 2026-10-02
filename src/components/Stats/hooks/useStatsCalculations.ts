import { useMemo } from "react";
import { WatchedMovie, DetailedRating, Person, MovieRating, MovieProposal } from "./useStatsData";
import {
  calculateTotalRuntime,
  formatRuntime,
  calculateOverallAverageRating,
  calculateOverallHype,
  calculateAwards,
  calculateGenreDistribution,
  calculateMovieAverages,
  calculateAnticipationStats,
  calculateSynergyStats,
  calculatePersonStats,
  calculateGroupHighlights,
  calculateGenreRadarData,
  calculateGroupLengthPreferences,
} from "../utils";

interface StatsData {
  watchedMovies: WatchedMovie[];
  detailedRatings: DetailedRating[];
  proposals: MovieProposal[];
  proposalRatings: MovieRating[];
  people: Person[];
  viewingPersonId: string;
}

export const useStatsCalculations = ({
  watchedMovies,
  detailedRatings,
  proposals,
  proposalRatings,
  people,
  viewingPersonId,
}: StatsData) => {
  const groupStats = useMemo(() => {
    try {
      const totalRuntime = calculateTotalRuntime(watchedMovies);
      const { average: averageRating, count: totalVotes, median: medianRating } = calculateOverallAverageRating(detailedRatings);
      const { average: averageHype, count: totalHypeVotes, median: medianHype } = calculateOverallHype(proposalRatings);
      const lengthPreferences = calculateGroupLengthPreferences(watchedMovies, detailedRatings, proposalRatings, proposals);
      const awards = calculateAwards(watchedMovies, detailedRatings, people);
      const genreData = calculateGenreDistribution(watchedMovies);
      const movieAverages = calculateMovieAverages(watchedMovies, detailedRatings);
      const anticipationStats = calculateAnticipationStats(proposalRatings, people, watchedMovies, proposals);
      const synergyStats = calculateSynergyStats(proposalRatings, detailedRatings, people, watchedMovies, proposals);
      const groupHighlights = calculateGroupHighlights(watchedMovies, detailedRatings, proposalRatings);
      const groupRadarData = calculateGenreRadarData(watchedMovies, detailedRatings, proposalRatings);

      const mostAnticipated = proposals.length > 0
        ? [...proposals].map(p => {
            const ratings = proposalRatings.filter(r => r.proposal_id === p.id);
            const avg = ratings.length > 0 ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0;
            return { ...p, avgRating: avg, votes: ratings.length };
          }).sort((a, b) => b.avgRating - a.avgRating)[0]
        : null;

      return {
        ok: true as const,
        totalRuntime,
        formattedRuntime: formatRuntime(totalRuntime),
        averageRating,
        totalVotes,
        medianRating,
        averageHype,
        totalHypeVotes,
        medianHype,
        lengthPreferences,
        awards,
        genreData,
        movieAverages,
        anticipationStats,
        synergyStats,
        groupHighlights,
        groupRadarData,
        mostAnticipated,
      };
    } catch (err) {
      console.error("Error calculating group stats:", err);
      return { ok: false as const };
    }
  }, [watchedMovies, detailedRatings, proposals, proposalRatings, people]);

  const personStats = useMemo(() => {
    try {
      if (!viewingPersonId) return null;
      return calculatePersonStats(viewingPersonId, watchedMovies, detailedRatings, proposalRatings, proposals, people);
    } catch (err) {
      console.error("Error calculating person stats:", err);
      return null;
    }
  }, [viewingPersonId, watchedMovies, detailedRatings, proposalRatings, proposals, people]);

  return useMemo(() => {
    if (!groupStats.ok) return { ok: false as const };
    return {
      ...groupStats,
      personStats,
    };
  }, [groupStats, personStats]);
};
