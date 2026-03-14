import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Frown, Smile, Star, ChevronDown, ChevronUp } from "lucide-react";

interface RankedPerson {
  name: string;
  value: string;
  score: number;
}

interface AwardsListProps {
  awards: {
    cinephile: RankedPerson[];
    harshestCritic: RankedPerson[];
    easyPleaser: RankedPerson[];
    tastemaker: RankedPerson[];
  };
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
}

export const AwardsList = ({ awards, expandedId, onToggleExpand }: AwardsListProps) => {
  if (!awards) return null;

  const awardItems = [
    {
      id: "cinephile",
      title: "The Cinephile",
      description: "Most movies attended/rated",
      icon: Trophy,
      data: awards.cinephile,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10"
    },
    {
      id: "tastemaker",
      title: "The Tastemaker",
      description: "Highest avg rating for their proposals",
      icon: Star,
      data: awards.tastemaker,
      color: "text-purple-500",
      bg: "bg-purple-500/10"
    },
    {
      id: "easyPleaser",
      title: "The Easy Pleaser",
      description: "Highest average ratings given",
      icon: Smile,
      data: awards.easyPleaser,
      color: "text-green-500",
      bg: "bg-green-500/10"
    },
    {
      id: "harshestCritic",
      title: "The Harshest Critic",
      description: "Lowest average ratings given",
      icon: Frown,
      data: awards.harshestCritic,
      color: "text-red-500",
      bg: "bg-red-500/10"
    }
  ];

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Session Awards & Rankings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {awardItems.map((award) => {
            const winner = award.data[0];
            // Cap at 15 items total (1 winner + 14 others)
            const others = award.data.slice(1, 15);
            const isExpanded = expandedId === award.id;

            return (
              <div key={award.id} className="flex flex-col p-4 rounded-lg bg-card border border-border/50 shadow-sm">
                <div className="flex flex-col items-center text-center mb-4">
                  <div className={`p-3 rounded-full ${award.bg} mb-3`}>
                    <award.icon className={`w-6 h-6 ${award.color}`} />
                  </div>
                  <h3 className="font-semibold text-base">{award.title}</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">{award.description}</p>
                  
                  {winner ? (
                    <div className="mt-1">
                      <p className="font-bold text-lg text-primary">{winner.name}</p>
                      <p className="text-xs text-muted-foreground">{winner.value}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic mt-2">No data yet</p>
                  )}
                </div>

                {others.length > 0 && (
                  <div className="mt-auto pt-4 border-t border-border/50">
                    <button 
                      onClick={() => onToggleExpand(award.id)}
                      className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span>Full Rankings</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    
                    {isExpanded && (
                      <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        {others.map((person, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2">
                              <span className="text-muted-foreground font-mono w-3">{idx + 2}.</span>
                              <span className="font-medium truncate max-w-[80px]">{person.name}</span>
                            </span>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                              {person.score.toFixed(1)}
                            </span>
                          </div>
                        ))}
                        {award.data.length > 15 && (
                          <p className="text-[10px] text-center text-muted-foreground pt-1 opacity-50">Capped at top 15</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
