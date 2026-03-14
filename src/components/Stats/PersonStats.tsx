import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Clock, Film, Star, Sparkles, Target, TrendingUp, TrendingDown, Info, Heart, Zap, Ghost, AlertCircle, Frown } from "lucide-react";
import { GenreRadarChart } from "./GenreRadarChart";

interface PersonStatsProps {
  name: string;
  stats: {
    moviesWatched: number;
    totalWatchTime: string;
    avgRatingGiven: string;
    avgHypeGiven: string;
    topGenre: { name: string; avg: number; count: number } | null;
    bottomGenre: { name: string; avg: number; count: number } | null;
    topHypeGenre: { name: string; avg: number; count: number } | null;
    bottomHypeGenre: { name: string; avg: number; count: number } | null;
    alignmentScore: string;
    alignmentHypeScore: string;
    totalRatings: number;
    totalHypeRatings: number;
    bestSynergy: { name: string; avgHypeDiff: number | null; avgScoreDiff: number | null } | null;
    worstSynergy: { name: string; avgHypeDiff: number | null; avgScoreDiff: number | null } | null;
    biggestSurprise: { title: string; hype: number; score: number; diff: number } | null;
    biggestDisappointment: { title: string; hype: number; score: number; diff: number } | null;
    radarData: { subject: string; hype: number; score: number; fullMark: number }[];
  };
}

export const PersonStats = ({ name, stats }: PersonStatsProps) => {
  return (
    <div className="col-span-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-full bg-primary/10">
          <User className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">{name}'s Personal Stats</h2>
      </div>

      {/* Primary Aggregate Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Film className="w-4 h-4 text-muted-foreground" />
              Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.moviesWatched} movies</div>
            <p className="text-xs text-muted-foreground mt-1">Total movies attended</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Screen Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWatchTime}</div>
            <p className="text-xs text-muted-foreground mt-1">Time spent watching</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" />
              Avg Post-Watch Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRatingGiven} / 10</div>
            <p className="text-xs text-muted-foreground mt-1">From {stats.totalRatings} ratings</p>
          </CardContent>
        </Card>

        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-500" />
              Avg Pre-Watch Hype
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgHypeGiven} / 5</div>
            <p className="text-xs text-muted-foreground mt-1">From {stats.totalHypeRatings} votes</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart Card */}
        <GenreRadarChart data={stats.radarData} title={`${name}'s Genre Analysis`} />

        {/* Alignment & Taste Card */}
        <Card className="border-primary/20">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Critical Alignment
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase font-bold tracking-tighter">Post-Watch Alignment</p>
                <div className="text-xl font-bold">{stats.alignmentScore} pts</div>
                <p className="text-[10px] text-muted-foreground">Diff. from group rating (0-10)</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase font-bold tracking-tighter text-orange-600">Hype Alignment</p>
                <div className="text-xl font-bold text-orange-600">{stats.alignmentHypeScore} pts</div>
                <p className="text-[10px] text-muted-foreground">Diff. from group hype (0-5)</p>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <p className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                Quick Highlights
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {stats.topGenre && (
                  <div className="p-2 rounded bg-green-500/5 border border-green-500/10">
                    <p className="text-[10px] text-green-600 font-bold uppercase">Favorite Genre</p>
                    <p className="text-sm font-medium">{stats.topGenre.name}</p>
                  </div>
                )}
                {stats.topHypeGenre && (
                  <div className="p-2 rounded bg-orange-500/5 border border-orange-500/10">
                    <p className="text-[10px] text-orange-600 font-bold uppercase">Most Anticipated</p>
                    <p className="text-sm font-medium">{stats.topHypeGenre.name}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Social Synergy & Anti-Synergy */}
      <Card className="border-pink-500/20">
        <CardHeader className="bg-pink-500/5 border-b border-pink-500/10">
          <CardTitle className="text-lg flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            Social Synergy
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Highest Synergy */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600 font-semibold">
                <Zap className="w-4 h-4" />
                Highest Synergy
              </div>
              {stats.bestSynergy ? (
                <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/10">
                  <p className="text-lg font-bold mb-2">{stats.bestSynergy.name}</p>
                  <div className="space-y-1 text-sm">
                    {stats.bestSynergy.avgScoreDiff !== null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg. Rating Diff:</span>
                        <span className="font-medium">{stats.bestSynergy.avgScoreDiff.toFixed(2)} pts</span>
                      </div>
                    )}
                    {stats.bestSynergy.avgHypeDiff !== null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg. Hype Diff:</span>
                        <span className="font-medium">{stats.bestSynergy.avgHypeDiff.toFixed(2)} pts</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 italic">You two usually agree on what to watch and how good it was.</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Not enough comparisons yet.</p>
              )}
            </div>

            {/* Lowest Synergy */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-red-600 font-semibold">
                <Ghost className="w-4 h-4" />
                Anti-Synergy
              </div>
              {stats.worstSynergy ? (
                <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/10">
                  <p className="text-lg font-bold mb-2">{stats.worstSynergy.name}</p>
                  <div className="space-y-1 text-sm">
                    {stats.worstSynergy.avgScoreDiff !== null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg. Rating Diff:</span>
                        <span className="font-medium">{stats.worstSynergy.avgScoreDiff.toFixed(2)} pts</span>
                      </div>
                    )}
                    {stats.worstSynergy.avgHypeDiff !== null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg. Hype Diff:</span>
                        <span className="font-medium">{stats.worstSynergy.avgHypeDiff.toFixed(2)} pts</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 italic">Total opposites.</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Not enough comparisons yet.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Surprise & Disappointment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.biggestSurprise && (
          <Card className="border-purple-500/20 bg-purple-500/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-purple-500" />
                The Biggest Surprise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-xl font-bold text-purple-700">{stats.biggestSurprise.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Low initial expectations, but you ended up loving it!
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-2 rounded bg-orange-500/10 border border-orange-500/20 text-center">
                    <p className="text-[10px] uppercase font-bold text-orange-600">Hype</p>
                    <p className="text-lg font-bold">{stats.biggestSurprise.hype}/5</p>
                  </div>
                  <div className="p-2 rounded bg-primary/10 border border-primary/20 text-center">
                    <p className="text-[10px] uppercase font-bold text-primary">Rating</p>
                    <p className="text-lg font-bold">{stats.biggestSurprise.score}/10</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {stats.biggestDisappointment && (
          <Card className="border-red-500/20 bg-red-500/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Frown className="w-5 h-5 text-red-500" />
                Biggest Disappointment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-xl font-bold text-red-700">{stats.biggestDisappointment.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    You were so excited for this, but it didn't live up to the hype.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-2 rounded bg-orange-500/10 border border-orange-500/20 text-center">
                    <p className="text-[10px] uppercase font-bold text-orange-600">Hype</p>
                    <p className="text-lg font-bold">{stats.biggestDisappointment.hype}/5</p>
                  </div>
                  <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-center">
                    <p className="text-[10px] uppercase font-bold text-red-600">Rating</p>
                    <p className="text-lg font-bold">{stats.biggestDisappointment.score}/10</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
        <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-700">
          <p className="font-semibold mb-1">Understanding your stats:</p>
          <ul className="list-disc list-inside space-y-1 opacity-80">
            <li><strong>Pre-Watch Hype:</strong> Calculated from the 0-5 star "want to watch" votes on proposals.</li>
            <li><strong>Post-Watch Rating:</strong> Calculated from the 0-10 detailed ratings given after watching.</li>
            <li><strong>Synergy:</strong> Calculated by comparing the difference between your votes and others. Low difference = high synergy.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
