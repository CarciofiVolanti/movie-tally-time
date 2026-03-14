import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, Film, Star } from "lucide-react";
import { useStatsData } from "./hooks/useStatsData";
import { 
  calculateTotalRuntime, 
  formatRuntime, 
  calculateOverallAverageRating, 
  calculateAwards, 
  calculateGenreDistribution,
  calculateMovieAverages,
  calculateAnticipationStats,
  calculateSynergyStats,
  calculatePersonStats,
  calculateGroupHighlights,
  calculateGenreRadarData
} from "./utils";
import { StatCard } from "./StatCard";
import { AwardsList } from "./AwardsList";
import { TopMovies } from "./TopMovies";
import { GenreChart } from "./GenreChart";
import { SynergyAwards } from "./SynergyAwards";
import { AnticipationAwards } from "./AnticipationAwards";
import { PersonStats } from "./PersonStats";
import { GroupHighlights } from "./GroupHighlights";
import { GenreRadarChart } from "./GenreRadarChart";

interface StatsProps {
  sessionId: string;
  onBack: () => void;
}

export const Stats = ({ sessionId, onBack }: StatsProps) => {
  const { watchedMovies, detailedRatings, proposals, proposalRatings, people, loading } = useStatsData(sessionId);
  const [viewingPersonId, setViewingPersonId] = useState<string>("");
  const [expandedRankingId, setExpandedRankingId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading session stats...</p>
        </div>
      </div>
    );
  }

  const hasWatched = watchedMovies.length > 0;
  const hasProposals = proposals.length > 0;

  let totalRuntime = 0;
  let averageRating = 0;
  let totalVotes = 0;
  let awards = null;
  let genreData: { name: string; value: number }[] = [];
  let movieAverages: any[] = [];
  let anticipationStats = null;
  let synergyStats = null;
  let personStats = null;
  let mostAnticipated = null;
  let groupHighlights: { surprise: any, disappointment: any } = { surprise: null, disappointment: null };
  let groupRadarData: { subject: string; hype: number; score: number; fullMark: number }[] = [];

  try {
    totalRuntime = calculateTotalRuntime(watchedMovies);
    const avgObj = calculateOverallAverageRating(detailedRatings);
    averageRating = avgObj.average;
    totalVotes = avgObj.count;
    awards = calculateAwards(watchedMovies, detailedRatings, people);
    genreData = calculateGenreDistribution(watchedMovies);
    movieAverages = calculateMovieAverages(watchedMovies, detailedRatings);
    anticipationStats = calculateAnticipationStats(proposalRatings, people, watchedMovies, proposals);
    synergyStats = calculateSynergyStats(proposalRatings, detailedRatings, people, watchedMovies, proposals);
    groupHighlights = calculateGroupHighlights(watchedMovies, detailedRatings, proposalRatings);
    groupRadarData = calculateGenreRadarData(watchedMovies, detailedRatings, proposalRatings);
    personStats = viewingPersonId ? calculatePersonStats(viewingPersonId, watchedMovies, detailedRatings, proposalRatings, proposals, people) : null;

    // Simple proposal stats for the quick overview
    mostAnticipated = proposals.length > 0 ? [...proposals].map(p => {
      const ratings = proposalRatings.filter(r => r.proposal_id === p.id);
      const avg = ratings.length > 0 ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0;
      return { ...p, avgRating: avg, votes: ratings.length };
    }).sort((a, b) => b.avgRating - a.avgRating)[0] : null;
  } catch (err) {
    console.error("Error calculating stats:", err);
    return (
      <div className="min-h-screen p-8 text-center">
        <h2 className="text-xl font-bold text-red-500">Error Calculating Stats</h2>
        <p className="text-muted-foreground mt-2">Something went wrong while processing the session data.</p>
        <Button onClick={onBack} className="mt-4">Back to Session</Button>
      </div>
    );
  }

  const selectedPerson = people.find(p => p.id === viewingPersonId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 p-4">
      <div className="container mx-auto max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Button onClick={onBack} variant="ghost" className="hover:bg-secondary/80">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            {viewingPersonId && (
              <Button onClick={() => setViewingPersonId("")} variant="outline" size="sm">
                View Group Stats
              </Button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <select
              value={viewingPersonId}
              onChange={e => setViewingPersonId(e.target.value)}
              className="p-2 rounded bg-card text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary transition text-sm min-w-[200px]"
            >
              <option value="">Group Insights</option>
              {people.map(person => (
                <option key={person.id} value={person.id}>{person.name}'s Stats</option>
              ))}
            </select>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center hidden sm:flex">
              <Star className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-primary" />
              {viewingPersonId ? "Personal Insights" : "Session Statistics"}
            </h1>
          </div>
        </div>

        {!hasWatched && !hasProposals ? (
          <div className="text-center py-12 bg-card rounded-lg border border-border/50">
            <Film className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold">No Data Yet</h2>
            <p className="text-muted-foreground">Add people and propose movies to see stats!</p>
          </div>
        ) : viewingPersonId && personStats && selectedPerson ? (
          <PersonStats name={selectedPerson.name} stats={personStats} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {/* Active Proposal Stats (Quick Wins) */}
            {hasProposals && !hasWatched && (
              <Card className="col-span-full bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-md flex items-center gap-2">
                    <Star className="w-4 h-4 text-primary" />
                    Session Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Proposals</p>
                      <p className="text-2xl font-bold">{proposals.length}</p>
                    </div>
                    {mostAnticipated && mostAnticipated.votes > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Highest Anticipation</p>
                        <p className="text-lg font-bold truncate max-w-[200px]">{mostAnticipated.movie_title}</p>
                        <p className="text-xs text-muted-foreground">Avg. Hype: {mostAnticipated.avgRating.toFixed(1)} / 5</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {hasWatched && (
              <>
                <div className="col-span-full grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard 
                    title="Total Watch Time" 
                    value={formatRuntime(totalRuntime)} 
                    icon={Clock} 
                  />
                  <StatCard 
                    title="Movies Watched" 
                    value={watchedMovies.length} 
                    icon={Film} 
                  />
                  <StatCard 
                    title="Group Post-Watch Rating" 
                    value={`★ ${averageRating.toFixed(2)} / 10`} 
                    description={`Calculated from ${totalVotes} total ratings`}
                    icon={Star} 
                  />
                </div>

                <AwardsList 
                  awards={awards} 
                  expandedId={expandedRankingId} 
                  onToggleExpand={(id) => setExpandedRankingId(expandedRankingId === id ? null : id)} 
                />
                <GroupHighlights 
                  surprise={groupHighlights.surprise} 
                  disappointment={groupHighlights.disappointment} 
                />
                <SynergyAwards 
                  stats={synergyStats} 
                  expandedId={expandedRankingId} 
                  onToggleExpand={(id) => setExpandedRankingId(expandedRankingId === id ? null : id)} 
                />
                <AnticipationAwards 
                  stats={anticipationStats} 
                  expandedId={expandedRankingId} 
                  onToggleExpand={(id) => setExpandedRankingId(expandedRankingId === id ? null : id)} 
                />
                <GenreRadarChart data={groupRadarData} title="Group Genre Analysis" />
                <TopMovies movies={movieAverages} />
                <GenreChart data={genreData} />
              </>
            )}

            {!hasWatched && hasProposals && (
              <div className="col-span-full py-12 text-center opacity-60 italic">
                <p>Post-watch awards and rankings will appear after you mark a movie as watched!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Stats;
